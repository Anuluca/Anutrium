import { expect, test } from './helpers/sceneDiagnostics'

test.beforeEach(async ({ page }) => {
  await page.route('**/site/home-features', (route) =>
    route.fulfill({ json: { lucarioHeadache: false, updatedAt: null } })
  )
})

test('island batches camera projection changes during focus and return', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  await page.evaluate(async () => {
    const { installCameraProbe } = await import(
      '/tests/fixtures/island-camera-probe.ts'
    )
    ;(window as any).islandCameraProbe = installCameraProbe()
  })
  await stage.locator('canvas').focus()
  await page.keyboard.press('Enter')
  await expect(stage).toHaveAttribute('data-material-phase', 'wireframe', {
    timeout: 15000,
  })
  await expect(stage).toHaveAttribute('data-camera-moving', 'false')
  const entering = await page.evaluate(() => {
    const probe = (window as any).islandCameraProbe
    const result = probe.summary()
    probe.reset()
    return result
  })
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-material-phase', 'chrome', {
    timeout: 15000,
  })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 15000 }
  )
  const leaving = await page.evaluate(() => {
    const probe = (window as any).islandCameraProbe
    const result = probe.summary()
    probe.restore()
    return result
  })
  console.log(
    `${info.project.name} camera projections: ${JSON.stringify({
      entering,
      leaving,
    })}`
  )
  expect(entering.updatedFrames).toBeGreaterThan(5)
  expect(leaving.updatedFrames).toBeGreaterThan(5)
  expect(entering.max).toBe(1)
  expect(leaving.max).toBe(1)
  await info.attach('camera-projections', {
    body: JSON.stringify({ entering, leaving }),
    contentType: 'application/json',
  })
})

test('island batches layout reads before writes and keeps hover refs stable', async ({
  page,
}, info) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="app" style="position:relative;width:100vw;height:100vh"></div>',
    })
  )
  await page.goto('/')
  const result = await page.evaluate(async (mobile) => {
    const { mountIslandLayout } = await import(
      '/tests/fixtures/island-link-layout.ts'
    )
    const layout = await mountIslandLayout(mobile)
    const frames: string[][] = []
    const rect = Element.prototype.getBoundingClientRect
    const write = CSSStyleDeclaration.prototype.setProperty
    let current: string[] = []
    Element.prototype.getBoundingClientRect = function () {
      if (this === layout.root) {
        current = []
        frames.push(current)
      }
      if (this.closest('.island-focus')) current.push('read')
      return rect.call(this)
    }
    CSSStyleDeclaration.prototype.setProperty = function (...args) {
      if (args[0] === '--island-title-scale') current.push('write')
      return write.apply(this, args)
    }
    try {
      layout.root
        .querySelectorAll<HTMLElement>('.island-panels header')
        .forEach((header) => (header.style.width = '45px'))
      await layout.setLocale('en')
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
      const batches = frames.map((events) => [...events])
      let subscriptions = 0
      const observe = ResizeObserver.prototype.observe
      ResizeObserver.prototype.observe = function (...args) {
        subscriptions++
        return observe.apply(this, args)
      }
      try {
        const buttons = [...layout.root.querySelectorAll('button')]
        for (let index = 0; index < 20; index++) {
          const button = buttons[index % buttons.length]
          button.dispatchEvent(new PointerEvent('pointerenter'))
          await layout.flush()
          button.dispatchEvent(new PointerEvent('pointerleave'))
          await layout.flush()
        }
      } finally {
        ResizeObserver.prototype.observe = observe
      }
      const activeOrder = [
        ...layout.root.querySelectorAll('.island-links > g'),
      ].map((node) => node.getAttribute('data-link-item'))
      return { batches, subscriptions, activeOrder }
    } finally {
      Element.prototype.getBoundingClientRect = rect
      CSSStyleDeclaration.prototype.setProperty = write
      layout.unmount()
    }
  }, info.project.name.includes('mobile'))
  expect(result.batches.length).toBeGreaterThan(0)
  expect(result.batches.some((batch) => batch.includes('write'))).toBe(true)
  for (const batch of result.batches) {
    const firstWrite = batch.indexOf('write')
    if (firstWrite >= 0) expect(batch.slice(firstWrite)).not.toContain('read')
  }
  expect(result.subscriptions).toBe(0)
  expect(result.activeOrder).toHaveLength(5)
})

test('island keeps page and router leave geometry within one pixel', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-material-phase',
    'wireframe',
    { timeout: 45000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 15000 }
  )
  await page.screenshot({
    path: `/tmp/anutrium-island-review-${info.project.name}.png`,
  })
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const router = document.querySelector('.router-container')!
    const read = () =>
      [root, router].map((element) => {
        const rect = element.getBoundingClientRect()
        return [rect.top, rect.left]
      })
    const state = { before: read(), frames: [] as number[][][] }
    ;(window as any).islandLeaveGeometry = state
    const sample = () => {
      if (!root.isConnected) return
      state.frames.push(read())
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    ;(
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/colorPalette')
  })
  await expect(page.locator('.temple-page')).toHaveCount(0, { timeout: 15000 })
  const samples = await page.evaluate(
    () =>
      (window as any).islandLeaveGeometry as {
        before: number[][]
        frames: number[][][]
      }
  )
  expect(samples.frames.length).toBeGreaterThan(2)
  for (const frame of samples.frames)
    for (let element = 0; element < 2; element++)
      for (let axis = 0; axis < 2; axis++)
        expect(
          Math.abs(frame[element][axis] - samples.before[element][axis])
        ).toBeLessThanOrEqual(1)
})
