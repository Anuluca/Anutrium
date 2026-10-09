import { expect, test } from '@playwright/test'

const categories = [
  {
    id: 'art',
    title: 'ART',
    items: ['摄影', '绘画'],
    paths: ['/island/photography', '/island/illustration'],
  },
  {
    id: 'creative',
    title: 'CREATIVE',
    items: ['实验室', '设计小屋'],
    paths: ['/404', '/404'],
  },
  {
    id: 'notes',
    title: 'NOTES',
    items: ['学习笔记', '杂谈'],
    paths: ['/island/study-notes', '/404'],
  },
  {
    id: 'otaku',
    title: 'OTAKU',
    items: ['游戏库', '收藏品'],
    paths: ['/404', '/island/merch-photography'],
  },
]

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    '桌面神殿，手机保留原有模型页'
  )
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 20000 }
  )
  await expect(page.locator('.temple-page')).not.toHaveClass(
    /route-enter-active/
  )
})

test('default avenue is symmetric, has no submenu and keeps the existing background', async ({
  page,
}) => {
  await expect(page.locator('.temple-menu')).toHaveCount(0)
  await expect(page.locator('.temple-obelisk')).toHaveCount(4)
  await expect(page.locator('.star-container')).toBeVisible()
  const bounds = await page.locator('.temple-obelisk').evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, height: rect.height }
    })
  )
  const viewport = page.viewportSize()!
  expect(
    Math.abs(bounds[0].x + bounds[3].x - viewport.width)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(bounds[1].x + bounds[2].x - viewport.width)
  ).toBeLessThanOrEqual(1)
  expect(bounds[0].height).toBeGreaterThan(bounds[1].height)
  expect(bounds[3].height).toBeGreaterThan(bounds[2].height)
  const root = await page.locator('.temple-page').boundingBox()
  expect(Math.abs(root!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(root!.y)).toBeLessThanOrEqual(1)
  expect(root!.width).toBe(viewport.width)
})

test('all four categories move the camera, show two links on the opposite side and return home', async ({
  page,
}) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const root = page.locator('.temple-page')
  const stage = page.locator('.temple-stage')
  const initial = await stage.getAttribute('data-camera-position')
  for (const [index, category] of categories.entries()) {
    await page.locator(`[data-obelisk="${category.id}"]`).click()
    await expect(root).toHaveAttribute('data-selected', category.id)
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
    await expect(stage).not.toHaveAttribute('data-camera-position', initial!)
    const menu = page.locator('.temple-menu')
    await expect(menu).toHaveClass(/is-visible/)
    await expect(menu.locator('h1')).toHaveText(category.title)
    await expect(menu.locator('a')).toHaveCount(2)
    for (const [itemIndex, title] of category.items.entries()) {
      await expect(menu.locator('a').nth(itemIndex)).toContainText(title)
      await expect(menu.locator('a').nth(itemIndex)).toHaveAttribute(
        'href',
        category.paths[itemIndex]
      )
    }
    const bounds = await menu.boundingBox()
    if (index < 2)
      expect(bounds!.x).toBeGreaterThan(page.viewportSize()!.width / 2)
    else
      expect(bounds!.x + bounds!.width).toBeLessThan(
        page.viewportSize()!.width / 2
      )
    await page.locator(`[data-obelisk="${category.id}"]`).click()
    await expect(root).toHaveAttribute('data-selected', 'none')
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
    await expect(menu).toHaveCount(0)
    await expect(stage).toHaveAttribute('data-camera-position', initial!)
  }
  expect(errors).toEqual([])
})

test('switching during camera travel continues from the current pose and commits only the last menu', async ({
  page,
}) => {
  const stage = page.locator('.temple-stage')
  await page.locator('[data-obelisk="creative"]').click()
  await page.waitForTimeout(550)
  const distance = await stage.evaluate(async (element) => {
    const read = () =>
      (element as HTMLElement).dataset.cameraPosition!.split(',').map(Number)
    const before = read()
    // 同一个浏览器任务内切换并采样下一帧，排除自动化工具等待焦点带来的时间间隔。
    ;(
      document.querySelector('[data-obelisk="notes"]') as HTMLButtonElement
    ).click()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const after = read()
    return Math.hypot(...before.map((value, index) => value - after[index]))
  })
  expect(distance).toBeLessThan(1)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 10000 }
  )
  await expect(page.locator('.temple-menu h1')).toHaveText('NOTES')
  await expect(page.locator('[data-obelisk="notes"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(page.locator('[data-obelisk="creative"]')).toHaveAttribute(
    'aria-pressed',
    'false'
  )
})

test('submenu opens existing routes and unimplemented sections open 404', async ({
  page,
}) => {
  await page.locator('[data-obelisk="art"]').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 10000 }
  )
  await page.locator('.temple-menu a').first().click()
  await expect(page).toHaveURL(/\/island\/photography$/)
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 20000 }
  )
  await page.locator('[data-obelisk="creative"]').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 10000 }
  )
  await page.locator('.temple-menu a').first().click()
  await expect(page).toHaveURL(/\/404$/)
})

test('model loading is silent and does not expose interactive controls before it is ready', async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/models/lucario-island.bin', async (route) => {
    await gate
    await route.continue()
  })
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'aria-busy',
      'true',
      { timeout: 20000 }
    )
    await expect(page.locator('.temple-obelisk:disabled')).toHaveCount(4)
    await expect(page.locator('.temple-page [role="status"]')).toHaveCount(0)
    release()
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'aria-busy',
      'false',
      { timeout: 20000 }
    )
    await expect(page.locator('.temple-obelisk:disabled')).toHaveCount(0)
  } finally {
    release()
  }
})

test('hover brightens only the crystal cap without a top beam or camera movement', async ({
  page,
}) => {
  const stage = page.locator('.temple-stage')
  const home = await stage.getAttribute('data-camera-position')
  await page.locator('[data-obelisk="creative"]').hover()
  await expect(stage).toHaveAttribute(
    'data-cap-glow',
    '0.380,1.080,0.380,0.380'
  )
  await expect(stage).toHaveAttribute(
    'data-top-light',
    '0.000,0.000,0.000,0.000'
  )
  await expect(stage).toHaveAttribute('data-camera-position', home!)
  await expect(page.locator('.temple-menu')).toHaveCount(0)
  await page.mouse.move(20, 150)
  await expect(stage).toHaveAttribute(
    'data-cap-glow',
    '0.380,0.380,0.380,0.380'
  )
  await expect(stage).toHaveAttribute(
    'data-top-light',
    '0.000,0.000,0.000,0.000'
  )
})

test('focus freezes the head, blurs the zodiac and exits through blank scene or menu space', async ({
  page,
}) => {
  test.setTimeout(60000)
  const root = page.locator('.temple-page')
  const stage = page.locator('.temple-stage')
  await page.locator('[data-obelisk="creative"]').click()
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 10000 })
  const pose = await stage.getAttribute('data-head-rotation')
  await page.mouse.move(1200, 200)
  await page.waitForTimeout(600)
  await expect(stage).toHaveAttribute('data-head-rotation', pose!)
  await expect(page.locator('.zodiac-stage')).toHaveCSS('filter', 'blur(4px)')
  await page.mouse.click(20, 150)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 10000 })
  await expect(page.locator('.zodiac-stage')).toHaveCSS('filter', 'blur(0px)')
  await page.mouse.move(1100, 170)
  await expect(stage).not.toHaveAttribute('data-head-rotation', pose!)
  for (const outer of ['art', 'otaku']) {
    await page.locator(`[data-obelisk="${outer}"]`).click()
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
    const [position, target] = await stage.evaluate((el) =>
      [el.dataset.cameraPosition!, el.dataset.cameraTarget!].map((value) =>
        value.split(',').map(Number)
      )
    )
    const yaw = Math.abs(
      Math.atan2(target[0] - position[0], position[2] - target[2])
    )
    expect(yaw).toBeCloseTo(Math.atan2(8.8, 12.8) / 2, 3)
    for (const inner of ['creative', 'notes']) {
      // 真实命中检查：内侧柱不得被前景柱或菜单挡住。
      await page.locator(`[data-obelisk="${inner}"]`).click({ trial: true })
    }
    await page.locator('.temple-menu h1').click()
    await expect(root).toHaveAttribute('data-selected', 'none')
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
  }
})
