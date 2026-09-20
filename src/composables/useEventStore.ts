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
import { ElMessage } from 'element-plus'
// 这里只从 polymarket.ts 取接口函数：它和 polymarket_sports.ts 里的同名实现完全一致，
// 数据层不需要知道调用方是哪个页面。
import {
  fetchPolymarketEvent,
  fetchPolymarketEventsBySlugs,
  type MarketEvent,
} from '../components/polymarket/polymarket'
import {
  buildEventQuote,
  type EventQuote,
} from '../components/polymarket/polymarket-quote'
import {
  deleteEvent,
  deleteEventsByStatus,
  getAllEvents,
  isIndexedDBAvailable,
  putEvent,
  putEvents,
  setDbErrorReporter,
  type EventBaseline,
  type EventLike,
  type EventStatus,
  type StoredEvent,
} from '../components/polymarket/polymarket-db'

/** 屏蔽词仍然留在 localStorage：它是纯配置、需要同步读取，且不再有人遍历 localStorage */
const BLOCK_KEY = 'polymarket-block-words'

export type { EventBaseline, EventLike, EventStatus, StoredEvent }

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
 * Polymarket 的链接有好几种形状，**不能一律取最后一段**：
 *   https://polymarket.com/zh/event/fed-decision-in-september-762   → fed-decision-in-september-762
 *   https://polymarket.com/zh/sports/tur/tur-gal-koc-2026-09-13     → tur-gal-koc-2026-09-13（末段就是事件 slug）
 *   https://polymarket.com/sports/tur/tur-gal-koc-2026-09-13        → tur-gal-koc-2026-09-13
 *
 * ⚠️ 点进某个具体市场后地址会**多一段**，末段变成市场 slug：
 *   https://polymarket.com/zh/event/<事件slug>/<市场slug>
 * 市场 slug 拿去查 `/events?slug=` 是查不到的（会报「没有找到」），所以只要路径里有
 * `event` 这一段，就取它**后面那一段**，而不是最后一段。
 * 体育类路径里没有 `event`，仍走末段。
 *
 * 顺带兼容没写协议的 `polymarket.com/zh/...` 和纯路径 `/zh/...`。
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

  // 事件页：/event/<事件slug>[/<市场slug>] → 取 event 后面那一段
  const eventIndex = segments.indexOf('event')
  if (eventIndex !== -1 && segments[eventIndex + 1]) {
    return safeDecode(segments[eventIndex + 1])
  }

  // 其它形状（sports 等）：末段就是事件 slug
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
  /**
   * 写库失败。为 true 时 `added` 不可信 —— 记录只加进了内存，刷新就没了。
   * 调用方必须优先报错，不能报「已收藏 N 个」。
   */
  writeFailed: boolean
}

/** 置顶优先，其次按 status 最后变更时间倒序 */
function sortManaged(list: StoredEvent[]): StoredEvent[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.statusChangedAt - a.statusChangedAt
  })
}

// ===== 「较收藏时」的基准 =====

/** 行情里每条选项的 key → 概率。没有选项就返回 null（不建立空基准） */
function pricesOf(quote: EventQuote | null | undefined): Record<string, number> | null {
  if (!quote?.options.length) return null
  const prices: Record<string, number> = {}
  quote.options.forEach((option) => {
    prices[option.key] = option.price
  })
  return prices
}

/**
 * 从事件自己带的 markets 现算一份行情。
 * 批量收藏时接口返回的事件就带着 markets，不用再多打一次请求。
 */
function quoteFromEvent(event: EventLike): EventQuote | null {
  const markets = (event as MarketEvent).markets
  if (!markets?.length) return null
  try {
    return buildEventQuote(event as MarketEvent)
  } catch {
    // 行情结构变了不该让「收藏」这个动作失败
    return null
  }
}

/**
 * 决定这条记录该带什么基准：
 *  - 只有收藏需要基准，隐藏不需要；
 *  - **已经有基准的绝不被覆盖** ——「较收藏时」里的「收藏时」就是收藏那一刻，
 *    之后再点收藏、改备注都不该把基准往后挪，否则数字会莫名其妙归零；
 *  - 收藏时行情还没到（刚粘贴链接、接口慢）就先不建，等行情回来由
 *    ensureBaselines 补上。
 */
function nextBaseline(
  status: EventStatus,
  timestamp: number,
  existing: StoredEvent | undefined,
  quote: EventQuote | null | undefined,
): EventBaseline | undefined {
  if (status !== 'favorite') return existing?.baseline
  if (existing?.baseline) return existing.baseline
  const prices = pricesOf(quote)
  return prices ? { at: timestamp, prices } : undefined
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
    /** 收藏那一刻的行情，用来建立「较收藏时」的基准 */
    quote?: EventQuote | null,
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
      baseline: nextBaseline(status, timestamp, existing, quote),
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

      // 写库失败必须让人看见。界面走的是「先改内存、再写库」，不接这个钩子就完全静默：
      // 曾经因此出现「收藏 / 置顶 / 备注 / 隐藏」四个操作全部显示成功、刷新后全部回滚。
      // 节流 3 秒 —— 一次失败常被重试逻辑连着触发好几次，刷屏反而没人看。
      let lastNotifiedAt = 0
      setDbErrorReporter((message) => {
        const now = Date.now()
        if (now - lastNotifiedAt < 3000) return
        lastNotifiedAt = now
        ElMessage.error(message)
      })

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

  /**
   * 返回「有没有真的写进库」。界面上的状态是内存里的，写库失败照样显示成功，
   * 所以调用方需要提示用户的场景（比如粘贴链接保存）必须看这个返回值。
   */
  async function markEvent(
    event: EventLike,
    status: EventStatus,
    /** 收藏那一刻的行情。传了才能建立「较收藏时」的基准 */
    quote?: EventQuote | null,
  ): Promise<boolean> {
    await init()
    // 单条收藏默认置顶：刚收藏的立刻出现在最上面
    const record = buildRecord(event, status, Date.now(), true, quote)
    upsertLocal(record)
    return putEvent(record)
  }

  /**
   * 批量标记，写入合并成单个事务。
   * quotes 按 slug 传进来（调用方手上就有）；缺的那条等行情回来由 ensureBaselines 补。
   *
   * 和 markEvent 一样返回「有没有真的写进库」——批量收藏的提示文案也要看它。
   */
  async function markMany(
    events: EventLike[],
    status: EventStatus,
    quotes?: Map<string, EventQuote>,
  ): Promise<boolean> {
    if (!events.length) return true
    await init()
    const timestamp = Date.now()
    const records = events.map((event) =>
      buildRecord(event, status, timestamp, false, quotes?.get(event.slug)),
    )

    const bySlug = new Map(managed.value.map((item) => [item.slug, item]))
    records.forEach((record) => bySlug.set(record.slug, record))
    managed.value = sortManaged([...bySlug.values()])

    return putEvents(records)
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

  /**
   * 给「还没有基准」的收藏补一个基准，基准时间就是现在。
   *
   * 会走到这里的有两种：这个功能上线之前收藏的老记录，以及收藏那一刻行情还没拉到的。
   * 幂等 —— 已经有基准的一律不动，所以可以在行情每次更新后放心反复调用。
   * 不碰 statusChangedAt，所以不会让卡片顺序跳动。
   */
  async function ensureBaselines(
    items: { slug: string; quote: EventQuote | null }[],
  ) {
    if (!items.length) return
    await init()
    const timestamp = Date.now()
    const bySlug = new Map(managed.value.map((item) => [item.slug, item]))
    const updated: StoredEvent[] = []

    items.forEach(({ slug, quote }) => {
      const target = bySlug.get(slug)
      if (!target || target.status !== 'favorite' || target.baseline) return
      const prices = pricesOf(quote)
      if (!prices) return
      const next: StoredEvent = {
        ...target,
        baseline: { at: timestamp, prices },
        updatedAt: timestamp,
      }
      bySlug.set(slug, next)
      updated.push(next)
    })

    if (!updated.length) return
    managed.value = sortManaged([...bySlug.values()])
    await putEvents(updated)
  }

  /** 粘贴链接或 slug 直接收藏 */
  async function addBySlugOrUrl(
    input: string,
  ): Promise<{ ok: boolean; title?: string; message?: string }> {
    const slug = extractSlug(input)
    if (!slug) return { ok: false, message: '请输入事件链接或 slug' }

    const event = await fetchPolymarketEvent(slug)
    if (!event) return { ok: false, message: `没有找到 slug 为「${slug}」的事件` }

    // 刚查回来的事件就带着 markets，顺手把基准建上，不用等界面再拉一次行情
    const saved = await markEvent(event, 'favorite', quoteFromEvent(event))
    if (!saved) {
      // 不能报「已收藏」——内存里是加上了，但刷新就没了，等于骗用户。
      // 故意不带 message：写库失败已经由数据层统一弹过一条了，这里再给一条会连出两个 toast。
      return { ok: false }
    }
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

    // 基准：只有「刚查回来的」那些能现算；从库里翻出来的（原本是隐藏）没有 markets，
    // 等界面拉到行情后由 ensureBaselines 补。
    const quotes = new Map<string, EventQuote>()
    fetched.forEach((event) => {
      const quote = quoteFromEvent(event)
      if (quote) quotes.set(event.slug, quote)
    })

    const records: EventLike[] = [...fromLibrary, ...fetched]
    let writeFailed = false
    if (records.length) {
      writeFailed = !(await markMany(records, 'favorite', quotes))
    }

    return {
      added: records.length,
      notFound,
      alreadyFavorite,
      duplicated,
      invalid,
      writeFailed,
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
    ensureBaselines,
    addBySlugOrUrl,
    addManyBySlugs,
  }
}
