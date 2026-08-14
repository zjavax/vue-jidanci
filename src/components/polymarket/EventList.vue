<template>
  <div class="event-list">
    <!-- 活跃事件 -->
    <div v-for="event in events" :key="event.slug" class="event-card">
      <a
        :href="`https://polymarket.com/zh/event/${event.slug}`"
        target="_blank"
        class="event-title"
      >
        {{ event.title }}
      </a>
      <div class="action-group">
        <el-button
          type="info"
          plain
          size="small"
          @click="hideEvent(event, '隐藏')"
        >
          隐藏
        </el-button>
        <el-button
          type="warning"
          plain
          size="small"
          @click="hideEvent(event, '收藏')"
        >
          收藏
        </el-button>
      </div>
    </div>

    <!-- 管理区域 -->
    <div v-if="hiddenEvents.length > 0" class="managed-section">
      <el-divider content-position="left">已管理事件</el-divider>

      <!-- 已收藏 -->
      <div class="sub-group">
        <el-input
          v-model="input"
          style="width: 500px"
          placeholder="Please input"
        ></el-input>

        <el-button type="info" plain size="small" @click="hideEventBySearch">
          保存
        </el-button>

        <div class="group-header">
          <el-tag type="warning" effect="dark" size="small">已收藏</el-tag>
        </div>

        <!-- 使用 template 包裹 v-for，解决优先级问题 -->
        <template v-for="event in hiddenEvents" :key="event.slug">
          <div
            v-if="event.updateStatus === '收藏'"
            class="event-card managed favorite"
          >
            <div class="card-inner">
              <a
                :href="`https://polymarket.com/zh/event/${event.slug}`"
                target="_blank"
                class="event-title"
              >
                {{ event.title }}
              </a>
              <el-button
                type="info"
                plain
                size="small"
                @click="hideEvent(event, '隐藏')"
              >
                隐藏
              </el-button>
              <el-button
                type="primary"
                link
                size="small"
                @click="restoreEvent(event.slug)"
              >
                删除
              </el-button>
            </div>
          </div>
        </template>
      </div>

      <!-- 已隐藏 -->
      <div class="sub-group">
        <div class="group-header">
          <el-tag type="info" effect="dark" size="small">已隐藏</el-tag>
          <el-button type="primary" link size="small" @click="delAll('隐藏')">
            全部删除
          </el-button>

          <el-button type="primary" link size="small" @click="hideAllEvents">
            全部隐藏
          </el-button>
        </div>

        <!-- 使用 template 包裹 v-for，解决优先级问题 -->
        <template v-for="event in hiddenEvents" :key="event.slug">
          <div v-if="event.updateStatus === '隐藏'" class="event-card managed">
            <div class="card-inner">
              <a
                :href="`https://polymarket.com/zh/event/${event.slug}`"
                target="_blank"
                class="event-title muted"
              >
                {{ event.title }}
              </a>
              <el-button
                type="warning"
                plain
                size="small"
                @click="hideEvent(event, '收藏')"
              >
                收藏
              </el-button>
              <el-button
                type="primary"
                link
                size="small"
                @click="restoreEvent(event.slug)"
              >
                删除
              </el-button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  fetchPolymarketEvents,
  MarketEvent,
  fetchPolymarketEvent,
} from "./polymarket";

const input = ref("");

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
    if (key && key !== "vueuse-color-scheme") {
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

const delAll = (status: string) => {
  // 遍历 localStorage 中的所有键值对
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i) || "";
    const value = localStorage.getItem(key);

    if (value && value !== "auto") {
      try {
        const data = JSON.parse(value);
        if (data.updateStatus === status) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        // 跳过无法解析为 JSON 的值
        console.warn("跳过解析失败的 localStorage 值:", key);
      }
    }
  }

  // 刷新事件列表
  loadEvents();
  loadHiddenEvents();
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

const hideEventBySearch = async () => {
  const event = await fetchPolymarketEvent(input.value);
  if (event) {
    hideEvent(event, "收藏");
    alert("保存成功:" + event.title);
  }
};

// 隐藏事件
const hideEvent = (event: MarketEvent, status: string) => {
  events.value = events.value.filter((e) => e.slug !== event.slug);

  // 保存到 localStorage
  event.updateStatus = status;
  saveLocalStorage(event.slug, event);
  loadHiddenEvents();
};

const hideAllEvents = () => {
  events.value.forEach((event) => {
    // 保存到 localStorage
    event.updateStatus = "隐藏";
    saveLocalStorage(event.slug, event);

    loadEvents();
    loadHiddenEvents();
  });
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
.event-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* 卡片样式 */
.event-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  transition: all 0.3s;
}

.event-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 标题链接 */
.event-title {
  flex: 1;
  text-decoration: none;
  color: #303133;
  font-weight: 500;
  margin-right: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-title:hover {
  color: #409eff;
}

.event-title.muted {
  color: #909399;
}

/* 按钮组 */
.action-group {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 管理区域样式 */
.managed-section {
  margin-top: 30px;
}

.sub-group {
  margin-bottom: 20px;
}

.group-header {
  margin-bottom: 10px;
}

/* 已管理卡片特殊样式 */
.event-card.managed {
  background-color: #f5f7fa;
  border-style: dashed;
}

.event-card.favorite {
  border-left: 3px solid #e6a23c;
}

.card-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>