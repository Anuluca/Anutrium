import { ANALYTICS_RANGES } from '@/config/siteAnalytics'

import type {
  RealtimeAnalytics,
  SiteAnalytics,
  VisitorCount,
} from '@/types/siteAnalytics'

type Payload = SiteAnalytics | RealtimeAnalytics | VisitorCount
interface Pending {
  controller: AbortController
  promise: Promise<Payload>
  subscribers: number
}
interface Resource {
  value?: Payload
  expiresAt: number
  pending?: Pending
}

const base = (
  import.meta.env.VITE_GA4_REPORTS_URL ||
  (import.meta.env.DEV
    ? 'https://steam-api.anuluca.com/analytics'
    : '/api/analytics')
).replace(/\/$/, '')
// 仅缓存固定统计路径，不随路由重挂载丢失。
const resources = new Map<string, Resource>()
const aborted = () =>
  new DOMException('Analytics request cancelled', 'AbortError')

function request<T extends Payload>(
  path: string,
  signal: AbortSignal,
  force: boolean,
  ttl: number
): Promise<T> {
  if (signal.aborted) return Promise.reject(aborted())
  let resource = resources.get(path)
  if (!resource) {
    resource = { expiresAt: 0 }
    resources.set(path, resource)
  }
  if (!force && resource.value && resource.expiresAt > Date.now())
    return Promise.resolve(resource.value as T)
  if (!resource.pending || resource.pending.controller.signal.aborted) {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      path === '/realtime' ? 25000 : 45000
    )
    const current = resource
    const pending: Pending = {
      controller,
      subscribers: 0,
      promise: Promise.resolve().then(async () => {
        try {
          const response = await fetch(`${base}${path}`, {
            signal: controller.signal,
          })
          const payload = await response.json().catch(() => null)
          if (!response.ok || !Array.isArray(payload?.reports))
            throw new Error(
              payload?.error === 'analytics_not_configured'
                ? 'setup'
                : 'network'
            )
          if (controller.signal.aborted) throw aborted()
          if (current.pending === pending) {
            current.value = payload
            const lifetime =
              payload.activeUsers === null ||
              payload.count === null ||
              payload.reports.some(
                (report: { status: string }) => report.status !== 'ready'
              )
                ? 15000
                : ttl
            const generated = Date.parse(payload.generatedAt)
            current.expiresAt =
              Math.min(
                Date.now(),
                Number.isFinite(generated) ? generated : Date.now()
              ) + lifetime
          }
          return payload
        } finally {
          clearTimeout(timeout)
          if (current.pending === pending) current.pending = undefined
        }
      }),
    }
    resource.pending = pending
  }
  const pending = resource.pending
  pending.subscribers++
  // 多个挂载点共享一次请求；只在最后一个订阅者离开时取消底层 fetch。
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const release = () => {
      signal.removeEventListener('abort', cancel)
      pending.subscribers--
      if (!pending.subscribers && resource!.pending === pending)
        pending.controller.abort()
    }
    const cancel = () => {
      if (settled) return
      settled = true
      release()
      reject(aborted())
    }
    signal.addEventListener('abort', cancel, { once: true })
    pending.promise.then(
      (value) => {
        if (settled) return
        settled = true
        release()
        resolve(value as T)
      },
      (error) => {
        if (settled) return
        settled = true
        release()
        reject(error)
      }
    )
  })
}

export function readAnalyticsSummary(
  days: number,
  signal: AbortSignal,
  force = false
) {
  if (!(ANALYTICS_RANGES as readonly number[]).includes(days))
    return Promise.reject(new Error('invalid_range'))
  return request<SiteAnalytics>(`/summary?days=${days}`, signal, force, 600000)
}
export const readAnalyticsRealtime = (signal: AbortSignal, force = false) =>
  request<RealtimeAnalytics>('/realtime', signal, force, 30000)

export const readVisitorViews = (signal: AbortSignal) =>
  request<VisitorCount>('/views', signal, false, 600000)
export const readVisitorOnline = (signal: AbortSignal) =>
  request<VisitorCount>('/online', signal, false, 30000)
