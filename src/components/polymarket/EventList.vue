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
      <el-button @click="hideEvent(event, '隐藏')" class="hide-button">
        隐藏
      </el-button>

      <el-button @click="hideEvent(event, '收藏')" class="hide-button">
        收藏
      </el-button>
    </div>

    <!-- 显示隐藏数据的区域 -->
    <div v-if="hiddenEvents.length > 0">
      <h3>已隐藏的事件</h3>
      <div v-for="event in hiddenEvents" :key="event.slug" class="event-item">
        <div v-if="event.updateStatus === '隐藏'">
          <span class="event.updateS">
            <a
              :href="`https://polymarket.com/zh/event/${event.slug}`"
              target="_blank"
              class="title-link"
            >
              {{ event.title }}
            </a></span
          >
          <el-button @click="restoreEvent(event.slug)" class="restore-button">
            恢复
          </el-button>
        </div>
      </div>

      <h3>已收藏的事件</h3>
      <div v-for="event in hiddenEvents" :key="event.slug" class="event-item">
        <div v-if="event.updateStatus === '收藏'">
          <span class="event.updateS">
            <a
              :href="`https://polymarket.com/zh/event/${event.slug}`"
              target="_blank"
              class="title-link"
            >
              {{ event.title }}
            </a></span
          >
          <el-button @click="restoreEvent(event.slug)" class="restore-button">
            恢复
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { fetchPolymarketEvents, MarketEvent } from "./polymarket";

// interface MarketEvent {
//   slug: string;
//   title: string;
// }

const events = ref<MarketEvent[]>([]);
const hiddenEvents = ref<MarketEvent[]>([]);

// 在组件加载时获取隐藏的事件
const loadHiddenEvents = () => {
  const hidden: MarketEvent[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      try {
        const event = getLocalStorage(key);
        if (event) {
          hidden.push({
            id: event.id,
            slug: event.slug,
            title: event.title,
            updateStatus: event.updateStatus,
          });
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
      id: event.id,
      slug: event.slug,
      title: event.title,
      updateStatus: "默认",
    }))
    .filter((event) => {
      // Check if the event slug exists in localStorage
      const storedValue = localStorage.getItem(event.slug);
      // Include the event only if it's NOT in localStorage (storedValue is null)
      return !storedValue;
    });
};

// 隐藏事件
const hideEvent = (event: MarketEvent, status: string) => {
  events.value = events.value.filter((e) => e.slug !== event.slug);

  // 保存到 localStorage
  event.updateStatus = status;
  saveLocalStorage(event.slug, event);
};

// 存储字符串数组
function saveLocalStorage(key: string, value: MarketEvent): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("保存数据失败:", error);
  }
}

// 获取函数
function getLocalStorage(key: string): MarketEvent | null {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as MarketEvent;
  } catch (error) {
    console.error("读取数据失败:", error);
    return null;
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
</style>