import { expect, test } from '@playwright/test'

import { FLORA_MODEL_CENTER_X } from '../src/config/floraLayout'
import { pageThemeColors } from '../src/config/pageThemes'
import modelRevision from '../src/utils/sprigatitoModelRevision.generated.json'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
})

test('Sprigatito dims the scene on hover and focuses without a secondary menu', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  const root = page.locator('.temple-page')
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 30000 })
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true')
  await expect(stage).toHaveAttribute('data-companion-material-phase', 'chrome')
  await expect(stage).toHaveAttribute('data-companion-wire-opacity', '0.000')
  const canvas = await stage.locator('canvas').elementHandle()
  await expect(page.locator('.flora-focus-layout')).toHaveCount(0)
  await expect(stage).toHaveAttribute(
    'data-companion-revision',
    modelRevision.revision
  )
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  if (!testInfo.project.name.includes('mobile')) {
    await page.mouse.move(point[0], point[1])
    await expect(stage).toHaveAttribute('data-hovered', 'sprigatito')
    await expect
      .poll(async () =>
        Number(await stage.getAttribute('data-statue-holy-light'))
      )
      .toBeLessThan(0.02)
    await expect
      .poll(async () =>
        Number(await stage.getAttribute('data-companion-holy-light'))
      )
      .toBeGreaterThan(0.49)
    await expect(stage).toHaveAttribute('data-companion-head-pose', '0.000')
    await page.screenshot({
      path: `.tmp/sprigatito-hover-${testInfo.project.name}.png`,
    })
    await expect
      .poll(async () =>
        Number(await stage.getAttribute('data-environment-brightness'))
      )
      .toBeLessThan(0.5)
    await page.mouse.move(5, 5)
    await expect
      .poll(async () =>
        Number(await stage.getAttribute('data-environment-brightness'))
      )
      .toBeGreaterThan(0.99)
    await expect
      .poll(async () =>
        Number(await stage.getAttribute('data-statue-holy-light'))
      )
      .toBeGreaterThan(0.99)
  }
  await page.mouse.click(point[0], point[1])
  await expect(root).toHaveAttribute('data-selected', 'sprigatito')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(stage).toHaveAttribute('data-companion-head-pose', '1.000')
  await expect(stage).toHaveAttribute(
    'data-companion-material-phase',
    'wireframe'
  )
  await expect(stage).toHaveAttribute('data-companion-wire-opacity', '1.000')
  await expect(stage).toHaveAttribute(
    'data-theme-color',
    pageThemeColors.SPRIGATITO
  )
  await expect(stage).toHaveAttribute('data-companion-holy-light', '0.500')
  await expect(page.locator('.temple-menu')).toHaveCount(0)
  await expect(page.locator('.current-module-name')).toHaveText('FLORATRIUM')
  const viewport = page.viewportSize()!
  const focused = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  const layout = page.locator('.flora-focus-layout')
  await expect(layout).toBeVisible()
  await expect(layout).toHaveClass(/is-border-hidden/)
  const borderToggle = page.locator('.layout-border-toggle')
  await expect(borderToggle).toHaveAttribute('aria-pressed', 'false')
  await borderToggle.click()
  await expect(layout).not.toHaveClass(/is-border-hidden/)
  const bounds = await layout.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const header = document
      .querySelector('.el-menu-layout-all')!
      .getBoundingClientRect()
    const footer = document
      .querySelector('.footer-com')!
      .getBoundingClientRect()
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      headerBottom: header.bottom,
      footerTop: footer.top,
    }
  })
  const regions = await layout.evaluate((element) =>
    Array.from(element.children).map((region) => {
      const rect = region.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        top: rect.top,
        height: rect.height,
        color: getComputedStyle(region).backgroundColor,
        borderWidth: getComputedStyle(region).borderTopWidth,
        borderStyle: getComputedStyle(region).borderTopStyle,
      }
    })
  )
  expect(bounds.left).toBeGreaterThan(0)
  expect(
    Math.abs(bounds.left - (viewport.width - bounds.right))
  ).toBeLessThanOrEqual(1)
  expect(Math.abs(bounds.top - bounds.headerBottom - 16)).toBeLessThanOrEqual(1)
  expect(Math.abs(bounds.footerTop - bounds.bottom - 16)).toBeLessThanOrEqual(1)
  expect(Math.abs(regions[0].left - bounds.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(regions[1].left - regions[0].right - 16)).toBeLessThanOrEqual(
    1
  )
  expect(Math.abs(regions[1].right - bounds.right)).toBeLessThanOrEqual(1)
  for (const region of regions) {
    expect(Math.abs(region.top - bounds.top)).toBeLessThanOrEqual(1)
    expect(Math.abs(region.height - bounds.height)).toBeLessThanOrEqual(1)
    expect(region.color).toBe('rgba(0, 0, 0, 0)')
    expect(region.borderWidth).toBe('1px')
    expect(region.borderStyle).toBe('solid')
  }
  expect(
    Math.abs(focused[0] - viewport.width * FLORA_MODEL_CENTER_X)
  ).toBeLessThanOrEqual(1)
  expect(
    await layout.evaluate((element) => getComputedStyle(element).pointerEvents)
  ).toBe('none')
  expect(
    await canvas!.evaluate(
      (element) => element === document.querySelector('.temple-stage canvas')
    )
  ).toBe(true)
  await expect(page).toHaveURL(/\/$/)
  await expect(borderToggle).toHaveAttribute('aria-pressed', 'true')
  const buttonRect = (await borderToggle.boundingBox())!
  expect(buttonRect.width).toBe(buttonRect.height)
  expect(Math.abs(buttonRect.x)).toBeLessThanOrEqual(1)
  expect(
    Math.abs(viewport.height - buttonRect.y - buttonRect.height)
  ).toBeLessThanOrEqual(1)
  expect(
    await borderToggle.evaluate(
      (element) => element.parentElement === document.body
    )
  ).toBe(true)
  await borderToggle.click()
  await expect(borderToggle).toHaveAttribute('aria-label', '显示分区边框')
  await expect(borderToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(root).toHaveAttribute('data-selected', 'sprigatito')
  const hiddenRegions = await layout
    .locator(':scope > section')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          borderColor: getComputedStyle(element).borderTopColor,
        }
      })
    )
  for (const [index, region] of hiddenRegions.entries()) {
    expect(region.borderColor).toBe('rgba(0, 0, 0, 0)')
    for (const axis of ['left', 'top', 'width', 'height'] as const)
      expect(Math.abs(region[axis] - regions[index][axis])).toBeLessThanOrEqual(
        1
      )
  }
  await expect(layout.locator('.flora-number-bar')).toBeVisible()
  await borderToggle.press('Enter')
  await expect(borderToggle).toHaveAttribute('aria-label', '隐藏分区边框')
  await expect(borderToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(layout).not.toHaveClass(/is-border-hidden/)
  await expect(root).toHaveAttribute('data-selected', 'sprigatito')
  await expect(stage).toHaveAttribute('data-background-base-reveal', '0.000')
  await expect(stage).toHaveAttribute('data-companion-rotation', '-35.00')
  const cameraPosition = (await stage.getAttribute('data-camera-position'))!
    .split(',')
    .map(Number)
  const cameraTarget = (await stage.getAttribute('data-camera-target'))!
    .split(',')
    .map(Number)
  expect(cameraPosition[1]).toBeLessThan(cameraTarget[1])
  expect(Math.abs(focused[1] - viewport.height * 0.55)).toBeLessThan(2)
  await page.screenshot({
    path: `.tmp/sprigatito-focus-${testInfo.project.name}.png`,
  })
  const mobile = testInfo.project.name.includes('mobile')
  const openNavigation = async () => {
    if (mobile) await page.locator('.mobile-menu-icon').click()
    return page.locator(mobile ? '.mobile-menu-items' : '.menu-box')
  }
  let menu = await openNavigation()
  await expect(menu.locator('[data-temple-nav="sprigatito"]')).toContainText(
    '花花小窝'
  )
  await expect(menu.locator('[data-temple-nav="statue"]')).toContainText(
    '个人海湾'
  )
  if (!mobile) {
    await expect
      .poll(() =>
        menu
          .locator('[data-temple-nav="sprigatito"] .main-title')
          .evaluate(
            (element) => getComputedStyle(element).webkitTextStrokeWidth
          )
      )
      .toBe('1px')
  }
  await menu.locator('[data-temple-nav="statue"]').click()
  await expect(root).toHaveAttribute('data-selected', 'statue')
  await expect(layout).toHaveCount(0)
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.current-module-name')).toHaveText('ISLAND')
  menu = await openNavigation()
  if (!mobile) {
    await expect
      .poll(() =>
        menu
          .locator('[data-temple-nav="statue"] .main-title')
          .evaluate(
            (element) => getComputedStyle(element).webkitTextStrokeWidth
          )
      )
      .toBe('1px')
  }
  await menu.locator('[data-temple-nav="sprigatito"]').click()
  await expect(root).toHaveAttribute('data-selected', 'sprigatito')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.current-module-name')).toHaveText('FLORATRIUM')
  await expect(page.locator('.temple-menu')).toHaveCount(0)
  await page.mouse.click(viewport.width * 0.95, viewport.height * 0.65)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(stage).toHaveAttribute('data-theme-color', pageThemeColors.HOME)
  await expect(stage).toHaveAttribute('data-companion-holy-light', '0.000')
  await expect(stage).toHaveAttribute('data-background-base-reveal', '1.000')
  await expect(stage).toHaveAttribute('data-companion-head-pose', '0.000')
  await expect(stage).toHaveAttribute('data-companion-material-phase', 'chrome')
  await expect(stage).toHaveAttribute('data-companion-wire-opacity', '0.000')
  await expect(layout).toHaveCount(0)
})

test('Huahua focus keeps the full page and route container stable during route leave', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.click(point[0], point[1])
  await expect(page.locator('.flora-focus-layout')).toBeVisible()
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  const borderToggle = page.locator('.layout-border-toggle')
  const globalButton = await borderToggle.elementHandle()
  await expect(borderToggle).toHaveAttribute('aria-pressed', 'false')
  await borderToggle.click()
  // 离场期间逐帧采样，检测 Shell 清理导致的页面与路由容器位移。
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const toggle = document.querySelector('.layout-border-toggle')!
    const read = () =>
      [root, container, toggle].map((el) => {
        const rect = el.getBoundingClientRect()
        return [rect.top, rect.left]
      })
    const probe = { before: read(), frames: [] as number[][][] }
    ;(window as any).huahuaLeaveGeometry = probe
    const observer = new MutationObserver(() => {
      if (!root.classList.contains('route-leave-active')) return
      observer.disconnect()
      const tick = () => {
        if (!root.isConnected) return
        probe.frames.push(read())
        requestAnimationFrame(tick)
      }
      tick()
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    ;(
      document.querySelector('.layout-page') as any
    ).__vueParentComponent.proxy.$router.push('/craft')
  })
  await expect(page.locator('.temple-page')).toHaveCount(0, { timeout: 15000 })
  const probe = await page.evaluate(
    () =>
      (window as any).huahuaLeaveGeometry as {
        before: number[][]
        frames: number[][][]
      }
  )
  expect(probe.frames.length).toBeGreaterThan(2)
  for (const frame of probe.frames)
    for (let element = 0; element < 3; element++)
      for (let axis = 0; axis < 2; axis++)
        expect(
          Math.abs(frame[element][axis] - probe.before[element][axis])
        ).toBeLessThanOrEqual(1)
  await expect(borderToggle).toBeVisible()
  await expect(borderToggle).toHaveAttribute('aria-pressed', 'true')
  expect(
    await globalButton!.evaluate(
      (element) => element === document.querySelector('.layout-border-toggle')
    )
  ).toBe(true)
  const rect = (await borderToggle.boundingBox())!
  expect(Math.abs(rect.x)).toBeLessThanOrEqual(1)
  expect(
    Math.abs(page.viewportSize()!.height - rect.y - rect.height)
  ).toBeLessThanOrEqual(1)
  await borderToggle.click()
  await expect(borderToggle).toHaveAttribute('aria-pressed', 'false')
})

test('Sprigatito starts a slower gesture near the camera end and keeps hover light on', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    '时序检查共用同一运镜实现'
  )
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.move(point[0], point[1])
  await expect
    .poll(async () =>
      Number(await stage.getAttribute('data-companion-holy-light'))
    )
    .toBeGreaterThan(0.49)
  await expect(stage).toHaveAttribute(
    'data-companion-light-color',
    pageThemeColors.SPRIGATITO
  )
  const originalDepthWrite = await stage.getAttribute(
    'data-background-base-depth-write'
  )
  const samples = await page.evaluate(
    () =>
      new Promise<
        {
          settled: boolean
          pose: number
          camera: string
          light: number
          elapsed: number
          depth: string
        }[]
      >((resolve, reject) => {
        const stage = document.querySelector<HTMLElement>('.temple-stage')!
        const root = document.querySelector<HTMLElement>('.temple-page')!
        const point = stage.dataset.companionScreen!.split(',').map(Number)
        const samples: {
          settled: boolean
          pose: number
          camera: string
          light: number
          elapsed: number
          depth: string
        }[] = []
        const start = performance.now()
        const sample = () => {
          samples.push({
            settled: root.dataset.settled === 'true',
            pose: Number(stage.dataset.companionHeadPose),
            camera: stage.dataset.cameraPosition!,
            light: Number(stage.dataset.companionHolyLight),
            elapsed: performance.now() - start,
            depth: stage.dataset.backgroundBaseDepthWrite!,
          })
          if (samples[samples.length - 1].pose === 1) return resolve(samples)
          if (performance.now() - start > 8000)
            return reject(new Error('Head gesture did not complete'))
          requestAnimationFrame(sample)
        }
        stage.querySelector('canvas')!.dispatchEvent(
          new MouseEvent('click', {
            clientX: point[0],
            clientY: point[1],
            bubbles: true,
          })
        )
        requestAnimationFrame(sample)
      })
  )
  expect(
    samples
      .filter((sample) => sample.elapsed < 1000)
      .every((sample) => sample.pose === 0)
  ).toBe(true)
  expect(samples.some((sample) => !sample.settled && sample.pose > 0.01)).toBe(
    true
  )
  const gesturing = samples.filter(
    (sample) => sample.settled && sample.pose > 0 && sample.pose < 1
  )
  expect(gesturing.length).toBeGreaterThan(0)
  expect(new Set(gesturing.map((sample) => sample.camera)).size).toBe(1)
  expect(new Set(samples.map((sample) => sample.depth))).toEqual(
    new Set([originalDepthWrite])
  )
  expect(samples[samples.length - 1].elapsed).toBeGreaterThan(2200)
  expect(Math.min(...samples.map((sample) => sample.light))).toBeGreaterThan(
    0.48
  )
  const exitSamples = await page.evaluate(
    () =>
      new Promise<
        { settled: boolean; pose: number; camera: string; depth: string }[]
      >((resolve, reject) => {
        const stage = document.querySelector<HTMLElement>('.temple-stage')!
        const root = document.querySelector<HTMLElement>('.temple-page')!
        const samples: {
          settled: boolean
          pose: number
          camera: string
          depth: string
        }[] = []
        const start = performance.now()
        const sample = () => {
          samples.push({
            settled: root.dataset.settled === 'true',
            pose: Number(stage.dataset.companionHeadPose),
            camera: stage.dataset.cameraPosition!,
            depth: stage.dataset.backgroundBaseDepthWrite!,
          })
          if (samples[samples.length - 1].pose === 0) return resolve(samples)
          if (performance.now() - start > 8000)
            return reject(new Error('Head reset did not complete'))
          requestAnimationFrame(sample)
        }
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        )
        requestAnimationFrame(sample)
      })
  )
  const movingOut = exitSamples.filter((sample) => !sample.settled)
  expect(movingOut.length).toBeGreaterThan(0)
  expect(movingOut.every((sample) => sample.pose >= 0.99)).toBe(true)
  const resetting = exitSamples.filter(
    (sample) => sample.settled && sample.pose > 0 && sample.pose < 1
  )
  expect(resetting.length).toBeGreaterThan(0)
  expect(new Set(resetting.map((sample) => sample.camera)).size).toBe(1)
  expect(new Set(exitSamples.map((sample) => sample.depth))).toEqual(
    new Set([originalDepthWrite])
  )
})
