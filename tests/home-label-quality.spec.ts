import { expect, test } from './helpers/sceneDiagnostics'

test('combined projection preserves camera/object transforms and reuses point buffers', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html>' })
  )
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { createScreenProjection } = await import(
      '/src/views/Home/scene/screenProjection.ts'
    )
    const projector = createScreenProjection()
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 300)
    const object = new THREE.Object3D()
    const source = new THREE.Vector3(),
      expected = new THREE.Vector3(),
      actual = new THREE.Vector3()
    let error = 0,
      stable = true
    for (let sample = 0; sample < 120; sample++) {
      camera.aspect = sample % 2 ? 9 / 16 : 16 / 9
      camera.position.set(Math.sin(sample * 0.2) * 5, 2 + sample * 0.01, 8)
      camera.lookAt(0, 1, 0)
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()
      object.position.set(Math.sin(sample * 0.1), 1, -2)
      object.rotation.set(0.1, sample * 0.02, -0.1)
      object.scale.set(1.2, 0.8, 1.1)
      object.updateMatrixWorld()
      projector.camera(camera)
      projector.object(object.matrixWorld)
      for (let index = 0; index < 9; index++) {
        source.set(index * 0.2 - 0.8, index * 0.3, -index * 0.1)
        expected.copy(source).applyMatrix4(object.matrixWorld).project(camera)
        stable &&= projector.point(actual.copy(source)) === actual
        error = Math.max(error, expected.distanceTo(actual))
      }
    }
    // 每点原来经过 world/view/projection 三次向量变换，现在一次。
    return { error, stable, samples: 120 * 9 }
  })
  expect(result.error).toBeLessThan(1e-10)
  expect(result.stable).toBe(true)
})

test('label loaders cache each tier separately and retain layout bounds and glyph identities', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html>' })
  )
  await page.goto('/')
  // only-if-cached 的未命中探测也触发 request；只统计成功取得资源的响应。
  const requests: string[] = []
  page.on('response', (response) => {
    if (response.ok() && response.url().includes('/models/temple-label'))
      requests.push(response.url())
  })
  const stats = await page.evaluate(async () => {
    const { loadTempleLabelModel } = await import(
      '/src/utils/templeLabelModel.ts'
    )
    const [high, low] = await Promise.all([
      loadTempleLabelModel('high'),
      loadTempleLabelModel('low'),
    ])
    const describe = (asset: typeof high) => {
      const attrs = asset.metadata.attributes
      const positions = new Float32Array(
        asset.buffer,
        attrs.position.offset,
        attrs.position.count
      )
      const ids = new Float32Array(
        asset.buffer,
        attrs.statueLabelCharacter.offset,
        attrs.statueLabelCharacter.count
      )
      const indices = new Uint16Array(
        asset.buffer,
        attrs.indices.offset,
        attrs.indices.count
      )
      const min = [Infinity, Infinity, Infinity],
        max = [-Infinity, -Infinity, -Infinity]
      for (let i = 0; i < positions.length; i++) {
        const axis = i % 3
        min[axis] = Math.min(min[axis], positions[i])
        max[axis] = Math.max(max[axis], positions[i])
      }
      return {
        faces: indices.length / 3,
        vertices: positions.length / 3,
        bytes: asset.buffer.byteLength,
        size: max.map((v, i) => v - min[i]),
        ids: [...new Set(ids)].sort(),
        validIndices: [...indices].every(
          (index) => index < positions.length / 3
        ),
        finite: [...positions].every(Number.isFinite),
      }
    }
    return {
      high: describe(high),
      low: describe(low),
      cached:
        (await loadTempleLabelModel('low')) === low &&
        (await loadTempleLabelModel('high')) === high,
    }
  })
  expect(stats.cached).toBe(true)
  expect(requests).toHaveLength(4)
  expect(stats.high.faces).toBe(1984)
  expect(stats.low.faces).toBeLessThan(stats.high.faces * 0.25)
  expect(stats.low.bytes).toBeLessThan(stats.high.bytes * 0.2)
  for (const tier of [stats.high, stats.low]) {
    expect(tier.ids).toEqual([0, 1, 2, 3, 4, 5])
    expect(tier.validIndices).toBe(true)
    expect(tier.finite).toBe(true)
  }
  for (let axis = 0; axis < 3; axis++)
    expect(Math.abs(stats.high.size[axis] - stats.low.size[axis])).toBeLessThan(
      1e-6
    )
})

for (const quality of ['high', 'low'] as const) {
  test(`scene uses only ${quality} label tier and preserves reveal and focus`, async ({
    page,
  }, info) => {
    test.setTimeout(90000)
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.route('**/src/config/templeLabelQuality.ts*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `export const templeLabelQuality = "${quality}"`,
      })
    )
    const labels: string[] = []
    page.on('response', (response) => {
      if (response.ok() && response.url().includes('/models/temple-label'))
        labels.push(new URL(response.url()).pathname)
    })
    await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 45000,
    })
    await expect(stage).toHaveAttribute('data-label-quality', quality)
    await expect(stage).toHaveAttribute(
      'data-label-faces',
      quality === 'high' ? '1984' : '392'
    )
    await expect(stage).toHaveAttribute('data-statue-label-visible', 'true')
    await expect(page.locator('.island-focus')).toBeVisible()
    await expect(
      page.locator('.island-links > g[visibility="visible"]')
    ).toHaveCount(5)
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 30000,
    })
    const alert = page.locator('.mobile-experience-alert .el-alert__close-btn')
    if (await alert.isVisible()) await alert.click()
    const prefix = quality === 'high' ? 'temple-label' : 'temple-label-low'
    expect(labels.sort()).toEqual(
      [`/models/${prefix}.bin.gz`, `/models/${prefix}.json`].sort()
    )
    await page.screenshot({
      path: `.tmp/label-${quality}-${info.project.name}.png`,
    })
    await page.evaluate(() => {
      ;(
        document.querySelector('#app') as any
      ).__vue_app__.config.globalProperties.$pinia._s
        .get('temple-navigation')
        .request(null)
    })
    await expect(page.locator('.island-focus')).toHaveCount(0)
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 15000 }
    )
    await expect(page.locator('.particles-bg')).toHaveAttribute(
      'data-max-fps',
      '40'
    )
  })
}
