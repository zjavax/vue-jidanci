<template>
  <div class="event-list">
    <el-alert
      v-if="ready && !supported"
      class="unsupported-alert"
      type="warning"
      :closable="false"
      show-icon
      title="当前浏览器不支持 IndexedDB，收藏与隐藏不会被保存"
    />

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
        已屏蔽 {{ blockedCount(events.length, visibleEvents.length) }} 条
      </span>
    </div>

    <!-- 数据工具条：重新拉一次事件列表 + 已收藏的行情。
         放在屏蔽词下面、事件卡片上面 —— 这里是「页面上所有数据」的总开关，
         和已收藏分组头里那个只刷行情的「刷新行情」不是一回事。
         「跳到已收藏」只是滚动导航，不发任何请求。 -->
    <div class="list-toolbar">
      <el-button
        type="primary"
        plain
        size="small"
        :loading="eventsLoading"
        @click="reloadAll"
      >
        刷新数据
      </el-button>
      <el-button
        type="primary"
        plain
        size="small"
        :disabled="!favorites.length"
        @click="scrollToFavorites"
      >
        跳到已收藏事件
      </el-button>
      <span v-if="eventsFetchedClock" class="fetched-at">
        数据获取于 {{ eventsFetchedClock }}
      </span>
      <span v-if="eventsError" class="fetched-error">{{ eventsError }}</span>
    </div>

    <!-- 活跃事件 -->
    <div
      v-for="card in activeCards"
      :key="card.event.slug"
      class="event-card"
      :class="{ 'with-quote': card.quote }"
    >
      <div class="card-main">
        <a
          :href="`https://polymarket.com/zh/event/${card.event.slug}`"
          target="_blank"
          class="event-title"
        >
          {{ card.event.title }}
        </a>
        <div class="action-group">
          <el-button
            type="info"
            plain
            size="small"
            @click="markEvent(card.event, 'hidden')"
          >
            隐藏
          </el-button>
          <el-button
            type="warning"
            plain
            size="small"
            @click="markEvent(card.event, 'favorite', card.quote)"
          >
            收藏
          </el-button>
        </div>
      </div>

      <!-- 默认铺开前 3 项，其余折在「展开其余 N 项」后面 -->
      <EventQuotePanel v-if="card.quote" :quote="card.quote" />
    </div>

    <!-- 管理区域：不再依赖「有没有已管理事件」才渲染。
         搜索栏是收藏的入口，如果它跟着整块一起消失，就会出现
         「想收藏得先有收藏」的鸡生蛋问题。 -->
    <div class="managed-section">
      <el-divider content-position="left">已管理事件</el-divider>

      <!-- 已收藏。这个 ref 是工具条上「跳到已收藏」的锚点 -->
      <div ref="favoritesAnchor" class="sub-group">
        <div class="search-bar">
          <el-input
            v-model="input"
            class="search-input"
            placeholder="请输入事件链接或 slug，点击保存收藏"
            clearable
            @keyup.enter="saveByInput"
          ></el-input>
          <el-button
            type="info"
            plain
            :loading="saving"
            @click="saveByInput"
          >
            保存
          </el-button>
        </div>

        <div class="group-header">
          <el-tag type="warning" effect="dark" size="small">
            已收藏 {{ favorites.length }}
          </el-tag>
          <el-button
            v-if="favorites.length"
            type="primary"
            plain
            size="small"
            :loading="quotesLoading"
            @click="refreshQuotes"
          >
            刷新行情
          </el-button>
          <span v-if="quotesUpdatedAt" class="quotes-updated">
            行情更新于 {{ quotesUpdatedAt }}
          </span>
          <span v-else-if="quotesError" class="quotes-error">
            {{ quotesError }}
          </span>
          <el-button
            v-if="favorites.length"
            type="primary"
            link
            size="small"
            @click="showSlugs"
          >
            查看slug
          </el-button>
        </div>

        <!-- 使用 template 包裹 v-for，解决优先级问题 -->
        <template v-for="card in favoriteCards" :key="card.event.slug">
          <div
            class="event-card managed favorite"
            :class="{ pinned: card.event.pinned }"
          >
            <div class="card-main">
              <span v-if="card.event.pinned" class="pin-flag">置顶</span>
              <a
                :href="`https://polymarket.com/zh/event/${card.event.slug}`"
                target="_blank"
                class="event-title"
              >
                {{ card.event.title }}
              </a>
              <div class="action-group">
                <el-button
                  :type="card.event.pinned ? 'danger' : 'warning'"
                  plain
                  size="small"
                  @click="togglePin(card.event.slug)"
                >
                  {{ card.event.pinned ? '取消置顶' : '置顶' }}
                </el-button>
                <el-button
                  type="primary"
                  plain
                  size="small"
                  @click="startEditNote(card.event)"
                >
                  备注
                </el-button>
                <el-button
                  type="info"
                  plain
                  size="small"
                  @click="markEvent(card.event, 'hidden')"
                >
                  隐藏
                </el-button>
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="unmarkEvent(card.event.slug)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <div
              v-if="card.event.note && editingSlug !== card.event.slug"
              class="card-note"
            >
              {{ card.event.note }}
            </div>

            <div v-if="editingSlug === card.event.slug" class="note-editor">
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
                  @click="saveNote(card.event.slug)"
                >
                  保存备注
                </el-button>
              </div>
            </div>

            <!-- 行情明细：截止时间 / 成交量 + 选项概率表。
                 传了 baseline 就把「24h变动」列换成「较收藏时」。 -->
            <EventQuotePanel
              v-if="card.quote"
              :quote="card.quote"
              :baseline="card.event.baseline"
            />
            <div v-else-if="quotesLoading" class="quote-placeholder">
              行情加载中…
            </div>
            <div v-else-if="quotesError" class="quote-placeholder error">
              {{ quotesError }}
            </div>

          </div>
        </template>

        <div v-if="ready && !favorites.length" class="empty-hint">
          还没有收藏。粘贴事件链接或 slug 到上面的输入框，点保存即可。
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

        <!-- 使用 template 包裹 v-for，解决优先级问题。
             这里必须是 v-if 而不是 v-show：v-show 只是 display:none，
             隐藏列表的卡片节点和里面的 el-button 组件实例照样全部创建，
             隐藏几百条时光首屏建节点就够卡了。改成 v-if 之后，没展开时
             这块 DOM 根本不存在，点标题才渲染。
             数据本来就在 IndexedDB 里（hiddenEvents 是个纯 computed），
             所以「点击才获取」不需要额外请求，展开时同步渲染即可。 -->
        <div v-if="hiddenOpen" class="collapse-body">
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

      <!-- 批量收藏：低频功能，默认折叠，放在整个页面的最底部 -->
      <div class="sub-group">
        <div class="group-header">
          <button
            type="button"
            class="collapse-toggle"
            :aria-expanded="batchOpen"
            @click="batchOpen = !batchOpen"
          >
            <span class="caret" :class="{ open: batchOpen }"></span>
            <span class="batch-toggle-label">批量收藏</span>
          </button>
          <span v-if="batchCount" class="batch-count">
            识别到 {{ batchCount }} 个 slug
          </span>
        </div>

        <div v-show="batchOpen" class="collapse-body">
          <div class="batch-bar">
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
      </div>
    </div>

    <!-- slug 弹框 -->
    <el-dialog v-model="slugDialogVisible" title="已收藏事件 slug" width="600px">
      <div class="slug-list">{{ slugsText }}</div>
      <template #footer>
        <el-button @click="copySlugs">复制</el-button>
        <el-button type="primary" @click="slugDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { fetchPolymarketEvents, type MarketEvent } from "./polymarket";
import EventQuotePanel from "./EventQuotePanel.vue";
import { buildEventQuote, formatClock } from "./polymarket-quote";
import {
  useEventStore,
  parseSlugList,
  type StoredEvent,
} from "../../composables/useEventStore";
import { useEventQuotes } from "../../composables/useEventQuotes";

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
  ensureBaselines,
  addBySlugOrUrl,
  addManyBySlugs,
} = useEventStore();

const {
  quotes,
  loading: quotesLoading,
  error: quotesError,
  lastUpdated: quotesLastUpdated,
  getQuote,
  hasQuote,
  refresh: fetchQuotes,
} = useEventQuotes();

const events = ref<MarketEvent[]>([]);

// 「已管理」「屏蔽词」两个过滤条件都作用在 computed 上，
// 所以标记/取消标记之后不需要重新请求接口；想拿新数据就点工具条上的「刷新数据」。
const visibleEvents = computed(() => filterVisible(events.value));

const eventsLoading = ref(false);
const eventsError = ref("");
/** 列表最后一次成功拉取的时刻 */
const eventsFetchedAt = ref(0);

const eventsFetchedClock = computed(() =>
  eventsFetchedAt.value ? formatClock(eventsFetchedAt.value) : "",
);

/**
 * 请求序号：连点刷新、或（sports 页）快速切标签时，只认最后一次的结果。
 * 不能用「正在加载就直接 return」来防连点 —— 那会让切标签丢掉后一次请求，
 * 出现「标签已经切了、列表还是上一个分类」的错位。
 */
let loadSeq = 0;

async function loadEvents() {
  const seq = ++loadSeq;
  eventsLoading.value = true;
  eventsError.value = "";
  try {
    const list = await fetchPolymarketEvents();
    if (seq !== loadSeq) return; // 已经有更新的请求发出去了，这次结果作废
    // fetchPolymarketEvents 把异常吞掉、返回 []，所以「空结果」只能当失败处理。
    // 这时**保留旧列表** —— 刷新失败不该把正在看的内容清空。
    if (!list.length) {
      eventsError.value = "没拿到数据，请检查网络后重试";
      return;
    }
    events.value = list;
    eventsFetchedAt.value = Date.now();
  } finally {
    if (seq === loadSeq) eventsLoading.value = false;
  }
}

/**
 * 「刷新数据」：事件列表和已收藏的行情一起重拉。
 * 只刷一半会出现「列表是新的、行情是旧的」，看着像数据错乱。
 */
async function reloadAll() {
  await Promise.all([loadEvents(), refreshQuotes()]);
}

/** 「已收藏」分组的锚点。工具条在页面顶部，收藏区在最下面，中间隔着上百条活跃事件。 */
const favoritesAnchor = ref<HTMLElement | null>(null);

/**
 * 「跳到已收藏」：把收藏区滚到视口顶部。
 * 用 ref 拿元素，而不是 querySelector('.sub-group') —— 「已隐藏」「批量收藏」用的是同一个
 * class，按 class 取会滚错地方。
 */
function scrollToFavorites() {
  favoritesAnchor.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ===== 活跃列表：行情 =====
//
// 列表接口（/events/keyset）返回的事件**本身就带着 markets**，所以正常情况下
// 一条额外请求都不用打。万一某条没带 markets（接口字段变动），就把缺的 slug
// 交给行情层补拉 —— 有兜底，不必赌接口形状。
const activeCards = computed(() =>
  visibleEvents.value.map((event) => ({
    event,
    quote:
      quotes.value[event.slug] ??
      (event.markets?.length ? buildEventQuote(event) : null),
  })),
);

const missingActiveSlugs = computed(() =>
  visibleEvents.value
    .filter((event) => !event.markets?.length && !hasQuote(event.slug))
    .map((event) => event.slug)
    .join("|"),
);

watch(missingActiveSlugs, (pending) => {
  if (pending) fetchQuotes(pending.split("|"));
});

// ===== 已收藏：行情 =====
//
// 收藏记录里只有 slug / 标题，概率和成交量得另外拉。这里把两者配成对，
// 模板里就不必反复调 getQuote() 再处理 null。
const favoriteCards = computed(() =>
  favorites.value.map((event) => ({
    event,
    quote: quotes.value[event.slug] ?? null,
  })),
);

const favoriteSlugs = computed(() => favorites.value.map((event) => event.slug));

const quotesUpdatedAt = computed(() =>
  quotesLastUpdated.value ? formatClock(quotesLastUpdated.value) : "",
);

function refreshQuotes() {
  return fetchQuotes(favoriteSlugs.value);
}

// 新收藏进来的事件还没行情时补拉一次。只在「缺行情的 slug 组合」变化时触发，
// 拉到结果之后组合变成空串，不会再触发，不存在来回刷的死循环。
watch(
  () =>
    favorites.value
      .filter((event) => !hasQuote(event.slug))
      .map((event) => event.slug)
      .join("|"),
  (pending) => {
    if (pending) refreshQuotes();
  },
);

// 给「还没有基准」的收藏补一个基准 —— 这个功能上线前收藏的老记录，
// 以及收藏那一刻行情还没拉到的。ensureBaselines 幂等，补完组合变空串就不再触发。
watch(
  () =>
    favorites.value
      .filter((event) => !event.baseline && hasQuote(event.slug))
      .map((event) => event.slug)
      .join("|"),
  (pending) => {
    if (!pending) return;
    ensureBaselines(
      pending
        .split("|")
        .map((slug) => ({ slug, quote: quotes.value[slug] ?? null })),
    );
  },
);

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
// 默认折叠、并且放在页面最底下：它是「一次性导入」用的，不该抢收藏列表的位置。
const batchOpen = ref(false);
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
// 只处理屏幕上看得到的那些（已被屏蔽词挡掉的不动），与用户看到的数量保持一致。
async function hideAllVisible() {
  await markMany(visibleEvents.value, "hidden");
}

// ===== slug 弹框 =====
const slugDialogVisible = ref(false);
const slugsText = ref("");

function showSlugs() {
  slugsText.value = favorites.value.map((event) => event.slug).join("\n");
  slugDialogVisible.value = true;
}

function copySlugs() {
  navigator.clipboard.writeText(slugsText.value);
}

// 必须在 onMounted 里读库：vite-ssg 预渲染跑在 Node 上，没有 indexedDB。
onMounted(async () => {
  await Promise.all([init(), loadEvents()]);
  // 收藏读出来之后才知道要拉哪些 slug，所以放在 init 之后。
  // 不 await：行情慢不该拖住首屏，卡片会先显示「行情加载中…」。
  refreshQuotes();
});
</script>

<style scoped>
.event-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
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

/* 数据工具条 */
.list-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.fetched-at {
  font-size: 12px;
  color: #909399;
}

.fetched-error {
  font-size: 12px;
  color: #d53a3a;
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

/* 活跃卡片带上行情后改成纵向：标题行 + 行情块 */
.event-card.with-quote {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
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

/* slug 列表弹框内容 */
.slug-list {
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.8;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
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

/* 行情状态提示 */
.quotes-updated {
  font-size: 12px;
  color: #909399;
}

.quotes-error {
  font-size: 12px;
  color: #d53a3a;
}

.quote-placeholder {
  border-top: 1px dashed #e4e7ed;
  padding-top: 10px;
  font-size: 12px;
  color: #a8abb2;
}

.quote-placeholder.error {
  color: #d53a3a;
}

/* 批量收藏 */
.batch-bar {
  margin-top: 10px;
  padding: 14px 16px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
}

.batch-toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
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
