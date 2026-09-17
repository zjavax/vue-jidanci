/**
 * 钱包层：链上现金 + 持仓总价值。
 *
 * 现金**不在 data-api 里** —— `/cash`、`/balance`、`/portfolio` 实测全是 404。
 * 只能读 Polygon 上 proxy 钱包的 ERC-20 余额。
 */

const DATA_API = 'https://data-api.polymarket.com'

/**
 * Polymarket 的现金以这两种 6 位小数的稳定币持有在 proxy 钱包里，两个都查再相加：
 * - pUSD：2026-04 交易所升级后的抵押品（当前现金主要在这里）
 * - USDC.e：旧版抵押品 / 在途资金
 */
const CASH_TOKENS = [
  '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB', // pUSD
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC.e
]

/** 免 key 且 CORS 开放的 Polygon 公共节点。按顺序试，失败换下一个。 */
const RPCS = [
  'https://polygon.drpc.org',
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.gateway.tenderly.co',
  'https://polygon.api.onfinality.io/public',
]

/** `balanceOf(address)` 的函数选择器 */
const BALANCE_OF = '0x70a08231'
const TOKEN_DECIMALS = 6

/** 一次 eth_call，多个 RPC 依次兜底；全失败才抛错 */
async function ethCall(to: string, data: string): Promise<string> {
  let lastError: unknown
  for (const rpc of RPCS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to, data }, 'latest'],
        }),
      })
      if (!res.ok) throw new Error(`http ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || 'rpc error')
      if (typeof json.result !== 'string' || !json.result.startsWith('0x')) {
        throw new Error('bad result')
      }
      return json.result
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(
    `所有 Polygon RPC 均失败：${lastError instanceof Error ? lastError.message : lastError}`
  )
}

/**
 * 读钱包里的可用现金（pUSD + USDC.e）。
 *
 * 任一币种读失败就返回 `null` 而不是 0 —— **读不到和余额为 0 是两回事**，
 * 不能拿 0 冒充。
 */
export async function fetchCash(address: string): Promise<number | null> {
  const data =
    BALANCE_OF + address.toLowerCase().replace(/^0x/, '').padStart(64, '0')
  try {
    const balances = await Promise.all(
      CASH_TOKENS.map((token) =>
        ethCall(token, data).then((hex) => Number(BigInt(hex)) / 10 ** TOKEN_DECIMALS)
      )
    )
    return balances.reduce((sum, b) => sum + b, 0)
  } catch (error) {
    console.warn('[polymarket-wallet] 读取现金失败:', error)
    return null
  }
}

/**
 * 持仓总价值（Polymarket 口径的 Portfolio 持仓部分）。
 *
 * 走官方 `/value` 而不是自己把持仓的 `currentValue` 加起来：
 * `/value` 不受 `limit` 截断影响。实测两者当前完全相等。
 */
export async function fetchPortfolioValue(address: string): Promise<number | null> {
  try {
    const res = await fetch(`${DATA_API}/value?user=${address}`)
    if (!res.ok) return null
    const rows = await res.json()
    const value = Array.isArray(rows) ? rows[0]?.value : undefined
    return typeof value === 'number' ? value : null
  } catch (error) {
    console.warn('[polymarket-wallet] 读取持仓总价值失败:', error)
    return null
  }
}

/** 一个账号的钱包概况。`undefined` = 加载中，`null` = 取不到。 */
export interface AccountWallet {
  cash: number | null | undefined
  portfolio: number | null | undefined
}

export const EMPTY_WALLET: AccountWallet = {
  cash: undefined,
  portfolio: undefined,
}

export async function fetchAccountWallet(address: string): Promise<AccountWallet> {
  const [cash, portfolio] = await Promise.all([
    fetchCash(address),
    fetchPortfolioValue(address),
  ])
  return { cash, portfolio }
}
