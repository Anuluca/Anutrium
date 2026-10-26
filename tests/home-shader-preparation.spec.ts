import { expect, test } from './helpers/sceneDiagnostics'

for (const entry of [
  { path: '/', selection: 'none', hint: 'home', nod: '10.000' },
  { path: '/atrium', selection: 'statue', hint: 'statue', nod: '5.000' },
  { path: '/flanerie', selection: 'flanerie', hint: 'flanerie', nod: '0.000' },
  {
    path: '/floratrium',
    selection: 'sprigatito',
    hint: 'sprigatito',
    nod: '10.000',
  },
]) {
  test(`entry ${entry.path} displays the model while remaining shaders prepare safely`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
      const response = await route.fetch()
      const marker = 'renderer.domElement.tabIndex = 0'
      const body = await response.text()
      expect(body).toContain(marker)
      await route.fulfill({
        response,
        body: body.replace(
          marker,
          `
        window.__preparationClips = [];
        window.__warmupGate = new Promise(resolve => { window.__releaseWarmup = resolve; });
        window.__preparationProbe = () => ({ programs: renderer.info.programs.length, clips: renderer.clippingPlanes.length, target: renderer.getRenderTarget() });
        const originalCompile = renderer.compileAsync.bind(renderer);
        renderer.compileAsync = (...args) => {
          const compiling = originalCompile(...args);
          return stage.dataset.shaderWarmup === 'entry-ready'
            ? compiling.then(() => window.__warmupGate) : compiling;
        };
        const originalRender = renderer.render.bind(renderer);
        renderer.render = (...args) => {
          if (args[0] === scene) window.__preparationClips.push(renderer.clippingPlanes.length);
          return originalRender(...args);
        };
        ${marker}`
        ),
      })
    })
    await page.goto(entry.path, { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('data-shader-warmup', 'entry-ready', {
      timeout: 60000,
    })
    await expect(stage).toHaveAttribute('data-preparation-entry', entry.hint)
    await expect
      .poll(
        () =>
          stage.evaluate((element) =>
            Number(getComputedStyle(element).opacity)
          ),
        { timeout: 30000 }
      )
      .toBeGreaterThan(0)
    await expect(stage.locator('canvas')).toBeVisible()
    await expect(stage).toHaveAttribute('aria-busy', 'true')
    const initial = Number(
      await stage.getAttribute('data-initial-shader-programs')
    )
    await page.evaluate(() => (window as any).__releaseWarmup())
    await expect(stage).toHaveAttribute('data-shader-warmup', 'complete', {
      timeout: 30000,
    })
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 15000,
    })
    await expect(stage).toHaveAttribute('aria-busy', 'false')
    const prepared = await page.evaluate(() =>
      (window as any).__preparationProbe()
    )
    expect(initial).toBeGreaterThan(0)
    expect(initial).toBeLessThan(prepared.programs)
    expect(prepared.clips).toBe(0)
    expect(prepared.target).toBeNull()
    await expect(stage).toHaveAttribute('data-head-nod-angle', entry.nod)
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      entry.selection
    )
    expect(
      await page.evaluate(() =>
        (window as any).__preparationClips.every((clips: number) => clips === 0)
      )
    ).toBe(true)
  })
}

test('leaving during deferred shader preparation cancels queued work and releases its programs', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.addInitScript(() => {
    const state = { links: 0, deletes: 0 }
    ;(window as any).__deferredGpu = state
    const link = WebGL2RenderingContext.prototype.linkProgram
    const remove = WebGL2RenderingContext.prototype.deleteProgram
    WebGL2RenderingContext.prototype.linkProgram = function (program) {
      state.links++
      return link.call(this, program)
    }
    WebGL2RenderingContext.prototype.deleteProgram = function (program) {
      state.deletes++
      return remove.call(this, program)
    }
  })
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const marker = 'renderer.domElement.tabIndex = 0'
    await route.fulfill({
      response,
      body: (
        await response.text()
      ).replace(
        marker,
        `
      const originalCompile = renderer.compileAsync.bind(renderer);
      renderer.compileAsync = (...args) => {
        const compiling = originalCompile(...args);
        return stage.dataset.shaderWarmup === 'entry-ready'
          ? compiling.then(() => new Promise(resolve => setTimeout(resolve, 500))) : compiling;
      };
      ${marker}`
      ),
    })
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-shader-warmup',
    'entry-ready',
    { timeout: 60000 }
  )
  await page.evaluate(() =>
    (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/colorPalette')
  )
  await expect(page.locator('.temple-stage')).toHaveCount(0, { timeout: 15000 })
  const links = await page.evaluate(() => (window as any).__deferredGpu.links)
  await expect
    .poll(() => page.evaluate(() => (window as any).__deferredGpu.deletes))
    .toBeGreaterThan(0)
  await page.waitForTimeout(700)
  expect(await page.evaluate(() => (window as any).__deferredGpu.links)).toBe(
    links
  )
  expect(errors).toEqual([])
})

test('latest home request during preparation replaces the snapshotted focus entry', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const marker = 'renderer.domElement.tabIndex = 0'
    await route.fulfill({
      response,
      body: (
        await response.text()
      ).replace(
        marker,
        `
      const gate = new Promise(resolve => { window.__resumeB1 = resolve; });
      const compile = renderer.compileAsync.bind(renderer);
      renderer.compileAsync = (...args) => {
        const pending = compile(...args);
        return stage.dataset.shaderWarmup === 'entry-ready' ? pending.then(() => gate) : pending;
      };
      ${marker}`
      ),
    })
  })
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-shader-warmup', 'entry-ready', {
    timeout: 60000,
  })
  await expect(stage).toHaveAttribute('data-preparation-entry', 'sprigatito')
  await page.evaluate(() => {
    const store = (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('temple-navigation')
    store.request(null)
    ;(window as any).__resumeB1()
  })
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 30000 })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
})
