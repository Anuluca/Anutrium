import {
  SUMMARY_METRICS,
  unavailableReport,
} from '../../src/config/siteAnalytics'
import type {
  AnalyticsReport,
  AnalyticsRow,
  RealtimeAnalytics,
  SiteAnalytics,
} from '../../src/types/siteAnalytics'
import {
  AnalyticsApiError,
  type GoogleAnalyticsClient,
  type GoogleReport,
} from './googleAnalyticsClient'

interface ReportSpec {
  id: string
  dimensions: readonly string[]
  metrics: readonly string[]
  eventName?: string
}
const trafficMetrics = [
  'activeUsers',
  'sessions',
  'screenPageViews',
  'engagementRate',
]
const specs: ReportSpec[] = [
  { id: 'overview', dimensions: [], metrics: SUMMARY_METRICS.overview },
  { id: 'engagement', dimensions: [], metrics: SUMMARY_METRICS.engagement },
  {
    id: 'trend',
    dimensions: ['date'],
    metrics: [
      'activeUsers',
      'newUsers',
      'sessions',
      'screenPageViews',
      'eventCount',
    ],
  },
  {
    id: 'pages',
    dimensions: ['pagePath'],
    metrics: [
      'screenPageViews',
      'activeUsers',
      'userEngagementDuration',
      'eventCount',
    ],
  },
  { id: 'landing', dimensions: ['landingPage'], metrics: trafficMetrics },
  {
    id: 'channels',
    dimensions: ['sessionDefaultChannelGroup'],
    metrics: trafficMetrics,
  },
  {
    id: 'sources',
    dimensions: ['sessionSourceMedium'],
    metrics: trafficMetrics,
  },
  {
    id: 'firstSources',
    dimensions: ['firstUserSourceMedium'],
    metrics: ['totalUsers', 'newUsers'],
  },
  {
    id: 'campaigns',
    dimensions: ['sessionCampaignName'],
    metrics: trafficMetrics,
  },
  { id: 'countries', dimensions: ['country'], metrics: trafficMetrics },
  {
    id: 'regions',
    dimensions: ['country', 'region'],
    metrics: ['activeUsers', 'sessions'],
  },
  {
    id: 'cities',
    dimensions: ['country', 'city'],
    metrics: ['activeUsers', 'sessions'],
  },
  { id: 'devices', dimensions: ['deviceCategory'], metrics: trafficMetrics },
  {
    id: 'browsers',
    dimensions: ['browser'],
    metrics: ['activeUsers', 'sessions'],
  },
  {
    id: 'systems',
    dimensions: ['operatingSystem'],
    metrics: ['activeUsers', 'sessions'],
  },
  {
    id: 'languages',
    dimensions: ['language'],
    metrics: ['activeUsers', 'sessions'],
  },
  {
    id: 'screens',
    dimensions: ['screenResolution'],
    metrics: ['activeUsers', 'sessions'],
  },
  {
    id: 'events',
    dimensions: ['eventName'],
    metrics: ['eventCount', 'totalUsers', 'keyEvents'],
  },
  {
    id: 'hours',
    dimensions: ['hour'],
    metrics: ['activeUsers', 'sessions', 'screenPageViews'],
  },
  {
    id: 'weekdays',
    dimensions: ['dayOfWeek'],
    metrics: ['activeUsers', 'sessions', 'screenPageViews'],
  },
  {
    id: 'projects',
    dimensions: ['customEvent:project_title'],
    metrics: ['eventCount'],
    eventName: 'project_click',
  },
  {
    id: 'tools',
    dimensions: ['customEvent:tool_title'],
    metrics: ['eventCount'],
    eventName: 'tool_click',
  },
  {
    id: 'shares',
    dimensions: ['customEvent:method'],
    metrics: ['eventCount'],
    eventName: 'share',
  },
]

const hostFilter = {
  filter: {
    fieldName: 'hostName',
    inListFilter: {
      values: ['anuluca.com', 'www.anuluca.com'],
      caseSensitive: false,
    },
  },
}
// 固定查询结构只构造一次；请求期间仅附加日期范围。
const queries = specs.map((spec) => ({
  spec,
  request: {
    dimensions: spec.dimensions.map((name) => ({ name })),
    metrics: spec.metrics.map((name) => ({ name })),
    dimensionFilter: spec.eventName
      ? {
          andGroup: {
            expressions: [
              hostFilter,
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: { matchType: 'EXACT', value: spec.eventName },
                },
              },
            ],
          },
        }
      : hostFilter,
    limit: spec.id === 'trend' ? 90 : spec.id === 'hours' ? 24 : 20,
    orderBys: ['trend', 'hours', 'weekdays'].includes(spec.id)
      ? [{ dimension: { dimensionName: spec.dimensions[0] } }]
      : [{ metric: { metricName: spec.metrics[0] }, desc: true }],
  },
}))

function normalized(id: string, report?: GoogleReport): AnalyticsReport {
  if (!report) return unavailableReport(id)
  const rows: AnalyticsRow[] = (report.rows || [])
    .filter(
      (row) =>
        !row.dimensionValues?.some(({ value }) => value.startsWith('RESERVED_'))
    )
    .map((row) => ({
      dimensions: (row.dimensionValues || []).map(({ value }) => value),
      metrics: Object.fromEntries(
        (report.metricHeaders || []).map(({ name }, index) => {
          const value = Number(row.metricValues?.[index]?.value || 0)
          return [name, Number.isFinite(value) ? value : 0]
        })
      ),
    }))
  return {
    id,
    status: 'ready',
    rows,
    rowCount: report.rowCount ?? rows.length,
    thresholded: !!report.metadata?.subjectToThresholding,
    sampled: !!report.metadata?.samplingMetadatas?.length,
    dataLoss: !!report.metadata?.dataLossFromOtherRow,
  }
}

export async function loadAnalyticsReports(
  google: GoogleAnalyticsClient,
  days: number
): Promise<SiteAnalytics> {
  const reports: AnalyticsReport[] = []
  let timeZone = ''
  const dateRanges = [
    { startDate: days === 1 ? 'today' : `${days - 1}daysAgo`, endDate: 'today' },
  ]
  for (let offset = 0; offset < queries.length; offset += 5) {
    const group = queries.slice(offset, offset + 5)
    const requests = group.map(({ request }) => ({ ...request, dateRanges }))
    try {
      const result = await google<{ reports: GoogleReport[] }>(
        'batchRunReports',
        { requests }
      )
      group.forEach(({ spec }, index) => {
        timeZone ||= result.reports[index]?.metadata?.timeZone || ''
        reports.push(normalized(spec.id, result.reports[index]))
      })
    } catch (error) {
      if (
        error instanceof AnalyticsApiError &&
        ([401, 403, 429].includes(error.status) || error.status >= 500)
      )
        throw error
      // 正常路径合并自定义维度；仅在维度无效的 400 错误时拆分隔离，限流和权限错误不放大请求。
      if (
        group.some(({ spec }) => spec.eventName) &&
        error instanceof AnalyticsApiError &&
        error.status === 400
      ) {
        for (const [index, { spec }] of group.entries()) {
          try {
            reports.push(
              normalized(
                spec.id,
                await google<GoogleReport>('runReport', requests[index])
              )
            )
          } catch {
            reports.push(unavailableReport(spec.id))
          }
        }
      } else
        group.forEach(({ spec }) => reports.push(unavailableReport(spec.id)))
    }
  }
  if (reports.every((report) => report.status === 'unavailable'))
    throw new AnalyticsApiError(502)
  return { days, generatedAt: new Date().toISOString(), timeZone, reports }
}

export async function loadRealtimeAnalytics(
  google: GoogleAnalyticsClient,
  streamId: string
): Promise<RealtimeAnalytics> {
  const dimensionFilter = {
    filter: {
      fieldName: 'streamId',
      stringFilter: { matchType: 'EXACT', value: streamId },
    },
  }
  const results = await Promise.allSettled([
    google<GoogleReport>('runRealtimeReport', {
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      metricAggregations: ['TOTAL'],
      dimensionFilter,
      limit: 20,
    }),
    google<GoogleReport>('runRealtimeReport', {
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter,
      limit: 20,
    }),
  ])
  if (results.every((result) => result.status === 'rejected'))
    throw new AnalyticsApiError(502)
  const country =
    results[0].status === 'fulfilled' ? results[0].value : undefined
  const total =
    country?.totals?.[0] ||
    country?.rows?.find((row) =>
      row.dimensionValues?.some(({ value }) => value === 'RESERVED_TOTAL')
    )
  const raw = total?.metricValues?.[0]?.value
  // 不把按国家的去重人数相加；使用 Google 返回的总体去重结果。
  const activeUsers =
    raw !== undefined && Number.isFinite(Number(raw))
      ? Number(raw)
      : country && !country.rows?.length
      ? 0
      : null
  return {
    generatedAt: new Date().toISOString(),
    activeUsers,
    reports: results.map((result, index) =>
      normalized(
        index === 0 ? 'realtimeCountries' : 'realtimeEvents',
        result.status === 'fulfilled' ? result.value : undefined
      )
    ),
  }
}
