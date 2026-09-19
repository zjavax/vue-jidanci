/**
 * Hyperliquid 盘前合约报价（io:ANTH）。
 *
 * 参考实现：`D:\zhangxiang\WorkBuddy\2026-09-08-15-10-07\polymarket\fetch.js`
 * 里的 `fetchHlAnth()`，本文件按同一口径移植：
 *   POST https://api.hyperliquid.xyz/info
 *   body { type: 'metaAndAssetCtxs', dex: 'io' }
 *   → [meta, assetCtxs]，`meta.universe[i].name === 'io:ANTH'`，行情在 `assetCtxs[i]`
 *
 * 实测（2026-09-19）：200 / ~150ms / **CORS 放行**（浏览器可直连，无需代理）。
 * `io` 这个 dex 下共 10 个标的：OAI / ANTH / SNDK / IONQ / NBIS / EWY / GPRO / SBE / TCNT / DRAM。
 *
 * ⚠️ 接口返回的数字**全是字符串**（`markPx: "2159.0"`），必须显式 Number() 转换。
 */

const INFO_URL = "https://api.hyperliquid.xyz/info";
const DEX = "io";
const SYMBOL = "io:ANTH";

export interface HlQuote {
  symbol: string;
  /** 标记价 markPx */
  mark: number;
  /** 前一日价 prevDayPx，用于算涨跌幅 */
  prevDay: number;
  /** 相对昨日的涨跌幅，百分数值（0.17 = +0.17%） */
  changePct: number;
  /** 预言机价 oraclePx */
  oracle: number;
  /**
   * 隐含估值（**万亿**美元）。口径沿用参考实现：`markPx / 1000`，
   * 即 1 单位合约 ≈ $10 亿市值。
   */
  valTrillion: number;
  /** 24h 名义成交额（美元） */
  dayNtlVlm: number;
}

interface HlMeta {
  universe?: { name?: string }[];
}

interface HlCtx {
  markPx?: string;
  prevDayPx?: string;
  oraclePx?: string;
  dayNtlVlm?: string;
}

/** 返回 null 表示取不到（区别于「取到了但为空」）。 */
export async function fetchHlQuote(): Promise<HlQuote | null> {
  try {
    const res = await fetch(INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs", dex: DEX }),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = (await res.json()) as [HlMeta?, HlCtx[]?];
    const meta = json?.[0];
    const ctxs = json?.[1];
    if (!meta || !Array.isArray(ctxs)) return null;

    const index = (meta.universe ?? []).findIndex((u) => u?.name === SYMBOL);
    if (index < 0) return null;
    const ctx = ctxs[index];
    if (!ctx) return null;

    const mark = Number(ctx.markPx);
    if (!Number.isFinite(mark) || mark <= 0) return null;
    const prevDay = Number(ctx.prevDayPx);

    return {
      symbol: SYMBOL,
      mark,
      prevDay: Number.isFinite(prevDay) ? prevDay : 0,
      changePct: Number.isFinite(prevDay) && prevDay > 0 ? ((mark - prevDay) / prevDay) * 100 : 0,
      oracle: Number(ctx.oraclePx) || 0,
      valTrillion: mark / 1000,
      dayNtlVlm: Number(ctx.dayNtlVlm) || 0,
    };
  } catch {
    return null;
  }
}

/** 标记价：2159.0 → `2,159.0`（保留 1 位小数，合约报价习惯） */
export const formatHlPrice = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};
