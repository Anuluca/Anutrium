import * as THREE from 'three'

const cornerOrders = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
]

/** 只复制扫描表面；原索引几何继续供实体、倒影、拾取和深度预通道共享。 */
export function createBarycentricGeometry(source: THREE.BufferGeometry) {
  const result = source.index ? source.toNonIndexed() : source.clone()
  // Basic 合成表面无需法线，避免为非索引副本重复上传无用的法线和形变法线。
  result.deleteAttribute('normal')
  delete result.morphAttributes.normal
  const count = result.getAttribute('position').count
  const representatives: number[] = []
  const corners: number[] = []
  const indices: number[] = []
  const variants = new Map<number, number>()
  for (let triangle = 0; triangle < count; triangle += 3) {
    let order = cornerOrders[0]
    let bestReuse = -1
    // 三个基向量可任意置换，min(barycentric / fwidth) 不变；优先沿用邻面已有顶点。
    for (const candidate of cornerOrders) {
      let reuse = 0
      for (let corner = 0; corner < 3; corner++) {
        const vertex =
          source.index?.getX(triangle + corner) ?? triangle + corner
        if (variants.has(vertex * 3 + candidate[corner])) reuse++
      }
      if (reuse > bestReuse) {
        bestReuse = reuse
        order = candidate
      }
    }
    for (let corner = 0; corner < 3; corner++) {
      const vertex = source.index?.getX(triangle + corner) ?? triangle + corner
      const key = vertex * 3 + order[corner]
      let index = variants.get(key)
      if (index === undefined) {
        index = representatives.length
        variants.set(key, index)
        representatives.push(triangle + corner)
        corners.push(order[corner])
      }
      indices.push(index)
    }
  }
  const compact = (attribute: THREE.BufferAttribute) => {
    const ArrayType = attribute.array.constructor as typeof Float32Array
    const values = new ArrayType(representatives.length * attribute.itemSize)
    representatives.forEach((sourceVertex, vertex) => {
      const start = sourceVertex * attribute.itemSize
      values.set(
        attribute.array.subarray(start, start + attribute.itemSize),
        vertex * attribute.itemSize
      )
    })
    const copy = new THREE.BufferAttribute(
      values,
      attribute.itemSize,
      attribute.normalized
    )
    copy.name = attribute.name
    copy.gpuType = attribute.gpuType
    return copy.setUsage(attribute.usage)
  }
  for (const [name, attribute] of Object.entries(result.attributes))
    result.setAttribute(name, compact(attribute as THREE.BufferAttribute))
  // 形变目标必须使用同一重映射，避免头痛/转头时扫描表面与实体分离。
  for (const [name, targets] of Object.entries(
    result.morphAttributes as Record<string, THREE.BufferAttribute[]>
  ))
    result.morphAttributes[name] = targets.map(compact)
  const coordinates = new Uint8Array(representatives.length * 3)
  corners.forEach((corner, vertex) => {
    coordinates[vertex * 3 + corner] = 255
  })
  result.setAttribute(
    'barycentric',
    new THREE.BufferAttribute(coordinates, 3, true)
  )
  result.setIndex(indices)
  return result
}
