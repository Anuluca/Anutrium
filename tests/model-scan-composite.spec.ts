import { expect, test } from '@playwright/test'

test('scan composite preserves 0.55 alpha, hides rear wires and keeps scan endpoints', async ({
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
    const { createModelScan } = await import(
      '/src/views/Home/scene/modelScan.ts'
    )
    const { createBarycentricGeometry } = await import(
      '/src/views/Home/scene/barycentricGeometry.ts'
    )
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
    renderer.setSize(128, 128)
    renderer.setClearColor(0, 0)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 2
    const geometry = new THREE.BufferGeometry()
    // 前方完整方片遮住后方穿过采样点的三角边；两者都朝向镜头。
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          -0.8, -0.8, 0.2, 0.8, -0.8, 0.2, 0.8, 0.8, 0.2, -0.8, 0.8, 0.2, -0.7,
          0.1015625, -0.2, 0.7, 0.1015625, -0.2, 0, 0.7, -0.2,
        ],
        3
      )
    )
    geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6])
    const depth = new THREE.MeshBasicMaterial({
      colorWrite: false,
      transparent: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    const prepass = new THREE.Mesh(geometry, depth)
    const wireGeometry = createBarycentricGeometry(geometry)
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      toneMapped: false,
    })
    const scan = createModelScan(new THREE.Color(1, 0, 0))
    scan.bounds.value.set(-1, 2)
    scan.install(material, 'composite')
    const surface = new THREE.Mesh(wireGeometry, material)
    surface.renderOrder = 1
    scene.add(prepass, surface)
    const gl = renderer.getContext()
    const pixel = (x: number, y: number) => {
      const bytes = new Uint8Array(4)
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes)
      return [...bytes]
    }
    scan.progress.value = 1
    renderer.render(scene, camera)
    const interior = pixel(38, 70)
    const edge = pixel(64, 64)
    const lines = renderer.info.render.lines
    prepass.visible = false
    renderer.render(scene, camera)
    const rearWithoutDepth = pixel(38, 70)
    prepass.visible = true
    scan.progress.value = 0
    renderer.render(scene, camera)
    const empty = pixel(38, 70)
    scan.progress.value = 0.5
    renderer.render(scene, camera)
    const converted = pixel(38, 25)
    const unconverted = pixel(38, 102)
    wireGeometry.dispose()
    geometry.dispose()
    depth.dispose()
    material.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    return {
      interior,
      edge,
      rearWithoutDepth,
      empty,
      converted,
      unconverted,
      lines,
    }
  })
  expect(result.interior[0]).toBeLessThanOrEqual(1)
  expect(result.interior[3]).toBeCloseTo(0.55 * 255, -1)
  expect(result.edge[0]).toBeGreaterThan(200)
  expect(result.edge[3]).toBeGreaterThan(230)
  expect(result.rearWithoutDepth[0]).toBeGreaterThan(result.interior[0] + 50)
  expect(result.empty).toEqual([0, 0, 0, 0])
  expect(result.converted[3]).toBeCloseTo(0.55 * 255, -1)
  expect(result.unconverted).toEqual([0, 0, 0, 0])
  expect(result.lines).toBe(0)
})

test('indexed scan matches expanded model through morphs, head turns and scan progress', async ({
  page,
}, info) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body></body></html>',
    })
  )
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js')
    const { createBarycentricGeometry } = await import(
      '/src/views/Home/scene/barycentricGeometry.ts'
    )
    const { createModelScan } = await import(
      '/src/views/Home/scene/modelScan.ts'
    )
    const { installHeadRig } = await import(
      '/src/views/Home/scene/materials.ts'
    )
    const metadata = await (await fetch('/models/lucario-island.json')).json()
    const buffer = await (
      await fetch('/models/lucario-island.bin')
    ).arrayBuffer()
    const source = new THREE.BufferGeometry()
    for (const [name, field, size] of [
      ['position', 'positions', 3],
      ['normal', 'normals', 3],
      ['headInfluence', 'weights', 1],
      ['headNodInfluence', 'nodWeights', 1],
    ] as const) {
      const { offset, count } = metadata.attributes[field]
      source.setAttribute(
        name,
        new THREE.BufferAttribute(new Float32Array(buffer, offset, count), size)
      )
    }
    const { offset, count } = metadata.attributes.indices
    source.setIndex(
      new THREE.BufferAttribute(new Uint16Array(buffer, offset, count), 1)
    )
    const bytes = (geometry: any) =>
      Object.values(geometry.attributes).reduce(
        (sum: number, attr: any) => sum + attr.array.byteLength,
        geometry.index?.array.byteLength ?? 0
      ) as number
    const baseline = source.toNonIndexed()
    baseline.deleteAttribute('normal')
    const coordinates = new Uint8Array(count * 3)
    for (let vertex = 0; vertex < count; vertex++)
      coordinates[vertex * 3 + (vertex % 3)] = 255
    baseline.setAttribute(
      'barycentric',
      new THREE.BufferAttribute(coordinates, 3, true)
    )
    const compact = createBarycentricGeometry(source)
    const metrics = {
      expandedVertices: baseline.attributes.position.count,
      indexedVertices: compact.attributes.position.count,
      expandedBytes: bytes(baseline),
      indexedBytes: bytes(compact),
      indexBytes: compact.index.array.byteLength,
    }
    // 加入非零形变目标，验证重映射同时保留形变与头部权重，而不只比较静态姿态。
    const morph = source.attributes.position.clone()
    for (let vertex = 0; vertex < morph.count; vertex++)
      morph.setX(vertex, source.attributes.headInfluence.getX(vertex) * 0.16)
    morph.array.forEach((_, index) => {
      if (index % 3 !== 0) morph.array[index] = 0
    })
    source.morphTargetsRelative = true
    source.morphAttributes.position = [morph]
    const animated = createBarycentricGeometry(source)
    baseline.morphTargetsRelative = true
    baseline.morphAttributes.position =
      source.toNonIndexed().morphAttributes.position
    const renderer = new THREE.WebGLRenderer({ alpha: true })
    renderer.setSize(384, 384)
    const target = new THREE.WebGLRenderTarget(384, 384)
    renderer.setRenderTarget(target)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x183047)
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20)
    camera.position.set(0, 1.7, 6)
    camera.lookAt(0, 1.7, 0)
    const rotation = { value: new THREE.Vector4(0, 0, 0, 1) }
    const rig = {
      headRotation: rotation,
      headPivot: { value: new THREE.Vector3(...metadata.headPivot) },
      headNodPivot: { value: new THREE.Vector3(...metadata.headNodPivot) },
      headNodAngle: { value: 0.17 },
    }
    const depth = new THREE.MeshBasicMaterial({
      colorWrite: false,
      transparent: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      toneMapped: false,
    })
    installHeadRig(depth, rig)
    installHeadRig(material, rig)
    const scan = createModelScan(new THREE.Color(0xff5577))
    source.computeBoundingBox()
    scan.bounds.value.set(
      source.boundingBox.min.y,
      source.boundingBox.max.y - source.boundingBox.min.y
    )
    scan.install(material, 'composite')
    const prepass = new THREE.Mesh(source, depth)
    const surface = new THREE.Mesh(animated, material)
    prepass.morphTargetInfluences[0] = surface.morphTargetInfluences[0] = 0.65
    surface.renderOrder = 1
    scene.add(prepass, surface)
    const capture = (geometry: any) => {
      surface.geometry = geometry
      renderer.render(scene, camera)
      const pixels = new Uint8Array(384 * 384 * 4)
      renderer.readRenderTargetPixels(target, 0, 0, 384, 384, pixels)
      return pixels
    }
    const comparisons: {
      progress: number
      turn: number
      maxDelta: number
      changedPixels: number
    }[] = []
    for (const turn of [0, 0.35]) {
      rotation.value.set(0, Math.sin(turn / 2), 0, Math.cos(turn / 2))
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        scan.progress.value = progress
        const original = capture(baseline)
        const indexed = capture(animated)
        let maxDelta = 0,
          changedPixels = 0
        for (let pixel = 0; pixel < indexed.length; pixel += 4) {
          let delta = 0
          for (let channel = 0; channel < 4; channel++)
            delta = Math.max(
              delta,
              Math.abs(indexed[pixel + channel] - original[pixel + channel])
            )
          maxDelta = Math.max(maxDelta, delta)
          if (delta > 2) changedPixels++
        }
        comparisons.push({ progress, turn, maxDelta, changedPixels })
      }
    }
    const timerAvailable = !!renderer
      .getContext()
      .getExtension('EXT_disjoint_timer_query_webgl2')
    const lines = renderer.info.render.lines
    for (const geometry of [source, baseline, compact, animated])
      geometry.dispose()
    depth.dispose()
    material.dispose()
    target.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    return { ...metrics, comparisons, lines, timerAvailable }
  })
  await info.attach('scan-indexed-evidence', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  })
  expect(result.indexedVertices).toBeLessThan(result.expandedVertices * 0.6)
  expect(result.indexedBytes).toBeLessThan(result.expandedBytes * 0.6)
  for (const sample of result.comparisons)
    expect(sample.changedPixels, JSON.stringify(sample)).toBe(0)
  expect(result.lines).toBe(0)
})
