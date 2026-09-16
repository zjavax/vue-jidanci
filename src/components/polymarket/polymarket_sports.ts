// 事件的字段形状和 polymarket.ts 完全一致（同一个 gamma-api），
// 所以直接复用那份类型，别在这儿再抄一份窄的 —— 抄窄了就拿不到
// markets / volume24hr / tags，卡片也就渲染不出行情。
import type { MarketEvent } from './polymarket'

export type { MarketEvent }

interface ApiResponse {
  events: MarketEvent[]
}

// 根据 volume24hr 取前100个数据， 总的
export async function fetchPolymarketEvents(
  tagSlug = 'politics',
): Promise<MarketEvent[]> {
  try {
    const response = await fetch(
      `https://gamma-api.polymarket.com/events/keyset?limit=50&tag_slug=${tagSlug}&closed=false&order=volume24hr&ascending=false&locale=zh`,
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
