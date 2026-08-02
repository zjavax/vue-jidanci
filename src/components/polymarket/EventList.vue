<template>
  <div class="event-list">
    <div v-for="event in events" :key="event.slug" class="event-item">
      <span class="event-title">{{ event.title }}</span>
      <button @click="hideEvent(event.slug)" class="hide-button">隐藏</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { fetchPolymarketEvents } from "./polymarket";

interface MarketEvent {
  slug: string;
  title: string;
}

const events = ref<MarketEvent[]>([]);

// 获取数据
const loadEvents = async () => {
  const eventData = await fetchPolymarketEvents();
  events.value = eventData.map((event) => ({
    slug: event.slug,
    title: event.title,
  }));
};

// 隐藏事件
const hideEvent = (slug: string) => {
  events.value = events.value.filter((event) => event.slug !== slug);
};

// 组件挂载时加载数据
loadEvents();
</script>

<style scoped>
.event-list {
  max-width: 800px;
  margin: 0 auto;
}

.event-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.event-title {
  flex: 1;
  font-size: 16px;
  color: #333;
}

.hide-button {
  background-color: #ff4757;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.hide-button:hover {
  background-color: #ff2e43;
}
</style>