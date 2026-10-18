import type { VisitorCount } from '../../src/types/siteAnalytics'
import type {
  GoogleAnalyticsClient,
  GoogleReport,
} from './googleAnalyticsClient'

// 同一资源内的新旧站正式地址与历史部署地址；排除 localhost 和预览环境。
export const VISITOR_HOSTS = [
  'anuluca.com',
  'www.anuluca.com',
  'anuluca.icu',
  'www.anuluca.icu',
  'anuluca.cn',
  'www.anuluca.cn',
  'anuluca.github.io',
  'anulucaen.github.io',
  'anulucas-blog.pages.dev',
  'anuluca.netlify.app',
  'anulucacom2024.netlify.app',
  'anulua.netlify.app',
]

export async function loadVisitorCount(
  google: GoogleAnalyticsClient,
  kind: 'views' | 'online',
  streamId: string
): Promise<VisitorCount> {
  const online = kind === 'online'
  const report = await google<GoogleReport>(
    online ? 'runRealtimeReport' : 'runReport',
    online
      ? {
          metrics: [{ name: 'activeUsers' }],
          minuteRanges: [{ startMinutesAgo: 4, endMinutesAgo: 0 }],
          dimensionFilter: {
            filter: {
              fieldName: 'streamId',
              stringFilter: { matchType: 'EXACT', value: streamId },
            },
          },
        }
      : {
          metrics: [{ name: 'screenPageViews' }],
          dateRanges: [{ startDate: '2015-08-14', endDate: 'today' }],
          dimensionFilter: {
            filter: {
              fieldName: 'hostName',
              inListFilter: { values: VISITOR_HOSTS, caseSensitive: false },
            },
          },
        }
  )
  const raw = report.rows?.[0]?.metricValues?.[0]?.value
  const value = raw === undefined ? (online ? 0 : null) : Number(raw)
  return {
    generatedAt: new Date().toISOString(),
    count:
      value !== null && Number.isFinite(value) && value >= 0 ? value : null,
    reports: [],
  }
}
