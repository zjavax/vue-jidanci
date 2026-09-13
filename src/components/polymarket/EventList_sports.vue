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

    <el-alert
      v-if="ready && !supported"
      class="unsupported-alert"
      type="warning"
      :closable="false"
      show-icon
      title="当前浏览器不支持 IndexedDB，收藏与隐藏不会被保存"
    />

    <!-- 屏蔽词输入框（与 EventList.vue 共用同一个 key，两个页面过滤规则一致） -->
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
        已屏蔽 {{ blockedCount(events.length, visibleEvents.length) }} 条
      </span>
    </div>

    <!-- 活跃事件 -->
    <div v-for="event in visibleEvents" :key="event.slug" class="event-card">
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
          @click="markEvent(event, 'hidden')"
        >
          隐藏
        </el-button>
        <el-button
          type="warning"
          plain
          size="small"
          @click="markEvent(event, 'favorite')"
        >
          收藏
        </el-button>
      </div>
    </div>

    <!-- 管理区域 -->
    <!-- 管理区域：不再依赖「有没有已管理事件」才渲染。
         搜索栏是收藏的入口，如果它跟着整块一起消失，就会出现
         「想收藏得先有收藏」的鸡生蛋问题。 -->
    <div class="managed-section">
      <el-divider content-position="left">已管理事件</el-divider>

      <!-- 已收藏 -->
      <div class="sub-group">
        <div class="search-bar">
          <el-input
            v-model="input"
            class="search-input"
            placeholder="请输入事件链接或 slug，点击保存收藏"
            clearable
            @keyup.enter="saveByInput"
          ></el-input>
          <el-button type="info" plain :loading="saving" @click="saveByInput">
            保存
          </el-button>
        </div>

        <div class="group-header">
          <el-tag type="warning" effect="dark" size="small">
            已收藏 {{ favorites.length }}
          </el-tag>
        </div>

        <!-- 使用 template 包裹 v-for，解决优先级问题 -->
        <template v-for="event in favorites" :key="event.slug">
          <div
            class="event-card managed favorite"
            :class="{ pinned: event.pinned }"
          >
            <div class="card-main">
              <span v-if="event.pinned" class="pin-flag">置顶</span>
              <a
                :href="`https://polymarket.com/zh/event/${event.slug}`"
                target="_blank"
                class="event-title"
              >
                {{ event.title }}
              </a>
              <div class="action-group">
                <el-button
                  :type="event.pinned ? 'danger' : 'warning'"
                  plain
                  size="small"
                  @click="togglePin(event.slug)"
                >
                  {{ event.pinned ? '取消置顶' : '置顶' }}
                </el-button>
                <el-button
                  type="primary"
                  plain
                  size="small"
                  @click="startEditNote(event)"
                >
                  备注
                </el-button>
                <el-button
                  type="info"
                  plain
                  size="small"
                  @click="markEvent(event, 'hidden')"
                >
                  隐藏
                </el-button>
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="unmarkEvent(event.slug)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <div
              v-if="event.note && editingSlug !== event.slug"
              class="card-note"
            >
              {{ event.note }}
            </div>

            <div v-if="editingSlug === event.slug" class="note-editor">
              <el-input
                v-model="noteDraft"
                type="textarea"
                :rows="2"
                maxlength="300"
                show-word-limit
                placeholder="给这条收藏写点备注"
              />
              <div class="note-actions">
                <el-button size="small" @click="cancelEditNote">取消</el-button>
                <el-button
                  type="primary"
                  size="small"
                  @click="saveNote(event.slug)"
                >
                  保存备注
                </el-button>
              </div>
            </div>
          </div>
        </template>

        <div v-if="ready && !favorites.length" class="empty-hint">
          还没有收藏。粘贴事件链接或 slug 到上面的输入框，点保存即可。
        </div>

        <!-- 批量收藏：每行一个 slug 或链接 -->
        <div class="batch-bar">
          <div class="batch-title">批量收藏</div>
          <el-input
            v-model="batchInput"
            type="textarea"
            :rows="4"
            placeholder="每行一个 slug 或链接"
          />
          <div class="batch-actions">
            <span class="batch-count">
              {{
                batchCount
                  ? `识别到 ${batchCount} 个 slug`
                  : "每行一个，支持裸 slug 或完整链接"
              }}
            </span>
            <el-button
              type="info"
              plain
              :loading="batchSaving"
              @click="saveBatch"
            >
              保存全部
            </el-button>
          </div>
        </div>
      </div>

      <!-- 已隐藏：默认折叠，点标题展开 -->
      <div class="sub-group">
        <div class="group-header">
          <button
            type="button"
            class="collapse-toggle"
            :aria-expanded="hiddenOpen"
            @click="hiddenOpen = !hiddenOpen"
          >
            <span class="caret" :class="{ open: hiddenOpen }"></span>
            <el-tag type="info" effect="dark" size="small">
              已隐藏 {{ hiddenEvents.length }}
            </el-tag>
          </button>

          <el-button
            v-if="hiddenEvents.length"
            type="primary"
            link
            size="small"
            @click="clearByStatus('hidden')"
          >
            全部删除
          </el-button>

          <el-button
            v-if="visibleEvents.length"
            type="primary"
            link
            size="small"
            @click="hideAllVisible"
          >
            全部隐藏
          </el-button>
        </div>

        <!-- 使用 template 包裹 v-for，解决优先级问题 -->
        <div v-show="hiddenOpen" class="collapse-body">
          <template v-for="event in hiddenEvents" :key="event.slug">
          <div class="event-card managed">
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
                @click="markEvent(event, 'favorite')"
              >
                收藏
              </el-button>
              <el-button
                type="primary"
                link
                size="small"
                @click="unmarkEvent(event.slug)"
              >
                删除
              </el-button>
            </div>
          </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  fetchPolymarketEvents,
  type MarketEvent,
} from "./polymarket_sports";
import {
  useEventStore,
  parseSlugList,
  type StoredEvent,
} from "../../composables/useEventStore";

// 解构出来，让每个 ref 成为顶层绑定 —— 否则模板里的 `store.xxx` 不会自动解包。
const {
  ready,
  supported,
  favorites,
  hiddenEvents,
  filterVisible,
  blockedCount,
  blockInput,
  blockWords,
  init,
  markEvent,
  markMany,
  unmarkEvent,
  clearByStatus,
  togglePin,
  setNote,
  addBySlugOrUrl,
  addManyBySlugs,
} = useEventStore();

const activeTag = ref("politics");
const tags = [
  { label: "政治", value: "politics" },
  { label: "体育", value: "sports" },
  { label: "加密", value: "crypto" },
  { label: "电竞", value: "esports" },
  { label: "伊朗", value: "iran" },
  { label: "金融财务", value: "finance" },
  { label: "地缘政治", value: "geopolitics" },
  { label: "科技", value: "tech" },
  { label: "流行文化", value: "pop-culture" },
  { label: "经济", value: "economy" },
  { label: "天气", value: "weather" },
  { label: "选举", value: "elections" },
  { label: "艺术", value: "art" },
];

const events = ref<MarketEvent[]>([]);

const visibleEvents = computed(() => filterVisible(events.value));

async function loadEvents() {
  events.value = await fetchPolymarketEvents(activeTag.value);
}

function switchTag(tag: string) {
  activeTag.value = tag;
  loadEvents();
}

// ===== 已收藏：备注 =====
const editingSlug = ref("");
const noteDraft = ref("");

function startEditNote(event: StoredEvent) {
  editingSlug.value = event.slug;
  noteDraft.value = event.note;
}

function cancelEditNote() {
  editingSlug.value = "";
  noteDraft.value = "";
}

async function saveNote(slug: string) {
  await setNote(slug, noteDraft.value.trim());
  cancelEditNote();
}

// ===== 已收藏：按链接 / slug 保存 =====
const input = ref("");
const saving = ref(false);

async function saveByInput() {
  if (saving.value) return;
  const value = input.value.trim();
  if (!value) {
    ElMessage.warning("请输入事件链接或 slug");
    return;
  }
  saving.value = true;
  // 立刻清空输入框，不等网络请求 + 写库。否则从点击到清空之间有一两百毫秒，
  // 用户会以为没反应而重复点。
  input.value = "";
  try {
    const result = await addBySlugOrUrl(value);
    if (result.ok) {
      ElMessage.success(`已收藏：${result.title}`);
    } else {
      input.value = value; // 失败就把输入还回去，别让用户重打
      ElMessage.error(result.message || "保存失败");
    }
  } finally {
    saving.value = false;
  }
}

// ===== 已隐藏：默认折叠 =====
const hiddenOpen = ref(false);

// ===== 批量收藏 =====
const batchInput = ref("");
const batchSaving = ref(false);
const batchCount = computed(() => parseSlugList(batchInput.value).slugs.length);

async function saveBatch() {
  if (batchSaving.value) return;
  if (!batchCount.value) {
    ElMessage.warning("请先粘贴 slug 或链接，每行一个");
    return;
  }
  batchSaving.value = true;
  try {
    const result = await addManyBySlugs(batchInput.value);

    const parts = [`已收藏 ${result.added} 个`];
    if (result.alreadyFavorite.length)
      parts.push(`${result.alreadyFavorite.length} 个已是收藏`);
    if (result.notFound.length) parts.push(`${result.notFound.length} 个未找到`);
    if (result.duplicated.length) parts.push(`${result.duplicated.length} 个重复`);
    if (result.invalid.length) parts.push(`${result.invalid.length} 个解析失败`);
    const summary = parts.join("，");

    // 没成功的留在框里，方便改完重试
    const leftovers = [...result.notFound, ...result.invalid];
    if (leftovers.length) {
      ElMessage.warning(summary);
      batchInput.value = leftovers.join("\n");
    } else {
      ElMessage.success(summary);
      batchInput.value = "";
    }
  } finally {
    batchSaving.value = false;
  }
}

// ===== 已隐藏：全部隐藏当前可见的 =====
async function hideAllVisible() {
  await markMany(visibleEvents.value, "hidden");
}

// 必须在 onMounted 里读库：vite-ssg 预渲染跑在 Node 上，没有 indexedDB。
onMounted(async () => {
  await Promise.all([init(), loadEvents()]);
});
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
  flex-wrap: wrap;
}

.unsupported-alert {
  margin-bottom: 16px;
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
  flex-wrap: wrap;
  justify-content: flex-end;
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
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

/* 已管理卡片特殊样式 */
.event-card.managed {
  background-color: #f5f7fa;
  border-style: dashed;
}

.card-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 收藏卡片改成纵向布局，容纳备注和收藏时间 */
.event-card.favorite {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  border-left: 3px solid #e6a23c;
}

.event-card.favorite.pinned {
  border-left-color: #f56c6c;
  background-color: #fef6f6;
}

.card-main {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  flex-wrap: wrap;
}

.card-main .event-title {
  margin-right: 0;
}

.pin-flag {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  color: #fff;
  background: #f56c6c;
}

.card-note {
  font-size: 13px;
  color: #606266;
  background: #fff;
  border-left: 2px solid #e6a23c;
  padding: 6px 10px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.note-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 分组折叠 */
.collapse-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.caret {
  width: 0;
  height: 0;
  border-left: 5px solid #909399;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transition: transform 0.2s;
}

.caret.open {
  transform: rotate(90deg);
}

.collapse-body {
  margin-top: 10px;
}

.empty-hint {
  padding: 10px 16px;
  color: #909399;
  font-size: 13px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
}

/* 批量收藏 */
.batch-bar {
  margin-top: 16px;
  padding: 14px 16px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
}

.batch-title {
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.batch-count {
  font-size: 12px;
  color: #909399;
}
</style>
