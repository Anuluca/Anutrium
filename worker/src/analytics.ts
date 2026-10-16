import { ANALYTICS_RANGES } from '../../src/config/siteAnalytics'
import { loadAnalyticsReports, loadRealtimeAnalytics } from './analyticsReports'
import {
  AnalyticsApiError,
  createGoogleAnalyticsClient,
} from './googleAnalyticsClient'
import { jsonResponse } from './http'

export async function handleAnalytics(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url)
  const realtime = url.pathname.endsWith('/realtime')
  const days = Number(url.searchParams.get('days') || 30)
  if (!realtime && !(ANALYTICS_RANGES as readonly number[]).includes(days))
    return jsonResponse({ error: 'invalid_range' }, 400, {
      'Cache-Control': 'no-store',
    })
  if (
    !/^\d+$/.test(env.GA4_PROPERTY_ID || '') ||
    !env.GA4_SERVICE_ACCOUNT_JSON ||
    (realtime && !/^\d+$/.test(env.GA4_STREAM_ID || ''))
  )
    return jsonResponse({ error: 'analytics_not_configured' }, 503, {
      'Cache-Control': 'no-store',
    })
  const key = new Request(
    new URL(
      `/__analytics/v4/${env.GA4_PROPERTY_ID}/${env.GA4_STREAM_ID}/${
        realtime ? 'realtime' : days
      }`,
      url.origin
    )
  )
  const cached = await caches.default.match(key)
  if (cached) return cached
  try {
    const google = await createGoogleAnalyticsClient(env)
    const data = realtime
      ? await loadRealtimeAnalytics(google, env.GA4_STREAM_ID)
      : await loadAnalyticsReports(google, days)
    // 上游部分失败时短缓存，避免把瞬时失败保留十分钟。
    const partial =
      ('activeUsers' in data && data.activeUsers === null) ||
      data.reports.some((report) => report.status === 'unavailable')
    const browserTtl = partial ? 15 : realtime ? 30 : 300
    const edgeTtl = partial ? 30 : realtime ? 60 : 600
    const response = jsonResponse(data, 200, {
      'Cache-Control': `public, max-age=${browserTtl}, s-maxage=${edgeTtl}`,
    })
    ctx.waitUntil(caches.default.put(key, response.clone()))
    return response
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'analytics_read_failed',
        realtime,
        status: error instanceof AnalyticsApiError ? error.status : 502,
      })
    )
    return jsonResponse({ error: 'analytics_unavailable' }, 502, {
      'Cache-Control': 'no-store',
    })
  }
}
