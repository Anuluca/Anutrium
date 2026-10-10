import { expect, test } from '@playwright/test'

const categories = [
  { id: 'archive', title: '作品集' },
  { id: 'flanerie', title: '旅程' },
]

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes('mobile'),
    '手机全屏菜单与紧密三维构图'
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 25000 }
  )
})

test('compact mobile temple supports touch focus and full-screen scanned menus for every category', async ({
  page,
}) => {
  test.setTimeout(60000)
  const root = page.locator('.temple-page')
  const stage = page.locator('.temple-stage')
  const viewport = page.viewportSize()!
  await expect(root).toHaveAttribute('data-route-shell', 'island-mobile')
  await expect(stage).toHaveAttribute('data-layout', 'mobile')
  await expect(page.locator('.temple-obelisk:visible')).toHaveCount(4)
  await expect(page.locator('.temple-menu')).toHaveCount(0)
  const bounds = await page.locator('.temple-obelisk').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        center: rect.left + rect.width / 2,
        height: rect.height,
      }
    })
  )
  expect(bounds[0].center).toBeLessThan(bounds[1].center)
  expect(bounds[2].center).toBeLessThan(bounds[3].center)
  expect(bounds[0].height).toBeGreaterThan(bounds[1].height)
  expect(
    Math.abs(bounds[0].center + bounds[3].center - viewport.width)
  ).toBeLessThan(1)
  expect(
    Math.abs(bounds[1].center + bounds[2].center - viewport.width)
  ).toBeLessThan(1)
  const home = await stage.getAttribute('data-camera-position')
  for (const category of categories) {
    const pillar = page.locator(`[data-obelisk="${category.id}"]`)
    const rect = (await pillar.boundingBox())!
    // 后排直接点露出的碑身，避免只验证尖顶可点、文字区域仍被雕像遮挡。
    const inner = category.id === 'flanerie' || category.id === 'island'
    await page.touchscreen.tap(
      rect.x +
        rect.width * (inner ? (category.id === 'flanerie' ? 0.58 : 0.42) : 0.5),
      rect.y + rect.height * (inner ? 0.4 : 0.1)
    )
    await expect(root).toHaveAttribute('data-selected', category.id)
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 7000,
    })
    const menu = page.locator('.temple-menu')
    await expect(menu).toHaveClass(/is-visible/)
    await menu.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      )
    })
    const frame = (await menu.boundingBox())!
    expect(Math.abs(frame.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(frame.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(frame.width - viewport.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(frame.height - viewport.height)).toBeLessThanOrEqual(1)
    const backdrop = await root.evaluate((element) => {
      const css = getComputedStyle(element, '::after')
      return {
        background: css.backgroundColor,
        image: css.backgroundImage,
        mask: css.maskImage,
        opacity: css.opacity,
      }
    })
    expect(backdrop.background).toBe('rgb(0, 0, 0)')
    expect(backdrop.image).toBe('none')
    expect(backdrop.mask).toContain('repeating-linear-gradient')
    expect(backdrop.opacity).toBe('1')
    await expect(menu.locator('header > h1')).toHaveText(category.title)
    if (category.id === 'archive')
      await expect(menu.locator('.shared-work-card').first()).toBeVisible()
    else if (category.id === 'flanerie')
      await expect(menu.locator('.travel-map-shell')).toBeVisible()

    await expect(page.locator('.el-menu-layout-all .logo-box')).toBeVisible()
    await expect(page.locator('.mobile-menu-icon')).toBeVisible()
    await page.touchscreen.tap(viewport.width / 2, 140)
    await expect(root).toHaveAttribute('data-selected', 'none')
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 7000,
    })
    await expect(menu).toHaveCount(0)
    await expect(stage).toHaveAttribute('data-camera-position', home!)
  }
})

test('mobile journey content opens its existing detail route', async ({
  page,
}) => {
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await page
    .locator('.temple-menu .shared-vlog-card')
    .first()
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page).toHaveURL(/\/flanerie\/[^?]+\?from=home$/)
  await expect(page.locator('.temple-page')).toHaveCount(0)
})

test('full-screen mobile menus fit narrow portrait and landscape viewports', async ({
  page,
}) => {
  test.setTimeout(40000)
  for (const size of [
    { width: 320, height: 900 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size)
    await expect(page.locator('.temple-page')).toHaveClass(
      /temple-page--mobile/
    )
    await page
      .locator('[data-obelisk="flanerie"]')
      .evaluate((element) => (element as HTMLButtonElement).click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 7000 }
    )
    const menu = page.locator('.temple-menu')
    await menu.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      )
    })
    const content = await menu
      .locator('header, .temple-menu-item')
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().toJSON())
      )
    for (const rect of content) {
      expect(rect.left).toBeGreaterThanOrEqual(0)
      expect(rect.right).toBeLessThanOrEqual(size.width)
      expect(rect.top).toBeGreaterThan(60)
      expect(rect.bottom).toBeLessThan(size.height - 30)
    }
    await page.touchscreen.tap(8, size.height - 90)
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      'none'
    )
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 7000 }
    )
  }
})
