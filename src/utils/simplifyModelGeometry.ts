import { MeshoptSimplifier } from 'meshoptimizer'
import { type BufferGeometry, Vector3 } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// 在已有轮廓上细减：保留分层轮廓支撑点、中线边界和颈部混合权重。
export async function prepareModelSimplifier() {
  await MeshoptSimplifier.ready
}

export function simplifyModelGeometry(
  source: BufferGeometry,
  options: {
    targetRatio?: number
    maxError?: number
    preservePoint?: (point: Vector3) => boolean
  } = {}
) {
  const geometry = mergeVertices(source)
  const positions = geometry.getAttribute('position')
  const indices = Uint32Array.from(geometry.index!.array)
  const weights = geometry.getAttribute('headInfluence')
  const locks = new Uint8Array(positions.count)
  const details = new Uint8Array(positions.count)
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox!
  const height = bounds.max.y - bounds.min.y
  const point = new Vector3()
  const supports = new Map<number, { index: number; value: number }>()
  for (let index = 0; index < positions.count; index += 1) {
    point.fromBufferAttribute(positions, index)
    const slice = Math.min(
      11,
      Math.floor(((point.y - bounds.min.y) / height) * 12)
    )
    for (let direction = 0; direction < 8; direction += 1) {
      const angle = (direction * Math.PI) / 4
      const value = point.x * Math.cos(angle) + point.z * Math.sin(angle)
      const key = slice * 8 + direction
      if (!supports.has(key) || value > supports.get(key)!.value) {
        supports.set(key, { index, value })
      }
    }
    const weight = weights.getX(index)
    details[index] = options.preservePoint?.(point) ? 1 : 0
    if ((weight > 0 && weight < 1) || details[index]) locks[index] = 1
  }
  for (const { index } of supports.values()) locks[index] = 1
  const [reducedIndices, error] = MeshoptSimplifier.simplifyWithAttributes(
    indices,
    positions.array as Float32Array,
    3,
    weights.array as Float32Array,
    1,
    [0.1],
    locks,
    Math.floor((indices.length * (options.targetRatio ?? 0.65)) / 3) * 3,
    options.maxError ?? 0.004,
    ['LockBorder']
  )
  const positionKey = (index: number) =>
    `${positions.getX(index).toFixed(5)},${positions
      .getY(index)
      .toFixed(5)},${positions.getZ(index).toFixed(5)}`
  const retained = new Set(Array.from(reducedIndices, positionKey))
  const protectedIndices = [...supports.values()].map(({ index }) => index)
  const contourPreserved = protectedIndices.every((index) =>
    retained.has(positionKey(index))
  )
  const faceKey = (face: Uint32Array) =>
    Array.from(face, positionKey).sort().join('|')
  const reducedFaces = new Set<string>()
  for (let offset = 0; offset < reducedIndices.length; offset += 3)
    reducedFaces.add(faceKey(reducedIndices.subarray(offset, offset + 3)))
  let detailsPreserved = true
  for (let offset = 0; offset < indices.length; offset += 3) {
    const face = indices.subarray(offset, offset + 3)
    if (
      face.every((index) => details[index]) &&
      !reducedFaces.has(faceKey(face))
    )
      detailsPreserved = false
  }
  const accepted = contourPreserved && detailsPreserved
  // 轮廓点不能丢失；不为达到目标面数而放宽误差。
  geometry.setIndex(Array.from(accepted ? reducedIndices : indices))
  const finalPositions = new Set(Array.from(geometry.index!.array, positionKey))
  return {
    geometry,
    error: accepted ? error : 0,
    detailsPreserved,
    contourPreserved: protectedIndices.every((index) =>
      finalPositions.has(positionKey(index))
    ),
  }
}

export function simplifyNeckGeometry(
  geometry: BufferGeometry,
  isNeck: (point: Vector3) => boolean
) {
  return simplifyRegionGeometry(geometry, isNeck, {
    targetRatio: 0.3,
    maxError: 0.006,
    slices: 1,
    directions: 4,
  })
}

// 焊接材质子网格后只简化左侧颈部，再同步镜像改动；身体和尾巴不重新生成。
export function simplifyWeldedNeckGeometry(
  geometry: BufferGeometry,
  isNeck: (point: Vector3) => boolean,
  centerX: number
) {
  const positions = geometry.getAttribute('position')
  const indices = Array.from(Uint32Array.from(geometry.index!.array))
  const key = (x: number, y: number, z: number) =>
    `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`
  const vertexByPosition = new Map<string, number>()
  for (let index = 0; index < positions.count; index += 1)
    vertexByPosition.set(
      key(positions.getX(index), positions.getY(index), positions.getZ(index)),
      index
    )
  const mirrored = (index: number) =>
    vertexByPosition.get(
      key(
        2 * centerX - positions.getX(index),
        positions.getY(index),
        positions.getZ(index)
      )
    )
  const faceKey = (face: number[]) => [...face].sort((a, b) => a - b).join(',')
  const leftFaces: number[][] = []
  const allFaces: number[][] = []
  for (let offset = 0; offset < indices.length; offset += 3) {
    const face = indices.slice(offset, offset + 3)
    allFaces.push(face)
    if (face.every((index) => positions.getX(index) <= centerX + 1e-6))
      leftFaces.push(face)
  }
  const left = geometry.clone()
  left.setIndex(leftFaces.flat())
  const result = simplifyRegionGeometry(left, isNeck, {
    targetRatio: 0.5,
    targetFaces: 35,
    maxError: 0.012,
    slices: 1,
    directions: 4,
    boundaryRings: 1,
  })
  const oldKeys = new Set(leftFaces.map(faceKey))
  const newFaces: number[][] = []
  const reducedIndices = Array.from(Uint32Array.from(left.index!.array))
  for (let offset = 0; offset < reducedIndices.length; offset += 3)
    newFaces.push(reducedIndices.slice(offset, offset + 3))
  const newKeys = new Set(newFaces.map(faceKey))
  const removed = leftFaces.filter((face) => !newKeys.has(faceKey(face)))
  const added = newFaces.filter((face) => !oldKeys.has(faceKey(face)))
  const mirrorFace = (face: number[]) => face.map(mirrored).reverse()
  const mirrorRemoved = removed.map(mirrorFace)
  const mirrorAdded = added.map(mirrorFace)
  const allKeys = new Set(allFaces.map(faceKey))
  const valid =
    result.contourPreserved &&
    [...mirrorRemoved, ...mirrorAdded].every((face) =>
      face.every((index) => index !== undefined)
    ) &&
    mirrorRemoved.every((face) => allKeys.has(faceKey(face as number[])))
  if (valid) {
    const removedKeys = new Set(
      [...removed, ...(mirrorRemoved as number[][])].map(faceKey)
    )
    geometry.setIndex([
      ...allFaces.filter((face) => !removedKeys.has(faceKey(face))).flat(),
      ...added.flat(),
      ...(mirrorAdded as number[][]).flat(),
    ])
  }
  left.dispose()
  return {
    before: result.before * 2,
    after: (valid ? result.after : result.before) * 2,
    error: valid ? result.error : 0,
    contourPreserved: valid,
  }
}

export function simplifyHeadGeometry(
  geometry: BufferGeometry,
  isHead: (point: Vector3) => boolean
) {
  return simplifyRegionGeometry(geometry, isHead, {
    targetRatio: 0.28,
    maxError: 0.008,
    slices: 8,
  })
}

// 焊接后折叠可能形成两张反向重合的零体积面；只移除不会留下开放边的新折叠片。
function removeCollapsedFlaps(indices: Uint32Array, original: Uint32Array) {
  const key = (face: number[]) => [...face].sort((a, b) => a - b).join(',')
  const originals = new Map<string, number>()
  for (let offset = 0; offset < original.length; offset += 3) {
    const id = key(Array.from(original.subarray(offset, offset + 3)))
    originals.set(id, (originals.get(id) ?? 0) + 1)
  }
  const groups = new Map<string, number[][]>()
  const edges = new Map<string, number>()
  const edgeKey = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`)
  for (let offset = 0; offset < indices.length; offset += 3) {
    const face = Array.from(indices.subarray(offset, offset + 3))
    const id = key(face)
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id)!.push(face)
    for (let edge = 0; edge < 3; edge += 1) {
      const id = edgeKey(face[edge], face[(edge + 1) % 3])
      edges.set(id, (edges.get(id) ?? 0) + 1)
    }
  }
  const removed = new Set<string>()
  for (const [id, faces] of groups) {
    if (faces.length !== 2 || (originals.get(id) ?? 0) > 1) continue
    const [a, b] = faces
    if (a[(a.indexOf(b[0]) + 1) % 3] === b[1]) continue
    if (
      a.every((vertex, index) => {
        const count = edges.get(edgeKey(vertex, a[(index + 1) % 3]))!
        return count === 2 || count >= 4
      })
    )
      removed.add(id)
  }
  const result: number[] = []
  for (let offset = 0; offset < indices.length; offset += 3) {
    const face = Array.from(indices.subarray(offset, offset + 3))
    if (!removed.has(key(face))) result.push(...face)
  }
  return Uint32Array.from(result)
}

// 只折叠指定区域内部的边，锁定接缝和分层轮廓支撑点，其他部位逐面保持不变。
function simplifyRegionGeometry(
  geometry: BufferGeometry,
  isRegion: (point: Vector3) => boolean,
  options: {
    targetRatio: number
    targetFaces?: number
    maxError: number
    slices: number
    directions?: number
    boundaryRings?: number
  }
) {
  const positions = geometry.getAttribute('position')
  const weights = geometry.getAttribute('headInfluence')
  const indices = Uint32Array.from(geometry.index!.array)
  const active = new Set(indices)
  const region = new Uint8Array(positions.count)
  const locks = new Uint8Array(positions.count).fill(1)
  const point = new Vector3()
  let minY = Infinity
  let maxY = -Infinity
  for (const index of active) {
    point.fromBufferAttribute(positions, index)
    if (!isRegion(point)) continue
    region[index] = 1
    locks[index] = 0
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  const editable = region.slice()
  // 接缝相邻的连接圈允许重排；外围仍锁定，避免原接缝过密限制颈部内部减面。
  for (let ring = 0; ring < (options.boundaryRings ?? 0); ring += 1) {
    const previous = editable.slice()
    for (let offset = 0; offset < indices.length; offset += 3) {
      const face = Array.from(indices.subarray(offset, offset + 3))
      if (face.some((index) => previous[index]))
        face.forEach((index) => {
          editable[index] = 1
        })
    }
  }
  for (const index of active) if (editable[index]) locks[index] = 0
  const supports = new Map<number, { index: number; value: number }>()
  const directions = options.directions ?? 8
  for (const index of active) {
    if (!region[index]) continue
    point.fromBufferAttribute(positions, index)
    const slice = Math.min(
      options.slices - 1,
      Math.floor(
        ((point.y - minY) / Math.max(maxY - minY, 1e-6)) * options.slices
      )
    )
    for (let direction = 0; direction < directions; direction += 1) {
      const angle = (direction * Math.PI * 2) / directions
      const value = point.x * Math.cos(angle) + point.z * Math.sin(angle)
      const key = slice * directions + direction
      if (!supports.has(key) || value > supports.get(key)!.value)
        supports.set(key, { index, value })
    }
  }
  for (const { index } of supports.values()) locks[index] = 1
  let before = 0
  const unchangedFaces: string[] = []
  const positionKey = (index: number) =>
    `${positions.getX(index).toFixed(5)},${positions
      .getY(index)
      .toFixed(5)},${positions.getZ(index).toFixed(5)}`
  const faceKey = (face: number[]) => face.map(positionKey).sort().join('|')
  for (let offset = 0; offset < indices.length; offset += 3) {
    const face = Array.from(indices.subarray(offset, offset + 3))
    if (new Set(face.map(positionKey)).size < 3) continue
    if (face.every((index) => region[index])) {
      before += 1
    }
    if (!face.every((index) => editable[index])) {
      // 区域交界处保持原三角形，避免减面后出现裂缝。
      face.forEach((index) => {
        locks[index] = 1
      })
      unchangedFaces.push(faceKey(face))
    }
  }
  const reduce = (targetCount: number) => {
    const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
      indices,
      positions.array as Float32Array,
      3,
      weights.array as Float32Array,
      1,
      [0.025],
      locks,
      targetCount,
      options.maxError,
      ['LockBorder', 'RegularizeLight']
    )
    return [
      options.boundaryRings
        ? removeCollapsedFlaps(simplified, indices)
        : simplified,
      error,
    ] as const
  }
  const countRegionFaces = (faces: Uint32Array) => {
    let count = 0
    for (let offset = 0; offset < faces.length; offset += 3) {
      const face = Array.from(faces.subarray(offset, offset + 3))
      if (
        face.every((index) => region[index]) &&
        new Set(face.map(positionKey)).size === 3
      )
        count += 1
    }
    return count
  }
  let [reduced, error] = reduce(
    Math.max(
      3,
      indices.length - Math.floor(before * (1 - options.targetRatio)) * 3
    )
  )
  if (options.boundaryRings && before) {
    // 连接圈的重排也会消耗面数预算，按颈部实际剩余面数搜索，而不是按整块网格比例估算。
    const target =
      options.targetFaces ?? Math.round(before * options.targetRatio)
    let distance = Math.abs(countRegionFaces(reduced) - target)
    let low = 3
    let high = indices.length
    for (
      let attempt = 0;
      attempt < 10 && low <= high && distance;
      attempt += 1
    ) {
      const middle = Math.floor((low + high) / 6) * 3
      const [candidate, candidateError] = reduce(middle)
      const after = countRegionFaces(candidate)
      if (Math.abs(after - target) < distance) {
        reduced = candidate
        error = candidateError
        distance = Math.abs(after - target)
      }
      if (after > target) high = middle - 3
      else low = middle + 3
    }
  }
  const retained = new Set(Array.from(reduced, positionKey))
  const reducedFaces = new Set<string>()
  let after = 0
  for (let offset = 0; offset < reduced.length; offset += 3) {
    const face = Array.from(reduced.subarray(offset, offset + 3))
    reducedFaces.add(faceKey(face))
    if (
      face.every((index) => region[index]) &&
      new Set(face.map(positionKey)).size === 3
    )
      after += 1
  }
  const contourPreserved = [...supports.values()].every(({ index }) =>
    retained.has(positionKey(index))
  )
  const surroundingsPreserved = unchangedFaces.every((face) =>
    reducedFaces.has(face)
  )
  const accepted = contourPreserved && surroundingsPreserved
  geometry.setIndex(Array.from(accepted ? reduced : indices))
  return {
    before,
    after: accepted ? after : before,
    error: accepted ? error : 0,
    contourPreserved: accepted,
  }
}
