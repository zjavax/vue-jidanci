<template>
  <div class="event-list">
    <!-- 标签筛选 -->
    <div class="tag-bar">
      <el-button
        v-for="tag in tags"
        :key="tag.value"
        :type="activeTag === tag.value ? 'primary' : 'info'"
        :plain="activeTag !== tag.value"
        size="large"
        @click="switchTag(tag.value)"
      >
        {{ tag.label }}
      </el-button>
    </div>

    <!-- 屏蔽词输入框 -->
    <div class="block-bar">
      <span class="block-label">屏蔽</span>
      <el-input
        v-model="blockInput"
        class="block-input"
        type="textarea"
        :rows="3"
        placeholder="屏蔽词，多个用分号 ; 分隔，例如：选举;足球"
        clearable
      />
      <span v-if="blockWords.length" class="block-count">
        已屏蔽 {{ events.length - filteredEvents.length }} 条
      </span>
    </div>

    <!-- 活跃事件 -->
    <div v-for="event in filteredEvents" :key="event.slug" class="event-card">
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
        <div class="search-bar">
          <el-input
            v-model="input"
            class="search-input"
            placeholder="请输入事件链接或 slug，点击保存收藏"
            clearable
          ></el-input>
          <el-button type="info" plain @click="hideEventBySearch">
            保存
          </el-button>
        </div>

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
import { ref, computed, watch } from "vue";
import {
  fetchPolymarketEvents,
  MarketEvent,
  fetchPolymarketEvent,
} from "./polymarket_sports";

const input = ref("");

// ===== 屏蔽词（与 EventList.vue 共用同一个 localStorage key，两个页面过滤规则一致）=====
const BLOCK_KEY = "polymarket-block-words";

const blockInput = ref(localStorage.getItem(BLOCK_KEY) || "");

// 解析屏蔽词：支持中英文分号，去空白、去空项、忽略大小写
const blockWords = computed(() =>
  blockInput.value
    .split(/[;；]/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
);

watch(blockInput, (val) => {
  localStorage.setItem(BLOCK_KEY, val);
});

const activeTag = ref('politics');
const tags = [
  { label: '政治', value: 'politics' },
  { label: '体育', value: 'sports' },
  { label: '加密', value: 'crypto' },
  { label: '电竞', value: 'esports' },
  { label: '伊朗', value: 'iran' },
  { label: '金融财务', value: 'finance' },
  { label: '地缘政治', value: 'geopolitics' },
  { label: '科技', value: 'tech' },
  { label: '流行文化', value: 'pop-culture' },
  { label: '经济', value: 'economy' },
  { label: '天气', value: 'weather' },
  { label: '选举', value: 'elections' },
  { label: '艺术', value: 'art' },
];

// interface MarketEvent {
//   slug: string;
//   title: string;
// }

const events = ref<MarketEvent[]>([]);
const hiddenEvents = ref<MarketEvent[]>([]);

// 标题或 slug 命中任一屏蔽词即过滤掉
const filteredEvents = computed(() => {
  if (!blockWords.value.length) return events.value;
  return events.value.filter((event) => {
    const text = `${event.title} ${event.slug}`.toLowerCase();
    return !blockWords.value.some((word) => text.includes(word));
  });
});

// 在组件加载时获取隐藏的事件
const loadHiddenEvents = () => {
  const hidden: MarketEvent[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // 排除非事件数据的 key：主题色、屏蔽词
    if (key && key !== "vueuse-color-scheme" && key !== BLOCK_KEY) {
      try {
        const event = getLocalStorage(key);
        // 屏蔽词的值可能恰好是合法 JSON（如 "123"），用 slug 类型兜底，避免脏数据混进来
        if (event && typeof event.slug === "string") {
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
  const eventData = await fetchPolymarketEvents(activeTag.value);
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
  // 兼容两种输入：直接传 slug，或传完整链接（自动截取 slug）
  let keyword = input.value.trim();
  const match = keyword.match(/\/event\/([^/?#]+)/);
  if (match) {
    keyword = match[1];
  }
  const event = await fetchPolymarketEvent(keyword);
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

const switchTag = (tag: string) => {
  activeTag.value = tag;
  loadEvents();
};

const hideAllEvents = () => {
  // 只处理当前可见的事件（已被屏蔽词过滤掉的不动），与屏幕上看到的数量保持一致
  filteredEvents.value.forEach((event) => {
    // 保存到 localStorage
    event.updateStatus = "隐藏";
    saveLocalStorage(event.slug, event);
  });

  // 注意：刷新调用必须放在循环外。
  // 原先写在 forEach 内部，会为每条事件打一个并发 API 请求。
  loadEvents();
  loadHiddenEvents();
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

/* 标签栏 */
.tag-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

/* 屏蔽词栏 */
.block-bar {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.block-label {
  padding-top: 8px;
  color: #606266;
  white-space: nowrap;
}

.block-input {
  flex: 1;
  max-width: 560px;
}

.block-count {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
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

/* 搜索栏样式 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.search-input {
  flex: 1;
  max-width: 500px;
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
