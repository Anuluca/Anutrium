import { expect, type Page, test } from './helpers/sceneDiagnostics'

async function emptyPage(page: Page) {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html>' })
  )
  await page.goto('/')
}

test('label LOD uses hysteresis and preserves depth when viewed obliquely', async ({
  page,
}) => {
  await emptyPage(page)
  const tiers = await page.evaluate(async () => {
    const { chooseTempleLabelTier: choose } = await import(
      '/src/views/Home/scene/templeLabelLod.ts'
    )
    return [
      choose('high', 27, 1),
      choose('high', 30, 1),
      choose('low', 30, 1),
      choose('low', 37, 1),
      choose('high', 10, 1),
      choose('flat', 14, 0.99),
      choose('flat', 17, 0.99),
      choose('flat', 10, 0.98),
      choose('low', 10, 0.94),
      choose('flat', NaN, 1),
    ]
  })
  expect(tiers).toEqual([
    'low',
    'high',
    'low',
    'high',
    'flat',
    'flat',
    'low',
    'low',
    'high',
    'high',
  ])
})

test('flat asset exactly reuses high-tier front triangles and six glyph identities', async ({
  page,
}) => {
  await emptyPage(page)
  const result = await page.evaluate(async () => {
    const { loadTempleLabelModel } = await import(
      '/src/utils/templeLabelModel.ts'
    )
    const [high, flat] = await Promise.all([
      loadTempleLabelModel('high'),
      loadTempleLabelModel('flat'),
    ])
    const read = (asset: typeof high) => {
      const a = asset.metadata.attributes
      return {
        p: new Float32Array(asset.buffer, a.position.offset, a.position.count),
        n: new Float32Array(asset.buffer, a.normal.offset, a.normal.count),
        ids: new Float32Array(
          asset.buffer,
          a.statueLabelCharacter.offset,
          a.statueLabelCharacter.count
        ),
        i: new Uint16Array(asset.buffer, a.indices.offset, a.indices.count),
      }
    }
    const a = read(high),
      b = read(flat)
    const triangle = (data: typeof a, offset: number) =>
      Array.from(data.i.subarray(offset, offset + 3))
        .flatMap((index) => [
          ...data.p.subarray(index * 3, index * 3 + 3),
          data.ids[index],
        ])
        .join(',')
    const reference = []
    for (let offset = 0; offset < a.i.length; offset += 3)
      if (
        a.i
          .subarray(offset, offset + 3)
          .every((index) => a.n[index * 3 + 2] > 0.9999)
      )
        reference.push(triangle(a, offset))
    const actual = []
    for (let offset = 0; offset < b.i.length; offset += 3)
      actual.push(triangle(b, offset))
    const depths = Array.from(b.p).filter((_, index) => index % 3 === 2)
    return {
      identical: JSON.stringify(reference) === JSON.stringify(actual),
      faces: b.i.length / 3,
      bytes: flat.buffer.byteLength,
      ids: [...new Set(b.ids)].sort(),
      thickness: Math.max(...depths) - Math.min(...depths),
      layoutSame:
        high.metadata.depth === flat.metadata.depth &&
        high.metadata.halfHeight === flat.metadata.halfHeight,
    }
  })
  expect(result).toEqual({
    identical: true,
    faces: 242,
    bytes: 8452,
    ids: [0, 1, 2, 3, 4, 5],
    thickness: 0,
    layoutSame: true,
  })
})

test('LOD loads on demand, ignores stale requests and bounds geometry/material lifetime', async ({
  page,
}) => {
  await emptyPage(page)
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { createTempleLabelLod, fillTempleLabelGeometry } = await import(
      '/src/views/Home/scene/templeLabelLod.ts'
    )
    const { loadTempleLabelModel } = await import(
      '/src/utils/templeLabelModel.ts'
    )
    const high = await loadTempleLabelModel('high'),
      low = await loadTempleLabelModel('low'),
      flat = await loadTempleLabelModel('flat')
    const material = new THREE.MeshBasicMaterial()
    const mesh = new THREE.Mesh(
      fillTempleLabelGeometry(new THREE.BufferGeometry(), high),
      material
    )
    const registered: any[] = [],
      changes: string[] = [],
      requested: string[] = []
    let complete: any,
      invalidates = 0
    const flush = async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    }
    const lod = createTempleLabelLod({
      mode: 'lod',
      mesh,
      initial: high,
      register: (g) => {
        registered.push(g)
        return g
      },
      invalidate: () => invalidates++,
      changed: (a) => changes.push(a.quality),
      load: (tier) => {
        requested.push(tier)
        return new Promise((resolve) => (complete = resolve))
      },
    })
    lod.update(10, 1, true, false)
    const hiddenRequests = requested.length
    lod.update(24, 1, true, true)
    lod.update(24, 1, true, true)
    complete(low)
    await flush()
    const noAsyncGeometry = registered.length === 0
    lod.update(60, 1, true, true)
    const staleIgnored = lod.current === 'high' && registered.length === 0
    lod.update(24, 1, true, true)
    const lowSelected = lod.current === 'low'
    lod.update(10, 1, false, true)
    const movingHigh = lod.current === 'high'
    lod.update(10, 1, true, true)
    complete(flat)
    await flush()
    lod.update(10, 1, true, true)
    const flatSelected = lod.current === 'flat'
    lod.update(10, 0.94, true, true)
    const obliqueHigh = lod.current === 'high'
    for (let i = 0; i < 100; i++) {
      lod.update(24, 1, true, true)
      lod.update(10, 1, true, true)
      lod.update(60, 1, true, true)
    }
    const bounded = registered.length === 2 && mesh.material === material
    lod.dispose()
    const stableGeometry = mesh.geometry
    lod.update(10, 1, true, true)
    const disposedNoChange = mesh.geometry === stableGeometry
    let finish: any,
      lateInvalidates = 0,
      lateRegisters = 0
    const late = createTempleLabelLod({
      mode: 'lod',
      mesh,
      initial: high,
      register: (g) => {
        lateRegisters++
        return g
      },
      invalidate: () => lateInvalidates++,
      changed: () => {},
      load: () => new Promise((resolve) => (finish = resolve)),
    })
    late.update(10, 1, true, true)
    late.dispose()
    finish(flat)
    await flush()
    let failures = 0
    const failure = createTempleLabelLod({
      mode: 'lod',
      mesh,
      initial: high,
      register: (g) => {
        registered.push(g)
        return g
      },
      invalidate: () => {},
      changed: () => {},
      load: (tier) => {
        if (tier === 'flat') return Promise.resolve(flat)
        failures++
        return Promise.reject(new Error('test'))
      },
    })
    failure.update(10, 1, true, true)
    await flush()
    failure.update(10, 1, true, true)
    const fallbackWasFlat = failure.current === 'flat'
    failure.update(24, 1, true, true)
    const safeFallback = fallbackWasFlat && failure.current === 'high'
    await flush()
    for (let i = 0; i < 100; i++) failure.update(24, 1, true, true)
    failure.dispose()
    for (const geometry of registered) geometry.dispose()
    mesh.geometry.dispose()
    material.dispose()
    return {
      hiddenRequests,
      noAsyncGeometry,
      staleIgnored,
      lowSelected,
      movingHigh,
      flatSelected,
      obliqueHigh,
      bounded,
      disposedNoChange,
      lateInvalidates,
      lateRegisters,
      requested,
      failures,
      safeFallback,
      invalidates,
    }
  })
  expect(result).toEqual({
    hiddenRequests: 0,
    noAsyncGeometry: true,
    staleIgnored: true,
    lowSelected: true,
    movingHigh: true,
    flatSelected: true,
    obliqueHigh: true,
    bounded: true,
    disposedNoChange: true,
    lateInvalidates: 0,
    lateRegisters: 0,
    requested: ['low', 'flat'],
    failures: 1,
    safeFallback: true,
    invalidates: 2,
  })
})

for (const mode of ['flat', 'lod'] as const) {
  test(`${mode} label keeps focus/reveal, shared shaders and focus return`, async ({
    page,
  }, info) => {
    test.setTimeout(90000)
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.route('**/src/config/templeLabelQuality.ts*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `export const templeLabelQuality = "${mode}"`,
      })
    )
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/island', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 45000,
    })
    await expect(stage).toHaveAttribute('data-label-mode', mode)
    await expect(stage).toHaveAttribute(
      'data-label-quality',
      mode === 'flat' ? 'flat' : 'high'
    )
    await expect(stage).toHaveAttribute(
      'data-label-faces',
      mode === 'flat' ? '242' : '1984'
    )
    await expect(stage).toHaveAttribute('data-statue-label-reveal', '1.000')
    await expect(
      page.locator('.island-links > g[visibility="visible"]')
    ).toHaveCount(5)
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 30000,
    })
    const alert = page.locator('.mobile-experience-alert .el-alert__close-btn')
    if (await alert.isVisible()) await alert.click()
    await expect(stage).toHaveAttribute('data-shader-warmup', 'complete')
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    const before = await stage.getAttribute('data-prepared-shader-programs')
    await page.screenshot({
      path: `.tmp/label-${mode}-${info.project.name}-2026-10-26.png`,
    })
    const request = (id: string | null) =>
      page.evaluate(
        (id) =>
          (
            document.querySelector('#app') as any
          ).__vue_app__.config.globalProperties.$pinia._s
            .get('temple-navigation')
            .request(id),
        id
      )
    await request(null)
    await expect(page.locator('.island-focus')).toHaveCount(0, {
      timeout: 15000,
    })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 15000 }
    )
    await request('statue')
    await expect(page.locator('.island-focus')).toBeVisible({ timeout: 15000 })
    await expect(stage).toHaveAttribute('data-statue-label-reveal', '1.000')
    expect(await stage.getAttribute('data-prepared-shader-programs')).toBe(
      before
    )
    await expect(page.locator('.particles-bg')).toHaveAttribute(
      'data-max-fps',
      '40'
    )
    expect(errors).toEqual([])
  })
}

test('real LOD swaps only geometry, adds no programs and survives a parked renderer', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.addInitScript(() => {
    const counters = { links: 0, draws: 0 }
    ;(window as any).__labelGpu = counters
    for (const [name, counter] of [
      ['linkProgram', 'links'],
      ['drawElements', 'draws'],
      ['drawElementsInstanced', 'draws'],
      ['drawArrays', 'draws'],
      ['drawArraysInstanced', 'draws'],
    ]) {
      const original = (WebGL2RenderingContext.prototype as any)[name]
      ;(WebGL2RenderingContext.prototype as any)[name] = function (
        ...args: unknown[]
      ) {
        if (this.canvas.closest?.('.temple-stage')) (counters as any)[counter]++
        return original.apply(this, args)
      }
    }
  })
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const source = await response.text(),
      marker = 'const sleepingSurface = createPetGeometry(sleepingModel)'
    expect(source).toContain(marker)
    await route.fulfill({
      response,
      body: source.replace(
        marker,
        `window.__labelPose = (fov) => {
      hasPointer = false; hovered = null; statueHovered = true;
      statueLabelReveal.value = 1; statueLabelTarget = 1; statueLabelMotionStart = 1;
      camera.position.set(0, statueLabel.position.y, statueLabel.position.z + 12);
      lookAt.set(0, statueLabel.position.y, statueLabel.position.z);
      camera.fov = fov; camera.updateProjectionMatrix(); markProjectionDirty(); invalidate();
    };
    window.__labelResources = () => ({canvas:renderer.domElement,geometry:statueLabel.geometry,material:statueLabel.material,count:renderer.info.memory.geometries});
    ${marker}`
      ),
    })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-shader-warmup', 'complete', {
    timeout: 45000,
  })
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true')
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await page.evaluate(() => {
    ;(window as any).__labelInitial = (window as any).__labelResources()
  })
  const links = await page.evaluate(() => (window as any).__labelGpu.links)
  expect(links).toBeGreaterThan(0)
  const pose = async (fov: number, tier: string) => {
    await page.evaluate((fov) => (window as any).__labelPose(fov), fov)
    await expect(stage).toHaveAttribute('data-label-quality', tier)
  }
  await pose(30, 'high')
  await pose(80, 'low')
  await pose(140, 'flat')
  await pose(30, 'high')
  await page.waitForTimeout(100)
  const expanded = await page.evaluate(() => {
    const before = (window as any).__labelInitial,
      after = (window as any).__labelResources()
    return {
      materialSame: before.material === after.material,
      highGeometrySame: before.geometry === after.geometry,
      count: after.count - before.count,
    }
  })
  expect(expanded).toEqual({
    materialSame: true,
    highGeometrySame: true,
    count: 2,
  })
  expect(await page.evaluate(() => (window as any).__labelGpu.links)).toBe(
    links
  )
  await page.evaluate(() =>
    (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/colorPalette')
  )
  await expect(page.locator('.temple-page')).toHaveCount(0, { timeout: 15000 })
  const parked = await page.evaluate(() => (window as any).__labelGpu.draws)
  expect(parked).toBeGreaterThan(0)
  await page.waitForTimeout(250)
  expect(await page.evaluate(() => (window as any).__labelGpu.draws)).toBe(
    parked
  )
  await page.goBack()
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 20000,
  })
  await pose(80, 'low')
  await pose(140, 'flat')
  await pose(30, 'high')
  const resumed = await page.evaluate(() => {
    const before = (window as any).__labelInitial,
      after = (window as any).__labelResources()
    return {
      canvasSame: before.canvas === after.canvas,
      materialSame: before.material === after.material,
      count: after.count - before.count,
      links: (window as any).__labelGpu.links,
    }
  })
  expect(resumed).toEqual({
    canvasSame: true,
    materialSame: true,
    count: 2,
    links,
  })
})
