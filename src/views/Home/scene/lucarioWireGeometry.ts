import * as THREE from 'three'

import { createBarycentricGeometry } from './barycentricGeometry'

/** 仅修饰线框副本：实体、拾取及深度预通道继续使用原始网格。 */
export function createLucarioWireGeometry(source: THREE.BufferGeometry) {
  const surface = source.clone()
  const positions = surface.getAttribute('position')
  const indices = surface.index!
  const coneFaces = new Set<number>()
  const roots = new Set<number>()
  const isTip = (index: number) =>
    Math.abs(positions.getX(index)) < 0.001 &&
    positions.getY(index) > 1.93 &&
    positions.getY(index) < 2.11 &&
    positions.getZ(index) > 0.3
  for (let face = 0; face < indices.count; face += 3) {
    const vertices = [
      indices.getX(face),
      indices.getX(face + 1),
      indices.getX(face + 2),
    ]
    if (!vertices.some(isTip)) continue
    coneFaces.add(face)
    for (const vertex of vertices) if (!isTip(vertex)) roots.add(vertex)
  }
  const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1))
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3()
  const hit = new THREE.Vector3()
  for (const vertex of roots) {
    const z = positions.getZ(vertex)
    ray.origin.set(positions.getX(vertex), positions.getY(vertex), 1)
    let front = z
    for (let face = 0; face < indices.count; face += 3) {
      if (coneFaces.has(face)) continue
      a.fromBufferAttribute(positions, indices.getX(face))
      b.fromBufferAttribute(positions, indices.getX(face + 1))
      c.fromBufferAttribute(positions, indices.getX(face + 2))
      if (ray.intersectTriangle(a, b, c, false, hit))
        front = Math.max(front, hit.z)
    }
    // 将埋入胸口的连接环贴到真实胸口表面，避免根部边线被预通道遮掉。
    const offset = front + 0.0015 - z
    positions.setZ(vertex, z + offset)
    if (!surface.morphTargetsRelative)
      for (const target of surface.morphAttributes.position ?? [])
        target.setZ(vertex, target.getZ(vertex) + offset)
  }
  const result = createBarycentricGeometry(surface, (a, b) => {
    const hub =
      Math.abs(Math.abs(a.x) - 0.06898) < 0.001 &&
      Math.abs(a.z - 0.3513) < 0.001
        ? a
        : Math.abs(Math.abs(b.x) - 0.06898) < 0.001 &&
          Math.abs(b.z - 0.3513) < 0.001
        ? b
        : null
    if (!hub) return true
    const other = hub === a ? b : a
    // 只去掉两侧汇聚点朝鼻梁中轴连接的内侧斜线，保留外侧额头斜线。
    return !(
      Math.abs(other.x) < 0.001 &&
      other.y > hub.y &&
      other.y - hub.y < 0.08 &&
      (Math.abs(other.z - 0.3588) < 0.001 || Math.abs(other.z - 0.3513) < 0.001)
    )
  })
  surface.dispose()
  return result
}
