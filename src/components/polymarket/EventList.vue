<template>
  <div class="event-list">
    <div v-for="event in events" :key="event.slug" class="event-item">
      <span class="event-title">
        <a
          :href="`https://polymarket.com/zh/event/${event.slug}`"
          target="_blank"
          class="title-link"
        >
          {{ event.title }}
        </a>
      </span>
      <button @click="hideEvent(event)" class="hide-button">隐藏</button>
    </div>

    <!-- 显示隐藏数据的区域 -->
    <div v-if="hiddenEvents.length > 0">
      <h3>已隐藏的事件</h3>
      <div v-for="event in hiddenEvents" :key="event.slug" class="event-item">
        <span class="event-title">
          <a
            :href="`https://polymarket.com/zh/event/${event.slug}`"
            target="_blank"
            class="title-link"
          >
            {{ event.title }}
          </a></span
        >
        <button @click="restoreEvent(event.slug)" class="restore-button">
          恢复
        </button>
      </div>
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
const hiddenEvents = ref<MarketEvent[]>([]);

// 在组件加载时获取隐藏的事件
const loadHiddenEvents = () => {
  const hidden: MarketEvent[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      try {
        const title = localStorage.getItem(key);
        if (title) {
          hidden.push({ slug: key, title: title });
        }
      } catch (error) {
        console.error("读取隐藏事件数据失败:", error);
      }
    }
  }
  hiddenEvents.value = hidden;
};

// 恢复事件的方法
const restoreEvent = (slug: string) => {
  delLocalStorage(slug);
  // 重新加载隐藏事件列表
  loadHiddenEvents();
  // 如果需要也重新加载显示的事件列表
  loadEvents();
};

// 获取数据
const loadEvents = async () => {
  const eventData = await fetchPolymarketEvents();
  events.value = eventData
    .map((event) => ({
      slug: event.slug,
      title: event.title,
    }))
    .filter((event) => {
      // Check if the event slug exists in localStorage
      const storedValue = localStorage.getItem(event.slug);
      // Include the event only if it's NOT in localStorage (storedValue is null)
      return !storedValue;
    });
};

// 隐藏事件
const hideEvent = (event: MarketEvent) => {
  events.value = events.value.filter((e) => e.slug !== event.slug);

  // 保存到 localStorage
  saveLocalStorage(event.slug, event.title);
};

// 存储字符串数组
function saveLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error("保存数据失败:", error);
  }
}

// 存储字符串数组
function delLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("保存数据失败:", error);
  }
}

// 读取字符串数组
function loadStringArray(key: string): string[] | null {
  try {
    const jsonString = localStorage.getItem(key);
    if (!jsonString) return null;
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("读取数据失败:", error);
    return null;
  }
}

// 组件挂载时加载数据
loadEvents();
loadHiddenEvents();
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

.restore-button {
  background-color: #030bf9;
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