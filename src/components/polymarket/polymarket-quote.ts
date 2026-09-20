/**
 * 把 gamma-api 的原始事件，规范化成「收藏卡片能直接渲染」的行情结构。
 *
 * 这份逻辑对齐参考报表（polymarket/fetch.js 的 marketToRows），刻意保持一致：
 *   - 二元市场（outcomes 长度 2）只看「是」这一侧，否则同一个问题会出现两行反向数据；
 *   - 盘口有效（双边报价、bid < ask、不是 0/1 空盘）时用买卖中价，否则退回平台显示价；
 *   - 「空盘 + 24h 零成交 + 未闭市」的行是占位市场，直接丢掉（报表里叫 isNoise）。
 * 差别只有一处：报表的「变动」是跟上一份快照比，浏览器里没有快照，
 * 改用接口自带的 oneDayPriceChange（24h 变动），所以列名是「24h变动」。
 */

import {
  fetchPolymarketEventsBySlugs,
  type MarketEvent,
  type PolymarketMarket,
} from './polymarket'

export interface QuoteOption {
  /** 事件slug#市场id#选项下标，稳定唯一 */
  key: string
  /** 行标题：分组名优先，其次二元市场用「是/否」，多元市场用选项名 */
  label: string
  /** 行副标题（完整问题）。和 label 重复时为空串，不渲染 */
  subLabel: string
  /** 当前概率，0~1 */
  price: number
  /** 24h 变动，单位百分点（pp）；接口没给就是 null */
  change24h: number | null
  /** 该选项 24h 成交额（美元） */
  volume24h: number
  /** 该选项是否已闭市 */
  closed: boolean
}

export interface EventQuote {
  slug: string
  title: string
  image: string
  /** ISO 字符串，可能为空 */
  endDate: string
  /** 事件累计成交额 */
  volume: number
  volume24h: number
  liquidity: number
  commentCount: number
  /** 标签名，最多取前若干个 */
  tags: string[]
  /** 事件是否已闭市 */
  closed: boolean
  options: QuoteOption[]
  /** 拉取时间戳 */
  fetchedAt: number
}

const MAX_TAGS = 3

function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

/** bestBid / bestAsk 二元市场是数字、多元市场是数组，统一对齐到 outcomes 下标 */
function alignNumbers(
  value: number | number[] | null | undefined,
  size: number,
): (number | null)[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const n = Number(item)
      return Number.isFinite(n) ? n : null
    })
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const list: (number | null)[] = new Array(size).fill(null)
    list[0] = value
    return list
  }
  return new Array(size).fill(null)
}

const GENERIC_LABELS = ['是', '否', 'yes', 'no', 'true', 'false']

function buildOptions(
  market: PolymarketMarket,
  slug: string,
  marketIndex: number,
): QuoteOption[] {
  const outcomes = parseArray(market.outcomes)
  const prices = parseArray(market.outcomePrices).map(Number)
  const size = outcomes.length
  if (!size) return []

  const bids = alignNumbers(market.bestBid, size)
  const asks = alignNumbers(market.bestAsk, size)
  const isBinary = size === 2
  const change = Number(market.oneDayPriceChange)
  const volume24h = Number(market.volume24hr ?? 0) || 0
  const closed = market.closed === true

  const options: QuoteOption[] = []

  for (let i = 0; i < size; i++) {
    if (isBinary && i > 0) continue // 二元市场只看「是」

    const bid = bids[i]
    const ask = asks[i]
    const raw = Number.isFinite(prices[i]) ? prices[i] : 0
    const mid = bid != null && ask != null ? (bid + ask) / 2 : raw
    // 有效盘口：双边报价都在、bid < ask、不是 0/1 空盘
    const bookActive =
      bid != null && ask != null && bid < ask && !(bid === 0 && ask === 1)
    // 空盘 + 零成交 + 未闭市 = 占位市场，丢掉
    if (!bookActive && volume24h === 0 && !closed) continue

    const label = market.groupItemTitle || outcomes[i] || `选项${i + 1}`
    const question = market.question || ''
    const normalized = label.toLowerCase()
    const generic = GENERIC_LABELS.includes(normalized)
    const subLabel =
      question && (generic ? question !== label : !question.includes(label))
        ? question
        : ''

    options.push({
      key: `${slug}#${market.id ?? marketIndex}#${i}`,
      label,
      subLabel,
      price: Number((bookActive ? mid : raw).toFixed(4)),
      change24h: Number.isFinite(change)
        ? Number((change * 100).toFixed(1))
        : null,
      volume24h,
      closed,
    })
  }

  return options
}

/** 原始事件 → 行情结构。字段缺失一律降级成 0 / 空串，不抛错。 */
export function buildEventQuote(event: MarketEvent): EventQuote {
  const slug = String(event.slug ?? '')
  const options = (event.markets ?? [])
    .flatMap((market, index) => buildOptions(market, slug, index))
    // 概率高的排前面，已闭市的沉底
    .sort((a, b) => Number(a.closed) - Number(b.closed) || b.price - a.price)

  return {
    slug,
    title: String(event.title ?? slug),
    image: String(event.image ?? event.icon ?? ''),
    endDate: String(event.endDate ?? ''),
    volume: Number(event.volume ?? 0) || 0,
    volume24h: Number(event.volume24hr ?? 0) || 0,
    liquidity: Number(event.liquidity ?? 0) || 0,
    commentCount: Number(event.commentCount ?? 0) || 0,
    tags: (event.tags ?? [])
      .map((tag) => tag?.label)
      .filter((label): label is string => Boolean(label))
      .slice(0, MAX_TAGS),
    closed: event.closed === true,
    options,
    fetchedAt: Date.now(),
  }
}

/**
 * 按「事件对象」缓存行情，同一个对象永远返回同一个 EventQuote 引用。
 *
 * 为什么必须有这个：
 * 活跃列表的 `activeCards` 每次重算都会对**每条**事件调一次 buildEventQuote，
 * 而它每次都返回**新对象**。引用一变，Vue 就认为 EventQuotePanel 的 props 变了，
 * 于是 100 张卡片的子组件全部重渲染 —— 每个组件要跑 4 个 computed + 整段模板。
 *
 * 实测（100 条活跃事件，点一次「隐藏」）：
 *   不缓存 → 69ms longtask，但 DOM 只变了 4 个节点
 *            （重渲染后值一模一样，所以没有 DOM 操作 —— 时间全花在白算上）
 *   缓存后 → longtask 消失
 *
 * 用 WeakMap 按事件对象本身做 key：`events.value` 只在「刷新数据」时整体替换，
 * 期间对象引用稳定，所以命中率极高；事件被换掉后条目自动回收，不会泄漏。
 */
const quoteCache = new WeakMap<MarketEvent, EventQuote>()

export function buildEventQuoteCached(event: MarketEvent): EventQuote {
  const cached = quoteCache.get(event)
  if (cached) return cached
  const quote = buildEventQuote(event)
  quoteCache.set(event, quote)
  return quote
}

export interface FetchQuotesResult {
  quotes: EventQuote[]
  /** 接口没返回的 slug */
  missing: string[]
}

/** 批量取行情。一次请求（超过 50 个 slug 内部会分块）。 */
export async function fetchEventQuotes(
  slugs: string[],
): Promise<FetchQuotesResult> {
  const unique = [...new Set(slugs.filter(Boolean))]
  if (!unique.length) return { quotes: [], missing: [] }

  const events = await fetchPolymarketEventsBySlugs(unique)
  const quotes = events.map(buildEventQuote)
  const got = new Set(quotes.map((quote) => quote.slug))

  return { quotes, missing: unique.filter((slug) => !got.has(slug)) }
}

// ===== 展示用格式化 =====

/** 12345678 → 12.3M */
export function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—'
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`
  return value.toFixed(0)
}

/** 0.7234 → 72.3% */
export function formatPercent(price: number): string {
  if (!Number.isFinite(price)) return '—'
  return `${(price * 100).toFixed(1)}%`
}

/** 概率条的宽度百分比 */
export function probabilityWidth(price: number): string {
  const pct = Math.min(Math.max(price * 100, 0), 100)
  return `${pct.toFixed(1)}%`
}

/** ISO 时间 → 2026-09-16；解析不出来就返回原串 */
export function formatDate(iso: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 距离截止还有几天，已经过了返回 null */
export function daysUntil(iso: string, now = Date.now()): number | null {
  if (!iso) return null
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return null
  return Math.ceil((target - now) / 86400000)
}

/** 时间戳 → 13:52 */
export function formatClock(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
