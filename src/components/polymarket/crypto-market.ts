/**
 * 加密货币市值前 N —— 数据源：CoinGecko 公开 API（免 key、CORS 放行）。
 *
 * 实测对比过的候选（2026-09-17，均在浏览器里真实 fetch）：
 *   - CoinGecko `/coins/markets` → 200 ✓ 本文件采用。直接按市值排序、自带 `market_cap_rank`，
 *     一个请求拿全 20 条，字段最规整。
 *   - CoinLore `/api/tickers` → 200 可用，字段是字符串且量级粗糙，作备选。
 *   - Binance `/api/v3/ticker/24hr` → 200 可用，但只有交易对报价、**没有市值排名**，
 *     要自己维护币种清单，不适合「前 20」这种需求。
 *   - CoinCap `/v2/assets` → CORS 拦（Failed to fetch）。
 *   - TradingView crypto scanner → 返回 `{"totalCount":0}`，crypto 市场不能用同一套参数。
 *
 * ⚠️ CoinGecko 免费额度有速率限制（按 IP 算，量级 10~30 次/分钟）。
 * 页面只在挂载时请求一次，不轮询，不会触发限流。
 */

import { formatMarketCap } from "./us-stocks";

const MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets";

export interface CryptoCoin {
  /** CoinGecko 的币种 id，如 `bitcoin`，用于拼详情页链接 */
  id: string;
  /** 大写代码，如 `BTC` */
  symbol: string;
  name: string;
  /** 当前价格（美元） */
  price: number;
  /** 总市值（美元） */
  marketCap: number;
  /** 市值排名（CoinGecko 官方排名） */
  rank: number;
  /** 24h 涨跌幅，百分数值（1.12 = +1.12%） */
  changePct: number;
}

interface CoinGeckoRow {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
  price_change_percentage_24h?: number;
}

/**
 * 取加密货币市值前 `limit` 名。
 * 失败返回 `null`（区别于「取到了但为空」），调用方据此区分「取不到」和「没有数据」。
 */
export async function fetchTopCryptos(limit = 20): Promise<CryptoCoin[] | null> {
  try {
    const url =
      `${MARKETS_URL}?vs_currency=usd&order=market_cap_desc` +
      `&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const json = (await res.json()) as CoinGeckoRow[];
    if (!Array.isArray(json)) return null;

    return json
      .map((row, index) => ({
        id: String(row.id ?? ""),
        symbol: String(row.symbol ?? "").toUpperCase(),
        name: String(row.name ?? ""),
        price: Number(row.current_price) || 0,
        marketCap: Number(row.market_cap) || 0,
        rank: Number(row.market_cap_rank) || index + 1,
        changePct: Number(row.price_change_percentage_24h) || 0,
      }))
      .filter((coin) => coin.symbol && coin.price > 0);
  } catch {
    // 网络 / CORS / 解析失败一律当作「取不到」，不抛出打断页面其它数据。
    return null;
  }
}

/**
 * 加密货币价格：量级跨度极大（BTC 七万、SHIB 十万分之一），按量级切换小数位。
 * 固定 2 位小数会把 SHIB 显示成 `$0.00`。
 */
export const formatCryptoPrice = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toExponential(2)}`;
};

export { formatMarketCap };
