import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://use.typekit.net/**', (route) => route.abort())
})

test('crosshair movement stays within a fixed layout budget', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const section = page.locator('.passion-section')
  await expect(section).toBeVisible()
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 25000,
  })
  await page.addStyleTag({
    content:
      '*,*::before,*::after { animation-play-state: paused !important; transition: none !important; }',
  })
  await page.evaluate(() => document.fonts.ready)
  const bounds = (await section.boundingBox())!
  await page.mouse.move(bounds.x + 30, bounds.y + 30)
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const before = await cdp.send('Performance.getMetrics')
  for (let index = 0; index < 30; index++) {
    await page.mouse.move(bounds.x + 35 + index * 2, bounds.y + 35 + index)
  }
  const after = await cdp.send('Performance.getMetrics')
  const count = (metrics: typeof before) =>
    metrics.metrics.find((item) => item.name === 'LayoutCount')!.value
  expect(count(after) - count(before)).toBeLessThanOrEqual(6)
  await expect(page.locator('.passion-crosshair__vertical')).toHaveCSS(
    'transform',
    /matrix/
  )
  expect(
    await section.evaluate((el) =>
      el.style.getPropertyValue('--passion-cross-x')
    )
  ).toBe('')
})

test('wireframe draws at most two batches per frame and stops in hidden tabs', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const browser = window as typeof window & { aboutDraws: number }
    browser.aboutDraws = 0
    const original = WebGL2RenderingContext.prototype.drawElementsInstanced
    WebGL2RenderingContext.prototype.drawElementsInstanced = function (
      ...args
    ) {
      if ((this.canvas as HTMLCanvasElement).closest('.passion-logo-bg'))
        browser.aboutDraws++
      return original.apply(this, args)
    }
  })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.passion-logo-bg canvas')).toBeVisible()
  await page.waitForFunction(
    () => (window as typeof window & { aboutDraws: number }).aboutDraws > 4
  )
  const frames = await page.evaluate(async () => {
    const browser = window as typeof window & { aboutDraws: number }
    const counts: number[] = []
    let previous = browser.aboutDraws
    for (let i = 0; i < 12; i++) {
      await new Promise(requestAnimationFrame)
      counts.push(browser.aboutDraws - previous)
      previous = browser.aboutDraws
    }
    return counts
  })
  expect(Math.max(...frames)).toBeLessThanOrEqual(2)
  expect(frames.some((count) => count === 2)).toBe(true)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const readCount = () =>
    page.evaluate(
      () => (window as typeof window & { aboutDraws: number }).aboutDraws
    )
  const paused = await readCount()
  await page.waitForTimeout(150)
  expect(await readCount()).toBe(paused)
  await expect(page.locator('.passion-section')).toHaveClass(/is-motion-paused/)
  await expect(page.locator('.passion-back')).toHaveCSS(
    'animation-play-state',
    'running'
  )
  expect(
    await page
      .locator('.passion-back')
      .evaluate((el) => getComputedStyle(el, '::after').animationPlayState)
  ).toBe('paused')
  await page.evaluate(() => {
    delete (document as Partial<Document>).visibilityState
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(readCount).toBeGreaterThan(paused)
})

test('60 fps particles respect their budget with 250 animation callbacks per second', async ({
  page,
}) => {
  await page.clock.install()
  await page.route('**/__about-particles', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body><div id="app" style="width:200px;height:200px"></div></body></html>',
    })
  )
  await page.goto('/__about-particles')
  await page.evaluate(async () => {
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 4)
    window.cancelAnimationFrame = (id) => clearTimeout(id)
    const browser = window as typeof window & { particleDraws: number }
    browser.particleDraws = 0
    const clear = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains('particles-bg'))
        browser.particleDraws++
      return clear.apply(this, args)
    }
    const { createApp } = await import('/node_modules/.vite/deps/vue.js')
    const { default: Particles } = await import(
      '/src/components/ParticlesBg/index.vue'
    )
    createApp(Particles, { maxFps: 60, quantity: 10 }).mount('#app')
  })
  await expect(page.locator('.particles-bg')).toHaveAttribute(
    'data-motion-state',
    'running'
  )
  await page.evaluate(() => {
    ;(window as typeof window & { particleDraws: number }).particleDraws = 0
  })
  await page.clock.runFor(1000)
  const draws = await page.evaluate(
    () => (window as typeof window & { particleDraws: number }).particleDraws
  )
  expect(draws).toBeGreaterThanOrEqual(58)
  expect(draws).toBeLessThanOrEqual(61)
})
