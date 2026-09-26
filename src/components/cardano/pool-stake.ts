/**
 * 摆渡 BAIDU 质押池数据层
 *
 * 数据全部来自 pool.pm，且**只在用户点刷新或首次进入页面时拉一次**：
 * pool.pm 只在 SSE 接口上给数据，但我们不要长连接 ——
 * 用 fetch 打开流、凑齐需要的帧就立刻 abort。页面平时零请求、零后端依赖。
 */

/** 池 ID（BAIDU / 摆渡） */
export const POOL_ID = 'pool1c86ul4pnqvu7jzag8fjdy6dgrn6pt4ad4vmyq038hyg0wl2kaed'

/** 关联地址：余额 + 质押账户余额 */
export const POOL_ADDRESS =
  'addr1qxu7nks0vt5te3dx2wmwq5ytz7td8hsvytl2zwkrjvwm0vmy3va7sk0l7yrpe9m3s3230ynqef8p0997ddhvkpkrkuysdhwdrg'

export const POOL_SSE_URL = `https://pool.pm/events/${POOL_ID}?dpr=1`
/** SSE 拿不到池数据时的退化路径：把 delegators 的 live_stake 求和 */
export const POOL_REST_URL = `https://pool.pm/api/delegators/${POOL_ID}`
export const ADDRESS_SSE_URL = `https://pool.pm/events/${POOL_ADDRESS}?dpr=1`

/** pool.pm 页面地址（页脚外链用） */
export const POOL_PM_URL = `https://pool.pm/${POOL_ID}`

/** BAIDU 质押池文档站（点 BAIDU 徽章跳转） */
export const POOL_DOC_URL = 'https://zjavax.github.io/cardano_doc/#/'

export interface SseMessage {
  type: string
  // pool.pm 的帧字段随 type 变化，这里只声明用得到的几个
  live_stake?: string
  slot?: number
  epoch?: number
  epoch_blocks?: number
  ticker?: string
  balance?: string
  stake_value?: string
  /** Config 帧带：创世参数（用来推链尖 slot） */
  genesis?: unknown
  [key: string]: unknown
}

export interface PoolSnapshot {
  ticker: string
  live_stake: string
  epoch: number | null
  epoch_blocks: number | null
  /** 是否来自 /api/delegators 求和（退化模式） */
  aggregated: boolean
}

export interface AddressSnapshot {
  balance: string
  stake_value: string
}

/* ------------------------------------------------------------------ *
 * 格式化
 * ------------------------------------------------------------------ */

export function comma(n: string | number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** lovelace -> { whole, frac, display }；用 BigInt 避免大数精度丢失 */
export function toAda(lovelace: string | number | bigint): {
  whole: bigint
  frac: string
  display: string
} {
  let v: bigint
  try {
    v = BigInt(lovelace as string)
  } catch {
    v = BigInt(Math.round(Number(lovelace)))
  }
  const M = 1000000n
  const whole = v / M
  const frac = (v % M).toString().padStart(6, '0')
  return { whole, frac, display: comma(whole.toString()) }
}

/** 质押总量的主显示：整数部分（原页面就是只显示整数 + 单独一行精确值） */
export function formatStakeDisplay(lovelace: string | number | bigint): string {
  return toAda(lovelace).display
}

/** 精确值行：12,345.678901 ₳ */
export function formatStakeExact(lovelace: string | number | bigint): string {
  const a = toAda(lovelace)
  return `精确值 ${a.display}.${a.frac} ₳`
}

/** 余额显示：整数部分 + 去掉末尾 0 的最多 6 位小数 */
export function formatBalance(lovelace: string | number | bigint): string {
  const a = toAda(lovelace)
  const f = a.frac.replace(/0+$/, '').slice(0, 6)
  return a.display + (f ? `.${f}` : '')
}

/** 余额下方的 lovelace 精确值行 */
export function formatLovelace(lovelace: string | number | bigint): string {
  let v: bigint
  try {
    v = BigInt(lovelace as string)
  } catch {
    v = BigInt(Math.round(Number(lovelace)))
  }
  return `${comma(v.toString())} lovelace`
}

/* ------------------------------------------------------------------ *
 * Epoch（Cardano 主网）
 *
 * ⚠ 进度**绝不能**拿 SSE 里 Block 帧的 slot 来算 —— 那是「本池自己出的块」，
 * 小池可能十几个小时才出一个。实测 BAIDU 的最后一个块落后链尖 10.7 小时，
 * 照它算出来的进度差 8.95 个百分点、剩余时间差 10 小时；出块间隔再长一点
 * 连 epoch 号都会差一个（09-22 那次就是：页面显示 656，链上是 657）。
 *
 * 正确做法：锚定 Shelley 创世参数，用**本机时间**推算链尖 slot：
 *     slot = shelley_known_slot + (unix秒 - shelley_known_time)
 * 已用 Koios /tip 校验过（abs_slot 198475767 ↔ block_time 1790042058，精确吻合），
 * 误差只来自链尖本身滞后几个 slot，5 天里小于 0.02%。
 *
 * epoch 号以 pool.pm 的 Pool 帧为准（链上权威），本机时间推算的只用来交叉校验：
 * 两者对不上且差得离谱，说明是本机系统时间偏了，此时进度不可信，要直说。
 * ------------------------------------------------------------------ */

const SHELLEY_SLOT = 4492800
const EPOCH_LEN = 432000
/** epoch 208 = 首个 Shelley epoch */
const EPOCH_OFFSET = 208
/** Shelley 创世锚点：slot 4492800 ↔ 1596059091（2020-07-29 21:44:51 UTC） */
const GENESIS_SLOT = 4492800
const GENESIS_TIME = 1596059091

/** 链上 epoch 与本机时间推算差超过这个量，就认定本机时间偏了（6 小时） */
const CLOCK_TOLERANCE_S = 6 * 3600

/**
 * 创世锚点。SSE 的 Config 帧会覆盖它 —— 覆盖只是为了不把参数写死，
 * 实测 pool.pm 给的三个值和上面的默认值完全一致。
 */
const anchor = { slot: GENESIS_SLOT, time: GENESIS_TIME, epochLen: EPOCH_LEN }

/** 用 Config 帧刷新创世锚点；字段缺失就保持原值 */
export function applyGenesis(genesis: unknown): void {
  if (!genesis || typeof genesis !== 'object') return
  const g = genesis as Record<string, unknown>
  if (typeof g.shelley_known_slot === 'number') anchor.slot = g.shelley_known_slot
  if (typeof g.shelley_known_time === 'number') anchor.time = g.shelley_known_time
  if (typeof g.shelley_epoch_length === 'number') anchor.epochLen = g.shelley_epoch_length
}

/** 用本机时间推算链尖 slot（不依赖任何网络数据） */
export function currentSlot(nowMs: number = Date.now()): number {
  return anchor.slot + Math.floor(nowMs / 1000 - anchor.time)
}

export interface EpochProgress {
  /** epoch 号：pool.pm 给了就用它的，没给就用本机时间推算 */
  epoch: number
  /** 本纪元已走过的百分比，0..100 */
  pct: number
  remainDays: number
  remainHours: number
  /** 本机系统时间和链上对不上（差 6 小时以上）→ 进度不可信 */
  suspect: boolean
  /** 悬停说明；一切正常时为空串 */
  title: string
}

/**
 * 算 epoch 进度。不需要任何网络数据 —— 链尖 slot 由本机时间推出来。
 * epochNo 传 null 时用推算值（池数据没拿到也能显示正确的进度）。
 */
export function calcEpochProgress(epochNo: number | null, nowMs: number = Date.now()): EpochProgress {
  const slotNow = currentSlot(nowMs)
  const epochLen = anchor.epochLen
  const epFromSlot = EPOCH_OFFSET + Math.floor((slotNow - SHELLEY_SLOT) / epochLen)
  const epoch = epochNo != null ? epochNo : epFromSlot

  // 进度 = 链尖 slot 相对「本纪元起始 slot」走了多远
  const epochStart = SHELLEY_SLOT + (epoch - EPOCH_OFFSET) * epochLen
  let inEpoch = slotNow - epochStart

  const base = { epoch, pct: 0, remainDays: 0, remainHours: 0, suspect: false, title: '' }

  // 链上 epoch 与按本机时间推算的对不上时，要分清两种情况，别一律报警：
  //   ① 刚跨过纪元、pool.pm 的数据还停在旧纪元（只差几分钟）→ 照边界显示就行
  //   ② 本机系统时间真的偏了（差几小时以上）→ 进度不可信，直说
  if (epochNo != null && epochNo !== epFromSlot) {
    const off = inEpoch < 0 ? -inEpoch : inEpoch - epochLen + 1
    if (off > CLOCK_TOLERANCE_S) {
      return {
        ...base,
        suspect: true,
        title:
          `链上 epoch ${epochNo}，按本机时间推算却是 ${epFromSlot}。` +
          '请校准系统时间后刷新。',
      }
    }
  }

  if (inEpoch < 0) inEpoch = 0
  if (inEpoch >= epochLen) inEpoch = epochLen - 1

  const pct = (inEpoch / epochLen) * 100
  const leftS = epochLen - inEpoch
  return {
    ...base,
    pct,
    remainDays: Math.floor(leftS / 86400),
    remainHours: Math.floor((leftS % 86400) / 3600),
  }
}

/* ------------------------------------------------------------------ *
 * 按需 SSE 拉取
 * ------------------------------------------------------------------ */

/**
 * 打开 SSE 流，凑齐 needTypes 里的消息类型就断开。
 *
 * - needTypes：需要凑齐的消息类型
 * - budgetMs ：整体最长等待
 * - graceMs  ：拿到第一个需要的帧后额外多等这么久（兜底，避免只差一帧就断）
 */
export function collectSSE(
  url: string,
  needTypes: string[],
  budgetMs: number,
  graceMs: number,
  signal?: AbortSignal,
): Promise<SseMessage[]> {
  return new Promise((resolve) => {
    const out: SseMessage[] = []
    const got: Record<string, boolean> = {}
    let settled = false
    const ctrl = new AbortController()
    let graceTimer: ReturnType<typeof setTimeout> | null = null

    const budgetTimer = setTimeout(finish, budgetMs)

    function finish() {
      if (settled) return
      settled = true
      clearTimeout(budgetTimer)
      if (graceTimer) clearTimeout(graceTimer)
      if (signal) signal.removeEventListener('abort', finish)
      try {
        ctrl.abort()
      } catch {
        /* ignore */
      }
      resolve(out)
    }

    function allGot() {
      return needTypes.every((t) => got[t])
    }

    function eat(msgs: SseMessage[]) {
      for (const m of msgs) {
        if (!m || !m.type) continue
        if (!got[m.type]) {
          got[m.type] = true
          out.push(m)
          if (!graceTimer && needTypes.indexOf(m.type) >= 0) {
            graceTimer = setTimeout(finish, graceMs)
          }
        } else {
          out.push(m)
        }
      }
      if (allGot()) finish()
    }

    if (!window.fetch || !window.AbortController) {
      finish()
      return
    }
    if (signal) {
      if (signal.aborted) {
        finish()
        return
      }
      signal.addEventListener('abort', finish, { once: true })
    }

    fetch(url, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { Accept: 'text/event-stream' },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        if (!res.body || !res.body.getReader) throw new Error('当前浏览器不支持流式读取')
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        const pump = (): void => {
          reader.read().then(
            (r) => {
              if (settled) return
              if (r.done) {
                finish()
                return
              }
              buf += dec.decode(r.value, { stream: true })
              let idx: number
              while ((idx = buf.indexOf('\n')) >= 0) {
                let line = buf.slice(0, idx)
                buf = buf.slice(idx + 1)
                if (line.charAt(line.length - 1) === '\r') line = line.slice(0, -1)
                if (line.slice(0, 5) !== 'data:') continue
                const payload = line.slice(5).trim()
                if (!payload) continue
                let msg: unknown
                try {
                  msg = JSON.parse(payload)
                } catch {
                  continue
                }
                eat((Array.isArray(msg) ? msg : [msg]) as SseMessage[])
                if (settled) return
              }
              pump()
            },
            () => finish(),
          )
        }
        pump()
      })
      .catch(() => finish())
  })
}

/**
 * 池总量：SSE 只要 Config + Pool 两帧 —— Config 给创世锚点（用来推链尖 slot），
 * Pool 给池数据。**不要再等 Block**：那是本池自己出的块，出块间隔不固定，等它只会白等。
 * （实测 Config 与 Pool 同毫秒到达，400ms 的兜底窗口足够。）
 */
export async function fetchPool(signal?: AbortSignal): Promise<PoolSnapshot> {
  const msgs = await collectSSE(POOL_SSE_URL, ['Config', 'Pool'], 9000, 400, signal)
  let pool: SseMessage | null = null
  for (const m of msgs) {
    if (m.type === 'Config') applyGenesis(m.genesis)
    if (m.type === 'Pool') pool = m
  }
  if (!pool) throw new Error('没拿到池数据')
  return {
    ticker: (pool.ticker as string) || 'BAIDU',
    live_stake: String(pool.live_stake ?? '0'),
    epoch: typeof pool.epoch === 'number' ? pool.epoch : null,
    epoch_blocks: typeof pool.epoch_blocks === 'number' ? pool.epoch_blocks : null,
    aggregated: false,
  }
}

/** 退化路径：/api/delegators 把 live_stake 求和 */
export async function fetchPoolViaRest(
  ticker: string,
  signal?: AbortSignal,
): Promise<PoolSnapshot> {
  const res = await fetch(POOL_REST_URL, { cache: 'no-store', signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { delegators?: Array<{ live_stake?: string }> }
  const list = data.delegators || []
  if (!list.length) throw new Error('汇总结果为空')
  let sum = 0n
  for (const d of list) {
    try {
      sum += BigInt(d.live_stake ?? '0')
    } catch {
      /* 单条脏数据跳过 */
    }
  }
  return {
    ticker,
    live_stake: sum.toString(),
    epoch: null,
    epoch_blocks: null,
    aggregated: true,
  }
}

/** 地址余额：pool.pm 没有对应的 REST 接口，只能走 SSE */
export async function fetchAddress(signal?: AbortSignal): Promise<AddressSnapshot> {
  const msgs = await collectSSE(ADDRESS_SSE_URL, ['Address'], 9000, 800, signal)
  for (const m of msgs) {
    if (m.type === 'Address') {
      return {
        balance: String(m.balance ?? '0'),
        stake_value: String(m.stake_value ?? '0'),
      }
    }
  }
  throw new Error('没拿到地址数据')
}
