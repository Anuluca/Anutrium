import { expect, test } from '@playwright/test'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
})

test('baked render assets contain only referenced vertices and valid morph topology', async () => {
  const files = (await readdir(resolve('public/models')))
    .filter((name) => name.startsWith('sprigatito-'))
    .sort()
  expect(files).toEqual(['sprigatito-sleep.bin.gz', 'sprigatito-sleep.json'])
  {
    const metadata = JSON.parse(
      await readFile(resolve(`public/models/sprigatito-sleep.json`), 'utf8')
    )
    const bytes = gunzipSync(
      await readFile(resolve(`public/models/sprigatito-sleep.bin.gz`))
    )
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    )
    const count = metadata.attributes.positions.count / 3
    const attribute = metadata.attributes.indices
    const indices = new Uint16Array(buffer, attribute.offset, attribute.count)
    expect(indices.length / 3).toBe(2066)
    expect(new Set(indices).size).toBe(count)
    expect(Math.max(...indices)).toBeLessThan(count)
    for (const name of [
      'positions',
      'normals',
      'raisedPositions',
      'raisedNormals',
    ]) {
      const attribute = metadata.attributes[name]
      expect(attribute.offset % 4).toBe(0)
      expect(attribute.count).toBe(count * 3)
      const values = new Float32Array(buffer, attribute.offset, attribute.count)
      expect(values.every(Number.isFinite)).toBe(true)
    }
    expect(bytes.length).toBe(attribute.offset + attribute.count * 2)
  }
  const environment = JSON.parse(
    await readFile(resolve('public/models/lucario-studio.json'), 'utf8')
  )
  expect(
    gunzipSync(await readFile(resolve('public/models/lucario-studio.bin.gz')))
      .byteLength
  ).toBe(environment.width * environment.height * 8)
})

test('cached picking matches Three intersections across morph poses and reuses vertex calculations', async ({
  page,
}) => {
  // 只加载待验证模块，避免页面场景的 GPU 工作干扰算法检查。
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' })
  )
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js')
    const { cacheMorphRaycastVertices } = await import(
      '/src/utils/cacheMorphRaycastVertices.ts'
    )
    const geometry = new THREE.SphereGeometry(1, 24, 16)
    const raised = geometry.getAttribute('position').clone()
    for (let index = 0; index < raised.count; index++)
      raised.setY(index, raised.getY(index) * 1.3 + 0.2)
    geometry.morphAttributes.position = [raised]
    geometry.computeBoundingBox()
    const surface = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    const original = new THREE.Mesh(geometry, surface)
    const cached = new THREE.Mesh(geometry, surface)
    for (const mesh of [original, cached]) {
      mesh.position.set(0.2, 0.3, -0.4)
      mesh.rotation.set(0.15, 0.3, 0.1)
      mesh.scale.set(0.8, 1.1, 0.9)
      mesh.updateMatrixWorld(true)
    }
    let computations = 0
    const getVertex = cached.getVertexPosition
    cached.getVertexPosition = function (index, target) {
      computations++
      return getVertex.call(this, index, target)
    }
    cacheMorphRaycastVertices(cached)
    const ray = new THREE.Raycaster()
    let compared = 0
    let difference = 0
    let mismatches = 0
    for (const pose of [0, 0.25, 1, 0.5, 0]) {
      original.morphTargetInfluences[0] = pose
      cached.morphTargetInfluences[0] = pose
      for (let x = -1.5; x <= 1.5; x += 0.2) {
        ray.set(new THREE.Vector3(x, 0.4, 4), new THREE.Vector3(0, 0, -1))
        ray.near = 0.1
        ray.far = 8
        const expected = ray.intersectObject(original)
        const actual = ray.intersectObject(cached)
        if (expected.length !== actual.length) mismatches++
        for (
          let index = 0;
          index < Math.min(expected.length, actual.length);
          index++
        ) {
          difference = Math.max(
            difference,
            expected[index].point.distanceTo(actual[index].point),
            Math.abs(expected[index].distance - actual[index].distance)
          )
          compared++
        }
      }
    }
    const before = computations
    ray.intersectObject(cached)
    ray.intersectObject(cached)
    return {
      mismatches,
      difference,
      compared,
      cachedCalls: computations - before,
      computations,
      vertices: raised.count,
    }
  })
  expect(result.mismatches).toBe(0)
  expect(result.compared).toBeGreaterThan(20)
  expect(result.difference).toBeLessThan(1e-10)
  expect(result.cachedCalls).toBe(0)
  expect(result.computations).toBeLessThanOrEqual(result.vertices * 5)
})

test('home downloads compact assets without loading runtime mesh simplification', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const probe = { lastDraws: 0, draws: 0, bufferBytes: 0 }
    ;(window as any).modelOptimizationProbe = probe
    const prototype = WebGL2RenderingContext.prototype
    const clear = prototype.clear
    prototype.clear = function (...args) {
      if (
        (this.canvas as HTMLCanvasElement).closest?.('.temple-stage') &&
        args[0] & this.COLOR_BUFFER_BIT
      ) {
        probe.lastDraws = probe.draws
        probe.draws = 0
      }
      return clear.apply(this, args)
    }
    for (const method of ['drawElements', 'drawArrays'] as const) {
      const draw = prototype[method]
      prototype[method] = function (...args) {
        if ((this.canvas as HTMLCanvasElement).closest?.('.temple-stage'))
          probe.draws++
        return draw.apply(this, args)
      }
    }
    const upload = prototype.bufferData
    prototype.bufferData = function (...args) {
      if ((this.canvas as HTMLCanvasElement).closest?.('.temple-stage'))
        probe.bufferBytes += (args[1] as ArrayBufferView)?.byteLength || 0
      return upload.apply(this, args)
    }
  })
  const requests: string[] = []
  const errors: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  expect(
    requests.filter((url) => url.includes('/models/sprigatito-sleep.bin.gz'))
  ).toHaveLength(1)
  expect(
    requests.some((url) =>
      /sprigatito-sleep\.bin(?:\?|$)|sprigatito-render-(?:full|wire)|meshopt_simplifier|simplifyMorphModelGeometry/.test(
        url
      )
    )
  ).toBe(false)
  expect(
    requests.filter((url) => url.includes('/models/temple-label.bin.gz'))
  ).toHaveLength(1)
  expect(
    requests.some(
      (url) =>
        url.includes('FontLoader') || url.includes('islandTextFont.generated')
    )
  ).toBe(false)
  expect(errors).toEqual([])
  const probe = await page.evaluate(
    () => (window as any).modelOptimizationProbe
  )
  expect(probe.draws).toBeGreaterThan(0)
  expect(probe.draws).toBeLessThanOrEqual(64)
  expect(probe.bufferBytes).toBeLessThan(270000)
})
