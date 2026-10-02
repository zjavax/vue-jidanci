/**
 * 加密货币市值前 N —— 数据源：CoinPaprika（主）+ CoinLore（备）。
 *
 * ⚠️ 2026-09-29 起 **CoinGecko 已不可用**，别再换回去：
 *    `GET api.coingecko.com/api/v3/coins/markets?...` 对未鉴权请求返回 **403 Forbidden**，
 *    且响应**不带 `Access-Control-Allow-Origin`** → 浏览器直接拦成 `TypeError: Failed to fetch`。
 *    线上站（vercel）控制台原文：`... blocked by CORS policy: No 'Access-Control-Allow-Origin'
 *    header is present ... net::ERR_FAILED 403 (Forbidden)`。
 *    注意 `/api/v3/ping` 仍是 200 —— 所以「域名能通」不代表数据端点能用，别拿 ping 当判据。
 *
 * 实测过的候选（2026-09-29，均在浏览器里真实 fetch，同一个 origin）：
 *   - ✅ CoinPaprika `/v1/tickers?limit=20` → 200 / ~716ms。**本文件主源**。
 *     字段最规整：`rank`、`symbol`、`name`、`quotes.USD.price`、`quotes.USD.market_cap`、
 *     `quotes.USD.percent_change_24h`，**全是数字**，详情页 `/coin/<id>/`。
 *   - ✅ CoinLore `/api/tickers/?limit=20` → 200 / ~1053ms。**备源**。
 *     字段是**字符串**（要 Number()），详情页用 `nameid` 而非 `id`。
 *   - ✅ Binance / Coinbase / OKX → 200，但**没有市值排名**，不适合「市值前 20」。
 *   - ❌ CoinGecko（403 + 无 CORS 头）、CryptoCompare、CoinCap v3 → 全部 `Failed to fetch`。
 */

import { formatMarketCap } from "./us-stocks";

const PAPRIKA_URL = "https://api.coinpaprika.com/v1/tickers";
const COINLORE_URL = "https://api.coinlore.net/api/tickers/";

/** 不参与「市值前二十」展示的币种（10-02 竹子指定）：
 *  稳定币（USDT / USDC / USDS）和包装代币（WBTC / WETH / STETH / WSTETH / CBBTC / WEETH）——
 *  它们只是 BTC / ETH / 美元的影子，不算独立标的，占掉前十里大半的坑位。 */
const EXCLUDED_SYMBOLS = new Set([
  "USDT",
  "USDC",
  "USDS",
  "WBTC",
  "WETH",
  "STETH",
  "WSTETH",
  "CBBTC",
  "WEETH",
]);

export interface CryptoCoin {
  /** 数据源内部的币种 id，只用于 `v-for` 的 key */
  id: string;
  /** 大写代码，如 `BTC` */
  symbol: string;
  name: string;
  /** 当前价格（美元） */
  price: number;
  /** 总市值（美元） */
  marketCap: number;
  /** 市值排名 */
  rank: number;
  /** 24h 涨跌幅，百分数值（1.12 = +1.12%） */
  changePct: number;
  /** 币种详情页。**两个数据源的链接格式不同，所以由数据层直接给出完整 URL**，
   *  模板不要自己拼 —— 否则换源就得改模板。 */
  url: string;
}

interface PaprikaRow {
  id?: string;
  name?: string;
  symbol?: string;
  rank?: number;
  quotes?: {
    USD?: {
      price?: number;
      market_cap?: number;
      percent_change_24h?: number;
    };
  };
}

interface CoinLoreRow {
  id?: string;
  nameid?: string;
  symbol?: string;
  name?: string;
  rank?: number;
  price_usd?: string;
  market_cap_usd?: string;
  percent_change_24h?: string;
}

/** CoinPaprika：主源。 */
async function fetchFromPaprika(limit: number): Promise<CryptoCoin[] | null> {
  const res = await fetch(`${PAPRIKA_URL}?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) return null;

  const json = (await res.json()) as PaprikaRow[];
  if (!Array.isArray(json)) return null;

  return json
    .map((row, index) => {
      const usd = row.quotes?.USD ?? {};
      return {
        id: String(row.id ?? ""),
        symbol: String(row.symbol ?? "").toUpperCase(),
        name: String(row.name ?? ""),
        price: Number(usd.price) || 0,
        marketCap: Number(usd.market_cap) || 0,
        rank: Number(row.rank) || index + 1,
        changePct: Number(usd.percent_change_24h) || 0,
        url: `https://coinpaprika.com/coin/${row.id}/`,
      };
    })
    .filter((coin) => coin.symbol && coin.price > 0);
}

/** CoinLore：备源。⚠️ 所有数值都是字符串，必须显式 Number()。 */
async function fetchFromCoinLore(limit: number): Promise<CryptoCoin[] | null> {
  const res = await fetch(`${COINLORE_URL}?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) return null;

  const json = (await res.json()) as { data?: CoinLoreRow[] };
  const rows = json?.data;
  if (!Array.isArray(rows)) return null;

  return rows
    .map((row, index) => ({
      id: String(row.id ?? row.nameid ?? ""),
      symbol: String(row.symbol ?? "").toUpperCase(),
      name: String(row.name ?? ""),
      price: Number(row.price_usd) || 0,
      marketCap: Number(row.market_cap_usd) || 0,
      rank: Number(row.rank) || index + 1,
      changePct: Number(row.percent_change_24h) || 0,
      // ⚠️ 用 nameid（`bitcoin`）不是 id（`90`）—— 后者拼不出能打开的页面
      url: `https://www.coinlore.com/coin/${row.nameid ?? ""}`,
    }))
    .filter((coin) => coin.symbol && coin.price > 0);
}

/**
 * 取加密货币市值前 `limit` 名。
 *
 * 多抓 `EXCLUDED_SYMBOLS.size` 条再过滤，
 * 这样剔除稳定币 / 包装代币后表格仍是满的 20 行。
 * `rank` 保留数据源的**全局排名**（剔除后不连续，但更真实）。
 *
 * 主源失败（抛错 / 非 2xx / 空结果）自动降级到备源 —— 免费公开 API 随时可能改策略，
 * 单个源挂掉不该让整个面板变「数据获取失败」。
 * 两个都拿不到才返回 `null`（区别于「取到了但为空」）。
 */
export async function fetchTopCryptos(limit = 20): Promise<CryptoCoin[] | null> {
  const fetchLimit = limit + EXCLUDED_SYMBOLS.size;
  for (const source of [fetchFromPaprika, fetchFromCoinLore]) {
    try {
      const list = await source(fetchLimit);
      const kept = (list ?? []).filter((coin) => !EXCLUDED_SYMBOLS.has(coin.symbol));
      if (kept.length > 0) return kept.slice(0, limit);
    } catch {
      // 网络 / CORS / 解析失败 → 换下一个源，不抛出打断页面其它数据
    }
  }
  return null;
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
