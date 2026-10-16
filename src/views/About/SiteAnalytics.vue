<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  ANALYTICS_RANGES,
  SUMMARY_KEYS,
  SUMMARY_METRICS,
  unavailableReport,
} from '@/config/siteAnalytics'

import { useSiteAnalytics } from './composables/useSiteAnalytics'

import type { AnalyticsReport } from '@/types/siteAnalytics'

const { locale } = useI18n()
const en = computed(() => locale.value === 'en')
const root = ref<HTMLElement>()
const { days, data, realtime, loading, error, activated, retry } =
  useSiteAnalytics(root)
const text = (cn: string, english: string) => (en.value ? english : cn)
const titles: Record<string, [string, string]> = {
  pages: ['页面浏览', 'Pages'],
  landing: ['入口页面', 'Landing pages'],
  channels: ['访问渠道', 'Channels'],
  sources: ['来源 / 媒介', 'Source / medium'],
  firstSources: ['首次访问来源', 'First user source'],
  campaigns: ['推广活动', 'Campaigns'],
  countries: ['国家 / 地区', 'Countries'],
  regions: ['地区分布', 'Regions'],
  cities: ['城市分布', 'Cities'],
  devices: ['设备类型', 'Devices'],
  browsers: ['浏览器', 'Browsers'],
  systems: ['操作系统', 'Operating systems'],
  languages: ['语言', 'Languages'],
  screens: ['屏幕分辨率', 'Screen resolutions'],
  events: ['事件统计', 'Events'],
  hours: ['访问时段', 'Hours'],
  weekdays: ['星期分布', 'Weekdays'],
  projects: ['作品点击', 'Project clicks'],
  tools: ['工具点击', 'Tool clicks'],
  shares: ['分享方式', 'Share methods'],
  realtimeCountries: ['实时国家 / 地区', 'Realtime countries'],
  realtimeEvents: ['实时事件', 'Realtime events'],
}
const labels: Record<string, [string, string]> = {
  activeUsers: ['活跃用户', 'Active users'],
  totalUsers: ['用户总数', 'Total users'],
  newUsers: ['新用户', 'New users'],
  sessions: ['会话数', 'Sessions'],
  engagedSessions: ['互动会话', 'Engaged sessions'],
  screenPageViews: ['浏览量', 'Views'],
  eventCount: ['事件数', 'Events'],
  keyEvents: ['关键事件', 'Key events'],
  engagementRate: ['互动率', 'Engagement rate'],
  bounceRate: ['跳出率', 'Bounce rate'],
  averageSessionDuration: ['平均会话时长', 'Avg. session duration'],
  userEngagementDuration: ['总互动时长', 'Engagement duration'],
  screenPageViewsPerSession: ['每次会话浏览量', 'Views per session'],
  totalRevenue: ['总收入', 'Revenue'],
}
const label = (key: string) => labels[key]?.[en.value ? 1 : 0] || key
const title = (key: string) => titles[key]?.[en.value ? 1 : 0] || key
const summaries = SUMMARY_KEYS
const reportsById = computed(
  () => new Map(data.value?.reports.map((report) => [report.id, report]))
)
const tableIds = Object.keys(titles).filter((id) => !id.startsWith('realtime'))
const missingReports = new Map(
  tableIds.map((id) => [id, unavailableReport(id)])
)
const summary = computed(() => {
  const metrics: Record<string, number> = {}
  for (const [id, keys] of Object.entries(SUMMARY_METRICS)) {
    const report = reportsById.value.get(id)
    if (report?.status !== 'ready') continue
    if (report.rows.length) Object.assign(metrics, report.rows[0].metrics)
    else
      for (const key of keys) {
        if (
          !key.endsWith('Rate') &&
          !['averageSessionDuration', 'screenPageViewsPerSession'].includes(key)
        )
          metrics[key] = 0
      }
  }
  return metrics
})
const tables = computed(() =>
  tableIds.map((id) => reportsById.value.get(id) || missingReports.get(id)!)
)
const allTables = computed(() => [
  ...tables.value,
  ...(realtime.value?.reports || []),
])
const columns = computed(
  () =>
    new Map(
      allTables.value.map((report) => [
        report.id,
        Object.keys(report.rows[0]?.metrics || {}),
      ])
    )
)
const trend = computed(() => reportsById.value.get('trend'))
const trendColumns = computed(() =>
  Object.keys(trend.value?.rows[0]?.metrics || {})
)
const maxViews = computed(() =>
  Math.max(
    1,
    ...(trend.value?.rows.map((r) => r.metrics.screenPageViews) || [])
  )
)
const trendPoints = computed(() =>
  (trend.value?.rows || [])
    .map(
      (row, i, rows) =>
        `${rows.length === 1 ? 300 : (i / (rows.length - 1)) * 600},${
          130 - (row.metrics.screenPageViews / maxViews.value) * 110
        }`
    )
    .join(' ')
)
const numberFormats = computed(() => {
  const language = en.value ? 'en-US' : 'zh-CN'
  return [0, 2].map(
    (maximumFractionDigits) =>
      new Intl.NumberFormat(language, { maximumFractionDigits })
  )
})
const format = (key: string, value?: number) => {
  if (value === undefined) return '—'
  if (key.endsWith('Rate')) return `${(value * 100).toFixed(1)}%`
  if (key.endsWith('Duration')) {
    const seconds = Math.max(0, Math.round(value))
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }
  return numberFormats.value[
    key === 'screenPageViewsPerSession' || key === 'totalRevenue' ? 1 : 0
  ].format(value)
}
const updated = computed(() =>
  data.value
    ? new Date(data.value.generatedAt).toLocaleString(
        en.value ? 'en-GB' : 'zh-CN',
        { timeZone: 'Asia/Shanghai', hour12: false }
      )
    : ''
)
function rowLabel(report: AnalyticsReport, dimensions: string[]) {
  if (report.id === 'weekdays')
    return (
      (en.value
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'])[
        Number(dimensions[0])
      ] || dimensions[0]
    )
  if (report.id === 'hours') return `${dimensions[0]}:00`
  return dimensions
    .map((value) => (value === '(not set)' ? text('未识别', 'Not set') : value))
    .join(' / ')
}
</script>

<template>
  <section
    id="about-analytics"
    ref="root"
    class="site-analytics no-rem"
    aria-labelledby="analytics-title"
    :aria-busy="loading"
  >
    <header class="analytics-header">
      <div>
        <p class="eyebrow">OPEN ANALYTICS / GA4</p>
        <h3 id="analytics-title">
          {{ text('访客与访问记录', 'Visitors & activity') }}
        </h3>
        <p class="intro">
          {{
            text(
              '公开访问汇总，记录这个网站被看见的过程。',
              'An open view of how this website is explored.'
            )
          }}
        </p>
      </div>
      <div
        class="range"
        role="group"
        :aria-label="text('统计时间范围', 'Date range')"
      >
        <button
          v-for="range in ANALYTICS_RANGES"
          :key="range"
          type="button"
          :aria-pressed="days === range"
          @click="days = range"
        >
          {{ range }}{{ text(' 天', ' days') }}
        </button>
      </div>
    </header>
    <div class="analytics-meta">
      <span class="live"
        >{{
          text('数据流近 30 分钟活跃用户', 'Stream active users · last 30 min')
        }}
        <strong>{{ realtime?.activeUsers ?? '—' }}</strong></span
      >
      <span
        >{{
          text(
            '含今日，常规数据可能延迟',
            'Includes today; reporting may be delayed'
          )
        }}<template v-if="updated"> · {{ updated }} UTC+8</template></span
      >
    </div>
    <p v-if="!activated || (loading && !data)" class="state" role="status">
      {{ text('正在读取访问统计…', 'Loading analytics…') }}
    </p>
    <div v-else-if="error && !data" class="state" role="status">
      <p>
        {{
          error === 'setup'
            ? text(
                '统计展示待连接，暂时无法读取访问数据。',
                'Analytics connection is pending.'
              )
            : text(
                '访问统计暂时无法读取，请稍后重试。',
                'Analytics is temporarily unavailable. Please try again.'
              )
        }}
      </p>
      <button type="button" @click="retry">
        {{ text('重新读取', 'Retry') }}
      </button>
    </div>
    <template v-else-if="data">
      <p v-if="loading || error" class="refresh-state" role="status">
        {{
          loading
            ? text(
                '正在读取选定范围，当前仍显示近 ' + data.days + ' 天数据。',
                'Loading selected range; still showing ' + data.days + ' days.'
              )
            : text(
                '更新失败，当前仍显示近 ' + data.days + ' 天数据。',
                'Update failed; still showing ' + data.days + ' days.'
              )
        }}
        <button v-if="error" type="button" @click="retry">
          {{ text('重新读取', 'Retry') }}
        </button>
      </p>
      <div class="summary-grid">
        <div v-for="key in summaries" :key="key" class="metric">
          <span>{{ label(key) }}</span
          ><strong>{{ format(key, summary[key]) }}</strong>
        </div>
      </div>
      <section class="trend-panel">
        <div class="panel-heading">
          <h4>{{ text('每日访问趋势', 'Daily traffic') }}</h4>
          <span>{{ text('折线：浏览量', 'Line: page views') }}</span>
        </div>
        <p v-if="trend?.status !== 'ready'" class="empty">
          {{ text('趋势数据暂不可用', 'Trend unavailable') }}
        </p>
        <p v-else-if="!trend.rows.length" class="empty">
          {{ text('此时间段暂无访问数据', 'No activity in this period') }}
        </p>
        <template v-else>
          <svg
            class="trend-chart"
            viewBox="0 0 600 150"
            role="img"
            :aria-label="
              text(
                '每日浏览量，完整数值见下方表格',
                'Daily views, exact values in the table below'
              )
            "
          >
            <path d="M0 20H600 M0 75H600 M0 130H600" class="grid-lines" />
            <polyline :points="trendPoints" />
            <circle
              v-if="trend.rows.length === 1"
              cx="300"
              :cy="
                130 - (trend.rows[0].metrics.screenPageViews / maxViews) * 110
              "
              r="3"
            />
          </svg>
          <details>
            <summary>
              {{ text('查看每日完整数值', 'Show daily values') }}
            </summary>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{{ text('日期', 'Date') }}</th>
                    <th v-for="key in trendColumns" :key="key">
                      {{ label(key) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in trend.rows" :key="row.dimensions[0]">
                    <th>
                      {{
                        row.dimensions[0].replace(
                          /(\d{4})(\d{2})(\d{2})/,
                          '$1-$2-$3'
                        )
                      }}
                    </th>
                    <td v-for="key in trendColumns" :key="key">
                      {{ format(key, row.metrics[key]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </template>
      </section>
      <div class="report-grid">
        <section
          v-for="report in allTables"
          :key="report.id"
          class="report-panel"
        >
          <div class="panel-heading">
            <h4>{{ title(report.id) }}</h4>
            <span v-if="report.rowCount > report.rows.length"
              >TOP {{ report.rows.length }} / {{ report.rowCount }}</span
            >
          </div>
          <p v-if="report.status === 'unavailable'" class="empty">
            {{
              ['projects', 'tools', 'shares'].includes(report.id)
                ? text(
                    '维度未配置或数据暂不可用',
                    'Dimension not configured or unavailable'
                  )
                : text('此报表暂不可用', 'Report unavailable')
            }}
          </p>
          <p v-else-if="!report.rows.length" class="empty">
            {{ text('此时间段暂无数据', 'No data in this period') }}
          </p>
          <template v-else>
            <p
              v-if="report.thresholded || report.sampled || report.dataLoss"
              class="quality"
            >
              {{
                text(
                  '此报表可能受隐私阈值、抽样或汇总限制影响',
                  'Thresholds, sampling or aggregation limits may apply'
                )
              }}
            </p>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{{ text('项目', 'Item') }}</th>
                    <th v-for="key in columns.get(report.id)" :key="key">
                      {{ label(key) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in report.rows" :key="index">
                    <th :title="rowLabel(report, row.dimensions)">
                      {{ rowLabel(report, row.dimensions) }}
                    </th>
                    <td v-for="key in columns.get(report.id)" :key="key">
                      {{ format(key, row.metrics[key]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>
      </div>
      <p class="footnote">
        {{
          text(
            '来源：Google Analytics 4。常规数据缓存 10 分钟，实时数据约每分钟读取；访问人数按 GA4 口径计算，各分类用户数不能直接相加。',
            'Source: Google Analytics 4. Reports cached for 10 minutes; realtime refreshed about every minute. User counts follow GA4 definitions and are not additive across categories.'
          )
        }}<template v-if="data.timeZone">
          {{ text('报表时区：', 'Report time zone: ')
          }}{{ data.timeZone }}。</template
        >
      </p>
    </template>
  </section>
</template>

<style scoped lang="less">
.site-analytics.no-rem {
  margin: 64px 0 50px;
  color: var(--text-color);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  .analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-color-strong);
  }
  h3 {
    margin: 4px 0;
    font-size: 26px;
    font-weight: 800;
  }
  .eyebrow {
    margin: 0;
    color: @primary-color;
    font-size: 11px;
    letter-spacing: 2px;
  }
  .intro,
  .footnote,
  .empty,
  .analytics-meta,
  .quality {
    color: var(--text-muted);
  }
  .intro {
    margin: 0;
  }
  .range {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  button {
    border: 1px solid var(--border-color);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 4px;
  }
  button[aria-pressed='true'] {
    border-color: @primary-color;
    color: @primary-color;
  }
  button:focus-visible,
  summary:focus-visible {
    outline: 2px solid @primary-color;
    outline-offset: 3px;
  }
  .analytics-meta {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px 0 20px;
    font-size: 12px;
  }
  .live strong {
    color: @primary-color;
    margin-left: 10px;
    font-size: 18px;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-top: 1px solid var(--border-color);
    border-left: 1px solid var(--border-color);
  }
  .metric {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 18px;
    border-right: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
    min-width: 0;
  }
  .metric span {
    color: var(--text-muted);
  }
  .metric strong {
    font-size: clamp(18px, 2vw, 30px);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  .trend-panel {
    margin-top: 20px;
    padding: 18px;
    border: 1px solid var(--border-color);
  }
  .panel-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
  }
  .panel-heading > span {
    color: var(--text-faint);
    font-size: 11px;
  }
  .trend-chart {
    display: block;
    width: 100%;
    height: 160px;
    overflow: visible;
  }
  .grid-lines {
    stroke: var(--border-color);
    fill: none;
  }
  polyline {
    fill: none;
    stroke: @primary-color;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }
  circle {
    fill: @primary-color;
  }
  summary {
    cursor: pointer;
    color: var(--text-muted);
    margin-top: 12px;
  }
  .report-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 16px;
  }
  .report-panel {
    min-width: 0;
    border: 1px solid var(--border-color);
    padding: 18px;
  }
  .table-scroll {
    overflow-x: auto;
    max-height: 300px;
    overscroll-behavior: contain;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th,
  td {
    padding: 9px 8px;
    border-bottom: 1px solid var(--border-color);
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  th:first-child {
    text-align: left;
    white-space: normal;
    overflow-wrap: anywhere;
    min-width: 100px;
    max-width: 240px;
    font-weight: 400;
  }
  thead th {
    color: var(--text-muted);
    font-weight: 400;
  }
  .empty {
    margin: 20px 0;
  }
  .quality {
    font-size: 11px;
  }
  .refresh-state {
    color: var(--text-muted);
    margin: 0 0 16px;
  }
  .state {
    padding: 32px 0;
    color: var(--text-muted);
  }
  .footnote {
    margin: 20px 0 0;
    font-size: 11px;
  }
  @media (max-width: 768px) {
    .analytics-header {
      align-items: start;
      flex-direction: column;
      gap: 16px;
    }
    h3 {
      font-size: 22px;
    }
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .report-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .metric,
    .report-panel,
    .trend-panel {
      padding: 14px;
    }
  }
}
</style>
