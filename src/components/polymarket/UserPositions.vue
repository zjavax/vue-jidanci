<template>
  <div class="positions-page">
    <div class="positions-container">
      <div class="page-topbar">
        <a
          class="status-link"
          href="https://status.polymarket.com/"
          target="_blank"
          rel="noopener"
          >pm当前状态</a
        >
      </div>
      <h2>
        我的仓位（<a
          class="account-link"
          href="https://polymarket.com/zh/@zjavax"
          target="_blank"
          rel="noopener"
          >zjavax</a
        >）
      </h2>
      <div class="account-wallet">
        <span class="wallet-item">
          <span class="wallet-label">资产组合</span>
          <span class="wallet-value">{{ money(walletCombined.total) }}</span>
        </span>
        <span class="wallet-item">
          <span class="wallet-label">现金</span>
          <span class="wallet-value">{{ money(walletCombined.cash) }}</span>
        </span>
        <span class="wallet-item">
          <span class="wallet-label">持仓总价值</span>
          <span class="wallet-value">{{ money(walletCombined.portfolio) }}</span>
        </span>
      </div>
      <table class="positions-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>选择</th>
            <th>买入</th>
            <th>份额</th>
            <th>预计收益</th>
            <th>平均价格</th>
            <th>当前价格</th>
            <th>当前价值</th>
            <th>收益</th>
            <th>百分比收益</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in positions" :key="position.slug">
            <td>
              <a
                :href="`https://polymarket.com/zh/event/${position.eventSlug}`"
                target="_blank"
                class="title-link"
              >
                {{ position.title }}
              </a>
            </td>
            <td>{{ position.outcome }}</td>
            <td>{{ position.initialValue.toFixed(0) }}</td>
            <td>{{ position.size.toFixed(0) }}</td>
            <td>{{ (position.size - position.initialValue).toFixed(0) }}</td>
            <td>{{ position.avgPrice.toFixed(2) }}</td>
            <td>{{ position.curPrice.toFixed(2) }}</td>
            <td>{{ position.currentValue.toFixed(0) }}</td>
            <td
              :class="{
                positive: position.cashPnl > 0,
                negative: position.cashPnl < 0,
              }"
            >
              {{ position.cashPnl.toFixed(2) }}
            </td>
            <td
              :class="{
                positive: position.percentPnl > 0,
                negative: position.percentPnl < 0,
              }"
            >
              {{ position.percentPnl.toFixed(2) }}%
            </td>
          </tr>
        </tbody>
        <tfoot v-if="positions.length > 0">
          <tr class="total-row">
            <td>合计</td>
            <td></td>
            <td>{{ total.initialValue.toFixed(0) }}</td>
            <td>{{ total.size.toFixed(0) }}</td>
            <td>{{ total.estimatedPnl.toFixed(0) }}</td>
            <td></td>
            <td></td>
            <td>{{ total.currentValue.toFixed(0) }}</td>
            <td
              :class="{
                positive: total.cashPnl > 0,
                negative: total.cashPnl < 0,
              }"
            >
              {{ total.cashPnl.toFixed(2) }}
            </td>
            <td
              :class="{
                positive: total.percentPnl > 0,
                negative: total.percentPnl < 0,
              }"
            >
              {{ total.percentPnl.toFixed(2) }}%
            </td>
          </tr>
        </tfoot>
      </table>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-if="!loading && positions.length === 0" class="no-data">
        暂无数据
      </div>

      <h2 style="margin-top: 40px">
        我的仓位（<a
          class="account-link"
          href="https://polymarket.com/zh/@zjavax2"
          target="_blank"
          rel="noopener"
          >zjavax2</a
        >）
      </h2>
      <div class="account-wallet">
        <span class="wallet-item">
          <span class="wallet-label">资产组合</span>
          <span class="wallet-value">{{ money(walletCombined2.total) }}</span>
        </span>
        <span class="wallet-item">
          <span class="wallet-label">现金</span>
          <span class="wallet-value">{{ money(walletCombined2.cash) }}</span>
        </span>
        <span class="wallet-item">
          <span class="wallet-label">持仓总价值</span>
          <span class="wallet-value">{{ money(walletCombined2.portfolio) }}</span>
        </span>
      </div>
      <table class="positions-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>选择</th>
            <th>买入</th>
            <th>份额</th>
            <th>预计收益</th>
            <th>平均价格</th>
            <th>当前价格</th>
            <th>当前价值</th>
            <th>收益</th>
            <th>百分比收益</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in positions2" :key="position.slug">
            <td>
              <a
                :href="`https://polymarket.com/zh/event/${position.eventSlug}`"
                target="_blank"
                class="title-link"
              >
                {{ position.title }}
              </a>
            </td>
            <td>{{ position.outcome }}</td>
            <td>{{ position.initialValue.toFixed(0) }}</td>
            <td>{{ position.size.toFixed(0) }}</td>
            <td>{{ (position.size - position.initialValue).toFixed(0) }}</td>
            <td>{{ position.avgPrice.toFixed(2) }}</td>
            <td>{{ position.curPrice.toFixed(2) }}</td>
            <td>{{ position.currentValue.toFixed(0) }}</td>
            <td
              :class="{
                positive: position.cashPnl > 0,
                negative: position.cashPnl < 0,
              }"
            >
              {{ position.cashPnl.toFixed(2) }}
            </td>
            <td
              :class="{
                positive: position.percentPnl > 0,
                negative: position.percentPnl < 0,
              }"
            >
              {{ position.percentPnl.toFixed(2) }}%
            </td>
          </tr>
        </tbody>
        <tfoot v-if="positions2.length > 0">
          <tr class="total-row">
            <td>合计</td>
            <td></td>
            <td>{{ total2.initialValue.toFixed(0) }}</td>
            <td>{{ total2.size.toFixed(0) }}</td>
            <td>{{ total2.estimatedPnl.toFixed(0) }}</td>
            <td></td>
            <td></td>
            <td>{{ total2.currentValue.toFixed(0) }}</td>
            <td
              :class="{
                positive: total2.cashPnl > 0,
                negative: total2.cashPnl < 0,
              }"
            >
              {{ total2.cashPnl.toFixed(2) }}
            </td>
            <td
              :class="{
                positive: total2.percentPnl > 0,
                negative: total2.percentPnl < 0,
              }"
            >
              {{ total2.percentPnl.toFixed(2) }}%
            </td>
          </tr>
        </tfoot>
      </table>
      <div v-if="loading2" class="loading">加载中...</div>
      <div v-if="!loading2 && positions2.length === 0" class="no-data">
        暂无数据
      </div>

      <div class="grand-total">
        <div class="grand-total-title">两个账号合计</div>
        <div class="grand-total-grid">
          <div class="grand-metric">
            <span class="grand-label">总买入</span>
            <span class="grand-value">{{ grandTotal.initialValue.toFixed(0) }}</span>
          </div>
          <div class="grand-metric">
            <span class="grand-label">总份额</span>
            <span class="grand-value">{{ grandTotal.size.toFixed(0) }}</span>
          </div>
          <div class="grand-metric">
            <span class="grand-label">总收益</span>
            <span
              class="grand-value"
              :class="{
                positive: grandTotal.cashPnl > 0,
                negative: grandTotal.cashPnl < 0,
              }"
            >
              {{ grandTotal.cashPnl.toFixed(2) }}
            </span>
          </div>
          <div class="grand-metric">
            <span class="grand-label">总预计收益</span>
            <span class="grand-value">{{ grandTotal.estimatedPnl.toFixed(0) }}</span>
          </div>
          <div class="grand-metric">
            <span class="grand-label">总资产组合</span>
            <span class="grand-value">{{ money(grandAsset) }}</span>
          </div>
          <div class="grand-metric">
            <span class="grand-label">现金</span>
            <span class="grand-value">{{ money(grandWallet.cash) }}</span>
          </div>
          <div class="grand-metric">
            <span class="grand-label">当前总价值</span>
            <span class="grand-value">{{ money(grandWallet.portfolio) }}</span>
          </div>
        </div>
        <div class="grand-sub">
          当前总价值 = 两个账号持仓市值合计；现金 = pUSD + USDC.e 链上余额；
          总资产组合 = 当前总价值 + 现金。
        </div>
        <div class="grand-sub">
          <a
            class="account-link"
            href="https://polymarket.com/zh/@zjavax"
            target="_blank"
            rel="noopener"
            >zjavax</a
          >：买入 {{ total.initialValue.toFixed(0) }} · 份额
          {{ total.size.toFixed(0) }} · 收益 {{ total.cashPnl.toFixed(2) }}
          ｜
          <a
            class="account-link"
            href="https://polymarket.com/zh/@zjavax2"
            target="_blank"
            rel="noopener"
            >zjavax2</a
          >：买入 {{ total2.initialValue.toFixed(0) }} · 份额
          {{ total2.size.toFixed(0) }} · 收益 {{ total2.cashPnl.toFixed(2) }}
        </div>
      </div>
    </div>
    <aside class="side-column">
      <section class="side-panel">
        <div class="side-panel-head">
          <span class="side-panel-title">美股市值前十</span>
          <span class="side-panel-tag">TradingView</span>
        </div>
        <table class="side-table">
          <thead>
            <tr>
              <th class="side-col-rank">#</th>
              <th>代码</th>
              <th>价格</th>
              <th>市值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(stock, index) in topStocks" :key="stock.symbol">
              <td class="side-col-rank">{{ index + 1 }}</td>
              <td>
                <a
                  class="side-link"
                  :href="`https://www.tradingview.com/symbols/${stock.symbol.replace(':', '-')}/`"
                  target="_blank"
                  rel="noopener"
                  :title="stock.name"
                  >{{ stock.ticker }}</a
                >
              </td>
              <td>{{ formatPrice(stock.price) }}</td>
              <td>{{ formatMarketCap(stock.marketCap) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="stocksLoading" class="side-state">加载中…</div>
        <div v-else-if="topStocks.length === 0" class="side-state">数据获取失败</div>
        <div class="side-panel-note">最近交易日收盘价 · 数据来自 TradingView</div>
      </section>

      <section class="side-panel">
        <div class="side-panel-head">
          <span class="side-panel-title">加密货币市值前二十</span>
          <span class="side-panel-tag">CoinGecko</span>
        </div>
        <table class="side-table">
          <thead>
            <tr>
              <th class="side-col-rank">#</th>
              <th>代码</th>
              <th>价格</th>
              <th>市值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="coin in topCryptos" :key="coin.id">
              <td class="side-col-rank">{{ coin.rank }}</td>
              <td>
                <a
                  class="side-link"
                  :href="`https://www.coingecko.com/en/coins/${coin.id}`"
                  target="_blank"
                  rel="noopener"
                  :title="coin.name"
                  >{{ coin.symbol }}</a
                >
              </td>
              <td>{{ formatCryptoPrice(coin.price) }}</td>
              <td>{{ formatMarketCap(coin.marketCap) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="cryptosLoading" class="side-state">加载中…</div>
        <div v-else-if="topCryptos.length === 0" class="side-state">数据获取失败</div>
        <div class="side-panel-note">24h 行情 · 数据来自 CoinGecko</div>
      </section>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { fetchUserPositions, UserPosition } from "./polymarket-positions";
import {
  fetchAccountWallet,
  type AccountWallet,
  EMPTY_WALLET,
} from "./polymarket-wallet";
import {
  fetchTopUsStocks,
  formatMarketCap,
  formatPrice,
  type UsStock,
} from "./us-stocks";
import {
  fetchTopCryptos,
  formatCryptoPrice,
  type CryptoCoin,
} from "./crypto-market";

/** 两个账号的钱包地址。加账号时改这里 + 模板里的两张表。 */
const ADDRESS_ZJAVAX = "0xb976609df37a76d5213b414833d9cb9cbd395876";
const ADDRESS_ZJAVAX2 = "0xe5c47cd9a52960df9730a05ed9a9b3959ab02231";

const positions = ref<UserPosition[]>([]);
const loading = ref<boolean>(true);
const positions2 = ref<UserPosition[]>([]);
const loading2 = ref<boolean>(true);

/** 每个账号的链上现金 / 持仓总价值（undefined = 加载中，null = 取不到） */
const wallet = ref<AccountWallet>({ ...EMPTY_WALLET });
const wallet2 = ref<AccountWallet>({ ...EMPTY_WALLET });

/** 右侧栏：美股市值前十 + 加密货币市值前二十（手机端不渲染，见样式里的 @media） */
const topStocks = ref<UsStock[]>([]);
const stocksLoading = ref<boolean>(true);
const topCryptos = ref<CryptoCoin[]>([]);
const cryptosLoading = ref<boolean>(true);

/** 金额展示：加载中「…」、取不到「—」，绝不拿 0 冒充读不到 */
const money = (value: number | null | undefined) =>
  value === undefined ? "…" : value === null ? "—" : value.toFixed(2);

/** 资产组合 = 现金 + 持仓总价值（Polymarket 口径的 Portfolio）。任一项缺失则整体未知。 */
const combineWallet = (w: AccountWallet) => {
  const pending = w.cash === undefined || w.portfolio === undefined;
  const failed = w.cash === null || w.portfolio === null;
  return {
    cash: w.cash,
    portfolio: w.portfolio,
    total: pending
      ? undefined
      : failed
        ? null
        : (w.cash as number) + (w.portfolio as number),
  };
};

const walletCombined = computed(() => combineWallet(wallet.value));
const walletCombined2 = computed(() => combineWallet(wallet2.value));

/** 汇总一个账号的所有仓位：总买入 / 总份额 / 总当前价值 / 总收益 / 总收益率（按买入额加权） */
const summarize = (list: UserPosition[]) => {
  const initialValue = list.reduce((sum, p) => sum + (p.initialValue || 0), 0);
  const size = list.reduce((sum, p) => sum + (p.size || 0), 0);
  const currentValue = list.reduce((sum, p) => sum + (p.currentValue || 0), 0);
  const cashPnl = list.reduce((sum, p) => sum + (p.cashPnl || 0), 0);
  return {
    initialValue,
    size,
    currentValue,
    cashPnl,
    // 预计收益 = 份额 − 买入。Polymarket 每份结算价固定 $1，
    // 所以「份额 × 1」就是全部押对时的回报，减去买入即净收益。
    estimatedPnl: size - initialValue,
    percentPnl: initialValue > 0 ? (cashPnl / initialValue) * 100 : 0,
  };
};

const total = computed(() => summarize(positions.value));
const total2 = computed(() => summarize(positions2.value));

const grandTotal = computed(() => {
  const a = total.value;
  const b = total2.value;
  const initialValue = a.initialValue + b.initialValue;
  const cashPnl = a.cashPnl + b.cashPnl;
  return {
    initialValue,
    size: a.size + b.size,
    currentValue: a.currentValue + b.currentValue,
    cashPnl,
    estimatedPnl: a.estimatedPnl + b.estimatedPnl,
    percentPnl: initialValue > 0 ? (cashPnl / initialValue) * 100 : 0,
  };
});

/** 两个账号的现金 / 资金组合合计。任一项未知则合计也未知。 */
const grandWallet = computed(() => {
  const sum = (key: "cash" | "portfolio" | "total") => {
    const a = walletCombined.value[key];
    const b = walletCombined2.value[key];
    if (a === undefined || b === undefined) return undefined;
    if (a === null || b === null) return null;
    return a + b;
  };
  return { cash: sum("cash"), portfolio: sum("portfolio"), total: sum("total") };
});

/** 总资产组合 = 持仓总价值 + 现金。用官方 /value 的持仓值，避免被 limit 截断。 */
const grandAsset = computed(() => {
  const p = grandWallet.value.portfolio;
  const c = grandWallet.value.cash;
  if (p === undefined || c === undefined) return undefined;
  if (p === null || c === null) return null;
  return p + c;
});

const loadPositions = async () => {
  loading.value = true;
  try {
    positions.value = await fetchUserPositions(ADDRESS_ZJAVAX);
  } catch (error) {
    console.error("Failed to load positions:", error);
  } finally {
    loading.value = false;
  }
};

const loadPositions2 = async () => {
  loading2.value = true;
  try {
    positions2.value = await fetchUserPositions(ADDRESS_ZJAVAX2);
  } catch (error) {
    console.error("Failed to load positions:", error);
  } finally {
    loading2.value = false;
  }
};

const loadWallet = async () => {
  wallet.value = await fetchAccountWallet(ADDRESS_ZJAVAX);
};

const loadWallet2 = async () => {
  wallet2.value = await fetchAccountWallet(ADDRESS_ZJAVAX2);
};

const loadStocks = async () => {
  stocksLoading.value = true;
  try {
    // 取不到返回 null → 保持空数组，界面显示「数据获取失败」，不影响仓位区渲染
    topStocks.value = (await fetchTopUsStocks(10)) ?? [];
  } finally {
    stocksLoading.value = false;
  }
};

const loadCryptos = async () => {
  cryptosLoading.value = true;
  try {
    topCryptos.value = (await fetchTopCryptos(20)) ?? [];
  } finally {
    cryptosLoading.value = false;
  }
};

onMounted(() => {
  loadPositions();
  loadPositions2();
  loadWallet();
  loadWallet2();
  loadStocks();
  loadCryptos();
});
</script>

<style scoped>
/* 页面外层：桌面 = 左「仓位」+ 右「美股市值前十」并排，利用表格右侧的空白。
   手机端见文件末尾的 @media（股票栏整块不渲染）。 */
.positions-page {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  max-width: 1560px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}

.positions-container {
  /* flex 子项：min-width:0 防止表格内容把整行顶宽（同 .app-main 那条教训） */
  flex: 1 1 auto;
  min-width: 0;
  color: #1f2937;
}

/* 页面顶部的工具链接：Polymarket 服务状态页 */
.page-topbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.status-link {
  display: inline-block;
  padding: 3px 10px;
  border: 1px solid #d6d9e0;
  border-radius: 999px;
  background-color: #ffffff;
  color: #3538cd;
  font-size: 12px;
  line-height: 1.6;
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.status-link:hover {
  border-color: #3538cd;
  background-color: #f5f6ff;
}

.positions-container h2 {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
}

.positions-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 13.5px;
}

.positions-table th,
.positions-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #eef0f4;
}

.positions-table th {
  background-color: #f7f8fa;
  color: #667085;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

/* 数值列右对齐 + 等宽数字，方便纵向比较大小 */
.positions-table th:nth-child(n + 3),
.positions-table td:nth-child(n + 3) {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.positions-table tbody tr:hover {
  background-color: #f8fafc;
}

.positions-table tbody tr:last-child td {
  border-bottom: none;
}

/* 每个账号表格底部的「合计」行 */
.positions-table tfoot .total-row td {
  border-top: 1px solid #e4e7ec;
  border-bottom: none;
  background-color: #fbfcfe;
  font-weight: 700;
  color: #1f2937;
}

.positions-table tfoot .total-row td:first-child {
  color: #667085;
  font-weight: 600;
}

/* 每个账号标题下的钱包概况：现金 / 持仓总价值 / 资金组合 */
.account-wallet {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  padding: 8px 12px;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background-color: #f8fafc;
}

.wallet-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.wallet-label {
  font-size: 12px;
  color: #667085;
}

.wallet-value {
  font-size: 13.5px;
  font-weight: 600;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
}

/* 两个账号合并后的总计 */
.grand-total {
  margin-top: 36px;
  padding: 18px 20px;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background-color: #f9fafb;
}

.grand-total-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 14px;
}

/* 6 个指标 → 3 列 × 2 行 */
.grand-total-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.grand-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 8px;
  background-color: #ffffff;
  border: 1px solid #eef0f4;
}

.grand-label {
  font-size: 12px;
  color: #667085;
}

.grand-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
}

.grand-sub {
  margin-top: 12px;
  font-size: 12px;
  color: #98a2b3;
  line-height: 1.6;
}

/* 右侧栏：美股 + 加密货币两个面板纵向堆叠。
   不加 sticky —— 两个面板加起来已经高于一屏，sticky 会把底部内容顶出视口 */
.side-column {
  flex: 0 0 290px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-panel {
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background-color: #ffffff;
  overflow: hidden;
}

.side-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background-color: #f9fafb;
  border-bottom: 1px solid #eef0f4;
}

.side-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.side-panel-tag {
  font-size: 10px;
  color: #98a2b3;
}

.side-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.side-table th,
.side-table td {
  padding: 7px 8px;
  text-align: right;
  border-bottom: 1px solid #f2f4f7;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.side-table th {
  font-size: 10.5px;
  font-weight: 600;
  color: #667085;
  background-color: #fcfcfd;
}

/* 代码列左对齐，价格 / 市值保持右对齐 */
.side-table th:nth-child(2),
.side-table td:nth-child(2) {
  text-align: left;
}

/* 名次列：窄且左对齐。选择器带 .side-table 才压得过 `.side-table td` 的右对齐 */
.side-table th.side-col-rank,
.side-table td.side-col-rank {
  width: 24px;
  padding-right: 0;
  text-align: left;
  color: #98a2b3;
  font-size: 11px;
}

.side-table tbody tr:last-child td {
  border-bottom: none;
}

.side-link {
  color: #3538cd;
  font-weight: 600;
  text-decoration: none;
}

.side-link:hover {
  text-decoration: underline;
}

.side-state {
  padding: 18px 12px;
  text-align: center;
  font-size: 12px;
  color: #98a2b3;
}

.side-panel-note {
  padding: 8px 12px;
  font-size: 10.5px;
  color: #98a2b3;
  border-top: 1px solid #f2f4f7;
  background-color: #fcfcfd;
}

.title-link {
  color: #3538cd;
  font-weight: 500;
  text-decoration: none;
}

.title-link:hover {
  text-decoration: underline;
}

/* 账号名（zjavax / zjavax2）→ 跳转 polymarket 个人主页。
   默认跟随所在标题的颜色，用虚线下划线暗示可点，避免整行标题变蓝 */
.account-link {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dashed #b9c0cc;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.account-link:hover {
  color: #3538cd;
  border-bottom-color: #3538cd;
  border-bottom-style: solid;
}

.positive {
  color: #15803d;
  font-weight: 600;
}

.negative {
  color: #b42318;
  font-weight: 600;
}

.loading,
.no-data {
  text-align: center;
  padding: 32px;
  color: #98a2b3;
  font-size: 14px;
}

/* 手机端：整表自适应收缩到屏幕宽度，保持行/列不变，无需手动缩放 */
@media (max-width: 768px) {
  .positions-page {
    display: block;
    max-width: 100%;
    margin: 0;
    padding: 10px 5px;
  }

  .positions-container {
    max-width: 100%;
  }

  /* 手机端不显示右侧行情栏（桌面才有空间放它） */
  .side-column {
    display: none;
  }

  .positions-container h2 {
    font-size: 15px;
    margin: 14px 0 6px;
  }

  .positions-table {
    margin-top: 6px;
    /* 固定布局，列宽按比例分配，表格永远不会超过屏幕宽度 */
    table-layout: fixed;
    font-size: 10px;
  }

  .positions-table th,
  .positions-table td {
    padding: 5px 2px;
    line-height: 1.2;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  /* 表头允许换行，否则会把列撑宽。
     ⚠️ 必须带上 `:nth-child(n + 3)` —— 桌面的数值列规则
     `.positions-table th:nth-child(n + 3) { white-space: nowrap }` 权重 (0,2,1) 更高，
     只写 `.positions-table th` 是 (0,1,1) 覆盖不掉，第 3 列起的表头会一直 nowrap，
     「百分比收益」就是这么撑出 5px 横向溢出的。 */
  .positions-table th,
  .positions-table th:nth-child(n + 3) {
    font-size: 9px;
    white-space: normal;
  }

  /* 数值列允许在窄列里折行 */
  .positions-table td:nth-child(n + 3) {
    white-space: normal;
  }

  /* 标题列尽可能窄，把宽度全部让给数值列 */
  .positions-table th:first-child,
  .positions-table td:first-child {
    width: 14%;
  }

  /* “选择”内容很短，压缩该列以给数值列留出更多空间 */
  .positions-table th:nth-child(2),
  .positions-table td:nth-child(2) {
    width: 7%;
  }

  .positions-table tfoot .total-row td {
    font-size: 10px;
    padding: 7px 2px;
  }

  .account-wallet {
    gap: 4px 14px;
    padding: 6px 8px;
    margin-bottom: 2px;
  }

  .wallet-item {
    gap: 4px;
  }

  .wallet-label {
    font-size: 11px;
  }

  .wallet-value {
    font-size: 12px;
  }

  .grand-total {
    margin-top: 20px;
    padding: 12px 10px;
  }

  .grand-total-title {
    font-size: 14px;
    margin-bottom: 10px;
  }

  .grand-total-grid {
    gap: 6px;
  }

  .grand-metric {
    padding: 8px 6px;
    gap: 4px;
  }

  .grand-label {
    font-size: 11px;
  }

  .grand-value {
    font-size: 15px;
  }

  .grand-sub {
    font-size: 11px;
    margin-top: 10px;
  }
}
</style>
