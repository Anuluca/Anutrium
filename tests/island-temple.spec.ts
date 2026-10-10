import { expect, test } from '@playwright/test'

const categories = [
  { id: 'archive', title: '作品集' },
  { id: 'flanerie', title: '旅程' },
]

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    '桌面神殿，手机保留原有模型页'
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
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
  const layout = await page.locator('.temple-stage').evaluate((stage) => ({
    statueZ: Number(stage.dataset.statueZ),
    monumentZ: stage.dataset.monumentZ!.split(',').map(Number),
    monumentYaw: stage.dataset.monumentYaw!.split(',').map(Number),
  }))
  expect(layout.statueZ).toBeGreaterThan(layout.monumentZ[1])
  expect(layout.statueZ).toBeGreaterThan(layout.monumentZ[2])
  expect(layout.monumentYaw).toEqual([40, 24, -24, -40])
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

test('all four categories frame their half of the screen, hide other pillars and return home', async ({
  page,
}) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const root = page.locator('.temple-page')
  const stage = page.locator('.temple-stage')
  const initial = await stage.getAttribute('data-camera-position')
  const initialTarget = await stage.getAttribute('data-camera-target')
  const initialFov = await stage.getAttribute('data-camera-fov')
  const initialMonuments = await stage.getAttribute('data-monument-z')
  const initialStatue = await stage.getAttribute('data-statue-z')
  for (const [index, category] of categories.entries()) {
    await page.locator(`[data-obelisk="${category.id}"]`).click()
    await expect(root).toHaveAttribute('data-selected', category.id)
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
    await expect(stage).not.toHaveAttribute('data-camera-position', initial!)
    await expect(stage).not.toHaveAttribute(
      'data-camera-target',
      initialTarget!
    )
    await expect(stage).toHaveAttribute('data-camera-fov', initialFov!)
    if (index === 1 || index === 2) {
      const layout = await stage.evaluate((element) => ({
        statueZ: Number(element.dataset.statueZ),
        monumentZ: element.dataset.monumentZ!.split(',').map(Number),
      }))
      const home = initialMonuments!.split(',').map(Number)
      expect(layout.monumentZ[index]).toBeGreaterThan(home[index])
      expect(layout.statueZ).toBeLessThan(Number(initialStatue))
      expect(layout.statueZ).toBeLessThan(layout.monumentZ[index])
      for (const [otherIndex, z] of layout.monumentZ.entries())
        if (otherIndex !== index) expect(z).toBe(home[otherIndex])
    } else {
      await expect(stage).toHaveAttribute('data-monument-z', initialMonuments!)
      await expect(stage).toHaveAttribute('data-statue-z', initialStatue!)
    }
    await expect(stage).toHaveAttribute('data-visible-obelisks', category.id)
    await expect(stage).toHaveAttribute('data-statue-visible', 'true')
    await expect(stage).toHaveAttribute('data-statue-holy-light', '0.000')
    const yaw = await stage.evaluate((element) => {
      const position = element.dataset.cameraPosition!.split(',').map(Number)
      const target = element.dataset.cameraTarget!.split(',').map(Number)
      return (
        Math.abs(Math.atan2(target[0] - position[0], position[2] - target[2])) *
        (180 / Math.PI)
      )
    })
    expect(yaw).toBeCloseTo(index === 1 || index === 2 ? 27.5 : 17.5, 2)
    const pitch = await stage.evaluate((element) => {
      const position = element.dataset.cameraPosition!.split(',').map(Number)
      const target = element.dataset.cameraTarget!.split(',').map(Number)
      return (
        Math.atan2(
          target[1] - position[1],
          Math.hypot(target[0] - position[0], target[2] - position[2])
        ) *
        (180 / Math.PI)
      )
    })
    expect(pitch).toBeCloseTo(10, 2)
    const focused = await page
      .locator(`[data-obelisk="${category.id}"]`)
      .boundingBox()
    const viewport = page.viewportSize()!
    const centerX = focused!.x + focused!.width / 2
    const expectedCenter = index === 0 || index === 3 ? 0.15 : 0.2
    expect(
      Math.abs(
        centerX / viewport.width -
          (index < 2 ? expectedCenter : 1 - expectedCenter)
      )
    ).toBeLessThan(0.025)
    expect(focused!.height / viewport.height).toBeGreaterThan(0.6)
    expect(focused!.height / viewport.height).toBeLessThan(0.75)
    expect(
      Math.abs((focused!.y + focused!.height / 2) / viewport.height - 0.5125)
    ).toBeLessThan(0.04)
    expect(focused!.y).toBeGreaterThan(50)
    expect(focused!.y + focused!.height).toBeLessThan(viewport.height - 30)
    for (const other of categories.filter((item) => item.id !== category.id)) {
      const hidden = page.locator(`[data-obelisk="${other.id}"]`)
      await expect(hidden).toBeHidden()
      await expect(hidden).toHaveAttribute('aria-hidden', 'true')
      await expect(hidden).toHaveAttribute('tabindex', '-1')
    }
    const menu = page.locator('.temple-menu')
    await expect(menu).toHaveClass(/is-visible/)
    await menu.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      )
    })
    await expect(menu.locator('header > h1')).toHaveText(category.title)
    if (index === 0)
      await expect(menu.locator('.shared-work-card').first()).toBeVisible()
    else if (index === 1)
      await expect(menu.locator('.travel-map-shell')).toBeVisible()

    const bounds = await menu.boundingBox()
    const shade = await root.evaluate(
      (element) => getComputedStyle(element, '::after').backgroundImage
    )
    expect(shade).toContain(index < 2 ? 'to left' : 'to right')
    expect(
      Math.abs(bounds!.width - viewport.width * 0.442)
    ).toBeLessThanOrEqual(1)
    const sideMargin =
      index < 2 ? viewport.width - bounds!.x - bounds!.width : bounds!.x
    expect(Math.abs(sideMargin - viewport.width * 0.058)).toBeLessThanOrEqual(1)
    if (index < 2)
      expect(bounds!.x).toBeGreaterThanOrEqual(
        page.viewportSize()!.width / 2 - 1
      )
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
    await expect(stage).toHaveAttribute('data-monument-z', initialMonuments!)
    await expect(stage).toHaveAttribute('data-statue-z', initialStatue!)
    await expect(stage).toHaveAttribute('data-statue-holy-light', '1.000')
    await expect(stage).toHaveAttribute(
      'data-visible-obelisks',
      'archive,flanerie,pokeyard,island'
    )
    await expect(page.locator('.temple-obelisk:visible')).toHaveCount(4)
  }
  expect(errors).toEqual([])
})

test('interrupting camera return continues from the current position into another focus', async ({
  page,
}) => {
  const stage = page.locator('.temple-stage')
  const initialCamera = await stage.getAttribute('data-camera-position')
  await page.locator('[data-obelisk="flanerie"]').click()
  await page.waitForTimeout(550)
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((button) => (button as HTMLButtonElement).click())
  await page.waitForTimeout(200)
  const distance = await stage.evaluate(async (element) => {
    const read = () =>
      (element as HTMLElement).dataset.cameraPosition!.split(',').map(Number)
    const before = read()
    // 同一个浏览器任务内切换并采样下一帧，排除自动化工具等待焦点带来的时间间隔。
    ;(
      document.querySelector('[data-obelisk="archive"]') as HTMLButtonElement
    ).click()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const after = read()
    return Math.hypot(...before.map((value, index) => value - after[index]))
  })
  expect(distance).toBeLessThan(1)
  await expect(stage).not.toHaveAttribute(
    'data-camera-position',
    initialCamera!
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 10000 }
  )
  await expect(page.locator('.temple-menu header > h1')).toHaveText('作品集')
  await expect(page.locator('[data-obelisk="archive"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(page.locator('[data-obelisk="flanerie"]')).toHaveAttribute(
    'aria-pressed',
    'false'
  )
})

test('portfolio focus embeds the existing project detail interaction', async ({
  page,
}) => {
  await page.locator('[data-obelisk="archive"]').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await page.locator('.temple-menu .shared-work-card').first().click()
  await expect(page.locator('.el-dialog')).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
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

test('hover fades in the crystal and its halo without a top beam or camera movement', async ({
  page,
}) => {
  const stage = page.locator('.temple-stage')
  const home = await stage.getAttribute('data-camera-position')
  await page.locator('[data-obelisk="flanerie"]').hover()
  await page.waitForTimeout(80)
  const partialGlow = Number(
    (await stage.getAttribute('data-cap-glow'))!.split(',')[1]
  )
  expect(partialGlow).toBeGreaterThan(0.38)
  expect(partialGlow).toBeLessThan(1.08)
  await expect(stage).toHaveAttribute(
    'data-cap-glow',
    '0.380,1.080,0.380,0.380'
  )
  await expect(stage).toHaveAttribute(
    'data-cap-halo',
    '0.000,0.650,0.000,0.000'
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
    'data-cap-halo',
    '0.000,0.000,0.000,0.000'
  )
  await expect(stage).toHaveAttribute(
    'data-top-light',
    '0.000,0.000,0.000,0.000'
  )
})

test('focus aims and holds the head, keeps the background sharp and exits through blank scene or menu space', async ({
  page,
}) => {
  test.setTimeout(60000)
  const root = page.locator('.temple-page')
  const stage = page.locator('.temple-stage')
  const backgroundFilter = await page
    .locator('.zodiac-stage')
    .evaluate((element) => getComputedStyle(element).filter)
  await page.locator('[data-obelisk="flanerie"]').click()
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 10000 })
  await expect(stage).toHaveAttribute('data-head-aim', 'flanerie')
  await page.waitForTimeout(800)
  const pose = await stage.getAttribute('data-head-rotation')
  expect(Number(pose!.split(',')[1])).toBeLessThan(-0.35)
  await page.mouse.move(1200, 200)
  await page.waitForTimeout(600)
  await expect(stage).toHaveAttribute('data-head-rotation', pose!)
  await expect(page.locator('.zodiac-stage')).toHaveCSS(
    'filter',
    backgroundFilter
  )
  await page.mouse.click(20, 150)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 10000 })
  await expect(page.locator('.zodiac-stage')).toHaveCSS(
    'filter',
    backgroundFilter
  )
  await page.mouse.move(1100, 170)
  await expect(stage).not.toHaveAttribute('data-head-rotation', pose!)
  for (const outer of ['archive']) {
    await page.locator(`[data-obelisk="${outer}"]`).click()
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
    await expect(stage).toHaveAttribute('data-visible-obelisks', outer)
    await expect(stage).toHaveAttribute('data-statue-visible', 'true')
    for (const inner of ['flanerie', 'island']) {
      await expect(page.locator(`[data-obelisk="${inner}"]`)).toBeHidden()
    }
    await page.locator('.temple-menu header > h1').click()
    await expect(root).toHaveAttribute('data-selected', 'none')
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
  }
})

test('crystal pixels stay stable when the focus camera settles', async ({
  page,
}) => {
  test.setTimeout(60000)
  const stage = page.locator('.temple-stage')
  await page.mouse.move(20, 150)
  await page.waitForTimeout(1000)
  // 只控制三维渲染时间，分别采样运镜结束前后；菜单与资源加载沿用浏览器原时钟。
  await page.evaluate(() => {
    const clock = { now: performance.now() }
    ;(
      window as typeof window & { templeFocusClock: typeof clock }
    ).templeFocusClock = clock
    const nativeFrame = requestAnimationFrame.bind(window)
    performance.now = () => clock.now
    window.requestAnimationFrame = (callback) =>
      nativeFrame(() => callback(clock.now))
  })
  const advance = async (milliseconds: number) => {
    await page.evaluate(async (ms) => {
      ;(
        window as typeof window & { templeFocusClock: { now: number } }
      ).templeFocusClock.now += ms
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    }, milliseconds)
  }
  const readColor = async (png: Buffer) =>
    page.evaluate(async (base64) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data
      const rgb = [0, 0, 0]
      for (let index = 0; index < pixels.length; index += 4)
        for (let channel = 0; channel < 3; channel++)
          rgb[channel] += pixels[index + channel]
      return rgb.map((value) => value / (pixels.length / 4))
    }, png.toString('base64'))
  for (const { id } of categories) {
    const pillar = page.locator(`[data-obelisk="${id}"]`)
    await pillar.evaluate((button) => (button as HTMLButtonElement).click())
    await advance(1600)
    const bounds = (await pillar.boundingBox())!
    // 取晶体内部的小区域，排除背景星点、文字和菜单的淡入。
    const clip = {
      x: Math.round(bounds.x + bounds.width * 0.47),
      y: Math.round(bounds.y + bounds.height * 0.1),
      width: Math.max(8, Math.round(bounds.width * 0.07)),
      height: Math.max(8, Math.round(bounds.height * 0.035)),
    }
    const before = await page.screenshot({ clip })
    await advance(100)
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    const after = await page.screenshot({ clip })
    const startColor = await readColor(before)
    const endColor = await readColor(after)
    expect(
      Math.max(
        ...startColor.map((value, index) => Math.abs(value - endColor[index]))
      )
    ).toBeLessThan(3)
    await pillar.evaluate((button) => (button as HTMLButtonElement).click())
    await advance(1700)
    await expect(stage).toHaveAttribute(
      'data-visible-obelisks',
      'archive,flanerie,pokeyard,island'
    )
  }
})
