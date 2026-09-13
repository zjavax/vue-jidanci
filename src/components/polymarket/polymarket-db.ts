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

/** 读操作：以请求成功为准 */
function read<T>(run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readonly')
        const request = run(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

/**
 * 写操作：以事务提交为准，而不是请求成功。
 * 请求返回成功之后事务仍然可能整体回滚，只等 request.onsuccess 会漏掉这种情况。
 */
function write(run: (store: IDBObjectStore) => void): Promise<void> {
  return openDB().then(
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
}

function isStoredEvent(value: unknown): value is StoredEvent {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<StoredEvent>
  return (
    typeof row.slug === 'string' &&
    (row.status === 'hidden' || row.status === 'favorite')
  )
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

export async function putEvent(event: StoredEvent): Promise<boolean> {
  if (!isIndexedDBAvailable()) return false
  try {
    await write((store) => {
      store.put(event)
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
      events.forEach((event) => store.put(event))
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
