/**
 * 已收藏事件的行情缓存。
 *
 * 收藏记录本身（polymarket-db）只存 slug / 标题 / 备注这些「用户数据」，
 * 概率、成交量是随时在变的行情，不适合跟用户数据混在一起持久化，
 * 所以这里只在内存里缓存，进页面时拉一次、点「刷新行情」再拉一次。
 *
 * 一次刷新对全部收藏只打**一个**批量请求（fetchEventQuotes 内部按 50 个 slug 分块）。
 */

import { ref } from 'vue'
import {
  fetchEventQuotes,
  type EventQuote,
} from '../components/polymarket/polymarket-quote'

export type { EventQuote }

export function useEventQuotes() {
  /** slug → 行情。用普通对象而不是 Map，模板里取值更省事 */
  const quotes = ref<Record<string, EventQuote>>({})
  const loading = ref(false)
  /** 拉取失败时的提示，非空就展示 */
  const error = ref('')
  /** 最后一次成功刷新的时间戳，0 表示还没成功过 */
  const lastUpdated = ref(0)
  /** 接口没返回的 slug */
  const missing = ref<string[]>([])

  // 同一时刻只允许一个刷新在飞，避免连点「刷新行情」打出一堆并发请求
  let inFlight: Promise<void> | null = null

  function getQuote(slug: string): EventQuote | null {
    return quotes.value[slug] ?? null
  }

  function hasQuote(slug: string): boolean {
    return Boolean(quotes.value[slug])
  }

  /**
   * 按 slug 列表刷新行情。
   *
   * 关键约定：**失败不清空已有行情**。网络抖一下就把满屏数据擦成空白，
   * 比显示一份略旧的数据糟糕得多，所以只在拿到结果时覆盖。
   */
  async function refresh(slugs: string[]): Promise<void> {
    if (inFlight) return inFlight

    const unique = [...new Set(slugs.filter(Boolean))]
    if (!unique.length) {
      quotes.value = {}
      missing.value = []
      error.value = ''
      lastUpdated.value = 0
      return
    }

    loading.value = true
    error.value = ''

    inFlight = (async () => {
      try {
        const result = await fetchEventQuotes(unique)

        if (result.quotes.length) {
          const next = { ...quotes.value }
          result.quotes.forEach((quote) => {
            next[quote.slug] = quote
          })
          quotes.value = next
          lastUpdated.value = Date.now()
        }

        missing.value = result.missing
        // 一个都没拿到才算失败；拿到一部分就照常显示
        if (!result.quotes.length) {
          error.value = '行情拉取失败，请检查网络后重试'
        }
      } catch (err) {
        console.error('[useEventQuotes] 刷新行情失败:', err)
        error.value = '行情拉取失败，请检查网络后重试'
      } finally {
        loading.value = false
        inFlight = null
      }
    })()

    return inFlight
  }

  return {
    quotes,
    loading,
    error,
    lastUpdated,
    missing,
    getQuote,
    hasQuote,
    refresh,
  }
}
