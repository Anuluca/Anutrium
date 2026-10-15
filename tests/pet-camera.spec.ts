import { expect, test } from '@playwright/test'

// 隔离 GPU：验证构图缓存的失效条件与投影算法，不用整页动画作为计时基准。
test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' })
  )
  await page.goto('/')
})

test('pet bounds reuse fixed projections and invalidate on camera, model and geometry changes', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { createPetScreenBounds } = await import(
      '/src/views/Home/scene/petFocusCamera.ts'
    )
    const geometry = new THREE.BoxGeometry()
    geometry.morphAttributes.position = [geometry.attributes.position]
    const mesh = new THREE.Mesh(geometry)
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.z = 5
    camera.updateMatrixWorld()
    const measure = createPetScreenBounds()
    const first = measure(mesh, camera)
    let reads = 0
    const attribute = geometry.morphAttributes.position[0]
    const getX = attribute.getX.bind(attribute)
    attribute.getX = (index: number) => {
      reads++
      return getX(index)
    }
    const hit = measure(mesh, camera) === first && reads === 0
    camera.aspect = 2
    camera.updateProjectionMatrix()
    const resized = measure(mesh, camera)
    const cameraInvalidated =
      resized !== first &&
      reads > 0 &&
      Math.abs(resized.maxX * 2 - first.maxX) < 1e-9
    mesh.position.x = 0.2
    const moved = measure(mesh, camera)
    const modelInvalidated = moved !== resized && moved.maxX > resized.maxX
    mesh.geometry = geometry.clone()
    const replaced = measure(mesh, camera)
    return {
      hit,
      cameraInvalidated,
      modelInvalidated,
      geometryInvalidated: replaced !== moved,
    }
  })
  expect(result).toEqual({
    hit: true,
    cameraInvalidated: true,
    modelInvalidated: true,
    geometryInvalidated: true,
  })
})

test('pet focus cache preserves output isolation and responds to viewport and display scale', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { createPetFocusCamera } = await import(
      '/src/views/Home/scene/petFocusCamera.ts'
    )
    const { loadFloraPetModel } = await import('/src/utils/floraPetModel.ts')
    const { pets } = await import('/src/locales/dynamic/pets.ts')
    const [reference, asset] = await Promise.all([
      loadFloraPetModel('sprigatito'),
      loadFloraPetModel('mightyena'),
    ])
    const geometry = new THREE.BufferGeometry()
    const attribute = asset.metadata.attributes.raisedPositions
    geometry.morphAttributes.position = [
      new THREE.BufferAttribute(
        new Float32Array(asset.buffer, attribute.offset, attribute.count),
        3
      ),
    ]
    const camera = new THREE.PerspectiveCamera(38, 1280 / 720, 0.1, 100)
    const context = {
      geometry,
      reference,
      camera,
      pet: { ...pets[1] },
      position: new THREE.Vector3(0, 0.035, 0),
      scale: new THREE.Vector3(2, 2, 2),
      size: new THREE.Vector3()
        .fromArray(asset.metadata.size)
        .multiplyScalar(2),
      mobile: false,
      referenceWidth: 0.2963257431983948,
    }
    const measure = createPetFocusCamera()
    const first = measure(context)
    const expected = first.position.clone()
    first.position.set(100, 100, 100)
    const isolated = measure(context).position.distanceTo(expected) < 1e-9
    const originalDistance = measure(context).position.distanceTo(
      measure(context).target
    )
    context.pet.focusScale = 1.5
    const enlarged = measure(context)
    const scaleInvalidated =
      enlarged.position.distanceTo(enlarged.target) < originalDistance
    context.mobile = true
    camera.aspect = 393 / 851
    const resized = measure(context)
    const viewportInvalidated =
      resized.position.distanceTo(enlarged.position) > 0.1
    return { isolated, scaleInvalidated, viewportInvalidated }
  })
  expect(result).toEqual({
    isolated: true,
    scaleInvalidated: true,
    viewportInvalidated: true,
  })
})
