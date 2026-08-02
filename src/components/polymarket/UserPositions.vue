<template>
  <div class="positions-container">
    <h2>我的仓位</h2>
    <table class="positions-table">
      <thead>
        <tr>
          <th>标题</th>
          <th>我的选择</th>
          <th>我的买入</th>
          <th>份额</th>
          <th>平均价格</th>
          <th>当前价值</th>
          <th>我的收益</th>
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
          <td>{{ position.initialValue.toFixed(2) }}</td>
          <td>{{ position.size.toFixed(2) }}</td>
          <td>{{ position.avgPrice.toFixed(4) }}</td>
          <td>{{ position.currentValue.toFixed(2) }}</td>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { fetchUserPositions, UserPosition } from "./polymarket-positions";

const positions = ref<UserPosition[]>([]);
const loading = ref<boolean>(true);

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

onMounted(() => {
  loadPositions();
});
</script>

<style scoped>
.positions-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.positions-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.positions-table th,
.positions-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.positions-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.positions-table tr:hover {
  background-color: #f9f9f9;
}

.title-link {
  color: #007bff;
  text-decoration: none;
}

.title-link:hover {
  text-decoration: underline;
  color: #0056b3;
}

.positive {
  color: #28a745;
  font-weight: bold;
}

.negative {
  color: #dc3545;
  font-weight: bold;
}

.loading,
.no-data {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>