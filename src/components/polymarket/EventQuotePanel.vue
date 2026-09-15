<template>
  <div class="quote">
    <div class="quote-meta">
      <span class="meta-item">
        <span class="meta-key">截止</span>
        {{ formatDate(quote.endDate) }}
        <span class="meta-extra">{{ deadlineHint(quote.endDate) }}</span>
      </span>
      <span class="meta-item">
        <span class="meta-key">24h量</span>
        {{ formatVolume(quote.volume24h) }}
      </span>
      <span class="meta-item">
        <span class="meta-key">总量</span>
        {{ formatVolume(quote.volume) }}
      </span>
      <span class="meta-item">
        <span class="meta-key">流动性</span>
        {{ formatVolume(quote.liquidity) }}
      </span>
      <span v-if="quote.commentCount" class="meta-item">
        <span class="meta-key">评论</span>
        {{ quote.commentCount }}
      </span>
      <span v-if="quote.closed" class="meta-flag meta-flag-closed">已闭市</span>
      <span v-for="tag in quote.tags" :key="tag" class="meta-flag">
        {{ tag }}
      </span>
    </div>

    <table v-if="quote.options.length" class="quote-table">
      <thead>
        <tr>
          <th>选项</th>
          <th class="num">当前概率</th>
          <th class="num">24h变动(pp)</th>
          <th class="num">24h量</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="option in shownOptions"
          :key="option.key"
          :class="{ closed: option.closed }"
        >
          <td>
            <div class="opt-label">{{ option.label }}</div>
            <div v-if="option.subLabel" class="opt-sub">
              {{ option.subLabel }}
            </div>
          </td>
          <td class="num">
            <div class="prob">
              <span class="prob-num">{{ formatPercent(option.price) }}</span>
              <span class="prob-track">
                <i :style="{ width: probabilityWidth(option.price) }"></i>
              </span>
            </div>
          </td>
          <td class="num">
            <span v-if="option.change24h === null" class="flat">—</span>
            <span v-else-if="option.change24h > 0" class="up">
              ▲{{ option.change24h.toFixed(1) }}
            </span>
            <span v-else-if="option.change24h < 0" class="dn">
              ▼{{ Math.abs(option.change24h).toFixed(1) }}
            </span>
            <span v-else class="flat">0.0</span>
          </td>
          <td class="num">{{ formatVolume(option.volume24h) }}</td>
        </tr>
      </tbody>
    </table>

    <button
      v-if="restCount"
      type="button"
      class="fold-toggle"
      @click="expanded = !expanded"
    >
      {{ expanded ? "收起" : `展开其余 ${restCount} 项` }}
    </button>

    <div v-if="!quote.options.length" class="quote-empty">
      这个事件暂时没有可展示的选项行情
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  daysUntil,
  formatDate,
  formatPercent,
  formatVolume,
  probabilityWidth,
  type EventQuote,
} from './polymarket-quote'

/** 默认只展开前几项，和参考报表的 TOP_N 保持一致 */
const PREVIEW_COUNT = 3

const props = defineProps<{ quote: EventQuote }>()

const expanded = ref(false)

const shownOptions = computed(() =>
  expanded.value ? props.quote.options : props.quote.options.slice(0, PREVIEW_COUNT),
)

const restCount = computed(() =>
  Math.max(props.quote.options.length - PREVIEW_COUNT, 0),
)

function deadlineHint(iso: string): string {
  const days = daysUntil(iso)
  if (days === null) return ''
  if (days < 0) return '已过截止'
  if (days === 0) return '今天截止'
  return `剩 ${days} 天`
}
</script>

<style scoped>
.quote {
  border-top: 1px dashed #e4e7ed;
  padding-top: 10px;
}

/* ===== 元信息 ===== */
.quote-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #606266;
}

.meta-item {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.meta-key {
  color: #a8abb2;
}

.meta-extra {
  color: #a8abb2;
}

.meta-flag {
  font-size: 11px;
  line-height: 18px;
  padding: 0 8px;
  border-radius: 20px;
  background: #f0f2f5;
  color: #606266;
}

.meta-flag-closed {
  background: #fde2e2;
  color: #d53a3a;
}

/* ===== 选项表格 ===== */
.quote-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.quote-table th {
  padding: 6px 10px;
  background: #fafbfc;
  border-bottom: 1px solid #eceef0;
  color: #909399;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.quote-table th.num,
.quote-table td.num {
  text-align: right;
}

.quote-table td {
  padding: 7px 10px;
  border-bottom: 1px solid #f4f5f6;
  vertical-align: top;
}

.quote-table tr:last-child td {
  border-bottom: none;
}

.quote-table tr.closed {
  opacity: 0.45;
}

.opt-label {
  font-weight: 500;
  color: #303133;
  word-break: break-word;
}

.opt-sub {
  margin-top: 2px;
  color: #a8abb2;
  font-size: 12px;
  font-weight: 400;
  word-break: break-word;
}

/* 概率数字 + 细概率条 */
.prob {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  min-width: 62px;
}

.prob-num {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: #303133;
}

.prob-track {
  display: block;
  width: 56px;
  height: 3px;
  border-radius: 2px;
  background: #ebeef5;
  overflow: hidden;
}

.prob-track i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: #409eff;
}

.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.up {
  color: #d53a3a;
  font-weight: 600;
}

.dn {
  color: #0a9d58;
  font-weight: 600;
}

.flat {
  color: #c0c4cc;
}

.fold-toggle {
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #409eff;
  font-size: 12px;
  cursor: pointer;
}

.fold-toggle:hover {
  text-decoration: underline;
}

.quote-empty {
  color: #a8abb2;
  font-size: 12px;
}
</style>
