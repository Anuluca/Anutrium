import { expect, test } from '@playwright/test'

test('ground hides the celestial layers throughout entrance and camera changes', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const samples: { horizon: number; bottom: number; opacity: number }[] = []
    ;(window as any).groundClipSamples = samples
    const sample = () => {
      const stage = document.querySelector<HTMLElement>('.temple-stage')
      const sky = document.querySelector<HTMLElement>('.celestial-viewport')
      const root = document.documentElement
      if (
        stage &&
        sky &&
        root.style.getPropertyValue('--temple-sky-bottom').endsWith('px')
      ) {
        samples.push({
          horizon: parseFloat(
            stage.style.getPropertyValue('--temple-horizon-y')
          ),
          bottom: parseFloat(
            getComputedStyle(sky).getPropertyValue('--temple-sky-bottom')
          ),
          opacity: Number(getComputedStyle(stage).opacity),
        })
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 60000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  const samples = await page.evaluate(() => (window as any).groundClipSamples)
  expect(
    samples.some((sample: any) => sample.opacity > 0 && sample.opacity < 0.95)
  ).toBe(true)
  expect(
    samples.every(
      (sample: any) => Math.abs(sample.horizon - sample.bottom) <= 1
    )
  ).toBe(true)

  // 用命中测试验证浏览器实际执行裁剪：地平线上方可见，下方不可见。
  const checkClip = async () => {
    const result = await page.evaluate(() => {
      const sky = document.querySelector<HTMLElement>('.celestial-viewport')!
      const horizon = parseFloat(
        getComputedStyle(sky).getPropertyValue('--temple-sky-bottom')
      )
      const marker = document.createElement('div')
      marker.style.cssText =
        'position:absolute;inset:0;pointer-events:auto;z-index:9999'
      sky.append(marker)
      const isHit = (y: number) =>
        document.elementsFromPoint(10, y).includes(marker)
      const above = isHit(Math.max(1, horizon - 4))
      const below = isHit(Math.min(innerHeight - 1, horizon + 4))
      marker.remove()
      return { above, below, horizon }
    })
    expect(result.horizon).toBeGreaterThan(4)
    expect(result.above).toBe(true)
    expect(result.below).toBe(false)
  }
  await checkClip()
  await page.screenshot({ path: testInfo.outputPath('ground-home.png') })
  await page.evaluate(() => {
    const app = (document.querySelector('#app') as any).__vue_app__
    app.config.globalProperties.$pinia._s
      .get('temple-navigation')
      .request('flanerie')
  })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 20000 }
  )
  await checkClip()
  await page.evaluate(() => {
    const app = (document.querySelector('#app') as any).__vue_app__
    app.config.globalProperties.$pinia._s
      .get('temple-navigation')
      .request('about')
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--temple-sky-bottom')
      )
    )
    .toBe('100%')
})
