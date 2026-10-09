import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

type Counters = {
  draws: number
  uploads: number
  listeners: number
  contexts: number
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = { draws: 0, uploads: 0, listeners: 0, contexts: 0 }
    ;(window as typeof window & { islandGpu: Counters }).islandGpu = state
    const modelCanvases = new Set<OffscreenCanvas | HTMLCanvasElement>()
    const pointerListeners = new Set<EventListenerOrEventListenerObject>()
    const add = window.addEventListener
    const remove = window.removeEventListener
    window.addEventListener = function (type, listener, options) {
      if (type === 'pointermove') {
        pointerListeners.add(listener)
        state.listeners = pointerListeners.size
      }
      return add.call(this, type, listener, options)
    }
    window.removeEventListener = function (type, listener, options) {
      if (type === 'pointermove') {
        pointerListeners.delete(listener)
        state.listeners = pointerListeners.size
      }
      return remove.call(this, type, listener, options)
    }
    // 记录真实 WebGL 调用，避免只验证组件自己声明的性能参数。
    const prototype = WebGL2RenderingContext.prototype
    const draw = prototype.drawElements
    const upload = prototype.bufferSubData
    prototype.drawElements = function (...args) {
      if ((this.canvas as HTMLCanvasElement).getAttribute('role') === 'img') {
        state.draws++
        modelCanvases.add(this.canvas)
        state.contexts = modelCanvases.size
      }
      return draw.apply(this, args)
    }
    prototype.bufferSubData = function (...args) {
      if ((this.canvas as HTMLCanvasElement).getAttribute('role') === 'img')
        state.uploads++
      return upload.apply(this, args)
    }
  })
})

test('island stops idle GPU work, uses static buffers and reuses downloaded assets', async ({
  page,
}) => {
  // 模拟不会自动设置 gzip 响应头的静态部署；普通回归覆盖自动解压路径。
  const packedEnvironment = await readFile(
    resolve('public/models/lucario-studio.bin.gz')
  )
  await page.route('**/models/lucario-studio.bin.gz', (route) =>
    route.fulfill({
      body: packedEnvironment,
      contentType: 'application/octet-stream',
    })
  )
  const assets: string[] = []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => assets.push(new URL(request.url()).pathname))
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.lucario-stage')
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 20000 })
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 15000,
  })
  await stage.locator('canvas').evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished)
    )
  })
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  await page.waitForTimeout(1400)
  const counters = () =>
    page.evaluate(() => ({
      ...(window as typeof window & { islandGpu: Counters }).islandGpu,
    }))
  const idleStart = await counters()
  await page.waitForTimeout(1100)
  const idleEnd = await counters()
  expect(idleEnd.draws).toBe(idleStart.draws)
  expect(idleEnd.uploads).toBe(idleStart.uploads)
  expect(idleEnd.listeners).toBe(1)
  expect(idleEnd.contexts).toBe(1)
  const resolution = await stage.locator('canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const ratio = Math.min(
      devicePixelRatio || 1,
      element.closest('.temple-stage') ? 1.5 : 2
    )
    return {
      width: canvas.width,
      height: canvas.height,
      expectedWidth: Math.floor(canvas.clientWidth * ratio),
      expectedHeight: Math.floor(canvas.clientHeight * ratio),
    }
  })
  expect(resolution.width).toBe(resolution.expectedWidth)
  expect(resolution.height).toBe(resolution.expectedHeight)
  await expect(stage).toHaveAttribute('data-max-fps', '60')
  expect(
    Number(await stage.getAttribute('data-pointer-sample-ms'))
  ).toBeCloseTo(1000 / 30, 5)
  await expect(page.locator('.particles-bg')).toHaveAttribute(
    'data-max-fps',
    '12'
  )
  const before = await stage.locator('canvas').screenshot()
  await page.mouse.move(viewport.width - 15, viewport.height / 2)
  await page.waitForTimeout(1000)
  const after = await stage.locator('canvas').screenshot()
  expect(before.equals(after)).toBe(false)
  expect((await counters()).uploads).toBe(idleEnd.uploads)
  expect(
    assets.filter((path) => /lucario\.glb|draco|meshopt_simplifier/.test(path))
  ).toEqual([])

  if (viewport.width <= 768) await page.locator('.mobile-menu-icon').click()
  await page
    .locator(
      viewport.width <= 768
        ? '.mobile-menu-items a[href="/craft"]'
        : '.menu-box a[href="/craft"]'
    )
    .click()
  await expect(page.locator('.craft-page')).toBeVisible()
  await expect(page.locator('.particles-bg')).toHaveAttribute(
    'data-max-fps',
    '60'
  )
  if (viewport.width <= 768) await page.locator('.mobile-menu-icon').click()
  await page
    .locator(
      viewport.width <= 768
        ? '.mobile-menu-items a[href="/island"]'
        : '.menu-box a[href="/island"]'
    )
    .click()
  await expect(stage).toHaveAttribute('aria-busy', 'false')
  for (const filename of [
    'lucario-island.bin',
    'lucario-island.json',
    'lucario-studio.bin.gz',
    'lucario-studio.json',
  ]) {
    expect(
      assets.filter((path) => path.endsWith(`/models/${filename}`))
    ).toHaveLength(1)
  }
  expect(errors).toEqual([])
})

test('sampled pointer preserves the final position and cancels pending work', async ({
  page,
}) => {
  await page.goto('/craft', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.craft-page')).toBeVisible()
  const result = await page.evaluate(async () => {
    const moduleURL = '/src/utils/pointerSamples.ts'
    const { subscribePointerSamples } = await import(
      /* @vite-ignore */ moduleURL
    )
    const samples: { x: number; time: number }[] = []
    const unsubscribe = subscribePointerSamples(
      (event: PointerEvent) =>
        samples.push({ x: event.clientX, time: performance.now() }),
      500
    )
    for (let index = 0; index < 100; index++)
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: index }))
    await new Promise((resolve) => setTimeout(resolve, 550))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 999 }))
    unsubscribe()
    await new Promise((resolve) => setTimeout(resolve, 550))
    return samples
  })
  expect(result.map((sample) => sample.x)).toEqual([0, 99])
  expect(result[1].time - result[0].time).toBeGreaterThanOrEqual(495)
})

test('hidden island cancels pending pointer updates and rendering, then resumes', async ({
  page,
}) => {
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lucario-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 20000 }
  )
  await page.waitForTimeout(1000)
  await page.mouse.move(10, 100)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hidden = await page.evaluate(() => ({
    ...(window as typeof window & { islandGpu: Counters }).islandGpu,
  }))
  await page.mouse.move(300, 300)
  await page.waitForTimeout(1200)
  expect(
    await page.evaluate(
      () => (window as typeof window & { islandGpu: Counters }).islandGpu.draws
    )
  ).toBe(hidden.draws)
  await page.evaluate(() => {
    delete (document as Partial<Document>).hidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { islandGpu: Counters }).islandGpu.draws
      )
    )
    .toBeGreaterThan(hidden.draws)
})
