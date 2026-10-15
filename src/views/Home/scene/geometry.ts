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
    for (const y of [-2.275, 2.275]) {
      const center = new THREE.Vector3(0, y, 0)
      const left = point(-halfWidth(y), y)
      const right = point(halfWidth(y), y)
      if (y > 0) addFacet(center, left, right)
      else addFacet(center, right, left)
    }
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
  const footGeometry = new THREE.BoxGeometry(1.8, 0.21, 1.8)
  const stepGeometry = new THREE.BoxGeometry(2.35, 0.13, 2.35)
  // 同材质的两级台阶烘焙进一个共享几何体，实体、网格及倒影均减少绘制调用。
  const baseParts = [stepGeometry, footGeometry]
  baseParts[0].translate(0, 0.065, 0)
  baseParts[1].translate(0, 0.235, 0)
  const baseGeometry = mergeGeometries(baseParts)!
  baseParts.forEach((value) => value.dispose())
  return baseGeometry
}
