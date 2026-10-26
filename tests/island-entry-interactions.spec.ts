import { expect, test } from './helpers/sceneDiagnostics'

test('Island starts its second phase earlier, keeps its end time and ignores model clicks in transit', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  const root = page.locator('.temple-page')
  const canvas = stage.locator('canvas')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  // 只控制场景时间，保证点击和断言发生在指定动画阶段。
  await page.evaluate(() => {
    const clock = { now: performance.now() }
    ;(window as any).islandInteractionClock = clock
    const frame = requestAnimationFrame.bind(window)
    performance.now = () => clock.now
    window.requestAnimationFrame = (callback) =>
      frame(() => callback(clock.now))
  })
  const advance = (ms: number) =>
    page.evaluate(async (ms) => {
      ;(window as any).islandInteractionClock.now += ms
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    }, ms)
  const clickModel = () =>
    canvas.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      // 覆盖不同机位下模型所在的中央区域。
      for (const x of [0.45, 0.5, 0.55])
        for (const y of [0.35, 0.5, 0.65])
          element.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              clientX: rect.x + rect.width * x,
              clientY: rect.y + rect.height * y,
            })
          )
    })

  await canvas.focus()
  await page.keyboard.press('Enter')
  await advance(600)
  await expect(stage).toHaveAttribute('data-statue-scan-progress', '0.0000')
  await advance(100)
  await expect(stage).toHaveAttribute('data-material-phase', 'scanning')
  await clickModel()
  await page.keyboard.press('Enter')
  await advance(20)
  await expect(root).toHaveAttribute('data-selected', 'statue')
  await expect(stage).toHaveAttribute('data-statue-restoring', 'false')
  await advance(3370)
  await expect(stage).toHaveAttribute('data-material-phase', 'scanning')
  await advance(20)
  await expect(stage).toHaveAttribute('data-material-phase', 'wireframe')

  // 稳态点击仍可返回；回正和退镜期间的重复点击不能重新进入。
  await canvas.dispatchEvent('click')
  await advance(20)
  await expect(stage).toHaveAttribute('data-statue-restoring', 'true')
  await clickModel()
  await advance(300)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await advance(500)
  await clickModel()
  await page.keyboard.press('Enter')
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(stage).toHaveAttribute('data-statue-return-phase', 'scanning')
  await expect(stage).toHaveAttribute('data-statue-body-rotation', '0,0,0')
  await advance(1800)
  await expect(stage).toHaveAttribute('data-statue-restoring', 'false')
  await expect(stage).toHaveAttribute('data-statue-scan-progress', '0.0000')
  await page.keyboard.press('Enter')
  await expect(root).toHaveAttribute('data-selected', 'statue')
})
