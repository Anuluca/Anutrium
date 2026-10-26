import { computed, ref } from 'vue'

let tracking = true
const checking = ref(0)
const checked = ref(0)
const missed = ref(false)
export const startupCacheState = computed(() =>
  missed.value ? 'miss' : checking.value || !checked.value ? 'checking' : 'hit'
)

export function finishStartupCacheCheck() {
  tracking = false
}

export async function fetchStartupAsset(url: string, signal: AbortSignal) {
  // 入口模式确定或已发现缺失后，后续模型直接走正常缓存策略。
  if (!tracking || missed.value) return fetch(url, { signal })
  checking.value++
  try {
    // 版本化资源查询真实 HTTP 缓存，命中后直接复用响应体。
    const response = await fetch(url, {
      cache: 'only-if-cached',
      mode: 'same-origin',
      signal,
    })
    if (response.ok) return response
    missed.value = true
  } catch {
    missed.value = true
  } finally {
    checked.value++
    checking.value--
  }
  return fetch(url, { signal })
}

export function startupScriptsCached() {
  let found = false
  for (const entry of performance.getEntriesByType('resource')) {
    if (
      !(entry instanceof PerformanceResourceTiming) ||
      !/\.(?:m?js|css)(?:\?|$)/.test(entry.name) ||
      new URL(entry.name).origin !== location.origin
    )
      continue
    if (
      (entry.transferSize !== 0 && entry.transferSize !== 300) ||
      entry.decodedBodySize <= 0
    )
      return false
    found = true
  }
  return found
}
