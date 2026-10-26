import * as THREE from 'three'

import { createBarycentricGeometry } from '../../src/views/Home/scene/barycentricGeometry'
import { createModelScan } from '../../src/views/Home/scene/modelScan'

// 隔离真实合成材质，按像素验证光点被网格线遮罩约束，避免整面扫光也通过动画测试。
export function sampleWireFlow() {
  const renderer = new THREE.WebGLRenderer({ antialias: false })
  const size = 256
  renderer.setSize(size, size)
  const target = new THREE.WebGLRenderTarget(size, size)
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 3
  const source = new THREE.PlaneGeometry(2, 2, 4, 4)
  const geometry = createBarycentricGeometry(source)
  const material = new THREE.MeshBasicMaterial({
    color: 0x440000,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    toneMapped: false,
  })
  const scan = createModelScan(material.color)
  scan.bounds.value.set(-1, 2)
  scan.progress.value = 1
  scan.install(material, 'composite')
  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(geometry, material))
  const pixels = new Uint8Array(size * size * 4)
  let outsideWire = 0
  let glowingPixels = 0
  const masks: Set<number>[] = []
  for (const time of [0, 0.17, 0.41]) {
    scan.flowTime.value = time
    renderer.setRenderTarget(target)
    renderer.render(scene, camera)
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels)
    const mask = new Set<number>()
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // 底色只有红通道；蓝通道唯一来自流动的光点。
        if (pixels[(y * size + x) * 4 + 2] < 45) continue
        glowingPixels++
        mask.add(y * size + x)
        const px = x + 0.5
        const py = y + 0.5
        const modX = px % 64
        const modY = py % 64
        const edgeDistance = Math.min(
          modX,
          64 - modX,
          modY,
          64 - modY,
          Math.abs(modX - modY) / Math.SQRT2
        )
        if (edgeDistance > 1.5) outsideWire++
      }
    }
    masks.push(mask)
  }
  const movedPixels = [...masks[0]].filter(
    (pixel) => !masks[1].has(pixel)
  ).length
  const sharedPixels = [...masks[0]].filter((pixel) =>
    masks[1].has(pixel)
  ).length
  // 越过共同周期后，真实 GPU 输出应与等价的小时间值一致，避免长期动画跳变。
  scan.flowTime.value = 19.99
  scan.advanceFlow(0.02)
  renderer.render(scene, camera)
  renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels)
  const wrapped = pixels.slice()
  scan.flowTime.value = 0.01
  renderer.render(scene, camera)
  renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels)
  let periodicMaxDelta = 0
  for (let index = 0; index < pixels.length; index++)
    periodicMaxDelta = Math.max(
      periodicMaxDelta,
      Math.abs(pixels[index] - wrapped[index])
    )
  scan.flowEnabled.value = 0
  renderer.render(scene, camera)
  renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels)
  let disabledBlueMaximum = 0
  for (let index = 2; index < pixels.length; index += 4)
    disabledBlueMaximum = Math.max(disabledBlueMaximum, pixels[index])
  material.dispose()
  geometry.dispose()
  source.dispose()
  target.dispose()
  renderer.dispose()
  return {
    outsideWire,
    glowingPixels,
    movedPixels,
    sharedPixels,
    periodicMaxDelta,
    disabledBlueMaximum,
  }
}
