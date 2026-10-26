import { expect, test } from '@playwright/test'

test('bounded link surface preserves pixels, expands safely and avoids per-frame size changes', async ({
  page,
}, info) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app" style="position:relative;width:100vw;height:100vh"></div>',
    })
  )
  await page.goto('/')
  const surface = await page.evaluate(async (mobile) => {
    const { mountIslandLayout } = await import(
      '/tests/fixtures/island-link-layout.ts'
    )
    const layout = await mountIslandLayout(mobile)
    const points = {
      chest: { x: innerWidth * 0.5, y: innerHeight * 0.45 },
      rightHand: { x: innerWidth * 0.45, y: innerHeight * 0.5 },
      leftHand: { x: innerWidth * 0.55, y: innerHeight * 0.5 },
      rightBraid: { x: innerWidth * 0.46, y: innerHeight * 0.3 },
      leftBraid: { x: innerWidth * 0.54, y: innerHeight * 0.3 },
    }
    await layout.update(points)
    ;(window as any).__linkProbe = { layout, points }
    const svg = layout.root.querySelector<SVGSVGElement>('.island-links')!
    const rect = svg.getBoundingClientRect()
    const parent = layout.root.getBoundingClientRect()
    return {
      ratio: (rect.width * rect.height) / (parent.width * parent.height),
      viewBox: svg.getAttribute('viewBox'),
      style: svg.getAttribute('style'),
    }
  }, info.project.name.includes('mobile'))
  expect(surface.ratio).toBeLessThan(0.9)
  const root = page.locator('.island-focus')
  const bounded = await root.screenshot()
  await root.locator('.island-links').evaluate((svg) => {
    svg.removeAttribute('viewBox')
    svg.removeAttribute('style')
  })
  const original = await root.screenshot()
  expect(bounded.equals(original)).toBe(true)
  await root.locator('.island-links').evaluate((svg, state) => {
    svg.setAttribute('style', state.style!)
    svg.setAttribute('viewBox', state.viewBox!)
  }, surface)
  const movement = await page.evaluate(async () => {
    const { layout, points } = (window as any).__linkProbe
    const svg = layout.root.querySelector('.island-links')!
    const initial = svg.getAttribute('style')
    for (let frame = 0; frame < 20; frame++) {
      points.chest.x += 0.5
      await layout.update(points)
    }
    const stable = svg.getAttribute('style') === initial
    points.chest.x = innerWidth + 70
    await layout.update(points)
    const right = svg.getBoundingClientRect().right
    const rootLeft = layout.root.getBoundingClientRect().left
    await layout.setMobile(true)
    await layout.setLocale('en')
    return { stable, expanded: right >= rootLeft + points.chest.x + 18 }
  })
  expect(movement.stable).toBe(true)
  expect(movement.expanded).toBe(true)
  await info.attach('bounded-surface', {
    body: JSON.stringify(surface),
    contentType: 'application/json',
  })
})

test('particles retain 40 FPS budget and stop drawing when inactive, hidden or reduced motion', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><div id="app" style="width:320px;height:240px"></div>',
    })
  )
  await page.goto('/')
  await page.evaluate(async () => {
    const { createApp, h, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Particles } = await import(
      '/src/components/ParticlesBg/index.vue'
    )
    const active = ref(true)
    let draws = 0
    const clear = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      draws++
      return clear.apply(this, args)
    }
    const app = createApp({
      setup: () => () =>
        h(Particles, { active: active.value, maxFps: 40, quantity: 10 }),
    })
    app.mount('#app')
    ;(window as any).__particleProbe = { active, app, draws: () => draws }
  })
  const canvas = page.locator('.particles-bg')
  await expect(canvas).toHaveAttribute('data-max-fps', '40')
  await expect(canvas).toHaveAttribute('data-motion-state', 'running')
  const count = () =>
    page.evaluate(() => (window as any).__particleProbe.draws())
  const initial = await count()
  await page.waitForTimeout(450)
  expect(await count()).toBeGreaterThan(initial)
  const assertStopped = async () => {
    await expect(canvas).toHaveAttribute('data-motion-state', 'paused')
    await page.waitForTimeout(50)
    const stopped = await count()
    await page.waitForTimeout(180)
    expect(await count()).toBe(stopped)
  }
  await page.evaluate(() => {
    ;(window as any).__particleProbe.active.value = false
  })
  await assertStopped()
  await page.evaluate(() => {
    ;(window as any).__particleProbe.active.value = true
  })
  await expect(canvas).toHaveAttribute('data-motion-state', 'running')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await assertStopped()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await assertStopped()
  await page.evaluate(() => {
    delete (document as any).visibilityState
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(canvas).toHaveAttribute('data-motion-state', 'running')
  await page.evaluate(() => (window as any).__particleProbe.app.unmount())
  const disposed = await count()
  await page.waitForTimeout(180)
  expect(await count()).toBe(disposed)
})

test('home keeps its existing star budget and pauses only the appropriate decoration', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 45000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  const stars = page.locator('.particles-bg')
  const footer = page.locator('.footer-com')
  await expect(stars).toHaveAttribute('data-max-fps', '40')
  await expect(stars).toHaveAttribute('data-motion-state', 'running')
  await expect(footer).not.toHaveClass(/motion-paused/)
  const change = async (state: Record<string, boolean>) =>
    page.evaluate((state) => {
      const store = (
        document.querySelector('#app') as any
      ).__vue_app__.config.globalProperties.$pinia._s.get('temple-navigation')
      store.$patch(state)
    }, state)
  await change({ immersive: true })
  await expect(footer).toHaveClass(/motion-paused/)
  // 沉浸状态仍需持续星空；仅隐藏的页脚暂停。
  await expect(stars).toHaveAttribute('data-motion-state', 'running')
  await change({ immersive: false, expanded: true })
  await expect(stars).toHaveAttribute('data-motion-state', 'paused')
  await expect(footer).not.toHaveClass(/motion-paused/)
  await change({ expanded: false, aboutOpen: true, aboutOverlayVisible: true })
  await expect(stars).toHaveAttribute('data-motion-state', 'paused')
  await change({ aboutOpen: false })
  await expect(stars).toHaveAttribute('data-motion-state', 'paused')
  await change({ aboutOverlayVisible: false })
  await expect(stars).toHaveAttribute('data-motion-state', 'running')
  await expect(stars).toHaveAttribute('data-max-fps', '40')
})

test('mobile full-screen album stops hidden model draws and resumes on close', async ({
  page,
}, info) => {
  test.skip(!info.project.name.includes('mobile'))
  test.setTimeout(60000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.addInitScript(() => {
    let draws = 0
    ;(window as any).__albumDraws = () => draws
    for (const name of [
      'drawElements',
      'drawArrays',
      'drawElementsInstanced',
      'drawArraysInstanced',
    ]) {
      const original = (WebGL2RenderingContext.prototype as any)[name]
      ;(WebGL2RenderingContext.prototype as any)[name] = function (
        ...args: unknown[]
      ) {
        if (this.canvas.closest?.('.temple-stage')) draws++
        return original.apply(this, args)
      }
    }
  })
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const button = page.locator('.flora-album-gallery__expand')
  await expect(button).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  const alert = page.locator('.mobile-experience-alert .el-alert__close-btn')
  if (await alert.isVisible()) await alert.click()
  await button.click()
  await expect(page.locator('.temple-page')).toHaveClass(
    /temple-page--album-expanded/
  )
  await expect(page.locator('.temple-stage canvas')).toBeHidden()
  await page.waitForTimeout(400)
  const count = () => page.evaluate(() => (window as any).__albumDraws())
  const stopped = await count()
  await page.waitForTimeout(350)
  expect(await count()).toBe(stopped)
  await button.click()
  await expect(page.locator('.temple-stage canvas')).toBeVisible()
  await expect.poll(count).toBeGreaterThan(stopped)
})
