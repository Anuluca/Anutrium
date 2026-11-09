import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

import type { NoteSummary } from '@/utils/noteDocument'

// 列表只在完整拉取成功后替换，无需为每条只读元信息建立深层响应式代理。
const remoteNotes = shallowRef<NoteSummary[]>([])
// 概览与列表共享排序结果，只有远端列表更新时重新排序。
const sortedNotes = computed(() =>
  [...remoteNotes.value].sort(
    (a, b) => b.time.localeCompare(a.time) || a.id.localeCompare(b.id)
  )
)
const error = ref(false)
const loading = ref(false)
let pending: Promise<void> | undefined
let hasLoaded = false
const CACHE_TTL_MS = 60_000
let loadedAt = 0
let consumers = 0

export const notesEndpoint = import.meta.env.DEV
  ? 'https://steam-api.anuluca.com/notes'
  : '/api/notes'

const reload = () => {
  if (pending) return pending
  loading.value = true
  error.value = false
  pending = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const notes: NoteSummary[] = []
      let cursor: string | null = null
      const seen = new Set<string>()
      do {
        const response = await fetch(
          `${notesEndpoint}${
            cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
          }`,
          { cache: 'no-store', signal: controller.signal }
        )
        if (!response.ok) throw new Error('notes_unavailable')
        const page = await response.json()
        if (!Array.isArray(page.notes)) throw new Error('invalid_notes')
        notes.push(...page.notes)
        cursor = page.nextCursor
        if (cursor !== null && (typeof cursor !== 'string' || seen.has(cursor)))
          throw new Error('invalid_cursor')
        if (cursor) seen.add(cursor)
      } while (cursor)
      remoteNotes.value = notes
      // 空列表也缓存；过期后的后台更新保留已有卡片，避免重新显示整页加载。
      hasLoaded = true
      loadedAt = Date.now()
    } catch {
      error.value = true
    } finally {
      clearTimeout(timeout)
      loading.value = false
      pending = undefined
    }
  })()
  return pending
}

const refreshIfStale = () => {
  if (document.visibilityState === 'hidden') return
  if (!hasLoaded || Date.now() - loadedAt >= CACHE_TTL_MS) void reload()
}

export function useNotes() {
  onMounted(() => {
    // 概览与 Notes 共享监听和进行中的请求，短时间来回切换不重复拉取。
    if (consumers++ === 0) {
      window.addEventListener('focus', refreshIfStale)
      document.addEventListener('visibilitychange', refreshIfStale)
    }
    refreshIfStale()
  })
  onBeforeUnmount(() => {
    if (--consumers === 0) {
      window.removeEventListener('focus', refreshIfStale)
      document.removeEventListener('visibilitychange', refreshIfStale)
    }
  })
  return {
    notes: sortedNotes,
    error,
    loading,
    reload,
  }
}
