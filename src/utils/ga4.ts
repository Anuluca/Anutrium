import { nextTick } from 'vue'
import type { Router } from 'vue-router'

type GoogleTag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: GoogleTag
  }
}

interface GoogleAnalyticsOptions {
  measurementId?: string
  enabled?: boolean
  debug?: boolean
}

let activeMeasurementId = ''

export const trackGoogleEvent = (
  name: string,
  parameters: Record<string, unknown>
) => {
  if (!activeMeasurementId || typeof window === 'undefined') return
  window.gtag?.('event', name, {
    ...parameters,
    send_to: activeMeasurementId,
  })
}

export const installGoogleAnalytics = (
  router: Router,
  {
    measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID,
    enabled = import.meta.env.PROD ||
      import.meta.env.VITE_GA4_ENABLE_DEV === 'true',
    debug = import.meta.env.VITE_GA4_DEBUG === 'true',
  }: GoogleAnalyticsOptions = {}
) => {
  if (
    typeof window === 'undefined' ||
    !enabled ||
    !/^G-[A-Z0-9]+$/.test(measurementId || '') ||
    activeMeasurementId
  )
    return () => undefined

  activeMeasurementId = measurementId!
  window.dataLayer = window.dataLayer || []
  // 使用 arguments 保持与 Google 官方队列格式一致，脚本加载前的事件也会被消费。
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', activeMeasurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...(debug ? { debug_mode: true } : {}),
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${activeMeasurementId}`
  script.dataset.anutriumGa4 = ''
  document.head.appendChild(script)

  let disposed = false
  let previousLocation = document.referrer
  const reportPage = async (path: string) => {
    // 等待当前路由的 SEO 标题更新；失败、重复导航不产生新的浏览量。
    await nextTick()
    if (disposed) return
    const location = new URL(path, window.location.origin).href
    trackGoogleEvent('page_view', {
      page_location: location,
      page_referrer: previousLocation,
      page_title: document.title,
    })
    previousLocation = location
  }

  const removeGuard = router.afterEach((to, _from, failure) => {
    if (!failure) void reportPage(to.fullPath)
  })
  void reportPage(router.currentRoute.value.fullPath)

  return () => {
    disposed = true
    removeGuard()
    script.remove()
    activeMeasurementId = ''
  }
}
