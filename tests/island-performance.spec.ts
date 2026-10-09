import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

type Counters = {
  draws: number
  uploads: number
  listeners: number
  contexts: number
  programs: number
  allocations: number
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = {
      draws: 0,
      uploads: 0,
      listeners: 0,
      contexts: 0,
      programs: 0,
      allocations: 0,
    }
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
    const link = prototype.linkProgram
    const allocate = prototype.texImage2D
    prototype.linkProgram = function (...args) {
      if ((this.canvas as HTMLCanvasElement).getAttribute('role') === 'img')
        state.programs++
      return link.apply(this, args)
    }
    prototype.texImage2D = function (...args) {
      if ((this.canvas as HTMLCanvasElement).getAttribute('role') === 'img')
        state.allocations++
      return allocate.apply(this, args)
    }
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
    const baseRatio = Math.min(
      devicePixelRatio || 1,
      element.closest('.temple-stage') ? 1.5 : 2
    )
    const budget = Number(
      (element.closest('.temple-stage') as HTMLElement | null)?.dataset
        .maxRenderPixels
    )
    const ratio = budget
      ? Math.min(
          baseRatio,
          Math.sqrt(budget / (canvas.clientWidth * canvas.clientHeight))
        )
      : baseRatio
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
  await expect(page.locator('.craft-page')).not.toHaveClass(
    /route-enter-active/
  )
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
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 20000 })
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

test('temple focus reuses prepared shaders and textures, then stops drawing while idle', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '桌面神殿渲染路径')
  test.setTimeout(60000)
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  const root = page.locator('.temple-page')
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 20000 })
  await expect(root).not.toHaveClass(/route-enter-active/)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  const read = () =>
    page.evaluate(() => ({
      ...(window as typeof window & { islandGpu: Counters }).islandGpu,
    }))
  const prepared = await read()
  expect(prepared.programs).toBeGreaterThan(0)
  for (const id of ['creative', 'notes', 'art', 'otaku']) {
    await page.locator(`[data-obelisk="${id}"]`).click()
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
    const focused = await read()
    expect(focused.programs).toBe(prepared.programs)
    expect(focused.allocations).toBe(prepared.allocations)
    if (id !== 'otaku') {
      await page.locator(`[data-obelisk="${id}"]`).click()
      await expect(root).toHaveAttribute('data-settled', 'true', {
        timeout: 10000,
      })
    }
  }
  await page.mouse.move(20, 150)
  await page.waitForTimeout(1000)
  const idle = await read()
  await page.mouse.move(35, 180)
  await page.waitForTimeout(500)
  expect((await read()).draws).toBe(idle.draws)
})

test('large desktop temple keeps its canvas within the render pixel budget', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '桌面大屏像素预算')
  await page.setViewportSize({ width: 3840, height: 2160 })
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 20000 }
  )
  const resolution = await page
    .locator('.temple-stage canvas')
    .evaluate((element) => {
      const canvas = element as HTMLCanvasElement
      return {
        pixels: canvas.width * canvas.height,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        budget: Number(
          (canvas.parentElement as HTMLElement).dataset.maxRenderPixels
        ),
      }
    })
  expect(resolution.budget).toBeGreaterThan(0)
  expect(resolution.pixels).toBeLessThanOrEqual(resolution.budget)
  expect(resolution.width).toBe(3840)
  expect(resolution.height).toBe(2160)
})

test('leaving during shader preparation cancels rendering and releases resources safely', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '桌面着色器异步预热')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    const state = { pending: 0, released: false, finished: 0, deleted: 0 }
    ;(
      window as typeof window & { islandPreparation: typeof state }
    ).islandPreparation = state
    const prototype = WebGL2RenderingContext.prototype
    const extension = prototype.getExtension
    const parameter = prototype.getProgramParameter
    const destroy = prototype.deleteProgram
    prototype.deleteProgram = function (program) {
      state.deleted++
      return destroy.call(this, program)
    }
    prototype.getExtension = function (name) {
      const result = extension.call(this, name)
      if (name === 'KHR_parallel_shader_compile')
        return result || { COMPLETION_STATUS_KHR: 0x91b1 }
      return result
    }
    // 延迟编译完成信号，稳定复现卸载组件时 Three 仍在轮询 program 的情况。
    prototype.getProgramParameter = function (program, name) {
      if (name === 0x91b1) {
        state.pending++
        if (state.released) state.finished++
        return state.released
      }
      return parameter.call(this, program, name)
    }
  })
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { islandPreparation: { pending: number } })
            .islandPreparation.pending
      )
    )
    .toBeGreaterThan(0)
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'true'
  )
  await expect(page.locator('.temple-page')).not.toHaveClass(
    /route-enter-active/
  )
  const deletedBeforeLeave = await page.evaluate(
    () =>
      (window as typeof window & { islandPreparation: { deleted: number } })
        .islandPreparation.deleted
  )
  const listenersBeforeLeave = await page.evaluate(
    () =>
      (window as typeof window & { islandGpu: Counters }).islandGpu.listeners
  )
  await page.locator('.menu-box a[href="/craft"]').click()
  await expect(page.locator('.craft-page')).toBeVisible()
  await expect(page.locator('.temple-page')).toHaveCount(0)
  await page.evaluate(() => {
    ;(
      window as typeof window & { islandPreparation: { released: boolean } }
    ).islandPreparation.released = true
  })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              islandPreparation: { finished: number }
            }
          ).islandPreparation.finished
      )
    )
    .toBeGreaterThan(0)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { islandPreparation: { deleted: number } })
            .islandPreparation.deleted
      )
    )
    .toBeGreaterThan(deletedBeforeLeave)
  await page.waitForTimeout(300)
  expect(errors).toEqual([])
  const counters = await page.evaluate(() => ({
    ...(window as typeof window & { islandGpu: Counters }).islandGpu,
  }))
  expect(counters.draws).toBe(0)
  expect(counters.listeners).toBe(listenersBeforeLeave)
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
