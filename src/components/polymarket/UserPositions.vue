<template>
  <div class="positions-container">
    <h2>我的仓位（zjavax）</h2>
    <table class="positions-table">
      <thead>
        <tr>
          <th>标题</th>
          <th>选择</th>
          <th>买入</th>
          <th>份额</th>
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
    </table>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="!loading && positions.length === 0" class="no-data">
      暂无数据
    </div>

    <h2 style="margin-top: 40px">我的仓位（zjavax2）</h2>
    <table class="positions-table">
      <thead>
        <tr>
          <th>标题</th>
          <th>选择</th>
          <th>买入</th>
          <th>份额</th>
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
    </table>
    <div v-if="loading2" class="loading">加载中...</div>
    <div v-if="!loading2 && positions2.length === 0" class="no-data">
      暂无数据
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { fetchUserPositions, UserPosition } from "./polymarket-positions";

const positions = ref<UserPosition[]>([]);
const loading = ref<boolean>(true);
const positions2 = ref<UserPosition[]>([]);
const loading2 = ref<boolean>(true);

const loadPositions = async () => {
  loading.value = true;
  try {
    positions.value = await fetchUserPositions();
  } catch (error) {
    console.error("Failed to load positions:", error);
  } finally {
    loading.value = false;
  }
};

const loadPositions2 = async () => {
  loading2.value = true;
  try {
    positions2.value = await fetchUserPositions(
      "0xe5c47cd9a52960df9730a05ed9a9b3959ab02231"
    );
  } catch (error) {
    console.error("Failed to load positions:", error);
  } finally {
    loading2.value = false;
  }
};

onMounted(() => {
  loadPositions();
  loadPositions2();
});
</script>

<style scoped>
.positions-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #1f2937;
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

.title-link {
  color: #3538cd;
  font-weight: 500;
  text-decoration: none;
}

.title-link:hover {
  text-decoration: underline;
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
  .positions-container {
    max-width: 100%;
    margin: 0;
    padding: 10px 5px;
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

  .positions-table th {
    font-size: 9px;
    /* 表头允许换行，否则会把列撑宽 */
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
}
</style>
