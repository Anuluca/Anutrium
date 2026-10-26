import path from 'node:path'

import { openHomeAboutOverlay } from './helpers/homeAboutOverlay'
import { expect, type Page, test } from './helpers/sceneDiagnostics'

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
  await page.route('**/github/contributions', (route) =>
    route.fulfill({
      json: {
        username: 'Anuluca',
        from: '2026-01-01',
        to: '2026-03-25',
        updatedAt: '2026-10-12T00:00:00Z',
        totalContributions: 84,
        weeks: Array.from({ length: 12 }, (_, week) => ({
          firstDay: String(week),
          days: Array.from({ length: 7 }, (_, weekday) => ({
            date: `day-${week}-${weekday}`,
            weekday,
            contributionCount: 1,
            contributionLevel: 'FIRST_QUARTILE',
          })),
        })),
      },
    })
  )
})

async function openArchive(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}

test('contribution animations retain their effect and pause offscreen, under about, and in hidden tabs', async ({
  page,
}) => {
  await openArchive(page)
  const graph = page.locator('.github-contribution-graph').first()
  await graph.scrollIntoViewIfNeeded()
  await expect(graph).not.toHaveClass(/is-motion-paused/)
  const cell = graph.locator('.github-contribution-graph__day').first()
  const animationName = await cell.evaluate(
    (e) => getComputedStyle(e).animationName
  )
  expect(animationName).toContain('githubContributionTwinkle')
  const offscreenStyle = await page.addStyleTag({
    content:
      '.github-contribution-graph { position: fixed !important; top: -10000px !important; bottom: auto !important; }',
  })
  await expect(graph).toHaveClass(/is-motion-paused/)
  await offscreenStyle.evaluate((e) => e.remove())
  await graph.scrollIntoViewIfNeeded()
  await expect(graph).not.toHaveClass(/is-motion-paused/)
  await openHomeAboutOverlay(page)
  await expect(graph).toHaveClass(/is-motion-paused/)
  await expect(cell).toHaveCSS('animation-play-state', 'paused')
  expect(await cell.evaluate((e) => getComputedStyle(e).animationName)).toBe(
    animationName
  )
  await expect(page.locator('.particles-bg')).toHaveAttribute(
    'data-motion-state',
    'paused'
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await graph.scrollIntoViewIfNeeded()
  await expect(graph).not.toHaveClass(/is-motion-paused/)
  await expect(page.locator('.particles-bg')).toHaveAttribute(
    'data-motion-state',
    'running'
  )
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(graph).toHaveClass(/is-motion-paused/)
  await page.evaluate(() => {
    delete (document as Partial<Document>).visibilityState
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(graph).not.toHaveClass(/is-motion-paused/)
})

test('expanded content pauses background particles and collapse resumes them', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'), '移动端没有展开开关')
  await openArchive(page)
  const particles = page.locator('.particles-bg')
  await expect(particles).toHaveAttribute('data-motion-state', 'running')
  await page.locator('.temple-expand').click()
  await expect(particles).toHaveAttribute('data-motion-state', 'paused')
  await expect(page.locator('.temple-page')).not.toHaveClass(
    /temple-page--resizing/
  )
  await page.locator('.temple-expand').click()
  await expect(particles).toHaveAttribute('data-motion-state', 'running')
})

test('scene matrix propagation matches Three.js through nested translation, rotation, and nonuniform scale', async ({
  page,
}) => {
  await page.route('**/__matrix-audit', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body></body></html>',
    })
  )
  await page.goto('/__matrix-audit')
  const result = await page.evaluate(async () => {
    const threeUrl = '/node_modules/three/build/three.module.js'
    const updaterUrl = '/src/utils/sceneMatrixUpdater.ts'
    const THREE = await import(threeUrl)
    const { createSceneMatrixUpdater } = await import(updaterUrl)
    const scene = new THREE.Scene()
    scene.position.set(3, -2, 5)
    const parent = new THREE.Group()
    parent.name = 'parent'
    const child = new THREE.Group()
    child.name = 'child'
    const fixed = new THREE.Object3D()
    fixed.name = 'fixed'
    fixed.position.set(1, 2, 3)
    scene.add(parent)
    parent.add(child)
    child.add(fixed)
    const expected = scene.clone(true)
    const update = createSceneMatrixUpdater(scene, [parent, child])
    let maxDifference = 0
    for (let index = 0; index < 20; index++) {
      for (const root of [scene, expected]) {
        const p = root.getObjectByName('parent')
        const c = root.getObjectByName('child')
        p.position.set(index / 10, -index / 20, Math.sin(index))
        p.rotation.set(index / 13, index / 7, -index / 23)
        p.scale.set(1 + index / 9, 0.5 + index / 20, 1.4)
        c.rotation.set(-index / 17, 0.3, index / 12)
      }
      update()
      expected.updateMatrixWorld(true)
      for (const name of ['parent', 'child', 'fixed']) {
        const a = scene.getObjectByName(name).matrixWorld.elements
        const b = expected.getObjectByName(name).matrixWorld.elements
        for (let i = 0; i < 16; i++)
          maxDifference = Math.max(maxDifference, Math.abs(a[i] - b[i]))
      }
    }
    let idleWorldUpdates = 0
    const original = scene.updateMatrixWorld.bind(scene)
    scene.updateMatrixWorld = (...args: any[]) => {
      idleWorldUpdates++
      return original(...args)
    }
    const idleChanged = update()
    return { maxDifference, idleChanged, idleWorldUpdates }
  })
  expect(result.maxDifference).toBeLessThan(1e-9)
  expect(result.idleChanged).toBe(false)
  expect(result.idleWorldUpdates).toBe(0)
})

test('about code starts loading during its mask transition while content waits for mask readiness', async ({
  page,
}) => {
  await openArchive(page)
  let observedMaskReady: string | null | undefined
  let release!: () => void
  const blocked = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/src/views/About/AboutContent.vue*', async (route) => {
    observedMaskReady = await page
      .locator('.about-overlay')
      .getAttribute('data-mask-ready')
    await blocked
    await route.continue()
  })
  await openHomeAboutOverlay(page)
  await expect.poll(() => observedMaskReady).toBe('false')
  await expect(page.locator('.about-overlay')).toHaveAttribute(
    'data-mask-ready',
    'true'
  )
  await expect(page.locator('.about-overlay .about-page')).toHaveCount(0)
  release()
  await expect(page.locator('.about-overlay .about-page')).toBeVisible()
})

test('footer geometry switches once and animates transforms without stretching final text', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'), '移动端页脚没有桌面边距')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/colorPalette')
  const footer = page.locator('.footer-com')
  await expect(footer).toHaveClass(/footer-expanded/)
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(1100)
  await footer.evaluate((e) => {
    const probe = { resizes: 0 }
    new ResizeObserver(() => probe.resizes++).observe(e)
    ;(window as any).footerGeometryProbe = probe
  })
  await page.waitForTimeout(50)
  const before = await page.evaluate(
    () => (window as any).footerGeometryProbe.resizes
  )
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      '--desktop-shell-inline-inset',
      '90px'
    )
  )
  await expect(footer).toHaveClass(/footer-resizing/)
  const frames = await footer.evaluate((e) =>
    e
      .getAnimations()
      .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes())
  )
  expect(
    frames.some(
      (frame) =>
        'width' in frame ||
        'left' in frame ||
        'bottom' in frame ||
        'height' in frame
    )
  ).toBe(false)
  await expect(footer).not.toHaveClass(/footer-resizing/)
  expect(
    (await page.evaluate(() => (window as any).footerGeometryProbe.resizes)) -
      before
  ).toBeLessThan(4)
  await expect(footer.locator('.footer-content')).toHaveCSS('transform', 'none')
  expect(
    await footer.evaluate((e) => e.getBoundingClientRect().left)
  ).toBeCloseTo(90, 0)
})

test('ready label bitmaps are reused without painting again when the same font completes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/colorPalette')
  await page.evaluate(() => document.fonts.ready)
  const result = await page.evaluate(async () => {
    const url = '/src/utils/templeLabelTextures.ts'
    const { getTempleLabelCanvas } = await import(url)
    await document.fonts.load('800 100px "UnboundedSans"', 'CACHE')
    let paints = 0
    const original = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (
      ...args: Parameters<typeof original>
    ) {
      if (this.canvas.width === 128 && this.canvas.height === 768) paints++
      return original.apply(this, args)
    }
    try {
      const first = getTempleLabelCanvas('CACHE', 'aquarius')
      const initialPaints = paints
      const second = getTempleLabelCanvas('CACHE', 'aquarius')
      await document.fonts.load('800 100px "UnboundedSans"', 'CACHE')
      const third = getTempleLabelCanvas('CACHE', 'aquarius')
      return {
        initialPaints,
        paints,
        reused:
          first.canvas === second.canvas && second.canvas === third.canvas,
      }
    } finally {
      CanvasRenderingContext2D.prototype.fillText = original
    }
  })
  expect(result.initialPaints).toBeGreaterThan(0)
  expect(result.paints).toBe(result.initialPaints)
  expect(result.reused).toBe(true)
})

test('theme and hover appearance keep companion light colors and reflections synchronized', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const source = await response.text()
    const marker = '  return {\n    select,'
    expect(source).toContain(marker)
    await route.fulfill({
      response,
      body: source.replace(
        marker,
        '  window.__appearanceProbe = { setThemeColor, sprigatitoLightColors, sprigatitoTheme, reflectionMaterials };\n' +
          marker
      ),
    })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  const read = () =>
    page.evaluate(() => {
      const probe = (window as any).__appearanceProbe
      return {
        colorsMatch: probe.sprigatitoLightColors.every((color: any) =>
          color.equals(probe.sprigatitoTheme)
        ),
        reflectionsMatch: probe.reflectionMaterials.every(
          ({ source, copy }: any) =>
            source.color.equals(copy.color) &&
            source.emissive.equals(copy.emissive) &&
            source.envMapIntensity === copy.envMapIntensity &&
            source.emissiveIntensity === copy.emissiveIntensity
        ),
      }
    })
  for (const color of ['#aabbcc', '#e23456', '#438b76']) {
    await page.evaluate(
      (color) => (window as any).__appearanceProbe.setThemeColor(color, false),
      color
    )
    await expect
      .poll(read)
      .toEqual({ colorsMatch: true, reflectionsMatch: true })
  }
  if (!info.project.name.includes('mobile')) {
    const point = (await stage.getAttribute('data-companion-screen'))!
      .split(',')
      .map(Number)
    await page.mouse.move(point[0], point[1])
    await expect(stage).toHaveAttribute('data-hovered', 'sprigatito')
    await expect
      .poll(async () =>
        Number(await stage.getAttribute('data-environment-brightness'))
      )
      .toBeLessThan(0.5)
    await expect
      .poll(read)
      .toEqual({ colorsMatch: true, reflectionsMatch: true })
    await page.mouse.move(5, 5)
    await expect
      .poll(async () =>
        Number(await stage.getAttribute('data-environment-brightness'))
      )
      .toBeGreaterThan(0.99)
    await expect
      .poll(read)
      .toEqual({ colorsMatch: true, reflectionsMatch: true })
  }
})
