import { expect, test } from '@playwright/test'
import path from 'node:path'

import { openHomeAboutOverlay } from './helpers/homeAboutOverlay'

test.beforeEach(async ({ page }) => {
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

test('home downloads panel messages only when their content is opened', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const domains = new Set<string>()
  const optionalEffects: string[] = []
  page.on('request', (request) => {
    if (/postprocessing|RoomEnvironment/.test(request.url()))
      optionalEffects.push(request.url())
    const match = new URL(request.url()).pathname.match(
      /\/locales\/modules\/(archive|flanerie|about)\.ts$/
    )
    if (match) domains.add(match[1])
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  expect([...domains]).toEqual([])
  expect(optionalEffects, '线框入口不应下载材质模式的环境和后处理').toEqual([])
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((element: HTMLButtonElement) => element.click())
  await expect(page.locator('.works-grid').first()).toBeVisible()
  expect([...domains]).toEqual(['archive'])
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  if (info.project.name.includes('mobile'))
    await page.locator('.mobile-menu-icon').click()
  await openHomeAboutOverlay(page)
  await expect(page.locator('.about-overlay .about-page')).toBeVisible()
  expect([...domains]).toEqual(['archive', 'about'])
})

test('desktop panel resizing avoids layout work on every animation frame', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'), '桌面侧栏提供展开按钮')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.works-grid').first()).toBeVisible()
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('.temple-menu').evaluate((element) => {
    const probe = { resizes: 0 }
    new ResizeObserver(() => probe.resizes++).observe(element)
    ;(window as any).panelResizeProbe = probe
  })
  const resizeCount = () =>
    page.evaluate(() => (window as any).panelResizeProbe.resizes as number)
  await expect.poll(resizeCount).toBeGreaterThan(0)
  for (const expanded of [true, false]) {
    const start = await resizeCount()
    await page.locator('.temple-expand').click()
    await expect(page.locator('.temple-page')).toHaveClass(
      /temple-page--resizing/
    )
    const frames = await page
      .locator('.temple-menu')
      .evaluate((element) =>
        element
          .getAnimations()
          .flatMap((animation) =>
            (animation.effect as KeyframeEffect).getKeyframes()
          )
      )
    expect(
      frames.some(
        (frame) => 'width' in frame || 'left' in frame || 'right' in frame
      )
    ).toBe(false)
    await expect(page.locator('.temple-page')).not.toHaveClass(
      /temple-page--resizing/
    )
    expect(
      (await resizeCount()) - start,
      '尺寸切换可以重排，动画不应每帧改变内容盒尺寸'
    ).toBeLessThan(4)
    await expect(page.locator('.temple-expand')).toHaveAttribute(
      'aria-expanded',
      String(expanded)
    )
    await expect(page.locator('.temple-menu')).toHaveCSS('will-change', 'auto')
    await expect(page.locator('.temple-menu__body')).toHaveCSS(
      'transform',
      'none'
    )
  }
})

test('home keeps route-leave geometry within one pixel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  await expect(page.locator('.temple-page')).not.toHaveClass(
    /route-enter-active/
  )
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addStyleTag({
    content: '.route-leave-active { transition-duration: 600ms !important; }',
  })
  // 切换 reduced-motion 会恢复尚未结束的入场 transform，几何基线必须在入场完成后采集。
  await page.locator('.temple-page').evaluate(async (element) => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
    await Promise.all(
      [element, element.parentElement!].flatMap((node) =>
        node.getAnimations().map((animation) => animation.finished)
      )
    )
  })
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = root.parentElement!
    const before = [
      root.getBoundingClientRect(),
      container.getBoundingClientRect(),
    ]
    const probe = { maxShift: 0, leaving: 0 }
    const sample = () => {
      if (!root.isConnected) return
      if (root.classList.contains('route-leave-active')) {
        probe.leaving++
        for (const [index, rect] of [
          root.getBoundingClientRect(),
          container.getBoundingClientRect(),
        ].entries()) {
          probe.maxShift = Math.max(
            probe.maxShift,
            Math.abs(rect.top - before[index].top),
            Math.abs(rect.left - before[index].left)
          )
        }
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    ;(window as any).homeLeaveProbe = probe
    void (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/craft')
  })
  await expect(page.locator('.craft-page')).toBeVisible()
  const probe = await page.evaluate(() => (window as any).homeLeaveProbe)
  expect(probe.leaving).toBeGreaterThan(1)
  expect(probe.maxShift).toBeLessThanOrEqual(1)
})
