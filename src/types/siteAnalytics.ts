/** 公共统计只传递聚合报表，不包含访客标识或服务端凭证。 */
export interface AnalyticsRow {
  dimensions: string[]
  metrics: Record<string, number>
}

export interface AnalyticsReport {
  id: string
  status: 'ready' | 'unavailable'
  rows: AnalyticsRow[]
  rowCount: number
  thresholded: boolean
  sampled: boolean
  dataLoss: boolean
}

export interface SiteAnalytics {
  days: number
  generatedAt: string
  timeZone: string
  reports: AnalyticsReport[]
}

export interface RealtimeAnalytics {
  generatedAt: string
  activeUsers: number | null
  reports: AnalyticsReport[]
}
