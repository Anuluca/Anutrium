import { expect, test } from './helpers/sceneDiagnostics'

// 隔离服务端可切换的头疼贴纸动画，避免把其他特效的绘制归因于光电。
test.beforeEach(async ({ page }) => {
  await page.route('**/site/home-features', (route) =>
    route.fulfill({ json: { lucarioHeadache: false, updatedAt: null } })
  )
})

test('wire flow animates static GPU buffers, pauses hidden and stops on return', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.addInitScript(() => {
    const state = { draws: 0, uploads: 0, programs: 0, textures: 0 }
    ;(window as any).wireFlowGPU = state
    const prototype = WebGL2RenderingContext.prototype
    for (const [method, counter] of [
      ['drawElements', 'draws'],
      ['drawArrays', 'draws'],
      ['bufferSubData', 'uploads'],
      ['bufferData', 'uploads'],
      ['linkProgram', 'programs'],
      ['texImage2D', 'textures'],
    ] as const) {
      const original = prototype[method] as Function
      ;(prototype as any)[method] = function (...args: any[]) {
        state[counter]++
        return original.apply(this, args)
      }
    }
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /WebGLProgram|Shader Error/.test(message.text())
    )
      errors.push(message.text())
  })
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-material-phase', 'wireframe', {
    timeout: 60000,
  })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(stage).toHaveAttribute('data-statue-wire-flow', 'true')
  await page.waitForTimeout(1200)
  const read = () => page.evaluate(() => ({ ...(window as any).wireFlowGPU }))
  const before = await read()
  const imageBefore = await stage.locator('canvas').screenshot()
  const timing = await page.evaluate(async () => {
    const intervals: number[] = []
    let last = performance.now()
    await new Promise<void>((resolve) => {
      function sample(now: number) {
        intervals.push(now - last)
        last = now
        if (intervals.length < 120) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    intervals.sort((a, b) => a - b)
    return { median: intervals[60], p95: intervals[114] }
  })
  const imageAfter = await stage
    .locator('canvas')
    .screenshot({ path: `/tmp/island-wire-flow-${info.project.name}.png` })
  const after = await read()
  expect(imageBefore.equals(imageAfter)).toBe(false)
  expect(after.draws).toBeGreaterThan(before.draws)
  for (const key of ['uploads', 'programs', 'textures'])
    expect(after[key]).toBe(before[key])
  console.log(
    `${info.project.name} wire flow frame intervals: ${JSON.stringify(timing)}`
  )
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hidden = await read()
  await page.waitForTimeout(600)
  expect((await read()).draws).toBe(hidden.draws)
  await page.evaluate(() => {
    delete (document as Partial<Document>).hidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect
    .poll(async () => (await read()).draws)
    .toBeGreaterThan(hidden.draws)
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.temple-stage')!
    const samples: { progress: number; active: boolean }[] = []
    const observer = new MutationObserver(() => {
      samples.push({
        progress: Number(stage.dataset.statueScanProgress),
        active: stage.dataset.statueWireFlow === 'true',
      })
    })
    observer.observe(stage, { attributes: true })
    ;(window as any).wireFlowReturn = { samples, observer }
  })
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-material-phase', 'chrome', {
    timeout: 20000,
  })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const returning = await page.evaluate(() => {
    const { samples, observer } = (window as any).wireFlowReturn
    observer.disconnect()
    return samples as { progress: number; active: boolean }[]
  })
  const scanningBack = returning.filter(
    (sample) => sample.progress > 0 && sample.progress < 1
  )
  expect(scanningBack.length).toBeGreaterThan(0)
  expect(scanningBack.every((sample) => sample.active)).toBe(true)
  await expect(stage).toHaveAttribute('data-statue-wire-flow', 'false')
  await page.waitForTimeout(1500)
  const home = await read()
  await page.waitForTimeout(600)
  expect((await read()).draws).toBe(home.draws)
  expect(errors).toEqual([])
})

test('reduced motion leaves wire flow still', async ({ page }) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-material-phase',
    'wireframe',
    { timeout: 45000 }
  )
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-statue-wire-flow',
    'false'
  )
})

test('electric highlights move only on wire edges, never across triangle interiors', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><div id="app"></div>',
    })
  )
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { sampleWireFlow } = await import(
      '/tests/fixtures/island-wire-flow.ts'
    )
    return sampleWireFlow()
  })
  expect(result.glowingPixels).toBeGreaterThan(100)
  expect(result.outsideWire).toBe(0)
  expect(result.movedPixels).toBeGreaterThan(50)
  expect(result.periodicMaxDelta).toBeLessThanOrEqual(1)
  expect(result.disabledBlueMaximum).toBe(0)
  console.log(`electric edge coverage: ${JSON.stringify(result)}`)
})

test.describe('wire animation production scheduling', () => {
  test.use({ sceneDiagnostics: false })
  test('stable flow keeps render CPU work bounded and wakes for pointer changes', async ({
    page,
  }, info) => {
    test.setTimeout(60000)
    await page.addInitScript(() => {
      const state = { active: false, times: [] as number[], draws: 0 }
      ;(window as any).wireFrameCPU = state
      const original = window.requestAnimationFrame
      const callbacks = new WeakMap<FrameRequestCallback, boolean>()
      const draw = WebGL2RenderingContext.prototype.drawElements
      WebGL2RenderingContext.prototype.drawElements = function (...args) {
        state.draws++
        return draw.apply(this, args)
      }
      window.requestAnimationFrame = function (callback) {
        let sceneRender = callbacks.get(callback)
        if (sceneRender === undefined) {
          sceneRender =
            callback.name === 'render' &&
            callback.toString().includes('statueScan')
          callbacks.set(callback, sceneRender)
        }
        if (!sceneRender) return original.call(window, callback)
        return original.call(window, (now) => {
          const start = performance.now()
          const draws = state.draws
          callback(now)
          if (state.active && state.draws > draws)
            state.times.push(performance.now() - start)
        })
      }
    })
    await page.goto('/island', { waitUntil: 'domcontentloaded' })
    const root = page.locator('.temple-page')
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'aria-busy',
      'false',
      { timeout: 45000 }
    )
    await expect(root).toHaveAttribute('data-selected', 'statue')
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 15000,
    })
    await page.waitForTimeout(1600)
    await page.evaluate(() => {
      ;(window as any).wireFrameCPU.active = true
    })
    await page.waitForTimeout(2400)
    const timing = await page.evaluate(() => {
      const state = (window as any).wireFrameCPU
      state.active = false
      const times = state.times as number[]
      times.sort((a, b) => a - b)
      return {
        count: times.length,
        mean: times.reduce((a, b) => a + b, 0) / times.length,
        p95: times[Math.floor(times.length * 0.95)],
      }
    })
    expect(timing.count).toBeGreaterThan(60)
    const before = await page.locator('.temple-stage canvas').screenshot()
    const anchor = page.locator('.island-links line').first()
    const anchorBefore = await anchor.getAttribute('x2')
    const viewport = page.viewportSize()!
    await page.mouse.move(viewport.width * 0.75, viewport.height * 0.25)
    await page.waitForTimeout(700)
    const after = await page.locator('.temple-stage canvas').screenshot()
    expect(before.equals(after)).toBe(false)
    await expect.poll(() => anchor.getAttribute('x2')).not.toBe(anchorBefore)
    await info.attach('wire-render-cpu', {
      body: JSON.stringify(timing),
      contentType: 'application/json',
    })
    console.log(
      `${info.project.name} scene render CPU: ${JSON.stringify(timing)}`
    )
  })
})

test('only island runs electric animation; home and every other module settle idle', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.addInitScript(() => {
    const state = { draws: 0 }
    ;(window as any).wireModuleGPU = state
    const original = WebGL2RenderingContext.prototype.drawElements
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      if ((this.canvas as HTMLCanvasElement).getAttribute('role') === 'img')
        state.draws++
      return original.apply(this, args)
    }
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /Shader Error|WebGLProgram/.test(message.text())
    )
      errors.push(message.text())
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  const root = page.locator('.temple-page')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  const draws = () =>
    page.evaluate(() => (window as any).wireModuleGPU.draws as number)
  for (const selection of [
    null,
    'statue',
    'flanerie',
    'archive',
    'island',
    'pokeyard',
    'sprigatito',
  ]) {
    if (selection)
      await page.evaluate((id) => {
        ;(
          document.querySelector('#app') as any
        ).__vue_app__.config.globalProperties.$pinia._s
          .get('temple-navigation')
          .request(id)
      }, selection)
    await expect(root).toHaveAttribute('data-selected', selection || 'none', {
      timeout: 15000,
    })
    if (selection)
      await expect(root).toHaveAttribute('data-settled', 'true', {
        timeout: 15000,
      })
    await expect(stage).toHaveAttribute(
      'data-statue-wire-flow',
      String(selection === 'statue')
    )
    await page.mouse.move(1, 1)
    if (selection === 'statue') {
      const before = await draws()
      await expect.poll(draws).toBeGreaterThan(before)
    } else {
      await expect
        .poll(
          async () => {
            const before = await draws()
            await page.waitForTimeout(300)
            return (await draws()) - before
          },
          {
            timeout: 10000,
            message: `module ${
              selection || 'home'
            } should settle after pointer motion`,
          }
        )
        .toBe(0)
      await expect(stage).toHaveAttribute('data-material-phase', 'chrome')
    }
  }
  expect(errors).toEqual([])
})
