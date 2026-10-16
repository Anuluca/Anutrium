import { trackGoogleEvent } from './ga4'

export { installGoogleAnalytics } from './ga4'

type AnalyticsEventName =
  | 'external_link_click'
  | 'project_click'
  | 'resume_click'
  | 'share'
  | 'tool_click'

type AnalyticsValue = boolean | number | string | null | undefined

interface AnalyticsPayload {
  [key: string]: AnalyticsValue
}

export const trackEvent = (
  event: AnalyticsEventName,
  payload: AnalyticsPayload = {}
) => {
  if (typeof window === 'undefined') return
  const parameters: Record<string, string | number> = {
    path: window.location.pathname,
    viewport:
      window.innerWidth < 768
        ? 'mobile'
        : window.innerWidth < 1200
        ? 'tablet'
        : 'desktop',
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string')
      parameters[key] = value.replace(/\s+/g, ' ').trim().slice(0, 100)
    else if (typeof value === 'boolean') parameters[key] = Number(value)
    else if (typeof value === 'number' && Number.isFinite(value))
      parameters[key] = value
  }
  trackGoogleEvent(event, parameters)
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

    let url: URL
    try {
      url = new URL(href, window.location.href)
    } catch {
      return
    }
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
