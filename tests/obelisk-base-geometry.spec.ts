import { expect, test } from '@playwright/test'
import * as THREE from 'three'

import {
  createObeliskBaseGeometry,
  createObeliskBodyGeometry,
} from '../src/views/Home/scene/geometry'

test('obelisk base has no buried contact faces in the solid or reflection', () => {
  const geometry = createObeliskBaseGeometry()
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  // 双面射线同时检查朝向相反的接触面，镜像后也不得出现层间平面。
  for (const scale of [1, -1]) {
    mesh.scale.y = scale
    mesh.updateMatrixWorld(true)
    for (const x of [-0.8, 0.17, 0.8]) {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(x, scale, 0.23),
        new THREE.Vector3(0, -scale, 0)
      )
      const heights = ray
        .intersectObject(mesh)
        .map((hit) => hit.point.y * scale)
      expect(heights).toHaveLength(2)
      expect(heights[0]).toBeCloseTo(0.34, 6)
      expect(heights[1]).toBeCloseTo(0, 6)
    }
    // 四边外露台阶仍有顶面和底面，不能以删掉整层顶面修复内部叠色。
    for (const [x, z] of [
      [1.02, 0.17],
      [-1.02, 0.17],
      [0.17, 1.02],
      [0.17, -1.02],
    ]) {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(x, scale, z),
        new THREE.Vector3(0, -scale, 0)
      )
      const heights = ray
        .intersectObject(mesh)
        .map((hit) => hit.point.y * scale)
      expect(heights).toHaveLength(2)
      expect(heights[0]).toBeCloseTo(0.13, 6)
      expect(heights[1]).toBeCloseTo(0, 6)
    }
  }
  geometry.dispose()
  material.dispose()
})

test('body meets the base without a duplicate bottom cap in either orientation', () => {
  const bodyGeometry = createObeliskBodyGeometry()
  const baseGeometry = createObeliskBaseGeometry()
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const body = new THREE.Mesh(bodyGeometry, material)
  body.position.y = 0.34 + 2.275
  const base = new THREE.Mesh(baseGeometry, material)
  const group = new THREE.Group()
  group.add(body, base)
  for (const scale of [1, -1]) {
    group.scale.y = scale
    group.updateMatrixWorld(true)
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0.17, scale * 6, 0.23),
      new THREE.Vector3(0, -scale, 0)
    )
    const heights = ray.intersectObject(group).map((hit) => hit.point.y * scale)
    expect(heights).toHaveLength(3)
    expect(heights[0]).toBeCloseTo(4.89, 6)
    expect(heights[1]).toBeCloseTo(0.34, 6)
    expect(heights[2]).toBeCloseTo(0, 6)
    // 碑身收起后，底座仍有完整顶面，不会留下开口。
    body.visible = false
    const baseHits = ray.intersectObject(base)
    expect(baseHits[0].point.y * scale).toBeCloseTo(0.34, 6)
    body.visible = true
  }
  bodyGeometry.dispose()
  baseGeometry.dispose()
  material.dispose()
})
