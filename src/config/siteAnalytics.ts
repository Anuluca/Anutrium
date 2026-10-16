import type { AnalyticsReport } from '../types/siteAnalytics'

/** 采集、报表和界面共用的固定范围，避免依赖展示字段的插入顺序。 */
export const ANALYTICS_RANGES = [7, 30, 90] as const
export const SUMMARY_METRICS = {
  overview: [
    'activeUsers',
    'totalUsers',
    'newUsers',
    'sessions',
    'engagedSessions',
    'screenPageViews',
    'eventCount',
    'keyEvents',
    'engagementRate',
  ],
  engagement: [
    'bounceRate',
    'averageSessionDuration',
    'userEngagementDuration',
    'screenPageViewsPerSession',
    'totalRevenue',
  ],
} as const
export const SUMMARY_KEYS = [
  ...SUMMARY_METRICS.overview,
  ...SUMMARY_METRICS.engagement,
]

export const unavailableReport = (id: string): AnalyticsReport => ({
  id,
  status: 'unavailable',
  rows: [],
  rowCount: 0,
  thresholded: false,
  sampled: false,
  dataLoss: false,
})
