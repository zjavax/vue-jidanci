/**
 * polymarket 事件状态的统一读写层。
 *
 * EventList.vue 和 EventList_sports.vue 原先各自抄了一份屏蔽词过滤 + 已管理事件读写
 * （约 35 行 × 2），已经因此出现过「改一个漏一个」。这里收敛成一份。
 *
 * 组件里的用法：
 *   const store = useEventStore()
 *   onMounted(store.init)                       // 必须在 onMounted 里，见下方 SSG 说明
 *   const visible = computed(() => store.filterVisible(rawEvents.value))
 */

import { computed, ref, watch } from 'vue'
// 这里只从 polymarket.ts 取接口函数：它和 polymarket_sports.ts 里的同名实现完全一致，
// 数据层不需要知道调用方是哪个页面。
import {
  fetchPolymarketEvent,
  fetchPolymarketEventsBySlugs,
} from '../components/polymarket/polymarket'
import {
  deleteEvent,
  deleteEventsByStatus,
  getAllEvents,
  isIndexedDBAvailable,
  putEvent,
  putEvents,
  type EventLike,
  type EventStatus,
  type StoredEvent,
} from '../components/polymarket/polymarket-db'

/** 屏蔽词仍然留在 localStorage：它是纯配置、需要同步读取，且不再有人遍历 localStorage */
const BLOCK_KEY = 'polymarket-block-words'

export type { EventLike, EventStatus, StoredEvent }

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * 从「完整链接」或「裸 slug」里取出 slug。
 *
 * 不要只认 `/event/` —— Polymarket 的链接有好几种形状，slug 都在**路径最后一段**：
 *   https://polymarket.com/zh/event/fed-decision-in-september-762   → fed-decision-in-september-762
 *   https://polymarket.com/zh/sports/tur/tur-gal-koc-2026-09-13     → tur-gal-koc-2026-09-13
 *   https://polymarket.com/sports/tur/tur-gal-koc-2026-09-13        → tur-gal-koc-2026-09-13
 * 所以统一取最后一段，顺带兼容没写协议的 `polymarket.com/zh/...` 和纯路径 `/zh/...`。
 */
export function extractSlug(input: string): string {
  const value = input.trim()
  if (!value) return ''

  // 不含斜杠 → 本身就是 slug（顺手去掉误粘的查询串 / 锚点）
  if (!value.includes('/')) return value.split(/[?#]/)[0]

  // 含斜杠 → 按链接或路径处理
  let pathname: string
  try {
    pathname = new URL(value).pathname
  } catch {
    // 不是合法绝对 URL（没写协议），退化成按纯路径解析
    pathname = value.split(/[?#]/)[0]
  }

  const segments = pathname.split('/').filter(Boolean)
  if (!segments.length) return ''
  return safeDecode(segments[segments.length - 1])
}

export interface ParsedSlugList {
  /** 去重后的 slug，保持输入顺序 */
  slugs: string[]
  /** 输入里重复出现的 slug */
  duplicated: string[]
  /** 解析不出 slug 的原始输入 */
  invalid: string[]
}

/**
 * 解析批量输入：换行、空格、中英文逗号、中英文分号都当分隔符。
 * slug 和 URL 里都不含这些字符，所以放心切。
 */
export function parseSlugList(raw: string): ParsedSlugList {
  const slugs: string[] = []
  const duplicated: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()

  raw
    .split(/[\s,，;；]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      const slug = extractSlug(token)
      if (!slug) {
        invalid.push(token)
        return
      }
      if (seen.has(slug)) {
        duplicated.push(slug)
        return
      }
      seen.add(slug)
      slugs.push(slug)
    })

  return { slugs, duplicated, invalid }
}

export interface BatchAddResult {
  /** 本次真正新收藏的条数 */
  added: number
  /** 接口没查到的 slug */
  notFound: string[]
  /** 本来就已经是收藏的，未改动 */
  alreadyFavorite: string[]
  /** 输入里重复出现的 */
  duplicated: string[]
  /** 解析不出 slug 的原始输入 */
  invalid: string[]
}

/** 置顶优先，其次按 status 最后变更时间倒序 */
function sortManaged(list: StoredEvent[]): StoredEvent[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.statusChangedAt - a.statusChangedAt
  })
}

export function useEventStore() {
  /** 已管理事件，始终保持「置顶优先 + 时间倒序」 */
  const managed = ref<StoredEvent[]>([])
  /** 首次读取完成前为 false，用于避免管理区域闪一下空白 */
  const ready = ref(false)
  /** 当前环境是否支持 IndexedDB（SSG 预渲染时为 false） */
  const supported = ref(true)

  // ===== 屏蔽词 =====
  const blockInput = ref(
    typeof localStorage === 'undefined'
      ? ''
      : localStorage.getItem(BLOCK_KEY) || '',
  )

  // 支持中英文分号，去空白、去空项、忽略大小写
  const blockWords = computed(() =>
    blockInput.value
      .split(/[;；]/)
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean),
  )

  watch(blockInput, (value) => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(BLOCK_KEY, value)
  })

  // ===== 派生数据 =====
  const favorites = computed(() =>
    managed.value.filter((event) => event.status === 'favorite'),
  )
  const hiddenEvents = computed(() =>
    managed.value.filter((event) => event.status === 'hidden'),
  )
  const managedSlugs = computed(
    () => new Set(managed.value.map((event) => event.slug)),
  )

  const isManaged = (slug: string) => managedSlugs.value.has(slug)

  /** 先剔除已管理的事件，再套屏蔽词。两个过滤条件都不改原始列表。 */
  function filterVisible<T extends EventLike>(list: T[]): T[] {
    const kept = list.filter((event) => !managedSlugs.value.has(event.slug))
    const words = blockWords.value
    if (!words.length) return kept
    return kept.filter((event) => {
      const text = `${event.title} ${event.slug}`.toLowerCase()
      return !words.some((word) => text.includes(word))
    })
  }

  /** 屏幕上被屏蔽词挡掉的条数 */
  function blockedCount(total: number, visible: number): number {
    return Math.max(total - visible, 0)
  }

  // ===== 本地缓存同步 =====

  /** 写入内存并维持排序，避免每次操作都整表重读 */
  function upsertLocal(event: StoredEvent) {
    managed.value = sortManaged([
      ...managed.value.filter((item) => item.slug !== event.slug),
      event,
    ])
  }

  function removeLocal(slug: string) {
    managed.value = managed.value.filter((event) => event.slug !== slug)
  }

  function buildRecord(
    event: EventLike,
    status: EventStatus,
    timestamp: number,
    /** 新记录是否直接置顶。只有「单条收藏」会传 true，见 markEvent */
    pinNew = false,
  ): StoredEvent {
    const existing = managed.value.find((item) => item.slug === event.slug)
    return {
      slug: event.slug,
      id: String(event.id ?? existing?.id ?? ''),
      title: event.title,
      status,
      // 收藏 = 新关注，默认置顶，省得收藏完还要再点一次置顶；
      // 隐藏没有置顶概念；批量导入不套用（一次几十条全顶上去反而看不清）。
      // 已有记录则保留用户自己的置顶选择。
      pinned:
        pinNew && status === 'favorite' ? true : (existing?.pinned ?? false),
      note: existing?.note ?? '',
      createdAt: existing?.createdAt ?? timestamp,
      statusChangedAt: timestamp,
      updatedAt: timestamp,
    }
  }

  // ===== 初始化 =====

  let initPromise: Promise<void> | null = null

  /**
   * 读一次全表。必须在 onMounted 里调用：
   * vite-ssg 预渲染跑在 Node 上，没有 indexedDB，在 setup 顶层直接调用会构建失败。
   */
  function init(): Promise<void> {
    if (initPromise) return initPromise
    initPromise = (async () => {
      supported.value = isIndexedDBAvailable()
      if (!supported.value) {
        ready.value = true
        return
      }
      managed.value = sortManaged(await getAllEvents())
      ready.value = true
    })()
    return initPromise
  }

  async function refresh() {
    managed.value = sortManaged(await getAllEvents())
  }

  // ===== 写操作 =====
  //
  // 每个写操作都先 await init()：init 会把整表快照赋值给 managed，
  // 如果用户在首次读库返回之前就点了按钮，后到的快照会把刚写进内存的记录覆盖掉
  // （putEvent 已经落库，所以表现为「刷新后记录又冒出来了」）。
  // 等 init 的 promise 先结算，就能保证「先读后写」的顺序。
  // init 内部有 promise 记忆，重复 await 不产生额外开销。

  async function markEvent(event: EventLike, status: EventStatus) {
    await init()
    // 单条收藏默认置顶：刚收藏的立刻出现在最上面
    const record = buildRecord(event, status, Date.now(), true)
    upsertLocal(record)
    await putEvent(record)
  }

  /** 批量标记，写入合并成单个事务 */
  async function markMany(events: EventLike[], status: EventStatus) {
    if (!events.length) return
    await init()
    const timestamp = Date.now()
    const records = events.map((event) => buildRecord(event, status, timestamp))

    const bySlug = new Map(managed.value.map((item) => [item.slug, item]))
    records.forEach((record) => bySlug.set(record.slug, record))
    managed.value = sortManaged([...bySlug.values()])

    await putEvents(records)
  }

  async function unmarkEvent(slug: string) {
    await init()
    removeLocal(slug)
    await deleteEvent(slug)
  }

  async function clearByStatus(status: EventStatus): Promise<number> {
    await init()
    const removed = await deleteEventsByStatus(status)
    managed.value = managed.value.filter((event) => event.status !== status)
    return removed
  }

  async function togglePin(slug: string) {
    await init()
    const target = managed.value.find((event) => event.slug === slug)
    if (!target) return
    const next: StoredEvent = {
      ...target,
      pinned: !target.pinned,
      updatedAt: Date.now(),
    }
    upsertLocal(next)
    await putEvent(next)
  }

  /** 备注不参与排序，所以只动 updatedAt */
  async function setNote(slug: string, note: string) {
    await init()
    const target = managed.value.find((event) => event.slug === slug)
    if (!target) return
    const next: StoredEvent = { ...target, note, updatedAt: Date.now() }
    upsertLocal(next)
    await putEvent(next)
  }

  /** 粘贴链接或 slug 直接收藏 */
  async function addBySlugOrUrl(
    input: string,
  ): Promise<{ ok: boolean; title?: string; message?: string }> {
    const slug = extractSlug(input)
    if (!slug) return { ok: false, message: '请输入事件链接或 slug' }

    const event = await fetchPolymarketEvent(slug)
    if (!event) return { ok: false, message: `没有找到 slug 为「${slug}」的事件` }

    await markEvent(event, 'favorite')
    return { ok: true, title: event.title }
  }

  /**
   * 批量收藏。每个 slug 只会落到下面某一类里，计数可以直接相加。
   * 已经在库里的（之前隐藏过）直接用库里的记录改成收藏，不必再查接口。
   */
  async function addManyBySlugs(raw: string): Promise<BatchAddResult> {
    await init()
    const { slugs, duplicated, invalid } = parseSlugList(raw)

    const managedBySlug = new Map(managed.value.map((event) => [event.slug, event]))
    const statusOf = (slug: string) => managedBySlug.get(slug)?.status

    const alreadyFavorite = slugs.filter((slug) => statusOf(slug) === 'favorite')
    const candidates = slugs.filter((slug) => statusOf(slug) !== 'favorite')

    const fromLibrary = candidates
      .map((slug) => managedBySlug.get(slug))
      .filter((event): event is StoredEvent => Boolean(event))
    const toFetch = candidates.filter((slug) => !managedBySlug.has(slug))

    const fetched = toFetch.length
      ? await fetchPolymarketEventsBySlugs(toFetch)
      : []
    const fetchedSlugs = new Set(fetched.map((event) => event.slug))
    const notFound = toFetch.filter((slug) => !fetchedSlugs.has(slug))

    const records: EventLike[] = [...fromLibrary, ...fetched]
    if (records.length) await markMany(records, 'favorite')

    return {
      added: records.length,
      notFound,
      alreadyFavorite,
      duplicated,
      invalid,
    }
  }

  return {
    // 状态
    managed,
    ready,
    supported,
    // 派生
    favorites,
    hiddenEvents,
    managedSlugs,
    isManaged,
    filterVisible,
    blockedCount,
    // 屏蔽词
    blockInput,
    blockWords,
    // 生命周期
    init,
    refresh,
    // 写操作
    markEvent,
    markMany,
    unmarkEvent,
    clearByStatus,
    togglePin,
    setNote,
    addBySlugOrUrl,
    addManyBySlugs,
  }
}
