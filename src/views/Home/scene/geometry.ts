import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function createObeliskBodyGeometry() {
  // 所有方尖碑共用几何体；顶部独立使用完整的四面锥体。
  // 每面一组菱形切面，中心微凹、边界保持原轮廓；独立三角面法线产生真实的切割反光。
  const facetPositions: number[] = []
  const facetColors: number[] = []
  const addFacet = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    shade = 1
  ) => {
    for (const point of [a, b, c]) {
      facetPositions.push(point.x, point.y, point.z)
      facetColors.push(shade, shade, shade)
    }
  }
  const halfWidth = (y: number) => 0.65 * (1 - ((y + 2.275) / 4.55) * 0.28)
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2
    const point = (x: number, y: number, inset = 0) =>
      new THREE.Vector3(x, y, halfWidth(y) - inset).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        angle
      )
    const bottom = -2.275
    const top = 2.275
    const middle = (bottom + top) / 2
    const bottomLeft = point(-halfWidth(bottom), bottom)
    const bottomRight = point(halfWidth(bottom), bottom)
    const topLeft = point(-halfWidth(top), top)
    const topRight = point(halfWidth(top), top)
    const lower = point(0, bottom)
    const upper = point(0, top)
    const left = point(-halfWidth(middle), middle)
    const right = point(halfWidth(middle), middle)
    const center = point(0, middle, 0.1)
    addFacet(lower, right, center, 0.35)
    addFacet(right, upper, center, 1.35)
    addFacet(upper, left, center, 0.65)
    addFacet(left, lower, center, 1.08)
    addFacet(bottomLeft, lower, left, 0.96)
    addFacet(lower, bottomRight, right, 0.96)
    addFacet(left, upper, topLeft, 0.96)
    addFacet(right, topRight, upper, 0.96)
    // 碑身底部由底座顶面承接；额外封口会与底座共面，并在倒影中露出朝上的内面。
    // 保留底座完整顶面，以便碑身收起时仍能封住底座。
    const topCenter = new THREE.Vector3(0, top, 0)
    addFacet(topCenter, topLeft, topRight)
  }
  const bodyGeometry = new THREE.BufferGeometry()
  bodyGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(facetPositions, 3)
  )
  bodyGeometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(facetColors, 3)
  )
  bodyGeometry.computeVertexNormals()
  return bodyGeometry
}

export function createObeliskBaseGeometry() {
  const footWidth = 1.8
  const stepWidth = 2.35
  const stepHeight = 0.13
  const footHeight = 0.21
  const footGeometry = new THREE.BoxGeometry(footWidth, footHeight, footWidth)
  const stepGeometry = new THREE.BoxGeometry(stepWidth, stepHeight, stepWidth)
  // 透明倒影不会写入深度，接触面即使藏在实体内部也会叠色；仅保留连续外壳。
  const removeFace = (box: THREE.BoxGeometry, face: number) => {
    const indices = Array.from(box.index!.array)
    const group = box.groups[face]
    indices.splice(group.start, group.count)
    box.setIndex(indices)
    box.clearGroups()
    return box
  }
  removeFace(stepGeometry, 2).translate(0, stepHeight / 2, 0)
  removeFace(footGeometry, 3).translate(0, stepHeight + footHeight / 2, 0)
  // 下层顶面只保留上层轮廓以外的四条台阶，不生成被上层覆盖的中心区域。
  const rim = (stepWidth - footWidth) / 2
  const offset = (stepWidth + footWidth) / 4
  const ledge = (width: number, depth: number, x: number, z: number) =>
    new THREE.PlaneGeometry(width, depth)
      .rotateX(-Math.PI / 2)
      .translate(x, stepHeight, z)
  const baseParts = [
    stepGeometry,
    footGeometry,
    ledge(stepWidth, rim, 0, -offset),
    ledge(stepWidth, rim, 0, offset),
    ledge(rim, footWidth, -offset, 0),
    ledge(rim, footWidth, offset, 0),
  ]
  const baseGeometry = mergeGeometries(baseParts)!
  baseParts.forEach((value) => value.dispose())
  return baseGeometry
}
