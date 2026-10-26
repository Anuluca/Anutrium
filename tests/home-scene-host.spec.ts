import { expect, type Page, test } from './helpers/sceneDiagnostics'

const navigate = (page: Page, path: string) =>
  page.evaluate(async (path) => {
    await (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push(path)
  }, path)

test('ready home retains one paused renderer and returns without reallocating programs or geometry', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const stats = { contexts: 0, programs: 0, buffers: 0, draws: 0 }
    ;(window as any).__hostGpu = stats
    const seen = new WeakSet<object>()
    const prototype = WebGL2RenderingContext.prototype as any
    for (const [name, counter] of [
      ['createProgram', 'programs'],
      ['createBuffer', 'buffers'],
      ['drawElements', 'draws'],
      ['drawArrays', 'draws'],
      ['drawElementsInstanced', 'draws'],
      ['drawArraysInstanced', 'draws'],
    ]) {
      const original = prototype[name]
      prototype[name] = function (...args: any[]) {
        if (this.canvas.getAttribute('aria-label')?.endsWith('三维模型')) {
          if (!seen.has(this)) {
            seen.add(this)
            stats.contexts++
          }
          stats[counter]++
        }
        return original.apply(this, args)
      }
    }
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 60000 })
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true')
  await page.waitForTimeout(500)
  const initial = await page.evaluate(() => {
    ;(window as any).__retainedCanvas = document.querySelector(
      '.temple-stage canvas'
    )
    return { ...(window as any).__hostGpu }
  })
  await navigate(page, '/colorPalette')
  await expect(page.locator('.palette-tool')).toBeVisible()
  await expect(stage).toHaveCount(0)
  const paused = await page.evaluate(() => ({ ...(window as any).__hostGpu }))
  await page.keyboard.press('Enter')
  await page.mouse.move(150, 150)
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => ({ ...(window as any).__hostGpu }))).toEqual(
    paused
  )
  await page.evaluate(() => {
    ;(
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$pinia._s
      .get('visualState')
      .setTheme('light')
  })
  await navigate(page, '/island')
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 20000 })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'statue'
  )
  await expect(stage).toHaveAttribute('data-color-mode', 'light')
  await expect(stage).toHaveAttribute('data-entrance-mode', 'simple')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true')
  await expect(stage).toHaveAttribute('data-material-phase', 'wireframe')
  expect(
    await page.evaluate(
      () =>
        document.querySelector('.temple-stage canvas') ===
        (window as any).__retainedCanvas
    )
  ).toBe(true)
  const resumed = await page.evaluate(() => ({ ...(window as any).__hostGpu }))
  expect(resumed.contexts).toBe(initial.contexts)
  expect(resumed.programs).toBe(initial.programs)
  expect(resumed.buffers).toBe(initial.buffers)
  await stage.locator('canvas').focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  await expect(stage).toHaveAttribute('data-material-phase', 'chrome')
  await info.attach('renderer-reuse', {
    body: JSON.stringify({ initial, paused, resumed }),
    contentType: 'application/json',
  })
})

test('host expires, rejects incompatible or over-budget scenes, and releases on pagehide', async ({
  page,
}) => {
  await page.route('**/__scene-host-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body></body></html>',
    })
  )
  await page.goto('/__scene-host-test')
  const result = await page.evaluate(async () => {
    const url = '/src/views/Home/templeSceneHost.ts'
    const { createTempleSceneHost } = await import(/* @vite-ignore */ url)
    const host = createTempleSceneHost(30, 10)
    const make = (bytes = 1, ready = true) => ({
      disposed: 0,
      valid: true,
      suspendForHost: () => ready,
      canResumeFromHost() {
        return this.valid
      },
      retainedBytes: () => bytes,
      dispose() {
        this.disposed++
      },
    })
    const a = make(),
      b = make(),
      expired = make(),
      oversized = make(11),
      cold = make(1, false),
      lost = make()
    host.retain('a', a)
    const same = host.take('a') === a
    await new Promise((resolve) => setTimeout(resolve, 50))
    const activeNotDisposed = a.disposed === 0
    host.retain('a', a)
    host.retain('b', b)
    host.take('incompatible')
    host.retain('expired', expired)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const emptyAfterTimeout = !host.hasResident()
    host.retain('large', oversized)
    host.retain('cold', cold)
    host.retain('lost', lost)
    lost.valid = false
    const rejectsLost = host.take('lost') === undefined
    const versioned = make()
    host.retain('versioned', versioned, {})
    const rejectsOldFactory = host.take('versioned', {}) === undefined
    const hidden = make()
    host.retain('hidden', hidden)
    window.dispatchEvent(new Event('pagehide'))
    return {
      same,
      activeNotDisposed,
      emptyAfterTimeout,
      rejectsLost,
      rejectsOldFactory,
      released: [a, b, expired, oversized, cold, lost, versioned, hidden].map(
        (scene) => scene.disposed
      ),
      emptyAfterPagehide: !host.hasResident(),
    }
  })
  expect(result).toEqual({
    same: true,
    activeNotDisposed: true,
    emptyAfterTimeout: true,
    rejectsLost: true,
    rejectsOldFactory: true,
    released: [1, 1, 1, 1, 1, 1, 1, 1],
    emptyAfterPagehide: true,
  })
})

test('inactive host releases real GPU resources and presentation changes rebuild safely', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/src/views/Home/templeSceneHost.ts*', async (route) => {
    const response = await route.fetch()
    const source = await response.text()
    const marker = 'retain(key, scene, version) {'
    expect(source).toContain(marker)
    // 获取实际被页面调用的宿主，避免开发服务 HMR 查询版本产生独立模块实例。
    await route.fulfill({
      response,
      body: source.replace(
        marker,
        marker + ' window.__clearResidentScene = clear;'
      ),
    })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 60000 }
  )
  await page.evaluate(() => {
    ;(window as any).__oldGl = (
      document.querySelector('.temple-stage canvas') as HTMLCanvasElement
    ).getContext('webgl2')
  })
  await navigate(page, '/colorPalette')
  await expect(page.locator('.temple-stage')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await navigate(page, '/island')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-presentation',
    'mobile'
  )
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 60000 }
  )
  await expect
    .poll(() => page.evaluate(() => (window as any).__oldGl.isContextLost()))
    .toBe(true)
  await page.evaluate(() => {
    ;(window as any).__oldGl = (
      document.querySelector('.temple-stage canvas') as HTMLCanvasElement
    ).getContext('webgl2')
  })
  await navigate(page, '/colorPalette')
  await expect(page.locator('.temple-stage')).toHaveCount(0)
  await page.evaluate(() => {
    ;(window as any).__clearResidentScene()
  })
  await expect
    .poll(() => page.evaluate(() => (window as any).__oldGl.isContextLost()))
    .toBe(true)
})

test('cold entry loads the current pet and defers a different framing reference until pet focus', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const requests: string[] = []
  page.on('request', (request) => {
    if (
      /\/models\/(sprigatito|mightyena)-sleep\.(json|bin\.gz)/.test(
        request.url()
      )
    )
      requests.push(request.url())
  })
  await page.goto('/colorPalette', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.palette-tool')).toBeVisible()
  await page.evaluate(async () => {
    const url = '/src/stores/floraPets.ts'
    const { useFloraPets } = await import(/* @vite-ignore */ url)
    useFloraPets().activePetId = 'xiaohei'
  })
  await navigate(page, '/')
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 60000 })
  await expect(stage).toHaveAttribute('data-pet-id', 'xiaohei')
  expect(requests.filter((url) => url.includes('sprigatito'))).toEqual([])
  expect(
    requests.filter((url) => url.includes('mightyena-sleep.bin.gz'))
  ).toHaveLength(1)
  await page.evaluate(() => {
    ;(
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$pinia._s
      .get('temple-navigation')
      .request('sprigatito')
  })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito',
    { timeout: 15000 }
  )
  await expect(stage).toHaveAttribute('data-companion-screen-bounds', /.+/, {
    timeout: 15000,
  })
  expect(
    requests.filter((url) => url.includes('sprigatito-sleep.bin.gz'))
  ).toHaveLength(1)
  await info.attach('state-based-model-downloads', {
    body: JSON.stringify(requests, null, 2),
    contentType: 'application/json',
  })
})

test('retained overview matches its original complete scene after history return', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/site/home-features', (route) =>
    route.fulfill({ json: { lucarioHeadache: false, updatedAt: null } })
  )
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const source = await response.text()
    const marker = 'renderer.domElement.tabIndex = 0'
    await route.fulfill({
      response,
      body: source.replace(
        marker,
        `window.__hostSnapshot = () => { renderer.render(scene, camera); window.__hostSnapshotState = {camera:camera.position.toArray(), target:lookAt.toArray(), zoom:camera.zoom, fov:camera.fov, view:camera.view, stage:[stage.clientWidth,stage.clientHeight], data:{...stage.dataset}}; return renderer.domElement.toDataURL(); }; ${marker}`
      ),
    })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 60000 })
  await page.waitForTimeout(300)
  const original = await page.evaluate(() => {
    ;(window as any).__originalCanvas = document.querySelector(
      '.temple-stage canvas'
    )
    return (window as any).__hostSnapshot()
  })
  const originalState = await page.evaluate(
    () => (window as any).__hostSnapshotState
  )
  await navigate(page, '/colorPalette')
  await expect(page.locator('.palette-tool')).toBeVisible()
  await page.goBack()
  await expect(stage).toHaveAttribute('aria-busy', 'false', { timeout: 20000 })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  const difference = await page.evaluate(async (original) => {
    const current = (window as any).__hostSnapshot()
    const images = await Promise.all(
      [original, current].map(async (url) => {
        const image = new Image()
        image.src = url
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, canvas.width, canvas.height).data
      })
    )
    let maxDelta = 0,
      changedPixels = 0
    for (let i = 0; i < images[0].length; i += 4) {
      let changed = false
      for (let c = 0; c < 4; c++) {
        const delta = Math.abs(images[0][i + c] - images[1][i + c])
        maxDelta = Math.max(maxDelta, delta)
        changed ||= delta > 0
      }
      if (changed) changedPixels++
    }
    return {
      maxDelta,
      changedPixels,
      totalPixels: images[0].length / 4,
      reused:
        document.querySelector('.temple-stage canvas') ===
        (window as any).__originalCanvas,
    }
  }, original)
  await info.attach('original-scene', {
    body: Buffer.from(original.split(',')[1], 'base64'),
    contentType: 'image/png',
  })
  await info.attach('resumed-scene', {
    body: Buffer.from(
      (
        await page.evaluate(() => (window as any).__hostSnapshot())
      ).split(',')[1],
      'base64'
    ),
    contentType: 'image/png',
  })
  await info.attach('pose-comparison', {
    body: JSON.stringify(
      {
        originalState,
        resumed: await page.evaluate(() => (window as any).__hostSnapshotState),
        difference,
      },
      null,
      2
    ),
    contentType: 'application/json',
  })
  expect(difference.reused).toBe(true)
  expect(difference.changedPixels / difference.totalPixels).toBeLessThan(0.001)
  expect(difference.maxDelta).toBeLessThanOrEqual(2)
  await info.attach('resident-scene-pixels', {
    body: JSON.stringify(difference),
    contentType: 'application/json',
  })
})

test.describe('production diagnostics disabled', () => {
  test.use({ sceneDiagnostics: false })
  test('home returns through the host without publishing diagnostic attributes', async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('aria-busy', 'false', {
      timeout: 60000,
    })
    await page.evaluate(() => {
      ;(window as any).__productionCanvas = document.querySelector(
        '.temple-stage canvas'
      )
    })
    await navigate(page, '/colorPalette')
    await expect(page.locator('.palette-tool')).toBeVisible()
    await page.goBack()
    await expect(stage).toHaveAttribute('aria-busy', 'false', {
      timeout: 20000,
    })
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true')
    await expect(stage).not.toHaveAttribute('data-camera-position')
    await expect(stage).not.toHaveAttribute('data-scene-draw-calls')
    expect(
      await page.evaluate(
        () =>
          document.querySelector('.temple-stage canvas') ===
          (window as any).__productionCanvas
      )
    ).toBe(true)
  })
})
