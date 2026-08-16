export interface UserPosition {
  title: string
  outcome: string
  initialValue: number
  size: number
  avgPrice: number
  curPrice: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  slug: string
  eventSlug: string
}

export async function fetchUserPositions(): Promise<UserPosition[]> {
  try {
    const response = await fetch(
      'https://data-api.polymarket.com/positions?user=0xb976609df37a76d5213b414833d9cb9cbd395876&sortBy=CURRENT&sortDirection=DESC&sizeThreshold=.1&limit=30&offset=0&redeemable=false',
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: UserPosition[] = await response.json()

    // 转换数据格式
    return data
  } catch (error) {
    console.error('Error fetching user positions:', error)
    return []
  }
}
