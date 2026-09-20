/**
 * gamma-api /events 返回的市场（一个事件下的一个选项组）。
 * 字段名照抄接口，故用 snake→camel 之外的原始写法：outcomes / outcomePrices 都是
 * **JSON 字符串**（如 '["是","否"]'），不是数组，用前必须 parse。
 */
export interface PolymarketMarket {
  id: string
  /** 完整问题，如「美联储会在2026年9月会议后下调利率50个基点以上吗？」 */
  question?: string
  /** 分组名，如「下调50个基点以上」；negRisk 多元事件里比 question 更适合当行标题 */
  groupItemTitle?: string
  /** JSON 字符串数组 */
  outcomes?: string
  /** JSON 字符串数组，与 outcomes 下标对齐 */
  outcomePrices?: string
  /** 二元市场是数字，多元市场是数组 */
  bestBid?: number | number[] | null
  bestAsk?: number | number[] | null
  volume24hr?: number
  /** 24h 价格变动，单位是「价格」不是百分点（0.05 = 5pp） */
  oneDayPriceChange?: number
  oneWeekPriceChange?: number
  spread?: number
  closed?: boolean
  acceptingOrders?: boolean
  endDate?: string
}

export interface PolymarketTag {
  id?: string
  label: string
  slug?: string
}

export interface MarketEvent {
  id: string
  slug: string
  title: string
  /** 历史遗留字段，接口里并不存在，保留只为兼容旧调用方 */
  updateStatus?: string

  // ===== 以下都是 /events 接口实际会返回、但列表接口未必用到的字段 =====
  image?: string
  icon?: string
  endDate?: string
  volume?: number
  volume24hr?: number
  liquidity?: number
  commentCount?: number
  closed?: boolean
  active?: boolean
  tags?: PolymarketTag[]
  /** 选项组。收藏卡片要展示「选项 / 概率 / 24h量」全靠它 */
  markets?: PolymarketMarket[]
}

interface ApiResponse {
  events: MarketEvent[]
}

// 根据 volume24hr 取前100个数据， 总的
export async function fetchPolymarketEvents(): Promise<MarketEvent[]> {
  try {
    const response = await fetch(
      'https://gamma-api.polymarket.com/events/keyset?limit=100&closed=false&order=volume24hr&ascending=false&locale=zh&locale=zh',
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: ApiResponse = await response.json()
    return data.events
  } catch (error) {
    console.error('Error fetching data:', error)
    return []
  }
}

export async function fetchPolymarketEvent(
  slug: string,
): Promise<MarketEvent | null> {
  try {
    const response = await fetch(
      'https://gamma-api.polymarket.com/events?locale=zh&locale=zh&slug=' +
        slug,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data[0]
  } catch (error) {
    console.error('Error fetching data:', error)
    return null
  }
}

/** 一次请求最多拼多少个 slug，避免 URL 过长被网关截断 */
const SLUG_CHUNK_SIZE = 50

async function fetchEventChunk(slugs: string[]): Promise<MarketEvent[]> {
  try {
    // gamma-api 支持重复的 slug 参数（?slug=a&slug=b），但不支持逗号分隔
    // （实测 `slug=a,b` 返回 0 条），所以这里拼重复参数。
    //
    // ⚠️ limit 必须显式传，不能靠默认值：/events 默认 limit=20，
    // 传 30 个 slug 也只回 20 条（实测 21→20、40→20、50→20；加 limit=50 才回 50）。
    // 漏传的后果是收藏超过 20 个以后，多出来的卡片**静默**没有行情 ——
    // 标题照常显示（那是本地库里的），选项和概率一片空白，连报错都没有。
    const params = new URLSearchParams({
      locale: 'zh',
      limit: String(slugs.length),
    })
    slugs.forEach((slug) => params.append('slug', slug))

    const response = await fetch(
      `https://gamma-api.polymarket.com/events?${params.toString()}`,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching data:', error)
    return []
  }
}

/**
 * 批量按 slug 取事件。批量收藏用它，避免 N 个 slug 打 N 个请求。
 * 返回结果里查不到的 slug 需要调用方自己比对差集。
 *
 * 注意：返回值里带着完整的 markets / volume24hr / endDate，
 * 收藏卡片的行情明细就是从这些字段里来的。
 */
export async function fetchPolymarketEventsBySlugs(
  slugs: string[],
): Promise<MarketEvent[]> {
  const unique = [...new Set(slugs.filter(Boolean))]
  if (!unique.length) return []

  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += SLUG_CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + SLUG_CHUNK_SIZE))
  }

  const pages = await Promise.all(chunks.map(fetchEventChunk))
  return pages.flat()
}
