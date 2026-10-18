import { expect, type Page, test } from '@playwright/test'

const payload = (count: number | null) => ({
  count,
  generatedAt: new Date().toISOString(),
  reports: [],
})
async function mockCounts(page: Page) {
  await page.route('**/analytics/online', (route) =>
    route.fulfill({ json: payload(2) })
  )
  await page.route('**/analytics/views', (route) =>
    route.fulfill({ json: payload(994) })
  )
}
async function mount(page: Page) {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body><div id="app"></div></body></html>',
    })
  )
  await page.goto('/')
  await page.evaluate(async () => {
    const { createApp } = await import('/node_modules/.vite/deps/vue.js')
    const { createI18n } = await import('/node_modules/.vite/deps/vue-i18n.js')
    const { default: Visitors } = await import(
      '/src/views/About/SiteVisitors.vue'
    )
    createApp(Visitors)
      .use(createI18n({ legacy: false, locale: 'zhCn', messages: {} }))
      .mount('#app')
  })
}

test('two compact counters preserve reported zero and explain their scope', async ({
  page,
}) => {
  await mockCounts(page)
  await page.route('**/analytics/online', (route) =>
    route.fulfill({ json: payload(0) })
  )
  await mount(page)
  await expect(page.locator('.site-visitors strong')).toHaveText(['0', '994'])
  await expect(page.locator('.site-visitors > span').first()).toHaveAttribute(
    'title',
    /近 5 分钟/
  )
  await expect(page.locator('.site-visitors > span').last()).toHaveAttribute(
    'title',
    /旧站/
  )
})

test('a failed counter never fabricates zero or hides the other counter', async ({
  page,
}) => {
  await mockCounts(page)
  await page.route('**/analytics/views', (route) =>
    route.fulfill({ status: 502, json: { error: 'analytics_unavailable' } })
  )
  await mount(page)
  await expect(page.locator('.site-visitors strong')).toHaveText(['2', '—'])
})

test('polling pauses when hidden and refreshes online without reloading cached totals', async ({
  page,
}) => {
  await page.clock.install()
  await mockCounts(page)
  let requests = 0
  await page.route('**/analytics/online', (route) => {
    requests++
    return route.fulfill({ json: payload(requests) })
  })
  let totals = 0
  await page.route('**/analytics/views', (route) => {
    totals++
    return route.fulfill({ json: payload(994) })
  })
  await mount(page)
  await expect.poll(() => requests).toBe(1)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.site-visitors strong').first()).toHaveText('—')
  await page.clock.fastForward(120000)
  expect(requests).toBe(1)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => requests).toBe(2)
  expect(totals).toBe(1)
})

test('About places only the counters at passion top left and retains leaving geometry', async ({
  page,
}) => {
  test.setTimeout(60000)
  await mockCounts(page)
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
  const visitors = page.locator('.passion-section .site-visitors')
  await expect(visitors).toHaveCount(1)
  await visitors.scrollIntoViewIfNeeded()
  await expect(visitors.locator('strong')).toHaveText(['2', '994'])
  await expect(page.locator('#about-analytics')).toHaveCount(0)
  await expect(page.locator('.bottom-text')).toHaveCount(1)
  const offsets = await visitors.evaluate((el) => {
    const rect = el.getBoundingClientRect()
    const parent = el.closest('.passion-section')!.getBoundingClientRect()
    return { top: rect.top - parent.top, left: rect.left - parent.left }
  })
  expect(Math.abs(offsets.top - 16)).toBeLessThanOrEqual(1)
  expect(Math.abs(offsets.left - 16)).toBeLessThanOrEqual(1)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)
  await page.screenshot({
    path: `/tmp/anutrium-visitors-${test.info().project.name}.png`,
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
