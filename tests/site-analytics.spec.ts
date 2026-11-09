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
