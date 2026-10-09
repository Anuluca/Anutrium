import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page: _page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '四柱场景仅用于桌面端')
})

test('entrance frames the statue before raising full-size pillars and enabling interaction', async ({
  page,
}) => {
  // 只控制渲染时间；网络加载、着色器预编译和路由定时器继续正常运行。
  await page.addInitScript(() => {
    const clock = { now: 1000 }
    ;(window as typeof window & { entranceClock: typeof clock }).entranceClock =
      clock
    const progressSequence = {
      first: -1,
      completed: false,
      flashed: false,
      removed: false,
    }
    ;(
      window as typeof window & { progressSequence: typeof progressSequence }
    ).progressSequence = progressSequence
    const observer = new MutationObserver(() => {
      const progress = document.querySelector('.temple-preparation-progress')
      const stage = document.querySelector<HTMLElement>('.temple-stage')
      if (progress && progressSequence.first < 0)
        progressSequence.first = Number(progress.getAttribute('aria-valuenow'))
      if (progress && stage?.dataset.entrancePhase === 'loading-complete') {
        progressSequence.completed ||=
          progress.getAttribute('aria-valuenow') === '100' &&
          stage.style.opacity === '0'
        progressSequence.flashed ||= progress.classList.contains('is-fading')
      }
      if (!progress && stage?.dataset.entrancePhase === 'statue') {
        progressSequence.removed = true
        observer.disconnect()
      }
    })
    observer.observe(document, {
      childList: true,
      attributes: true,
      subtree: true,
    })
    const requestFrame = window.requestAnimationFrame.bind(window)
    performance.now = () => clock.now
    window.requestAnimationFrame = (callback) =>
      requestFrame(() => callback(clock.now))
  })
  const advance = async (milliseconds: number) => {
    await page.evaluate(async (ms) => {
      ;(
        window as typeof window & { entranceClock: { now: number } }
      ).entranceClock.now += ms
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    }, milliseconds)
  }
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  const hero = stage.locator('.page-hero-title')
  const titleRise = () =>
    hero.locator('h1').evaluate((element) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
      return matrix.m42 / element.getBoundingClientRect().height
    })
  await expect(stage).toHaveAttribute('data-entrance-phase', 'statue', {
    timeout: 20000,
  })
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & {
            progressSequence: {
              first: number
              completed: boolean
              flashed: boolean
              removed: boolean
            }
          }
        ).progressSequence
    )
  ).toEqual({ first: 0, completed: true, flashed: true, removed: true })
  await expect(stage).toHaveAttribute('data-base-y', '0.000,0.000,0.000,0.000')
  expect(
    Math.abs(Number(await stage.getAttribute('data-shaft-base-gap')))
  ).toBeLessThan(0.0001)
  await expect(stage).toHaveAttribute('data-visible-obelisks', '')
  await expect(stage).toHaveAttribute('data-statue-holy-light', '0.000')
  expect(await titleRise()).toBeCloseTo(1, 2)
  await expect(stage).toHaveAttribute(
    'data-monument-y',
    '-7.500,-7.500,-7.500,-7.500'
  )
  const initialCamera = await stage.getAttribute('data-camera-position')
  expect(Number(initialCamera!.split(',')[0])).toBe(0)
  expect(Number(initialCamera!.split(',')[1])).toBeGreaterThan(4.25)
  const initialOpacity = await stage.evaluate((element) =>
    Number(getComputedStyle(element).opacity)
  )
  expect(initialOpacity).toBeLessThan(0.2)
  await expect(page.locator('.temple-obelisk:disabled')).toHaveCount(4)
  await expect(page.locator('.temple-obelisk:visible')).toHaveCount(0)
  await page
    .locator('[data-obelisk="creative"]')
    .evaluate((button) => (button as HTMLButtonElement).click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  const headPitch = async () => {
    const quaternion = (await stage.getAttribute('data-head-rotation'))!
      .split(',')
      .map(Number)
    return (
      (2 * Math.atan2(quaternion[0], quaternion[3]) * 180) / Math.PI +
      Number(await stage.getAttribute('data-head-nod-angle'))
    )
  }
  const initialPitch = await headPitch()
  const entranceRate = 1.2
  await advance(750 / entranceRate)
  const raisedCamera = (await stage.getAttribute('data-camera-position'))!
    .split(',')
    .map(Number)
  const raisedTarget = (await stage.getAttribute('data-camera-target'))!
    .split(',')
    .map(Number)
  expect(raisedCamera[0]).toBe(0)
  expect(raisedTarget[0]).toBe(0)
  expect(raisedCamera[1]).toBeLessThan(Number(initialCamera!.split(',')[1]))
  await expect(stage).toHaveAttribute('data-visible-obelisks', '')
  await expect(stage).toHaveAttribute('data-statue-holy-light', '0.000')
  const earlyTitleRise = await titleRise()
  expect(earlyTitleRise).toBeGreaterThan(0)
  expect(earlyTitleRise).toBeLessThan(1)
  await advance(250 / entranceRate)
  await expect(stage).toHaveAttribute('data-visible-obelisks', 'creative,notes')
  expect(
    Number(await stage.getAttribute('data-statue-holy-light'))
  ).toBeGreaterThan(0)
  expect(
    await stage.evaluate((el) => Number(getComputedStyle(el).opacity))
  ).toBeLessThan(1)
  await advance(400 / entranceRate)
  await expect(stage).toHaveAttribute(
    'data-visible-obelisks',
    'art,creative,notes,otaku'
  )
  expect(await headPitch()).toBeCloseTo(initialPitch, 2)
  await advance(1700 / entranceRate)
  const middleCamera = (await stage.getAttribute('data-camera-position'))!
    .split(',')
    .map(Number)
  const middleTarget = (await stage.getAttribute('data-camera-target'))!
    .split(',')
    .map(Number)
  expect(middleCamera[0]).toBe(0)
  expect(middleTarget[0]).toBe(0)
  expect(middleCamera[1]).toBeLessThan(raisedCamera[1])
  expect(middleCamera[2]).toBe(raisedCamera[2])
  await expect(stage).toHaveAttribute(
    'data-visible-obelisks',
    'art,creative,notes,otaku'
  )
  const heights = (await stage.getAttribute('data-monument-y'))!
    .split(',')
    .map(Number)
  expect(heights.every((y) => y > -7.5 && y < 0)).toBe(true)
  expect(heights[1]).toBeGreaterThan(heights[0])
  const middleHolyLight = Number(
    await stage.getAttribute('data-statue-holy-light')
  )
  expect(middleHolyLight).toBeGreaterThan(0)
  expect(middleHolyLight).toBeLessThan(1)
  expect(await titleRise()).toBeLessThan(earlyTitleRise)
  expect(await headPitch()).toBeGreaterThan(initialPitch)
  await expect(page.locator('.temple-obelisk:disabled')).toHaveCount(4)
  await expect(stage).not.toHaveAttribute(
    'data-camera-position',
    initialCamera!
  )
  await advance(1500 / entranceRate)
  await expect(stage).toHaveAttribute(
    'data-monument-y',
    '0.000,0.000,0.000,0.000'
  )
  await expect(stage).toHaveAttribute('data-statue-holy-light', '1.000')
  expect(await titleRise()).toBeGreaterThan(0)
  await advance(1050 / entranceRate)
  await expect(stage).toHaveAttribute('data-entrance-finished', 'false')
  await advance(50 / entranceRate)
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true')
  await expect(stage).toHaveAttribute('data-entrance-phase', 'complete')
  await expect(page.locator('.temple-obelisk:enabled')).toHaveCount(4)
  await expect(page.locator('.temple-obelisk:visible')).toHaveCount(4)
  await expect(stage).toHaveAttribute(
    'data-monument-y',
    '0.000,0.000,0.000,0.000'
  )
  await expect(stage).toHaveAttribute(
    'data-camera-position',
    /^0\.0000,1\.0000,/
  )
  expect(await headPitch()).toBeCloseTo(initialPitch + 10, 2)
  expect(await titleRise()).toBeCloseTo(0, 3)
  await expect(hero.locator('h1')).toHaveCSS('opacity', '1')
  await expect(stage).toHaveAttribute('data-statue-holy-light', '1.000')
  await expect(hero).toHaveClass(/is-static/)
  const geometry = await hero.evaluate((element) => {
    const stage = element.parentElement!
    const rect = element.getBoundingClientRect()
    const bounds = stage.getBoundingClientRect()
    return {
      bottom: rect.bottom - bounds.top,
      horizon: parseFloat(stage.style.getPropertyValue('--temple-horizon-y')),
      left: rect.left,
      width: rect.width,
      viewport: innerWidth,
      color: getComputedStyle(element).color,
    }
  })
  expect(Math.abs(geometry.bottom - geometry.horizon)).toBeLessThanOrEqual(1)
  expect(geometry.left).toBe(0)
  expect(geometry.width).toBe(geometry.viewport)
  expect(geometry.color).toBe('rgb(226, 52, 86)')
  await advance(6000)
  await expect(hero.locator('.is-animating')).toHaveCount(0)
  await expect(hero.locator('.page-hero-title__char').first()).toHaveCSS(
    'pointer-events',
    'none'
  )
  await page.locator('[data-obelisk="creative"]').click()
  await advance(500)
  let movingHeights = (await stage.getAttribute('data-monument-y'))!
    .split(',')
    .map(Number)
  expect(movingHeights[0]).toBeGreaterThan(-7.5)
  expect(movingHeights[0]).toBeLessThan(0)
  expect(movingHeights[1]).toBe(0)
  await expect(stage).toHaveAttribute(
    'data-visible-obelisks',
    'art,creative,notes,otaku'
  )
  await expect(stage).toHaveAttribute('data-base-y', '0.000,0.000,0.000,0.000')
  await advance(1200)
  await expect(stage).toHaveAttribute('data-visible-obelisks', 'creative')
  await expect(hero).toHaveCSS('opacity', '0.2')
  await stage
    .locator('canvas')
    .click({ position: { x: 20, y: page.viewportSize()!.height - 100 } })
  await advance(500)
  movingHeights = (await stage.getAttribute('data-monument-y'))!
    .split(',')
    .map(Number)
  expect(movingHeights[0]).toBeGreaterThan(-7.5)
  expect(movingHeights[0]).toBeLessThan(0)
  await expect(stage).toHaveAttribute('data-base-y', '0.000,0.000,0.000,0.000')
  await advance(1200)
  await expect(stage).toHaveAttribute(
    'data-monument-y',
    '0.000,0.000,0.000,0.000'
  )
  await expect(hero).toHaveCSS('opacity', '1')
})

test('route entry completes before the scene fades in and starts its camera motion', async ({
  page,
}) => {
  test.setTimeout(60000)
  // 在 GSAP 初始化前接管时钟，保证首次加载与缓存返回使用同一个时间源。
  await page.clock.install()
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50))
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  for (let attempt = 0; attempt < 100; attempt++) {
    await page.clock.runFor(50)
    const phase = await page.evaluate(
      () =>
        document.querySelector<HTMLElement>('.temple-stage')?.dataset
          .entrancePhase
    )
    if (phase === 'delay') break
    await page.waitForTimeout(100)
  }
  await page.clock.runFor(2400)
  await page.clock.fastForward(5700)
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 25000 }
  )
  await page.locator('.menu-box a[href="/craft"]').click()
  await page.clock.runFor(1000)
  await expect(page.locator('.craft-page')).toBeVisible()
  await expect(page.locator('.craft-page')).not.toHaveClass(
    /route-enter-active/
  )
  // 延长真实路由过渡，确保缓存资源提前准备好，覆盖“资源先就绪”的时序。
  await page.addStyleTag({
    content: '.route-enter-active { transition-duration: 8s !important; }',
  })
  await page.locator('.menu-box a[href="/island"]').click()
  const root = page.locator('.temple-page')
  const stage = page.locator('.temple-stage')
  for (let attempt = 0; attempt < 100; attempt++) {
    await page.clock.runFor(50)
    const phase = await page.evaluate(
      () =>
        document.querySelector<HTMLElement>('.temple-stage')?.dataset
          .entrancePhase
    )
    if (phase === 'waiting-route') break
    await page.waitForTimeout(100)
  }
  await expect(stage).toHaveAttribute('data-entrance-phase', 'waiting-route', {
    timeout: 7000,
  })
  await expect(root).toHaveClass(/route-enter-active/)
  await expect(stage).toHaveCSS('opacity', '0')
  await expect(stage.locator('canvas')).toHaveCSS('visibility', 'hidden')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'false')
  await expect(page.locator('.temple-obelisk:disabled')).toHaveCount(4)
  await page.clock.fastForward(9000)
  await expect(root).not.toHaveClass(/route-enter-active/, { timeout: 12000 })
  await expect(stage).toHaveAttribute('data-entrance-phase', 'delay')
  await expect(page.getByRole('progressbar')).toBeVisible()
  for (let attempt = 0; attempt < 60; attempt++) {
    await page.clock.runFor(50)
    if ((await stage.getAttribute('data-entrance-phase')) === 'statue') break
  }
  await expect(stage).toHaveAttribute('data-entrance-phase', 'statue')
  await expect(stage).toHaveAttribute('data-camera-position', /^0\.0000,/)
  await page.clock.fastForward(5700)
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 10000,
  })
  await expect(stage).toHaveCSS('opacity', '1')
})

test('resizing during the entrance settles at the resized home framing', async ({
  page,
}) => {
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-phase', 'statue', {
    timeout: 20000,
  })
  await page.setViewportSize({ width: 1100, height: 900 })
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 12000,
  })
  const home = await stage.getAttribute('data-camera-position')
  expect(Number(home!.split(',')[2])).toBeCloseTo(31 / (1100 / 900), 3)
  await page.locator('[data-obelisk="creative"]').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await page.locator('[data-obelisk="creative"]').click()
  await expect(stage).toHaveAttribute('data-camera-position', home!, {
    timeout: 5000,
  })
})

test('reduced motion opens the final scene immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 20000,
  })
  await expect(stage).toHaveAttribute('data-entrance-phase', 'complete')
  await expect(stage).toHaveAttribute(
    'data-monument-y',
    '0.000,0.000,0.000,0.000'
  )
  await expect(stage).toHaveAttribute(
    'data-camera-position',
    /^0\.0000,1\.0000,/
  )
  await expect(page.locator('.temple-obelisk:enabled')).toHaveCount(4)
  await expect(stage).toHaveAttribute('data-statue-holy-light', '1.000')
  await expect(stage.locator('.page-hero-title h1')).toHaveCSS('opacity', '1')
})
