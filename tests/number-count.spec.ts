import { expect, test } from '@playwright/test'

test('detail count follows the title height and theme without a unit', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const item = page
    .locator('.island-focus:not(.island-closing-snapshot) .island-item:visible')
    .first()
  const count = item.locator('.number-count')
  await expect(count).toHaveText('34', { timeout: 45000 })
  const geometry = await count.evaluate((el) => ({
    font: parseFloat(getComputedStyle(el).fontSize),
    height: el.parentElement!.getBoundingClientRect().height,
    color: getComputedStyle(el).color,
    theme: getComputedStyle(document.documentElement)
      .getPropertyValue('--page-theme-color')
      .trim(),
    unit: el.parentElement!.querySelector('.section-count small'),
  }))
  expect(Math.abs(geometry.font - geometry.height)).toBeLessThanOrEqual(1)
  expect(geometry.unit).toBeNull()
  expect(geometry.theme).not.toBe('')
})

test('section count follows its title row height', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const count = page.locator('.home-section-actions .number-count').first()
  await expect(count).toBeVisible({ timeout: 45000 })
  await expect
    .poll(() =>
      count.evaluate((el) =>
        Math.abs(
          parseFloat(getComputedStyle(el).fontSize) -
            el.parentElement!.getBoundingClientRect().height
        )
      )
    )
    .toBeLessThanOrEqual(1)
  await expect(count).toHaveText(/^\d+$/)
})

test('visible counters share an observer and update when their targets change', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route('http://localhost:3000/count-perf-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<div id="fixture"></div>',
    })
  )
  await page.goto('/count-perf-test')
  await page.evaluate(async () => {
    const Original = window.IntersectionObserver
    ;(window as any).countObserverInstances = 0
    window.IntersectionObserver = class extends Original {
      constructor(callback, options) {
        super(callback, options)
        ;(window as any).countObserverInstances++
      }
    }
    const { createApp, h, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: CountUp } = await import(
      '/src/components/CountUp/index.vue'
    )
    const target = ref(4)
    createApp({
      render: () =>
        h('div', [
          h(CountUp, { to: target.value, duration: 400, minDigits: 2 }),
          h(CountUp, { to: 8, duration: 400, minDigits: 2 }),
        ]),
    }).mount('#fixture')
    ;(window as any).counterTarget = target
  })
  const counters = page.locator('#fixture > div > span')
  await expect(counters.nth(0)).toHaveText('04')
  await expect(counters.nth(1)).toHaveText('08')
  expect(
    await page.evaluate(() => (window as any).countObserverInstances)
  ).toBe(1)
  await page.evaluate(() => ((window as any).counterTarget.value = 6))
  await expect(counters.nth(0)).toHaveText('06')
})
