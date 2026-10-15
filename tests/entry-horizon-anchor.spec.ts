import { expect, test } from '@playwright/test'

test('entry crystal tip stays on its loading line across viewport and browser chrome changes', async ({
  page,
}) => {
  test.setTimeout(60000)
  let releaseScene!: () => void
  const sceneGate = new Promise<void>((resolve) => {
    releaseScene = resolve
  })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    await sceneGate
    await route.continue()
  })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const overlay = page.locator('.entry-overlay-container')
    const scene = overlay.locator('.scene-container')
    await expect(overlay.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect
      .poll(() =>
        scene.evaluate((element) =>
          parseFloat(
            (element as HTMLElement).style.getPropertyValue(
              '--crystal-half-height'
            )
          )
        )
      )
      .toBeGreaterThan(0)
    // 真实手机浏览器的地址栏会使 fixed 可视容器短于 100vh；同时覆盖顶部偏移。
    for (const [chromeHeight, top] of [
      [0, 0],
      [96, 0],
      [180, 24],
    ]) {
      await overlay.evaluate(
        (element, geometry) => {
          Object.assign((element as HTMLElement).style, {
            height: `calc(100vh - ${geometry.chromeHeight}px)`,
            bottom: 'auto',
            top: `${geometry.top}px`,
          })
        },
        { chromeHeight, top }
      )
      const gap = await overlay.evaluate((element) => {
        const canvas = element.querySelector('canvas')!.getBoundingClientRect()
        const scene = element.querySelector<HTMLElement>('.scene-container')!
        const tipOffset = parseFloat(
          scene.style.getPropertyValue('--crystal-half-height')
        )
        const line = element
          .querySelector('.loading-line')!
          .getBoundingClientRect()
        return Math.abs(canvas.top + canvas.height / 2 + tipOffset - line.top)
      })
      expect(
        gap,
        `browser chrome ${chromeHeight}px, top ${top}px`
      ).toBeLessThanOrEqual(1)
    }
  } finally {
    releaseScene()
  }
})
