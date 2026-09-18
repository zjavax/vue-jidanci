/**
 * 美股市值前十 —— 数据源：TradingView 公开 scanner。
 *
 * 为什么是它：这是唯一「免 key + CORS 放行 + 支持按市值排序」的接口。
 * 实测排除掉的候选（2026-09-17，均在浏览器里真实 fetch）：
 *   - Yahoo query1/query2、Nasdaq api、EODHD、StockTwits、Tiingo → CORS 拦（Failed to fetch）
 *   - FMP、AlphaVantage、Finnhub → demo key 全部 401，要真实 key
 *   - stockanalysis.com → 只开放 /api/quotes/s/<TICKER>（有价格、**没有市值**），
 *     /api/screener/* 全 404，/stocks/xxx/__data.json 被 CORS 拦
 *
 * 如果以后换成 Finnhub：免费版没有「市值排名」端点，只能拿一份固定的 ticker 列表
 * 逐个打 /quote + /stock/profile2（10 只 = 20 次请求，60 次/分钟额度够用），
 * 好处是数据更权威，代价是需要注册 key。届时只需替换本文件的 fetchTopUsStocks。
 */

const SCANNER_URL = "https://scanner.tradingview.com/america/scan";

/**
 * 多取一些再按市值去重：同一公司可能有多个股份类别，市值字段完全相同。
 * 实测 Alphabet 会同时返回 GOOGL / GOOG / GOOGM / GOOGN 四条（都是 4.17T），
 * BRK.A / BRK.B 同理。取 30 条足够去重后剩 10 家。
 */
const FETCH_COUNT = 30;

const COLUMNS = [
  "name",
  "description",
  "close",
  "change",
  "market_cap_basic",
  "currency",
  "volume",
];

export interface UsStock {
  /** 带交易所前缀的完整符号，如 `NASDAQ:NVDA` */
  symbol: string;
  /** 纯代码，如 `NVDA` */
  ticker: string;
  /** 公司名 */
  name: string;
  /** 最新收盘价 */
  price: number;
  /** 涨跌幅，百分数值（0.32 = +0.32%） */
  changePct: number;
  /** 总市值（美元） */
  marketCap: number;
  currency: string;
}

/** 非普通股：存托凭证 / 优先股 / 权证，它们和正股共享市值，必须剔除否则前十会被同一家公司占满。 */
const NON_COMMON_RE = /\b(depositary|preferred|warrant|rights?)\b/i;

/** scanner 的一行：`s` 是完整符号，`d` 是按 COLUMNS 顺序排的值数组。 */
interface ScannerRow {
  s: string;
  d: unknown[];
}

const toNumber = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toString = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

/**
 * 取美股市值前 `limit` 名。
 * 失败返回 `null`（区别于「取到了但为空」），调用方据此区分「取不到」和「没有数据」。
 */
export async function fetchTopUsStocks(limit = 10): Promise<UsStock[] | null> {
  try {
    const res = await fetch(SCANNER_URL, {
      method: "POST",
      // ⚠️ 必须是 text/plain。用 application/json 会触发 CORS 预检（OPTIONS），
      // TradingView 的 scanner 不接受预检请求，会直接失败。
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        filter: [{ left: "market_cap_basic", operation: "greater", right: 0 }],
        options: { lang: "en" },
        markets: ["america"],
        symbols: { query: { types: [] }, tickers: [] },
        columns: COLUMNS,
        sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
        range: [0, FETCH_COUNT],
      }),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { data?: ScannerRow[] };
    if (!Array.isArray(json?.data)) return null;

    const rows = json.data.map((row) => {
      const d = row.d ?? [];
      return {
        symbol: toString(row.s),
        ticker: toString(d[0]),
        name: toString(d[1]),
        price: toNumber(d[2]),
        changePct: toNumber(d[3]),
        marketCap: toNumber(d[4]),
        currency: toString(d[5]),
        volume: toNumber(d[6]),
      };
    });

    // 去重：① 非普通股直接丢（存托凭证/优先股，它们和正股共享市值）；
    // ② 同一家公司只留一条 —— 用**公司名**做 key，留成交量最大的那个
    //    （GOOGL 成交量通常高于 GOOG）。
    // ⚠️ 不能拿「市值相等」当 key：2026-09-18 实测 GOOGL / GOOG 的 `market_cap_basic`
    //    已经变成两个**略有差异**的值（界面上都显示 4.21 万亿，但不全等），
    //    精确匹配会漏掉，结果前十里同时出现 GOOGL 和 GOOG。
    const byCompany = new Map<string, UsStock & { volume: number }>();
    for (const row of rows) {
      if (!row.ticker || !row.marketCap) continue;
      if (NON_COMMON_RE.test(row.name)) continue;
      const key = (row.name || row.ticker).trim().toLowerCase();
      const prev = byCompany.get(key);
      if (!prev || row.volume > prev.volume) byCompany.set(key, row);
    }

    return [...byCompany.values()]
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, limit)
      .map(({ volume: _volume, ...stock }) => stock);
  } catch {
    // 网络 / CORS / 解析失败一律当作「取不到」，不抛出打断页面其它数据。
    return null;
  }
}

/** 市值 → 中文量级：5.15 万亿 / 8902 亿。 */
export const formatMarketCap = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} 万亿`;
  if (value >= 1e8) return `${(value / 1e8).toFixed(0)} 亿`;
  if (value >= 1e4) return `${(value / 1e4).toFixed(0)} 万`;
  return value.toFixed(0);
};

/** 价格 → $332.41 */
export const formatPrice = (value: number): string =>
  Number.isFinite(value) ? `$${value.toFixed(2)}` : "—";
