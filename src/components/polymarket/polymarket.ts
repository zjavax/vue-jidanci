interface MarketEvent {
  id: string
  slug: string
  title: string
}

interface ApiResponse {
  events: MarketEvent[]
}

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
