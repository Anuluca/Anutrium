import { expect, test } from '@playwright/test'
import path from 'node:path'

import { openHomeAboutOverlay } from './helpers/homeAboutOverlay'

test.beforeEach(async ({ page }) => {
  // 几何采样不能被其他开发窗口的 HMR 重挂载打断；字体也固定为同一份本地资源。
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('https://use.typekit.net/**', (route) => route.abort())
  await page.route('https://assets.anuluca.com/fonts/unbounded/**', (route) =>
    route.fulfill({
      path: path.resolve(
        'scripts/fonts/generated',
        path.basename(new URL(route.request().url()).pathname)
      ),
      contentType: 'font/woff2',
      headers: { 'access-control-allow-origin': '*' },
    })
  )
})

test('focus and blur preserve full resolution and page geometry throughout motion', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  if (!testInfo.project.name.includes('mobile'))
    await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  const canvas = stage.locator('canvas')
  const read = () =>
    canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement
      const { x, y, width, height } = canvas.getBoundingClientRect()
      return { x, y, width, height, pixels: canvas.width * canvas.height }
    })
  const initial = await read()
  for (const focused of [true, false]) {
    if (focused) await page.locator('[data-obelisk="flanerie"]').click()
    else await page.keyboard.press('Escape')
    const changes = await canvas.evaluate(async (element) => {
      const canvas = element as HTMLCanvasElement
      const initial = {
        bufferWidth: canvas.width,
        bufferHeight: canvas.height,
        ...canvas.getBoundingClientRect().toJSON(),
      }
      const changes: (typeof initial)[] = []
      const end = performance.now() + 3600
      await new Promise<void>((resolve) => {
        const sample = () => {
          const current = {
            bufferWidth: canvas.width,
            bufferHeight: canvas.height,
            ...canvas.getBoundingClientRect().toJSON(),
          }
          if (Object.keys(current).some((key) => current[key] !== initial[key]))
            changes.push(current)
          if (performance.now() >= end) return resolve()
          requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      return changes
    })
    expect(changes, '运镜期间不得更改画布尺寸或页面几何').toEqual([])
    await expect(stage).toHaveAttribute('data-head-turn-progress', '1.000')
    expect((await read()).pixels).toBe(initial.pixels)
  }
  await expect(stage).toHaveAttribute('data-head-aim', 'pointer')
})

test('expanded home pauses hidden GPU work and resumes after collapse', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '仅桌面提供展开按钮')
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    let draws = 0
    const draw = WebGL2RenderingContext.prototype.drawElements
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      if ((this.canvas as HTMLCanvasElement).closest?.('.temple-stage')) draws++
      return draw.apply(this, args)
    }
    Object.defineProperty(window, 'homeSceneDraws', { get: () => draws })
  })
  const readDraws = () =>
    page.evaluate(() => (window as any).homeSceneDraws as number)
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.temple-page')
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 25000 })
  const expand = page.locator('.temple-expand')
  await expand.click()
  await expect(root).toHaveClass(/temple-page--expanded/)
  await expect(root).not.toHaveClass(/temple-page--resizing/)
  const before = await readDraws()
  expect(before).toBeGreaterThan(0)
  await page.mouse.move(10, 150)
  await page.mouse.move(900, 500, { steps: 12 })
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    delete (document as Partial<Document>).hidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(400)
  const hiddenDraws = (await readDraws()) - before
  expect(hiddenDraws, '隐藏场景不应因鼠标或切回标签页而绘制').toBe(0)
  await expand.click()
  await expect(root).not.toHaveClass(/temple-page--expanded/)
  await expect.poll(readDraws).toBeGreaterThan(before)
  await page.keyboard.press('Escape')
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-head-aim',
    'pointer'
  )
})

test('about overlay pauses the covered home scene and resumes after closing', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    let draws = 0
    const draw = WebGL2RenderingContext.prototype.drawElements
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      if ((this.canvas as HTMLCanvasElement).closest?.('.temple-stage')) draws++
      return draw.apply(this, args)
    }
    Object.defineProperty(window, 'homeSceneDraws', { get: () => draws })
  })
  const readDraws = () =>
    page.evaluate(() => (window as any).homeSceneDraws as number)
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 25000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 25000,
  })
  const mobile = testInfo.project.name.includes('mobile')
  if (mobile) await page.locator('.mobile-menu-icon').click()
  await openHomeAboutOverlay(page)
  await expect(page.locator('.about-overlay .about-page')).toBeVisible()
  const before = await readDraws()
  expect(before).toBeGreaterThan(0)
  await page.mouse.move(20, 160)
  await page.waitForTimeout(500)
  expect(await readDraws(), 'About 打开时不应绘制被遮挡的首页场景').toBe(before)
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect.poll(readDraws).toBeGreaterThan(before)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'archive'
  )
})

test('About pauses the covered pet album and resumes its existing animations', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.route('https://assets.anuluca.com/Floratrium/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#e23456"/></svg>',
    })
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const strip = page.locator('.flora-album-strip')
  await expect(strip).toHaveClass(/is-running/, { timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  const position = strip.locator('.flora-album-strip__position').first()
  const animation = await position.evaluateHandle((el) => el.getAnimations()[0])
  await openHomeAboutOverlay(page)
  await expect(page.locator('.about-overlay .about-page')).toBeVisible()
  await expect
    .poll(() => animation.evaluate((value) => value.playState))
    .toBe('paused')
  const time = await animation.evaluate((value) => Number(value.currentTime))
  await page.waitForTimeout(250)
  expect(await animation.evaluate((value) => Number(value.currentTime))).toBe(
    time
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect
    .poll(() => animation.evaluate((value) => value.playState))
    .toBe('running')
  await expect
    .poll(() => animation.evaluate((value) => Number(value.currentTime)))
    .not.toBe(time)
})

test('head-only focus motion does not rewrite pillar hit regions', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 25000,
  })
  await page.locator('[data-obelisk="flanerie"]').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await page.evaluate(() => {
    const probe = {
      writes: 0,
      observer: new MutationObserver((records) => {
        probe.writes += records.length
      }),
    }
    document.querySelectorAll('.temple-obelisk').forEach((button) => {
      probe.observer.observe(button, {
        attributes: true,
        attributeFilter: ['style'],
      })
    })
    ;(window as any).homeHitRegionProbe = probe
  })
  await expect(stage).toHaveAttribute('data-head-turn-progress', '1.000')
  const writes = await page.evaluate(() => {
    const probe = (window as any).homeHitRegionProbe
    probe.observer.disconnect()
    return probe.writes as number
  })
  expect(writes, '相机构图不变时，转头不应重新计算和写入方尖碑点击区域').toBe(0)
})
