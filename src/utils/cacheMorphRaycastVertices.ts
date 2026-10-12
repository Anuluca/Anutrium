import type { Mesh } from 'three'

// Three 的逐三角面拾取会反复计算共享顶点的变形；姿态未变时复用 CPU 顶点，GPU 缓冲保持静态。
export function cacheMorphRaycastVertices(mesh: Mesh) {
  // 包围盒包含两个姿态；射线先排除球体包围范围内、实际模型范围外的空白区域。
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
  const count = mesh.geometry.getAttribute('position').count
  const positions = new Float64Array(count * 3)
  const valid = new Uint8Array(count)
  let influences: number[] = []
  const raycast = mesh.raycast
  const getVertexPosition = mesh.getVertexPosition
  mesh.raycast = function (raycaster, intersections) {
    const current = this.morphTargetInfluences || []
    if (
      current.length !== influences.length ||
      current.some((value, index) => value !== influences[index])
    ) {
      influences = current.slice()
      valid.fill(0)
    }
    raycast.call(this, raycaster, intersections)
  }
  mesh.getVertexPosition = function (index, target) {
    if (!valid[index]) {
      getVertexPosition.call(this, index, target)
      target.toArray(positions, index * 3)
      valid[index] = 1
      return target
    }
    return target.fromArray(positions, index * 3)
  }
}
