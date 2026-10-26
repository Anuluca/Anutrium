import * as THREE from 'three'

import { createBarycentricGeometry } from '../../src/views/Home/scene/barycentricGeometry'
import { createLucarioWireGeometry } from '../../src/views/Home/scene/lucarioWireGeometry'
import { createModelScan } from '../../src/views/Home/scene/modelScan'

export async function inspectLucarioWire() {
  const metadata = await fetch('/models/lucario-island.json').then((r) =>
    r.json()
  )
  const buffer = await fetch('/models/lucario-island.bin').then((r) =>
    r.arrayBuffer()
  )
  const source = new THREE.BufferGeometry()
  const positions = metadata.attributes.positions
  source.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array(buffer, positions.offset, positions.count),
      3
    )
  )
  const indices = metadata.attributes.indices
  source.setIndex(
    new THREE.BufferAttribute(
      new Uint16Array(buffer, indices.offset, indices.count),
      1
    )
  )
  const original = Array.from(source.getAttribute('position').array)
  const optimized = createLucarioWireGeometry(source)
  const baseline = createBarycentricGeometry(source)
  const barycentric = optimized.getAttribute('barycentric')
  const index = optimized.index!
  let hiddenSides = 0
  const removedEdges = new Set<string>()
  for (let face = 0; face < index.count; face += 3)
    for (let component = 0; component < 3; component++)
      if (
        [0, 1, 2].every(
          (corner) =>
            barycentric.getComponent(index.getX(face + corner), component) === 1
        )
      )
        hiddenSides++
  // 从边中点的重心坐标读取真实隐藏边，防止删对数量却删错位置。
  for (let face = 0; face < index.count; face += 3)
    for (let corner = 0; corner < 3; corner++) {
      const first = face + ((corner + 1) % 3)
      const second = face + ((corner + 2) % 3)
      if (
        [0, 1, 2].every(
          (component) =>
            barycentric.getComponent(index.getX(first), component) +
              barycentric.getComponent(index.getX(second), component) >
            0
        )
      )
        removedEdges.add(
          [source.index!.getX(first), source.index!.getX(second)]
            .sort((a, b) => a - b)
            .join(':')
        )
    }
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(600, 600)
  document.body.append(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-0.4, 0.4, 0.4, -0.4, 0.1, 10)
  const depth = new THREE.MeshBasicMaterial({
    colorWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  const material = new THREE.MeshBasicMaterial({
    color: '#e23455',
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    toneMapped: false,
  })
  const scan = createModelScan(material.color)
  scan.progress.value = 1
  scan.flowEnabled.value = 0
  scan.install(material, 'composite')
  const surface = new THREE.Mesh(source, depth)
  const wire = new THREE.Mesh(baseline, material)
  wire.renderOrder = 1
  scene.add(surface, wire)
  const render = (part: 'face' | 'chest', improved: boolean) => {
    const y = part === 'face' ? 2.49 : 2.025
    const size = part === 'face' ? 0.3 : 0.2
    camera.left = -size
    camera.right = size
    camera.top = size
    camera.bottom = -size
    camera.position.set(0, y, 5)
    camera.lookAt(0, y, 0)
    camera.updateProjectionMatrix()
    wire.geometry = improved ? optimized : baseline
    surface.geometry = improved ? optimized : source
    renderer.render(scene, camera)
  }
  return {
    hiddenSides,
    removedEdges: [...removedEdges].sort(),
    sourceUnchanged: original.every(
      (value, index) => value === source.getAttribute('position').array[index]
    ),
    triangles: optimized.index!.count / 3,
    originalTriangles: source.index!.count / 3,
    render,
    dispose() {
      renderer.dispose()
      source.dispose()
      optimized.dispose()
      baseline.dispose()
      depth.dispose()
      material.dispose()
    },
  }
}
