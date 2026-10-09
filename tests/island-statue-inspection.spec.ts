import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '全身展示用于桌面神殿')
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
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
  await page.mouse.move(20, 150)
  await expect(page.locator('.cursor-shape')).not.toHaveClass(/\bis-active\b/)
  await canvas.click({
    position: { x: viewport.width / 2, y: viewport.height / 2 },
  })
  await expect(root).toHaveAttribute('data-selected', 'statue')
  await advance(600)
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
  await expect(stage.locator('.page-hero-title')).toBeHidden()
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

  await canvas.click({ position: { x: 20, y: viewport.height / 2 } })
  await advance(1700)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(stage).toHaveAttribute('data-camera-position', home!)
  await expect(stage).toHaveAttribute('data-statue-y', halfY!)
  await expect(stage).toHaveAttribute('data-statue-wire-opacity', '0.000')
  await expect(stage).toHaveAttribute('data-material-phase', 'chrome')
  await expect(stage).toHaveAttribute('data-statue-clip-height', '0.52')
  await expect(page.locator('.temple-obelisk:visible')).toHaveCount(4)
  await expect(page.locator('.el-menu-layout-all')).toBeVisible()
  await expect(page.locator('.footer-com')).toBeVisible()
  await expect(stage.locator('.page-hero-title')).toBeVisible()
  await canvas.focus()
  await page.keyboard.press('Enter')
  await advance(1700)
  await expect(root).toHaveAttribute('data-selected', 'statue')
  await page.keyboard.press('Escape')
  await advance(1700)
  await expect(root).toHaveAttribute('data-selected', 'none')
})

test('clicking the statue exits pillar focus and inspection leaves without shifting or leaking the cursor state', async ({
  page,
}) => {
  const root = page.locator('.temple-page')
  await page.locator('[data-obelisk="creative"]').click()
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
