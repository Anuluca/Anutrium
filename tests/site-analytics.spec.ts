import { expect, test } from '@playwright/test'

const report = (
  id: string,
  dimensions: string[],
  metrics: Record<string, number>
) => ({
  id,
  status: 'ready',
  rows: [{ dimensions, metrics }],
  rowCount: 1,
  thresholded: false,
  sampled: false,
  dataLoss: false,
})
const fixture = {
  days: 30,
  generatedAt: '2026-10-16T02:00:00.000Z',
  timeZone: 'Asia/Shanghai',
  reports: [
    report('overview', [], {
      activeUsers: 12,
      totalUsers: 15,
      newUsers: 10,
      sessions: 20,
      engagedSessions: 14,
      screenPageViews: 42,
      eventCount: 81,
      keyEvents: 0,
      engagementRate: 0.7,
    }),
    report('engagement', [], {
      bounceRate: 0.3,
      averageSessionDuration: 95,
      userEngagementDuration: 300,
      screenPageViewsPerSession: 2.1,
      totalRevenue: 0,
    }),
    report('trend', ['20261015'], {
      activeUsers: 12,
      sessions: 20,
      screenPageViews: 42,
    }),
    report('pages', ['/about'], { screenPageViews: 42, activeUsers: 12 }),
    { ...report('projects', [], {}), status: 'unavailable', rows: [] },
  ],
}

test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body style="margin:16px;background:#000;color:#fff"><div id="app"></div></body></html>',
    })
  )
  await page.goto('/')
})

async function mount(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const { createApp } = await import('/node_modules/.vite/deps/vue.js')
    const { createI18n } = await import('/node_modules/.vite/deps/vue-i18n.js')
    const { default: Analytics } = await import(
      '/src/views/About/SiteAnalytics.vue'
    )
    createApp(Analytics)
      .use(createI18n({ legacy: false, locale: 'zhCn', messages: {} }))
      .mount('#app')
  })
}

test('renders public aggregates, changes range and fits the viewport', async ({
  page,
}) => {
  const ranges: string[] = []
  await page.route('**/analytics/summary?*', (route) => {
    ranges.push(new URL(route.request().url()).searchParams.get('days')!)
    return route.fulfill({ json: fixture })
  })
  await page.route('**/analytics/realtime', (route) =>
    route.fulfill({
      json: { generatedAt: fixture.generatedAt, activeUsers: 3, reports: [] },
    })
  )
  await mount(page)
  await expect(page.locator('.metric').first().locator('strong')).toHaveText(
    '12'
  )
  await expect(page.locator('.live strong')).toHaveText('3')
  await expect(
    page.getByRole('heading', { name: '作品点击', exact: true })
  ).toBeVisible()
  await expect(page.getByText('维度未配置或数据暂不可用').first()).toBeVisible()
  await page.getByRole('button', { name: '7 天', exact: true }).click()
  await expect.poll(() => ranges).toEqual(['30', '7'])
  await expect(page.locator('.metric').first().locator('strong')).toHaveText(
    '12'
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)
  await page.screenshot({
    path: `test-results/analytics-${test.info().project.name}.png`,
    fullPage: true,
  })
})

test('unconfigured access shows no fabricated zeroes and retry recovers', async ({
  page,
}) => {
  let configured = false
  await page.route('**/analytics/summary?*', (route) =>
    route.fulfill(
      configured
        ? { json: fixture }
        : { status: 503, json: { error: 'analytics_not_configured' } }
    )
  )
  await page.route('**/analytics/realtime', (route) =>
    route.fulfill({ status: 502, json: { error: 'analytics_unavailable' } })
  )
  await mount(page)
  await expect(
    page.getByText('统计展示待连接，暂时无法读取访问数据。')
  ).toBeVisible()
  await expect(page.locator('.live strong')).toHaveText('—')
  await expect(page.locator('.metric')).toHaveCount(0)
  configured = true
  await page.getByRole('button', { name: '重新读取', exact: true }).click()
  await expect(page.locator('.metric').first().locator('strong')).toHaveText(
    '12'
  )
})

test('About places analytics before its single footer and retains leaving geometry', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.route('**/analytics/summary?*', (route) =>
    route.fulfill({ status: 503, json: { error: 'analytics_not_configured' } })
  )
  await page.route('**/analytics/realtime', (route) =>
    route.fulfill({ status: 503, json: { error: 'analytics_not_configured' } })
  )
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 25000,
  })
  await expect(page.locator('.route-curtain')).toHaveCount(0, {
    timeout: 25000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 25000,
  })
  const analytics = page.locator('#about-analytics')
  await expect(analytics).toBeAttached()
  await analytics.scrollIntoViewIfNeeded()
  await expect(
    analytics.getByText('统计展示待连接，暂时无法读取访问数据。')
  ).toBeVisible()
  await expect(page.locator('.bottom-text')).toHaveCount(1)
  expect(
    await analytics.evaluate((element) =>
      element.nextElementSibling?.classList.contains('page-footer-anchor')
    )
  ).toBe(true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)
  await page.screenshot({
    path: `/tmp/anutrium-about-analytics-${test.info().project.name}.png`,
  })
  // 回到页面顶部再测离场，避免滚动恢复本身改变几何位置。
  await page.evaluate(async () => {
    const { scrollPageTo } = await import('/src/utils/pageScroll.ts')
    scrollPageTo({ top: 0 })
  })
  await expect.poll(() => page.evaluate(() => document.body.scrollTop)).toBe(0)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  const deltas = await page.evaluate(async () => {
    const pageElement = document.querySelector('.about-page')!
    const container = document.querySelector('.router-container')!
    const initial = [
      pageElement.getBoundingClientRect(),
      container.getBoundingClientRect(),
    ]
    const samples: number[] = []
    const router = (
      document.querySelector('#app') as HTMLElement & {
        __vue_app__: {
          config: {
            globalProperties: { $router: { push(path: string): Promise<void> } }
          }
        }
      }
    ).__vue_app__.config.globalProperties.$router
    const navigation = router.push('/404')
    await new Promise<void>((resolve) => {
      const deadline = performance.now() + 10000
      const frame = () => {
        if (!pageElement.isConnected || performance.now() > deadline)
          return resolve()
        ;[pageElement, container].forEach((element, i) => {
          const rect = element.getBoundingClientRect()
          samples.push(
            Math.abs(rect.top - initial[i].top),
            Math.abs(rect.left - initial[i].left)
          )
        })
        requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    await navigation
    return samples
  })
  expect(deltas.length).toBeGreaterThan(0)
  expect(Math.max(...deltas)).toBeLessThanOrEqual(1)
  await expect(page.locator('.not-found-page')).toBeVisible()
})

test('range changes reuse cached reports and retain content while loading', async ({
  page,
}) => {
  const ranges: string[] = []
  let release!: () => void
  await page.route('**/analytics/summary?*', async (route) => {
    const days = new URL(route.request().url()).searchParams.get('days')!
    ranges.push(days)
    if (days === '7')
      await new Promise<void>((resolve) => {
        release = resolve
      })
    await route.fulfill({
      json: {
        ...fixture,
        days: Number(days),
        generatedAt: new Date().toISOString(),
      },
    })
  })
  await page.route('**/analytics/realtime', (route) =>
    route.fulfill({
      json: {
        generatedAt: new Date().toISOString(),
        activeUsers: 3,
        reports: [],
      },
    })
  )
  await mount(page)
  await expect(page.locator('.metric')).toHaveCount(14)
  await page.getByRole('button', { name: '7 天', exact: true }).click()
  await expect(page.locator('.refresh-state')).toContainText(
    '当前仍显示近 30 天数据'
  )
  await expect(page.locator('.metric')).toHaveCount(14)
  await expect.poll(() => ranges.length).toBe(2)
  release()
  await expect(page.locator('.refresh-state')).toHaveCount(0)
  await page.getByRole('button', { name: '30 天', exact: true }).click()
  await expect(page.locator('.refresh-state')).toHaveCount(0)
  expect(ranges).toEqual(['30', '7'])
})

test('polling pauses outside the viewport and resumes when visible', async ({
  page,
}) => {
  let realtimeReads = 0
  await page.route('**/analytics/summary?*', (route) =>
    route.fulfill({
      json: { ...fixture, generatedAt: new Date().toISOString() },
    })
  )
  await page.route('**/analytics/realtime', (route) => {
    realtimeReads++
    return route.fulfill({
      json: {
        generatedAt: new Date().toISOString(),
        activeUsers: 3,
        reports: [],
      },
    })
  })
  await mount(page)
  await expect(page.locator('.live strong')).toHaveText('3')
  await page.clock.install()
  await page.locator('#about-analytics').evaluate((el) => {
    el.style.marginTop = '10000px'
  })
  await page.clock.runFor(100)
  await page.clock.fastForward(120000)
  expect(realtimeReads).toBe(1)
  await page.locator('#about-analytics').evaluate((el) => {
    el.style.marginTop = '0'
  })
  await page.clock.runFor(100)
  await expect.poll(() => realtimeReads).toBe(2)
})

test('number formatting constructs two reusable formatters for the whole report', async ({
  page,
}) => {
  await page.route('**/analytics/summary?*', (route) =>
    route.fulfill({ json: fixture })
  )
  await page.route('**/analytics/realtime', (route) =>
    route.fulfill({
      json: {
        generatedAt: new Date().toISOString(),
        activeUsers: 3,
        reports: [],
      },
    })
  )
  await page.evaluate(() => {
    const Native = Intl.NumberFormat
    let constructions = 0
    Object.defineProperty(Intl, 'NumberFormat', {
      value: class extends Native {
        constructor(...args: ConstructorParameters<typeof Intl.NumberFormat>) {
          super(...args)
          constructions++
        }
      },
    })
    Object.defineProperty(window, 'analyticsFormatterCount', {
      get: () => constructions,
    })
  })
  await mount(page)
  await expect(page.locator('.metric').first().locator('strong')).toHaveText(
    '12'
  )
  expect(
    await page.evaluate(() => Reflect.get(window, 'analyticsFormatterCount'))
  ).toBe(2)
})

test('polling pauses in a hidden document and refreshes when it becomes visible', async ({
  page,
}) => {
  let reads = 0
  await page.route('**/analytics/summary?*', (route) =>
    route.fulfill({
      json: { ...fixture, generatedAt: new Date().toISOString() },
    })
  )
  await page.route('**/analytics/realtime', (route) => {
    reads++
    return route.fulfill({
      json: {
        generatedAt: new Date().toISOString(),
        activeUsers: 3,
        reports: [],
      },
    })
  })
  await mount(page)
  await expect(page.locator('.live strong')).toHaveText('3')
  await page.clock.install()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(100)
  await page.clock.fastForward(120000)
  expect(reads).toBe(1)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(100)
  await expect.poll(() => reads).toBe(2)
})
