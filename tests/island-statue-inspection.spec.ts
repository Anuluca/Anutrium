import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '全身展示用于桌面神殿')
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    {
      timeout: 20000,
    }
  )
  await expect(page.locator('.temple-page')).not.toHaveClass(
    /route-enter-active/
  )
})

test('clicking the statue smoothly reveals its full wireframe and restores the temple', async ({
  page,
}) => {
  const root = page.locator('.temple-page')
  const stage = page.locator('.temple-stage')
  const canvas = stage.locator('canvas')
  const home = await stage.getAttribute('data-camera-position')
  const halfY = await stage.getAttribute('data-statue-y')
  await page.evaluate(() => {
    const clock = { now: performance.now() }
    ;(window as typeof window & { statueClock: typeof clock }).statueClock =
      clock
    const nativeFrame = requestAnimationFrame.bind(window)
    performance.now = () => clock.now
    window.requestAnimationFrame = (callback) =>
      nativeFrame(() => callback(clock.now))
  })
  const advance = async (milliseconds: number) => {
    await page.evaluate(async (ms) => {
      ;(
        window as typeof window & { statueClock: { now: number } }
      ).statueClock.now += ms
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    }, milliseconds)
  }
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  await expect(page.locator('.cursor-shape')).toHaveClass(/\bis-active\b/)
  for (let i = 0; i < 10; i++) await advance(100)
  expect(
    Number(await stage.getAttribute('data-statue-holy-scale'))
  ).toBeGreaterThan(1.25)
  expect(Number(await stage.getAttribute('data-statue-sheen'))).toBeGreaterThan(
    2.4
  )
  await page.mouse.move(20, 150)
  await expect(page.locator('.cursor-shape')).not.toHaveClass(/\bis-active\b/)
  await canvas.click({
    position: { x: viewport.width / 2, y: viewport.height / 2 },
  })
  await expect(root).toHaveAttribute('data-selected', 'statue')
  await advance(200)
  expect(
    Number(await stage.getAttribute('data-statue-clip-height'))
  ).toBeLessThan(
    Number(halfY) - Number(await stage.getAttribute('data-statue-full-y'))
  )
  const reveal = Number(await stage.getAttribute('data-temple-reveal'))
  expect(reveal).toBeGreaterThan(0)
  expect(reveal).toBeLessThan(1)
  await advance(400)
  const halfway = Number(await stage.getAttribute('data-statue-wire-opacity'))
  expect(halfway).toBeGreaterThan(0)
  expect(halfway).toBeLessThan(1)
  await expect(stage).not.toHaveAttribute('data-camera-position', home!)
  await advance(1100)
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(stage).toHaveAttribute('data-material-phase', 'wireframe')
  await expect(stage).toHaveAttribute('data-statue-wire-opacity', '1.000')
  await expect(stage).toHaveAttribute('data-visible-obelisks', '')
  expect(
    Number(await stage.getAttribute('data-statue-clip-height'))
  ).toBeLessThan(0)
  expect(await stage.getAttribute('data-statue-y')).toBe(
    await stage.getAttribute('data-statue-full-y')
  )
  await expect(page.locator('.temple-obelisk:visible')).toHaveCount(0)
  await expect(stage.locator('.temple-backdrop')).toBeHidden()
  await expect(page.locator('.el-menu-layout-all')).toBeVisible()
  await expect(page.locator('.logo-box')).toBeVisible()
  await expect(page.locator('.footer-com')).toBeVisible()
  await expect(page.locator('.fullscreen')).toBeVisible()
  await expect(page.locator('.cursor-position')).toHaveCSS(
    'visibility',
    'visible'
  )
  await expect(page.locator('.star-container')).toBeVisible()
  await expect(page.locator('.zodiac-stage')).toBeVisible()
  await expect(page.locator('.particle-viewport')).toBeVisible()
  await page.screenshot({ path: 'test-results/island-statue-full-wire.png' })

  const neutralHead = await stage.getAttribute('data-head-rotation')
  await page.mouse.move(viewport.width * 0.85, viewport.height * 0.25)
  for (let i = 0; i < 15; i++) await advance(100)
  await expect(stage).not.toHaveAttribute('data-head-rotation', neutralHead!)
  const body = (await stage.getAttribute('data-statue-body-rotation'))!
    .split(',')
    .map(Number)
  expect(Math.abs(body[1])).toBeGreaterThan(0.03)
  expect(body[0]).toBe(0)
  expect(body[2]).toBe(0)
  const headBeforeVerticalMove = await stage.getAttribute('data-head-rotation')
  await page.mouse.move(viewport.width * 0.85, viewport.height * 0.8)
  for (let i = 0; i < 10; i++) await advance(100)
  await expect(stage).not.toHaveAttribute(
    'data-head-rotation',
    headBeforeVerticalMove!
  )
  const bodyAfterVerticalMove = (await stage.getAttribute(
    'data-statue-body-rotation'
  ))!
    .split(',')
    .map(Number)
  expect(bodyAfterVerticalMove[0]).toBe(0)
  expect(bodyAfterVerticalMove[1]).toBeCloseTo(body[1], 4)
  expect(bodyAfterVerticalMove[2]).toBe(0)
  await expect(stage).toHaveAttribute('data-head-nod-angle', '10.000')
  const fullCamera = await stage.getAttribute('data-camera-position')
  const angledHead = (await stage.getAttribute('data-head-rotation'))!
    .split(',')
    .map(Number)
  await canvas.click({ position: { x: 20, y: viewport.height / 2 } })
  await advance(200)
  await expect(stage).toHaveAttribute('data-camera-position', fullCamera!)
  const returningHead = (await stage.getAttribute('data-head-rotation'))!
    .split(',')
    .map(Number)
  expect(Math.abs(returningHead[1])).toBeLessThan(Math.abs(angledHead[1]))
  expect(Math.abs(returningHead[1])).toBeGreaterThan(0.001)
  await expect(stage).toHaveAttribute('data-statue-depth-test', 'true')
  await advance(200)
  const restingHead = (await stage.getAttribute('data-head-rotation'))!
    .split(',')
    .map(Number)
  expect(restingHead[0]).toBeCloseTo(Math.sin((7 * Math.PI) / 360), 5)
  expect(restingHead[1]).toBeCloseTo(0, 5)
  await expect(stage).toHaveAttribute('data-head-nod-angle', '10.000')
  await advance(1000)
  const returnClip = Number(await stage.getAttribute('data-statue-clip-height'))
  expect(returnClip).toBeGreaterThan(0.1)
  expect(returnClip).toBeLessThan(0.52)
  await advance(700)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(stage).toHaveAttribute('data-camera-position', home!)
  await expect(stage).toHaveAttribute('data-statue-y', halfY!)
  await expect(stage).toHaveAttribute('data-statue-wire-opacity', '0.000')
  await expect(stage).toHaveAttribute('data-material-phase', 'chrome')
  await expect(stage).toHaveAttribute('data-statue-clip-height', '0.52')
  await expect(page.locator('.temple-obelisk:visible')).toHaveCount(4)
  await expect(page.locator('.el-menu-layout-all')).toBeVisible()
  await expect(page.locator('.footer-com')).toBeVisible()
  await expect(stage.locator('.temple-backdrop')).toBeVisible()
  await canvas.focus()
  await page.keyboard.press('Enter')
  await advance(1700)
  await expect(root).toHaveAttribute('data-selected', 'statue')
  await page.keyboard.press('Escape')
  await advance(2100)
  await expect(root).toHaveAttribute('data-selected', 'none')
})

test('clicking the statue exits pillar focus and inspection leaves without shifting or leaking the cursor state', async ({
  page,
}) => {
  const root = page.locator('.temple-page')
  await page.locator('[data-obelisk="flanerie"]').click()
  await expect(root).toHaveAttribute('data-settled', 'true')
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width * 0.43, viewport.height * 0.5)
  await expect(page.locator('.cursor-shape')).toHaveClass(/\bis-active\b/)
  await root.locator('canvas').click({
    position: { x: viewport.width * 0.43, y: viewport.height * 0.5 },
  })
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(root.locator('.temple-stage')).toHaveAttribute(
    'data-material-phase',
    'chrome'
  )
  await root.locator('canvas').focus()
  await page.keyboard.press('Enter')
  await expect(root).toHaveAttribute('data-selected', 'statue')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.temple-menu')).toHaveCount(0)
  await page.setViewportSize({ width: 1100, height: 900 })
  await expect(root.locator('canvas')).toHaveCSS('width', '1100px')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.evaluate(async () => {
    const state = { done: false, samples: [] as number[][] }
    ;(
      window as typeof window & { statueDeparture: typeof state }
    ).statueDeparture = state
    const sample = () => {
      const root = document.querySelector('.temple-page')
      const container = document.querySelector('.router-container')
      if (!root || !container) {
        state.done = true
        return
      }
      const a = root.getBoundingClientRect()
      const b = container.getBoundingClientRect()
      state.samples.push([a.left, a.top, b.left, b.top])
      requestAnimationFrame(sample)
    }
    sample()
    const app = document.querySelector<
      HTMLElement & {
        __vue_app__?: {
          config: {
            globalProperties: {
              $router: { push: (path: string) => Promise<void> }
            }
          }
        }
      }
    >('#app')
    await app!.__vue_app__!.config.globalProperties.$router.push('/craft')
  })
  await expect(page.locator('.craft-page')).toBeVisible()
  await expect(root).toHaveCount(0)
  await expect(page.locator('.el-menu-layout-all')).toBeVisible()
  await expect(page.locator('.footer-com')).toBeVisible()
  await page.mouse.move(20, 150)
  await expect(page.locator('.cursor-shape')).not.toHaveClass(/\bis-active\b/)
  const departure = await page.evaluate(
    () =>
      (
        window as typeof window & {
          statueDeparture: { done: boolean; samples: number[][] }
        }
      ).statueDeparture
  )
  expect(departure.done).toBe(true)
  expect(departure.samples.length).toBeGreaterThan(1)
  for (const sample of departure.samples)
    sample.forEach((coordinate, index) =>
      expect(
        Math.abs(coordinate - departure.samples[0][index])
      ).toBeLessThanOrEqual(1)
    )
  expect(errors).toEqual([])
})
