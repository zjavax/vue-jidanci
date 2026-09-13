export interface MarketEvent {
  id: string
  slug: string
  title: string
  updateStatus: string
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
    const params = new URLSearchParams({ locale: 'zh' })
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
