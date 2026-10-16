import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' })
  )
  // 不向 Google 发送测试数据，只验证真实浏览器中的队列及路由接入。
  await page.route('https://www.googletagmanager.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' })
  )
  await page.goto('/')
})

test('pageviews cover entry, navigation and back without counting failed navigation', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createRouter, createMemoryHistory } = await import(
      '/node_modules/.vite/deps/vue-router.js'
    )
    const { installGoogleAnalytics } = await import('/src/utils/ga4')
    const router = createRouter({
      history: createMemoryHistory(),
      routes: ['/', '/about', '/blocked'].map((path) => ({
        path,
        component: { template: '<div />' },
      })),
    })
    router.beforeEach((to) => to.path !== '/blocked')
    await router.push('/')
    const dispose = installGoogleAnalytics(router, {
      measurementId: 'G-TEST123',
      enabled: true,
    })
    await router.push('/about')
    await router.push('/about')
    await router.push('/blocked')
    await new Promise<void>((resolve) => {
      const stop = router.afterEach(() => {
        stop()
        resolve()
      })
      router.back()
    })
    await Promise.resolve()
    const commands = window.dataLayer!.map((args) =>
      Array.from(args as ArrayLike<unknown>)
    )
    dispose()
    await router.push('/about')
    return { commands, afterDispose: window.dataLayer!.length }
  })
  const pageviews = result.commands.filter((args) => args[1] === 'page_view')
  expect(pageviews.map((args) => args[2].page_location)).toEqual([
    'http://localhost:3000/',
    'http://localhost:3000/about',
    'http://localhost:3000/',
  ])
  expect(pageviews[1][2].page_referrer).toBe('http://localhost:3000/')
  expect(pageviews[2][2].page_referrer).toBe('http://localhost:3000/about')
  expect(
    result.commands.find((args) => args[0] === 'config')![2].send_page_view
  ).toBe(false)
  expect(result.afterDispose).toBe(result.commands.length)
})

test('existing business events reach GA4 once and disabled setups do not load scripts', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createRouter, createMemoryHistory } = await import(
      '/node_modules/.vite/deps/vue-router.js'
    )
    const { installGoogleAnalytics, trackProjectClick } = await import(
      '/src/utils/analytics.ts'
    )
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    installGoogleAnalytics(router, {
      measurementId: 'G-TEST123',
      enabled: false,
    })
    installGoogleAnalytics(router, { measurementId: 'invalid', enabled: true })
    const disabledScripts = document.querySelectorAll(
      '[data-anutrium-ga4]'
    ).length
    const dispose = installGoogleAnalytics(router, {
      measurementId: 'G-TEST123',
      enabled: true,
    })
    installGoogleAnalytics(router, {
      measurementId: 'G-TEST123',
      enabled: true,
    })
    trackProjectClick({ id: 'demo', title: '作品', source: 'archive' })
    const scripts = document.querySelectorAll('[data-anutrium-ga4]').length
    const commands = window.dataLayer!.map((args) =>
      Array.from(args as ArrayLike<unknown>)
    )
    dispose()
    return { disabledScripts, scripts, commands }
  })
  expect(result.disabledScripts).toBe(0)
  expect(result.scripts).toBe(1)
  expect(result.commands.filter((args) => args[1] === 'project_click')).toEqual(
    [
      [
        'event',
        'project_click',
        expect.objectContaining({
          project_id: 'demo',
          project_title: '作品',
          source: 'archive',
          send_to: 'G-TEST123',
        }),
      ],
    ]
  )
})
