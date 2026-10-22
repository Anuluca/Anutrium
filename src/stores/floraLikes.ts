import { ref } from 'vue'
import { defineStore } from 'pinia'

import {
  type FloraLikesSnapshot,
  type FloraPetId,
  isLikeCounts,
} from '@/types/floraLikes'

const endpoint =
  import.meta.env.VITE_FLORA_LIKES_URL ||
  (import.meta.env.DEV
    ? 'https://steam-api.anuluca.com/floratrium/likes'
    : '/api/floratrium/likes')
const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* 无持久存储时仍可在当前会话中使用。 */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* 忽略不可用存储。 */
    }
  },
}
async function request(init: RequestInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    return await fetch(endpoint, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
function parse(value: unknown): FloraLikesSnapshot {
  const data = value as FloraLikesSnapshot
  if (
    !data ||
    !isLikeCounts(data.counts) ||
    typeof data.visitorToken !== 'string' ||
    !Number.isInteger(data.remaining) ||
    data.remaining < 0 ||
    data.remaining > 10 ||
    data.limit !== 10 ||
    !Number.isFinite(Date.parse(data.resetsAt)) ||
    !Array.isArray(data.acceptedRequestIds)
  )
    throw new Error('unavailable')
  return data
}
export const useFloraLikes = defineStore('flora-likes', () => {
  const snapshot = ref<FloraLikesSnapshot | null>(null)
  const busy = ref(false)
  const error = ref('')
  let loading: Promise<void> | null = null
  let pending: { petId: FloraPetId; requestId: string } | null = null
  function accept(value: unknown) {
    snapshot.value = parse(value)
    storage.set('flora-likes-visitor', snapshot.value.visitorToken)
    if (
      pending &&
      snapshot.value.acceptedRequestIds.includes(pending.requestId)
    ) {
      pending = null
      storage.remove('flora-likes-pending')
    }
  }
  async function load(force = false) {
    if (loading) return loading
    if (
      snapshot.value &&
      !force &&
      Date.now() < Date.parse(snapshot.value.resetsAt)
    )
      return
    loading = (async () => {
      error.value = ''
      try {
        const saved = storage.get('flora-likes-pending')
        if (saved) {
          try {
            const item = JSON.parse(saved)
            if (
              ['huahua', 'xiaohei'].includes(item.petId) &&
              typeof item.requestId === 'string'
            )
              pending = item
          } catch {
            storage.remove('flora-likes-pending')
          }
        }
        const token =
          storage.get('flora-likes-visitor') ?? snapshot.value?.visitorToken
        const response = await request({
          headers: token ? { 'X-Flora-Visitor': token } : {},
          cache: 'no-store',
          credentials: 'omit',
        })
        if (!response.ok) throw new Error('unavailable')
        accept(await response.json())
      } catch {
        error.value = 'unavailable'
      } finally {
        loading = null
      }
    })()
    return loading
  }
  async function like(petId: FloraPetId) {
    if (busy.value) throw new Error('busy')
    busy.value = true
    try {
      await load()
      if (!snapshot.value) throw new Error('unavailable')
      if (pending && pending.petId !== petId) throw new Error('pending_other')
      if (!pending && !snapshot.value.remaining) throw new Error('daily_limit')
      pending ??= { petId, requestId: crypto.randomUUID() }
      storage.set('flora-likes-pending', JSON.stringify(pending))
      // 网络重试复用同一请求 ID；服务端已落库但回包丢失也不会重复计数。
      for (let attempt = 0; attempt < 2; attempt++) {
        let response: Response
        try {
          response = await request({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...pending,
              visitorToken: snapshot.value.visitorToken,
            }),
            credentials: 'omit',
          })
        } catch {
          if (!attempt) continue
          throw new Error('unconfirmed')
        }
        const data = await response.json()
        if (response.ok) {
          accept(data)
          error.value = ''
          return
        }
        if (response.status === 429) {
          accept(data)
          pending = null
          storage.remove('flora-likes-pending')
          throw new Error('daily_limit')
        }
        if (response.status === 401) {
          pending = null
          storage.remove('flora-likes-pending')
          storage.remove('flora-likes-visitor')
          snapshot.value = null
          throw new Error('unavailable')
        }
        if (response.status >= 500 && !attempt) continue
        throw new Error('unconfirmed')
      }
    } finally {
      busy.value = false
    }
  }
  return { snapshot, busy, error, load, like }
})
