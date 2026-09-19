<script setup lang="ts">
/**
 * 摆渡 BAIDU 质押池看板
 *
 * 由 D:\cardano\ada本地运维\pool-stake\index.html 整合而来。
 * 与原单页的差异：
 *  - 主题不再写 <html data-theme>，改为组件根上的 .is-dark + --ps-* 变量，
 *    避免污染站点其他路由；未手动切换过时跟随站点暗色（useDark）。
 *  - 所有 CSS class / 变量加 ps- 前缀 + scoped，样式不外泄。
 *  - 切走路由时 abort 未完成的 SSE 拉取。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { isDark as siteIsDark } from '~/composables'
import {
  ADDRESS_SSE_URL,
  POOL_ADDRESS,
  POOL_ID,
  POOL_PM_URL,
  calcEpochProgress,
  comma,
  fetchAddress,
  fetchPool,
  fetchPoolViaRest,
  formatBalance,
  formatLovelace,
  formatStakeDisplay,
  formatStakeExact,
  type AddressSnapshot,
  type PoolSnapshot,
} from './pool-stake'

/* ------------------------------------------------------------------ *
 * 主题：优先用户在本页手动切过的选择，否则跟随站点暗色
 * ------------------------------------------------------------------ */
const THEME_KEY = 'poolpm-theme'

function readManualTheme(): 'dark' | 'light' | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

const manualTheme = ref<'dark' | 'light' | null>(readManualTheme())
const dark = computed(() => (manualTheme.value ? manualTheme.value === 'dark' : siteIsDark.value))

function toggleTheme() {
  const next = dark.value ? 'light' : 'dark'
  manualTheme.value = next
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    /* 隐私模式下 localStorage 可能不可用 */
  }
}

/* ------------------------------------------------------------------ *
 * 状态
 * ------------------------------------------------------------------ */
const ticker = ref('BAIDU')

const statusKind = ref<'' | 'live' | 'warn' | 'err'>('')
const statusText = ref('等待刷新')

const stakeDisplay = ref('—')
const stakeExact = ref('等待数据…')

const epochNo = ref('—')
const epochPct = ref(0)
const epochRight = ref('—')

const epochBlocks = ref('—')
const updatedAt = ref('—')

const addrStatusKind = ref<'' | 'live' | 'warn' | 'err'>('')
const addrStatusText = ref('等待刷新')
const addrBalance = ref('—')
const addrBalanceExact = ref('等待数据…')
const addrStake = ref('—')
const addrStakeExact = ref('等待数据…')

const refreshing = ref(false)
/** 只有手动点刷新才转圈（首次自动拉取不转） */
const manualSpinning = ref(false)

const toastText = ref('')
const toastOn = ref(false)

/* ------------------------------------------------------------------ *
 * 闪烁动画：数据变了才闪一下
 * ------------------------------------------------------------------ */
const stakeFlash = ref(false)
const balanceFlash = ref(false)
const stakeAcctFlash = ref(false)

const flashTimers = new Map<object, number>()

async function triggerFlash(target: typeof stakeFlash) {
  const prev = flashTimers.get(target)
  if (prev) clearTimeout(prev)
  target.value = false
  await nextTick()
  target.value = true
  flashTimers.set(
    target,
    window.setTimeout(() => {
      target.value = false
      flashTimers.delete(target)
    }, 900),
  )
}

/* ------------------------------------------------------------------ *
 * 渲染
 * ------------------------------------------------------------------ */
let lastSlot = 0
let lastStake: string | null = null
let lastBalance: string | null = null
let lastStakeValue: string | null = null

function stamp(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

function markUpdated() {
  updatedAt.value = stamp()
}

function renderEpoch() {
  const p = calcEpochProgress(lastSlot)
  if (!p) {
    epochRight.value = '等待区块数据…'
    return
  }
  epochNo.value = comma(p.epoch)
  epochPct.value = Number(p.pct.toFixed(2))
  epochRight.value = `${p.pct.toFixed(2)}% · 剩余 ${p.remainDays} 天 ${p.remainHours} 小时`
}

function renderPool(p: PoolSnapshot) {
  stakeDisplay.value = formatStakeDisplay(p.live_stake)
  stakeExact.value = formatStakeExact(p.live_stake)
  if (lastStake !== null && p.live_stake !== lastStake) void triggerFlash(stakeFlash)
  lastStake = p.live_stake

  if (p.ticker) ticker.value = p.ticker
  epochBlocks.value = p.epoch_blocks != null ? String(p.epoch_blocks) : '—'

  renderEpoch()
  markUpdated()
}

function renderAddress(m: AddressSnapshot) {
  addrBalance.value = formatBalance(m.balance)
  addrBalanceExact.value = formatLovelace(m.balance)
  if (lastBalance !== null && m.balance !== lastBalance) void triggerFlash(balanceFlash)
  lastBalance = m.balance

  addrStake.value = formatBalance(m.stake_value)
  addrStakeExact.value = formatLovelace(m.stake_value)
  if (lastStakeValue !== null && m.stake_value !== lastStakeValue) void triggerFlash(stakeAcctFlash)
  lastStakeValue = m.stake_value

  markUpdated()
}

/* ------------------------------------------------------------------ *
 * 刷新：整个生命周期只在挂载时自动拉一次 + 用户点按钮时拉
 * ------------------------------------------------------------------ */
let activeCtrl: AbortController | null = null
let toastTimer: number | null = null
let disposed = false

function toast(msg: string) {
  toastText.value = msg
  toastOn.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastOn.value = false
  }, 1500)
}

async function refreshData(manual: boolean) {
  if (refreshing.value) return
  refreshing.value = true
  manualSpinning.value = manual

  activeCtrl?.abort()
  const ctrl = new AbortController()
  activeCtrl = ctrl

  statusKind.value = ''
  statusText.value = '获取中…'
  addrStatusKind.value = ''
  addrStatusText.value = '获取中…'

  const poolTask = fetchPool(ctrl.signal)
    .then(({ pool, lastSlot: slot }) => {
      if (disposed) return
      if (slot) lastSlot = slot
      renderPool(pool)
      statusKind.value = 'live'
      statusText.value = `已更新 ${stamp()}`
    })
    .catch(() => {
      if (disposed) return
      // SSE 失败退化为 /api/delegators 求和
      return fetchPoolViaRest(ticker.value, ctrl.signal)
        .then((pool) => {
          if (disposed) return
          renderPool(pool)
          statusKind.value = 'warn'
          statusText.value = '已更新（汇总模式）'
        })
        .catch((e: unknown) => {
          if (disposed) return
          const msg = e instanceof Error ? e.message : '未知错误'
          statusKind.value = 'err'
          statusText.value = `获取失败：${msg}`
        })
    })

  const addrTask = fetchAddress(ctrl.signal)
    .then((m) => {
      if (disposed) return
      renderAddress(m)
      addrStatusKind.value = 'live'
      addrStatusText.value = `已更新 ${stamp()}`
    })
    .catch(() => {
      if (disposed) return
      addrStatusKind.value = 'err'
      addrStatusText.value = '未取到数据'
    })

  await Promise.all([poolTask, addrTask])
  if (disposed) return
  refreshing.value = false
  manualSpinning.value = false
}

function onRefresh() {
  toast('刷新数据…')
  void refreshData(true)
}

/* ------------------------------------------------------------------ *
 * 复制
 * ------------------------------------------------------------------ */
function copy(text: string, okMsg: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => toast(okMsg),
      () => toast('复制失败，请手动选择'),
    )
  } else {
    toast(text)
  }
}

/* ------------------------------------------------------------------ *
 * 生命周期
 * ------------------------------------------------------------------ */
onMounted(() => {
  void refreshData(false)
})

onBeforeUnmount(() => {
  disposed = true
  activeCtrl?.abort()
  activeCtrl = null
  if (toastTimer) clearTimeout(toastTimer)
  for (const t of flashTimers.values()) clearTimeout(t)
  flashTimers.clear()
})
</script>

<template>
  <div class="ps-root" :class="{ 'is-dark': dark }">
    <div class="ps-wrap">
      <!-- 顶栏 -->
      <div class="ps-top">
        <div class="ps-brand">
          <div class="ps-dot" />
          <div>
            <h1><span class="ps-cn">摆渡</span> BAIDU 质押池</h1>
            <span>摆渡大家，去往财富自由的彼岸</span>
          </div>
        </div>
        <div class="ps-tools">
          <div class="ps-status" :class="statusKind">
            <span class="ps-pip" /><span>{{ statusText }}</span>
          </div>
          <button
            class="ps-iconbtn"
            :class="{ spin: manualSpinning }"
            title="刷新数据"
            @click="onRefresh"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.1"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
          <button class="ps-iconbtn" title="切换主题" @click="toggleTheme">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.1"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="4.2" />
              <path
                d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- HERO -->
      <div class="ps-card ps-hero">
        <div class="ps-hero-head">
          <span class="ps-ticker">{{ ticker }}</span>
          <span class="ps-pid" title="点击复制池 ID" @click="copy(POOL_ID, '池 ID 已复制')">
            {{ POOL_ID }}
          </span>
        </div>

        <div class="ps-plate">
          <div class="ps-cn">摆渡</div>
          <p class="ps-motto">摆渡大家，去往财富自由的彼岸</p>
          <svg class="ps-wave" viewBox="0 0 158 56" fill="none" aria-hidden="true">
            <path
              d="M2 20c13 0 13-9 26-9s13 9 26 9 13-9 26-9 13 9 26 9 13-9 26-9 13 9 26 9"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
            />
            <path
              d="M2 33c13 0 13-9 26-9s13 9 26 9 13-9 26-9 13 9 26 9 13-9 26-9 13 9 26 9"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              opacity=".62"
            />
            <path
              d="M2 46c13 0 13-9 26-9s13 9 26 9 13-9 26-9 13 9 26 9 13-9 26-9 13 9 26 9"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              opacity=".34"
            />
          </svg>
        </div>

        <div class="ps-label">质押总量 · Live Stake</div>
        <div class="ps-big" :class="{ flash: stakeFlash }">
          <span>{{ stakeDisplay }}</span><span class="ps-ada">₳</span>
        </div>
        <div class="ps-exact">{{ stakeExact }}</div>
      </div>

      <!-- 关联账户余额 -->
      <div class="ps-card">
        <div class="ps-sec-title">
          关联账户余额
          <span class="ps-sp" />
          <span class="ps-status ps-mini" :class="addrStatusKind">
            <span class="ps-pip" /><span>{{ addrStatusText }}</span>
          </span>
        </div>
        <div class="ps-acct">
          <div class="ps-ac">
            <div class="ps-k">
              账户余额
              <span
                class="ps-pid ps-mini"
                title="点击复制地址"
                @click="copy(POOL_ADDRESS, '地址已复制')"
              >
                addr1qxu7…wdrg
              </span>
            </div>
            <div class="ps-v" :class="{ flash: balanceFlash }">
              {{ addrBalance }}<span class="ps-u">₳</span>
            </div>
            <div class="ps-s">{{ addrBalanceExact }}</div>
          </div>
          <div class="ps-ac">
            <div class="ps-k">质押账户余额</div>
            <div class="ps-v" :class="{ flash: stakeAcctFlash }">
              {{ addrStake }}<span class="ps-u">₳</span>
            </div>
            <div class="ps-s">{{ addrStakeExact }}</div>
          </div>
        </div>
      </div>

      <!-- EPOCH -->
      <div class="ps-card">
        <div class="ps-epoch-top">
          <div class="ps-t">Epoch <span>{{ epochNo }}</span> 进度</div>
          <div class="ps-r">{{ epochRight }}</div>
        </div>
        <div class="ps-bar"><i :style="{ width: epochPct + '%' }" /></div>
      </div>

      <!-- 池参数 -->
      <div class="ps-card">
        <div class="ps-sec-title">池参数</div>
        <div class="ps-row1">
          <div class="ps-k">本 Epoch 出块</div>
          <div class="ps-rv">{{ epochBlocks }}</div>
        </div>
      </div>

      <div class="ps-foot">
        <div>
          数据来源 <code>pool.pm/events</code> · 按需拉取（不留长连接） · 点右上角 ↻ 刷新数据
        </div>
        <div>
          最后更新 <span>{{ updatedAt }}</span> ·
          <a :href="POOL_PM_URL" target="_blank" rel="noopener">在 pool.pm 查看 ↗</a>
        </div>
      </div>
    </div>

    <div class="ps-toast" :class="{ on: toastOn }">{{ toastText }}</div>
  </div>
</template>

<style scoped>
/* 变量全部挂在组件根上（原页面写在 :root，会污染站点其它路由） */
.ps-root {
  --ps-bg: #f4f6fb;
  --ps-bg-grad: radial-gradient(1200px 600px at 15% -10%, #e5ecff 0%, transparent 60%),
    radial-gradient(1000px 500px at 100% 0%, #ffe6f0 0%, transparent 55%);
  --ps-card: #ffffff;
  --ps-text: #0f172a;
  --ps-muted: #64748b;
  --ps-faint: #94a3b8;
  --ps-line: #e6eaf2;
  --ps-accent: #0033ad;
  --ps-accent-soft: #eef3ff;
  --ps-pink: #e91e63;
  --ps-ok: #16a34a;
  --ps-ok-soft: #e8f7ee;
  --ps-warn: #d97706;
  --ps-warn-soft: #fdf3e3;
  --ps-err: #dc2626;
  --ps-err-soft: #fdeceb;
  --ps-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 10px 30px rgba(15, 23, 42, 0.07);
  --ps-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono',
    monospace;

  background: var(--ps-bg);
  background-image: var(--ps-bg-grad);
  background-attachment: fixed;
  color: var(--ps-text);
  min-height: 100vh;
  transition: background-color 0.25s ease, color 0.25s ease;
  text-align: left;
}

.ps-root.is-dark {
  --ps-bg: #0a0f1e;
  --ps-bg-grad: radial-gradient(1200px 600px at 15% -10%, #16224a 0%, transparent 60%),
    radial-gradient(1000px 500px at 100% 0%, #3a1226 0%, transparent 55%);
  --ps-card: #121a30;
  --ps-text: #e8eeff;
  --ps-muted: #93a4c8;
  --ps-faint: #6b7da3;
  --ps-line: #233052;
  --ps-accent: #7aa2ff;
  --ps-accent-soft: #1b2646;
  --ps-pink: #ff5c8a;
  --ps-ok: #4ade80;
  --ps-ok-soft: #12301f;
  --ps-warn: #fbbf24;
  --ps-warn-soft: #3a2c10;
  --ps-err: #f87171;
  --ps-err-soft: #3a1a1a;
  --ps-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 10px 30px rgba(0, 0, 0, 0.35);
}

.ps-root,
.ps-root * {
  box-sizing: border-box;
}

.ps-wrap {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 20px 56px;
}

/* ---------- top bar ---------- */
.ps-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}
.ps-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}
.ps-brand .ps-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--ps-pink);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ps-pink) 18%, transparent);
}
.ps-brand h1 {
  font-size: 15px;
  font-weight: 650;
  margin: 0;
  letter-spacing: 0.2px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.ps-brand h1 .ps-cn {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.16em;
  background: linear-gradient(
    120deg,
    var(--ps-accent),
    color-mix(in srgb, var(--ps-pink) 78%, var(--ps-accent))
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ps-brand > div > span {
  font-size: 12.5px;
  color: var(--ps-muted);
  display: block;
  margin-top: 3px;
  font-weight: 450;
  letter-spacing: 0.03em;
}
.ps-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ps-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 560;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--ps-line);
  background: var(--ps-card);
  color: var(--ps-muted);
  box-shadow: var(--ps-shadow);
  white-space: nowrap;
}
.ps-status .ps-pip {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ps-faint);
  flex: 0 0 auto;
}
.ps-status.live .ps-pip {
  background: var(--ps-ok);
  animation: ps-pulse 1.9s ease-in-out infinite;
}
.ps-status.live {
  color: var(--ps-ok);
  border-color: color-mix(in srgb, var(--ps-ok) 28%, var(--ps-line));
  background: var(--ps-ok-soft);
}
.ps-status.warn .ps-pip {
  background: var(--ps-warn);
}
.ps-status.warn {
  color: var(--ps-warn);
  background: var(--ps-warn-soft);
  border-color: color-mix(in srgb, var(--ps-warn) 28%, var(--ps-line));
}
.ps-status.err .ps-pip {
  background: var(--ps-err);
}
.ps-status.err {
  color: var(--ps-err);
  background: var(--ps-err-soft);
  border-color: color-mix(in srgb, var(--ps-err) 28%, var(--ps-line));
}
.ps-status.ps-mini {
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: none;
}
.ps-status.ps-mini .ps-pip {
  width: 6px;
  height: 6px;
}
.ps-status.ps-mini:not(.live):not(.warn):not(.err) {
  background: transparent;
  border-color: transparent;
  color: var(--ps-faint);
}
@keyframes ps-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.82);
  }
}
.ps-iconbtn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--ps-line);
  background: var(--ps-card);
  color: var(--ps-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: var(--ps-shadow);
  transition: 0.16s ease;
  padding: 0;
}
.ps-iconbtn:hover {
  color: var(--ps-accent);
  border-color: color-mix(in srgb, var(--ps-accent) 40%, var(--ps-line));
  transform: translateY(-1px);
}
.ps-iconbtn:active {
  transform: translateY(0);
}
.ps-iconbtn svg {
  width: 16px;
  height: 16px;
  display: block;
}
.ps-iconbtn.spin svg {
  animation: ps-spin 0.9s linear infinite;
}
@keyframes ps-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- cards ---------- */
.ps-card {
  background: var(--ps-card);
  border: 1px solid var(--ps-line);
  border-radius: 18px;
  box-shadow: var(--ps-shadow);
  padding: 24px;
  margin-bottom: 16px;
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

/* ---------- hero ---------- */
.ps-hero {
  position: relative;
  overflow: hidden;
}
.ps-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    600px 220px at 100% 0%,
    color-mix(in srgb, var(--ps-accent) 9%, transparent),
    transparent 70%
  );
}
.ps-hero-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.ps-ticker {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.6px;
  padding: 5px 11px;
  border-radius: 8px;
  background: var(--ps-accent-soft);
  color: var(--ps-accent);
  border: 1px solid color-mix(in srgb, var(--ps-accent) 22%, transparent);
}
.ps-pid {
  font-family: var(--ps-mono);
  font-size: 11.5px;
  color: var(--ps-faint);
  cursor: pointer;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px dashed var(--ps-line);
  background: transparent;
  transition: 0.15s ease;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ps-pid:hover {
  color: var(--ps-accent);
  border-color: color-mix(in srgb, var(--ps-accent) 45%, var(--ps-line));
}
.ps-pid.ps-mini {
  font-size: 10.5px;
  padding: 3px 7px;
  max-width: 190px;
}
.ps-label {
  font-size: 12.5px;
  color: var(--ps-muted);
  font-weight: 500;
  letter-spacing: 0.3px;
  margin: 14px 0 4px;
}
.ps-big {
  font-family: var(--ps-mono);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -1.5px;
  font-size: clamp(38px, 8.4vw, 66px);
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.ps-big .ps-ada {
  font-size: 0.42em;
  font-weight: 650;
  color: var(--ps-muted);
  letter-spacing: 0;
}
.ps-big.flash {
  animation: ps-flash 0.85s ease;
}
@keyframes ps-flash {
  0% {
    color: var(--ps-ok);
    transform: scale(1.018);
  }
  100% {
    color: var(--ps-text);
    transform: scale(1);
  }
}
.ps-exact {
  font-family: var(--ps-mono);
  font-size: 12.5px;
  color: var(--ps-faint);
  margin-top: 9px;
  font-variant-numeric: tabular-nums;
}

/* ---------- 摆渡 nameplate ---------- */
.ps-plate {
  position: relative;
  z-index: 1;
  margin: 16px 0 6px;
  padding: 17px 19px 16px;
  border-radius: 15px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ps-accent) 8%, transparent),
    color-mix(in srgb, var(--ps-pink) 7%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--ps-accent) 15%, var(--ps-line));
}
.ps-plate .ps-cn {
  display: inline-block; /* 让渐变贴着文字走，而不是横跨整个卡片宽度 */
  font-size: clamp(26px, 5vw, 32px);
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1.15;
  background: linear-gradient(
    120deg,
    var(--ps-accent),
    color-mix(in srgb, var(--ps-pink) 78%, var(--ps-accent))
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ps-plate .ps-motto {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--ps-muted);
  letter-spacing: 0.05em;
  line-height: 1.6;
}
.ps-plate .ps-wave {
  position: absolute;
  right: -6px;
  bottom: -4px;
  width: 158px;
  height: auto;
  color: var(--ps-accent);
  opacity: 0.15;
  pointer-events: none;
}
.ps-root.is-dark .ps-plate .ps-wave {
  opacity: 0.26;
}

/* ---------- epoch bar ---------- */
.ps-epoch-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 9px;
  gap: 12px;
  flex-wrap: wrap;
}
.ps-epoch-top .ps-t {
  font-size: 13px;
  font-weight: 600;
}
.ps-epoch-top .ps-r {
  font-size: 12px;
  color: var(--ps-muted);
  font-variant-numeric: tabular-nums;
}
.ps-bar {
  height: 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ps-accent) 12%, transparent);
  overflow: hidden;
}
.ps-bar > i {
  display: block;
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--ps-accent),
    color-mix(in srgb, var(--ps-pink) 70%, var(--ps-accent))
  );
  transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ---------- stats row ---------- */
/* 池参数只剩一项，用单行「标签左 / 数值右」排布，避免单元格被拉得又宽又空 */
.ps-row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 15px 17px;
  border: 1px solid var(--ps-line);
  border-radius: 14px;
  background: var(--ps-card);
}
.ps-row1 .ps-k {
  font-size: 12px;
  color: var(--ps-muted);
  font-weight: 500;
}
.ps-row1 .ps-rv {
  font-family: var(--ps-mono);
  font-size: 22px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
  color: var(--ps-text);
}

/* ---------- account balances ---------- */
.ps-acct {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--ps-line);
  border: 1px solid var(--ps-line);
  border-radius: 14px;
  overflow: hidden;
}
.ps-ac {
  background: var(--ps-card);
  padding: 17px 18px;
  min-width: 0;
}
.ps-ac .ps-k {
  font-size: 11.5px;
  color: var(--ps-muted);
  font-weight: 550;
  margin-bottom: 9px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ps-ac .ps-v {
  font-family: var(--ps-mono);
  font-size: clamp(21px, 3.6vw, 29px);
  font-weight: 700;
  letter-spacing: -0.9px;
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: baseline;
  gap: 5px;
  line-height: 1.1;
  flex-wrap: wrap;
}
.ps-ac .ps-v .ps-u {
  font-size: 0.5em;
  font-weight: 600;
  color: var(--ps-muted);
}
.ps-ac .ps-v.flash {
  animation: ps-flash 0.85s ease;
}
.ps-ac .ps-s {
  font-family: var(--ps-mono);
  font-size: 11px;
  color: var(--ps-faint);
  margin-top: 7px;
  font-variant-numeric: tabular-nums;
}

/* ---------- section title ---------- */
.ps-sec-title {
  font-size: 13px;
  font-weight: 650;
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ps-text);
}
.ps-sec-title::before {
  content: '';
  width: 3px;
  height: 13px;
  border-radius: 2px;
  flex: 0 0 auto;
  background: linear-gradient(
    180deg,
    var(--ps-accent),
    color-mix(in srgb, var(--ps-pink) 80%, var(--ps-accent))
  );
}
.ps-sec-title .ps-sp {
  flex: 1;
}

/* ---------- footer ---------- */
.ps-foot {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: var(--ps-faint);
  padding: 4px 4px 0;
  line-height: 1.7;
}
.ps-foot a {
  color: var(--ps-muted);
  text-decoration: none;
  border-bottom: 1px dotted var(--ps-line);
}
.ps-foot a:hover {
  color: var(--ps-accent);
}
.ps-foot code {
  font-family: var(--ps-mono);
  font-size: 11px;
  background: var(--ps-accent-soft);
  padding: 1.5px 6px;
  border-radius: 5px;
  color: var(--ps-muted);
}

/* ---------- toast ---------- */
.ps-toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translate(-50%, 14px);
  background: var(--ps-text);
  color: var(--ps-bg);
  font-size: 12.5px;
  font-weight: 550;
  padding: 9px 16px;
  border-radius: 10px;
  opacity: 0;
  pointer-events: none;
  transition: 0.22s ease;
  z-index: 99;
}
.ps-toast.on {
  opacity: 0.96;
  transform: translate(-50%, 0);
}

@media (max-width: 560px) {
  .ps-wrap {
    padding: 18px 14px 44px;
  }
  .ps-card {
    padding: 18px;
    border-radius: 15px;
  }
  .ps-acct {
    grid-template-columns: 1fr;
  }
  .ps-foot {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
