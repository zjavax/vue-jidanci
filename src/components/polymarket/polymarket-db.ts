/**
 * polymarket 事件状态的 IndexedDB 封装。
 *
 * 为什么换掉 localStorage：
 * 旧方案把每个被标记的事件存成 localStorage 里一个独立的 key（key 就是 slug），
 * 于是「读出全部已管理事件」这件事只能遍历整个 localStorage、逐个 JSON.parse，
 * 再靠白名单把 vueuse-color-scheme / 屏蔽词这类非事件 key 排除掉。
 * 每新增一个配置项就多一个污染源，而且没法给记录加字段、没法排序。
 * 现在记录都躺在同一张表里，不存在「误伤其它 key」这个问题。
 *
 * 环境约定：IndexedDB 在 Node（vite-ssg 预渲染）里不存在，
 * 所以每个对外函数都先做环境守卫，不可用时安静返回空结果，绝不抛错。
 */

export type EventStatus = 'hidden' | 'favorite'

/**
 * 事件的最小形状。
 * 刻意只要求 id / slug / title —— 这样无论是接口返回的 MarketEvent，
 * 还是库里读出来的 StoredEvent，都能直接传进来，数据层不必知道调用方是谁。
 */
export interface EventLike {
  id: string
  slug: string
  title: string
}

/**
 * 「较收藏时」的基准：收藏那一刻各选项的概率快照。
 * 有它，界面上就能显示「从我收藏到现在涨了多少」，而不是接口给的 24h 变动 ——
 * 竹子关注的是长周期事件（截止日期常在几个月后），24h 波动对他没什么信息量。
 */
export interface EventBaseline {
  /** 基准建立时间 */
  at: number
  /** 选项 key（`QuoteOption.key`，形状是 `slug#市场id#下标`）→ 概率（0~1） */
  prices: Record<string, number>
}

export interface StoredEvent {
  /** 主键 */
  slug: string
  id: string
  title: string
  status: EventStatus
  /** 置顶的排在列表最前面 */
  pinned: boolean
  /** 备注 */
  note: string
  /**
   * 收藏时的行情基准。可选：这个字段是后加的，老记录没有；
   * 另外收藏那一刻行情还没拉到时也会暂时为空。界面会退化成显示 24h 变动。
   */
  baseline?: EventBaseline
  /** 首次被标记的时间 */
  createdAt: number
  /** status 最后一次变更的时间 —— 列表排序依据 */
  statusChangedAt: number
  /** 记录任意字段最后被修改的时间 */
  updatedAt: number
}

export const DB_NAME = 'polymarket'
export const DB_VERSION = 1
const STORE = 'events'

export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('当前环境不支持 IndexedDB'))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'slug' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('statusChangedAt', 'statusChangedAt', { unique: false })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      // 别的标签页要升级版本时主动让位，否则对方会一直卡在 blocked
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }

    request.onerror = () => {
      dbPromise = null // 允许下一次重试
      reject(request.error)
    }

    request.onblocked = () => {
      dbPromise = null
      reject(new Error('数据库被其它标签页占用，无法升级版本'))
    }
  })

  return dbPromise
}

/**
 * 出错时的对外通告。这一层不引 UI 依赖（文件在 Node 预渲染里也会被加载），
 * 所以只留一个钩子，由组合层接到 ElMessage 上。
 *
 * 为什么必须有：本文件的函数一律「失败就返回空值 / false」，而调用方基本不看返回值 ——
 * 写库失败因此**完全静默**：界面照样显示成功，刷新后改动全没了。
 * 2026-09-20 的 DataCloneError（reactive Proxy 进不了 IndexedDB）就是这么藏了很久，
 * 表现为「收藏 / 置顶 / 备注 / 隐藏」四个操作全部显示成功、全部刷新后回滚。
 *
 * 只负责通知 UI；详细的错误对象仍由各函数自己的 console.error 打（避免重复刷屏）。
 */
type DbErrorReporter = (message: string) => void
let reportToUI: DbErrorReporter | null = null

export function setDbErrorReporter(reporter: DbErrorReporter | null) {
  reportToUI = reporter
}

const WRITE_LOST = '本地存储写入失败，这次改动刷新后会丢失'
const READ_LOST = '本地存储读取失败，列表可能不完整'

/** 读操作：以请求成功为准 */
function read<T>(run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB()
    .then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const transaction = db.transaction(STORE, 'readonly')
          const request = run(transaction.objectStore(STORE))
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        }),
    )
    .catch((error) => {
      reportToUI?.(READ_LOST)
      throw error
    })
}

/**
 * 写操作：以事务提交为准，而不是请求成功。
 * 请求返回成功之后事务仍然可能整体回滚，只等 request.onsuccess 会漏掉这种情况。
 */
function write(run: (store: IDBObjectStore) => void): Promise<void> {
  return openDB()
    .then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE, 'readwrite')
          try {
            run(transaction.objectStore(STORE))
          } catch (error) {
            transaction.abort()
            reject(error)
            return
          }
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
          transaction.onabort = () =>
            reject(transaction.error ?? new Error('事务被中止'))
        }),
    )
    .catch((error) => {
      reportToUI?.(WRITE_LOST)
      throw error
    })
}

function isStoredEvent(value: unknown): value is StoredEvent {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<StoredEvent>
  return (
    typeof row.slug === 'string' &&
    (row.status === 'hidden' || row.status === 'favorite')
  )
}

/**
 * 基准是后加的字段，老记录没有；也可能被手改坏。
 * 校验不过就当没有 —— 界面会退回显示 24h 变动，比渲染出 NaN 好。
 */
function normalizeBaseline(value: unknown): EventBaseline | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<EventBaseline>
  if (typeof raw.at !== 'number' || !raw.prices || typeof raw.prices !== 'object') {
    return undefined
  }
  const prices: Record<string, number> = {}
  Object.entries(raw.prices).forEach(([key, price]) => {
    if (typeof price === 'number' && Number.isFinite(price)) prices[key] = price
  })
  if (!Object.keys(prices).length) return undefined
  return { at: raw.at, prices }
}

/** 补齐缺失字段，避免读到老结构写入的行时炸掉 */
function normalize(row: StoredEvent): StoredEvent {
  const fallback = Date.now()
  return {
    slug: row.slug,
    id: String(row.id ?? ''),
    title: row.title ?? row.slug,
    status: row.status,
    pinned: row.pinned === true,
    note: typeof row.note === 'string' ? row.note : '',
    baseline: normalizeBaseline(row.baseline),
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : fallback,
    statusChangedAt:
      typeof row.statusChangedAt === 'number' ? row.statusChangedAt : fallback,
    updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : fallback,
  }
}

export async function getAllEvents(): Promise<StoredEvent[]> {
  if (!isIndexedDBAvailable()) return []
  try {
    const rows = await read<StoredEvent[]>((store) => store.getAll())
    if (!Array.isArray(rows)) return []
    return rows.filter(isStoredEvent).map(normalize)
  } catch (error) {
    console.error('[polymarket-db] 读取事件失败:', error)
    return []
  }
}

/**
 * 深拷贝成纯对象（顺带解包 Vue 的 reactive Proxy）。
 *
 * 为什么写库前必须做：IndexedDB 的 structured clone **不接受 Proxy**，会抛 DataCloneError。
 * 而调用方经常直接把响应式状态里的字段塞进记录，最典型的两处：
 *   - `nextBaseline` 里的 `return existing.baseline` —— existing 取自 managed（reactive 数组元素）；
 *   - `togglePin` / `setNote` 的 `{ ...target }` —— spread 只解一层，baseline 这个嵌套对象仍是 Proxy。
 * 不处理的后果很隐蔽：store.put 抛错 → 被 catch 吞掉只打一行日志 →
 * 界面上「收藏 / 置顶 / 备注 / 隐藏」全都显示成功 → **刷新后全部回滚**。
 *
 * 只递归普通对象和数组；其它对象（Date 之类）原样透传，交给 structured clone 自己判断。
 */
function toPlain<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toPlain(item)) as unknown as T
  }
  if (!value || typeof value !== 'object') return value
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return value
  const out: Record<string, unknown> = {}
  Object.keys(value as Record<string, unknown>).forEach((key) => {
    out[key] = toPlain((value as Record<string, unknown>)[key])
  })
  return out as T
}

export async function putEvent(event: StoredEvent): Promise<boolean> {
  if (!isIndexedDBAvailable()) return false
  try {
    await write((store) => {
      store.put(toPlain(event))
    })
    return true
  } catch (error) {
    console.error('[polymarket-db] 写入事件失败:', error)
    return false
  }
}

/** 批量写入放在同一个事务里，避免 N 次事务开销 */
export async function putEvents(events: StoredEvent[]): Promise<boolean> {
  if (!events.length || !isIndexedDBAvailable()) return false
  try {
    await write((store) => {
      events.forEach((event) => store.put(toPlain(event)))
    })
    return true
  } catch (error) {
    console.error('[polymarket-db] 批量写入事件失败:', error)
    return false
  }
}

export async function deleteEvent(slug: string): Promise<boolean> {
  if (!isIndexedDBAvailable()) return false
  try {
    await write((store) => {
      store.delete(slug)
    })
    return true
  } catch (error) {
    console.error('[polymarket-db] 删除事件失败:', error)
    return false
  }
}

/** 按 status 走索引游标删除，返回实际删除条数 */
export async function deleteEventsByStatus(status: EventStatus): Promise<number> {
  if (!isIndexedDBAvailable()) return 0
  try {
    const db = await openDB()
    return await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      const store = transaction.objectStore(STORE)
      const cursorRequest = store
        .index('status')
        .openKeyCursor(IDBKeyRange.only(status))

      let removed = 0
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (!cursor) return
        store.delete(cursor.primaryKey)
        removed += 1
        cursor.continue()
      }
      cursorRequest.onerror = () => reject(cursorRequest.error)
      transaction.oncomplete = () => resolve(removed)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('事务被中止'))
    })
  } catch (error) {
    // 这个函数没走 write()（它要游标逐条删），所以得自己通告一次。
    // 它失败时返回 0，而 0 同时也是「本来就没东西可删」，调用方分不出来 —— 必须在这里说话。
    reportToUI?.(WRITE_LOST)
    console.error('[polymarket-db] 按状态批量删除失败:', error)
    return 0
  }
}

export async function clearAllEvents(): Promise<boolean> {
  if (!isIndexedDBAvailable()) return false
  try {
    await write((store) => {
      store.clear()
    })
    return true
  } catch (error) {
    console.error('[polymarket-db] 清空事件失败:', error)
    return false
  }
}
