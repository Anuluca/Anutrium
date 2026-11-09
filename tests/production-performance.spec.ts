import { expect, type Page, test } from '@playwright/test'

const budgets = {
  firstContentfulPaint: Number(process.env.PERF_FCP_BUDGET_MS || 10_000),
  domContentLoaded: Number(process.env.PERF_DCL_BUDGET_MS || 10_000),
  entryReady: Number(process.env.PERF_ENTRY_BUDGET_MS || 30_000),
  routeTransition: Number(process.env.PERF_ROUTE_BUDGET_MS || 6_000),
}

const enableConstrainedDevice = async (page: Page) => {
  const session = await page.context().newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    connectionType: 'cellular4g',
  })
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  return session
}

test.beforeEach(async ({ page }) => {
  await enableConstrainedDevice(page)
})

test('cold production entry stays inside the slow-4G budget', async ({
  page,
}) => {
  await page.goto('/colorPalette', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.palette-tool')).toBeAttached()
  await expect(page.locator('.layout-page')).toHaveClass(/layout-show/, {
    timeout: budgets.entryReady,
  })

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming
    const firstContentfulPaint = performance
      .getEntriesByName('first-contentful-paint')
      .at(0)

    return {
      domContentLoaded: navigation.domContentLoadedEventEnd,
      entryReady: performance.now(),
      firstContentfulPaint: firstContentfulPaint?.startTime ?? Infinity,
      hasViteDevelopmentClient: Boolean(
        document.querySelector('script[src*="@vite/client"]')
      ),
    }
  })

  expect(metrics.hasViteDevelopmentClient).toBe(false)
  expect(metrics.domContentLoaded).toBeLessThan(budgets.domContentLoaded)
  expect(metrics.entryReady).toBeLessThan(budgets.entryReady)
  expect(metrics.firstContentfulPaint).toBeLessThan(
    budgets.firstContentfulPaint
  )
})
