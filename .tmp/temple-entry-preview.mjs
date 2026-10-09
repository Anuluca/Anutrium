import { chromium } from '@playwright/test'
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal'] })
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  await page.addInitScript(() => {
    window.templePreviewClock = { now: 1000 }
    const nativeFrame = requestAnimationFrame.bind(window)
    performance.now = () => window.templePreviewClock.now
    window.requestAnimationFrame = callback => nativeFrame(() => callback(window.templePreviewClock.now))
  })
  await page.goto('http://localhost:3000/island', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('.temple-stage')?.dataset.entrancePhase === 'statue', { timeout: 20000 })
  const advance = ms => page.evaluate(async ms => {
    window.templePreviewClock.now += ms
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }, ms)
  for (const [step, name] of [[1400 / 1.2, 'early'], [1700 / 1.2, 'middle'], [2600 / 1.2, 'complete']]) {
    await advance(step)
    await page.screenshot({ path: `.tmp/temple-entry-${name}.png` })
    console.log(name, await page.locator('.temple-stage').evaluate(el => ({
      holy: el.dataset.statueHolyLight,
      camera: el.dataset.cameraPosition,
      title: getComputedStyle(el.querySelector('.page-hero-title h1')).transform,
      horizon: el.style.getPropertyValue('--temple-horizon-y')
    })))
  }
  await page.locator('[data-obelisk="creative"]').evaluate(el => el.click())
  await advance(1700)
  await page.waitForTimeout(700)
  await page.screenshot({ path: '.tmp/temple-focus-upward.png' })
} finally {
  await browser.close()
}
