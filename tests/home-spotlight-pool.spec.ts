import { expect, test } from './helpers/sceneDiagnostics'

test('removing zero spotlights preserves the full home composite', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const body = await response.text()
    const marker = 'renderer.domElement.tabIndex = 0'
    expect(body).toContain(marker)
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        'window.__spotComposite = () => ({renderer,scene,camera,spotLightPool});' +
          marker
      ),
    })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 60000 }
  )
  await page.mouse.move(15, 100)
  await page.waitForTimeout(1500)
  const result = await page.evaluate(async () => {
    const { renderer, scene, camera, spotLightPool } = (
      window as any
    ).__spotComposite()
    const zeros = spotLightPool.sources.every((light) => light.intensity === 0)
    const frames: string[] = []
    // 同一 JS 任务内保持姿态/贴图不变，只改变是否让五个零亮度控制灯进入 Scene。
    for (const legacy of [false, true, false]) {
      for (const light of spotLightPool.sources) {
        if (legacy) scene.add(light, light.target)
        else scene.remove(light, light.target)
      }
      scene.updateMatrixWorld(true)
      renderer.render(scene, camera)
      frames.push(renderer.domElement.toDataURL())
    }
    const pixels = await Promise.all(
      frames.map(async (url) => {
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
    let maxDelta = 0
    for (let i = 0; i < pixels[0].length; i++)
      for (let frame = 1; frame < pixels.length; frame++)
        maxDelta = Math.max(maxDelta, Math.abs(pixels[0][i] - pixels[frame][i]))
    return { zeros, maxDelta }
  })
  expect(result.zeros).toBe(true)
  expect(result.maxDelta).toBeLessThanOrEqual(2)
})

test('home prewarms bounded spotlight states before rapid focus changes', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const body = await response.text()
    const marker = 'renderer.domElement.tabIndex = 0'
    expect(body).toContain(marker)
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        `
      window.__spotPoolSamples = [];
      window.__spotPoolProbe = () => ({ programs: renderer.info.programs.length, active: spotLightPool.activeCount });
      const auditRender = renderer.render.bind(renderer);
      renderer.render = (...args) => {
        if (args[0] === scene && stage.dataset.shaderWarmup === 'complete') {
          const active = [];
          scene.traverseVisible(object => { if (object.isSpotLight) active.push(object); });
          window.__spotPoolSamples.push({ count: active.length, zero: active.some(light => light.intensity <= 0) });
        }
        return auditRender(...args);
      };
      ${marker}`
      ),
    })
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  const root = page.locator('.temple-page')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 60000,
  })
  await page.mouse.move(15, 100)
  await page.waitForTimeout(1000)
  const read = () => page.evaluate(() => (window as any).__spotPoolProbe())
  const prepared = await read()
  expect(prepared.active).toBe(0)
  const select = (id: string | null) =>
    page.evaluate((id) => {
      const app = (document.querySelector('#app') as any).__vue_app__
      app.config.globalProperties.$pinia._s.get('temple-navigation').request(id)
    }, id)
  await select('flanerie')
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 10000 })
  await expect(stage).toHaveAttribute('data-active-spot-lights', '1')
  expect((await read()).programs).toBe(prepared.programs)
  for (const id of ['archive', 'pokeyard', 'sprigatito']) {
    await select(id)
    await page.waitForTimeout(220)
  }
  await expect(root).toHaveAttribute('data-selected', 'sprigatito')
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 10000 })
  await expect(stage).toHaveAttribute('data-active-spot-lights', '1')
  expect((await read()).programs).toBe(prepared.programs)
  await select(null)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 10000 })
  await expect(stage).toHaveAttribute('data-active-spot-lights', '0')
  const samples = await page.evaluate(
    () =>
      (window as any).__spotPoolSamples as { count: number; zero: boolean }[]
  )
  expect(new Set(samples.map((sample) => sample.count))).toEqual(
    new Set([0, 1, 2])
  )
  expect(samples.every((sample) => sample.count <= 2 && !sample.zero)).toBe(
    true
  )
  expect((await read()).programs).toBe(prepared.programs)
  expect(errors).toEqual([])
})

test('spot pool removes zero-light shader slots and matches the original lighting', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body></body></html>',
    })
  )
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js')
    const { createSpotLightPool } = await import(
      '/src/views/Home/scene/spotLightPool.ts'
    )
    const renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.setSize(64, 64)
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30)
    camera.position.set(0, 1.6, 5)
    camera.lookAt(0, 0, 0)
    const geometry = new THREE.SphereGeometry(1, 24, 16)
    const makeScene = () => {
      const scene = new THREE.Scene()
      const material = new THREE.MeshStandardMaterial({
        color: 0xd84566,
        roughness: 0.4,
        metalness: 0.3,
      })
      scene.add(new THREE.Mesh(geometry, material))
      scene.add(new THREE.AmbientLight(0xffffff, 0.6))
      return { scene, material }
    }
    const original = makeScene()
    const pooled = makeScene()
    const sources = Array.from({ length: 5 }, (_, i) => {
      const light = new THREE.SpotLight(0xff8099, 0, 20, 0.8, 0.85, 1.5)
      light.position.set(i - 2, 3, 3)
      original.scene.add(light, light.target)
      return light
    })
    const controls = sources.map((source) => source.clone())
    const pool = createSpotLightPool(pooled.scene, controls)
    const gl = renderer.getContext()
    const render = (state: typeof original) => {
      renderer.render(state.scene, camera)
      const bytes = new Uint8Array(64 * 64 * 4)
      gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, bytes)
      const program = renderer.properties.get(state.material).currentProgram
      return {
        bytes,
        slots: program.getUniforms().map.spotLights?.seq.length || 0,
      }
    }
    const measurements = []
    for (const count of [0, 1, 2, 0]) {
      for (let i = 0; i < sources.length; i++) {
        const intensity =
          i === 0 && count > 0 ? 8 : i === 2 && count > 1 ? 11 : 0
        sources[i].intensity = controls[i].intensity = intensity
      }
      pool.update()
      const a = render(original)
      const b = render(pooled)
      let maxDelta = 0
      for (let i = 0; i < a.bytes.length; i++)
        maxDelta = Math.max(maxDelta, Math.abs(a.bytes[i] - b.bytes[i]))
      measurements.push({
        count,
        originalSlots: a.slots,
        pooledSlots: b.slots,
        maxDelta,
        active: pool.activeCount,
        visibleZeros: pool.lights.filter(
          (light) => light.visible && light.intensity === 0
        ).length,
      })
    }
    // 快速连续切换可能留下多个衰减尾巴，真实灯仍只接受最强两个来源。
    controls.forEach((light, i) => {
      light.intensity = i + 1
    })
    pool.update()
    const strongest = pool.lights
      .map((light) => light.intensity)
      .sort((a, b) => a - b)
    pool.dispose()
    geometry.dispose()
    original.material.dispose()
    pooled.material.dispose()
    sources.forEach((light) => light.dispose())
    controls.forEach((light) => light.dispose())
    renderer.dispose()
    renderer.forceContextLoss()
    return { measurements, strongest }
  })
  for (const row of result.measurements) {
    expect(row.originalSlots).toBe(5)
    expect(row.pooledSlots).toBe(row.count)
    expect(row.active).toBe(row.count)
    expect(row.visibleZeros).toBe(0)
    expect(row.maxDelta).toBeLessThanOrEqual(2)
  }
  expect(result.strongest).toEqual([4, 5])
})
