type AnalyticsEventName =
  | 'external_link_click'
  | 'project_click'
  | 'resume_click'
  | 'share'
  | 'tool_click'
  | 'tool_use'

type AnalyticsValue = boolean | number | string | null | undefined

interface AnalyticsPayload {
  [key: string]: AnalyticsValue
}

const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT as
  | string
  | undefined

const trimValue = (value: AnalyticsValue) => {
  if (typeof value !== 'string') return value
  return value.replace(/\s+/g, ' ').trim().slice(0, 240)
}

const getViewport = () => {
  if (typeof window === 'undefined') return 'server'
  if (window.innerWidth < 768) return 'mobile'
  if (window.innerWidth < 1200) return 'tablet'
  return 'desktop'
}

export const trackEvent = (
  event: AnalyticsEventName,
  payload: AnalyticsPayload = {}
) => {
  if (typeof window === 'undefined') return

  const eventPayload = {
    event,
    path: window.location.pathname,
    viewport: getViewport(),
    language: navigator.language,
    ts: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, trimValue(value)])
    ),
  }

  window.dispatchEvent(
    new CustomEvent('anutrium:analytics', { detail: eventPayload })
  )

  if (!ANALYTICS_ENDPOINT) return

  const body = JSON.stringify(eventPayload)

  if (navigator.sendBeacon) {
    const queued = navigator.sendBeacon(
      ANALYTICS_ENDPOINT,
      new Blob([body], { type: 'application/json' })
    )
    if (queued) return
  }

  fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}

export const trackProjectClick = (project: {
  id?: string
  title?: string
  source?: string
}) => {
  trackEvent('project_click', {
    project_id: project.id,
    project_title: project.title,
    source: project.source,
  })
}

export const trackToolClick = (tool: {
  id?: string
  title?: string
  source?: string
}) => {
  trackEvent('tool_click', {
    tool_id: tool.id,
    tool_title: tool.title,
    source: tool.source,
  })
}

export const trackToolUse = (tool: { id?: string; title?: string }) => {
  trackEvent('tool_use', {
    tool_id: tool.id,
    tool_title: tool.title,
  })
}

export const trackShare = (target: {
  method?: string
  targetId?: string
  targetTitle?: string
  targetType?: string
  url?: string
}) => {
  trackEvent('share', {
    method: target.method,
    target_id: target.targetId,
    target_title: target.targetTitle,
    target_type: target.targetType,
    url: target.url,
  })
}

export const installExternalLinkTracking = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => undefined
  }

  const handleClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const anchor = target.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) return

    const href = anchor.getAttribute('href')
    if (!href) return

    const url = new URL(href, window.location.href)
    const isMailOrTel = ['mailto:', 'tel:'].includes(url.protocol)
    const isExternalHttp =
      ['http:', 'https:'].includes(url.protocol) &&
      url.origin !== window.location.origin

    if (!isMailOrTel && !isExternalHttp) return

    trackEvent('external_link_click', {
      href: isMailOrTel ? url.protocol.replace(':', '') : url.origin,
      label: anchor.textContent || anchor.getAttribute('aria-label') || '',
      link_type: isMailOrTel ? url.protocol.replace(':', '') : 'external',
    })
  }

  document.addEventListener('click', handleClick, true)
  return () => document.removeEventListener('click', handleClick, true)
}
