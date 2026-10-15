import { MeshoptSimplifier } from 'meshoptimizer'

const components = (name) =>
  name === 'weights' || name === 'nodWeights' ? 1 : 3
const positionNames = [
  'positions',
  'raisedPositions',
  'yawPositions',
  'pitchPositions',
]

// 离线几何面块化：焊接接缝、受限平滑、保留轮廓支撑点并简化；不增加运行时计算。
export async function facetModelGeometry(
  attributes,
  sourceIndices,
  options = {}
) {
  await MeshoptSimplifier.ready
  const count = attributes.positions.length / 3
  const deformationNames = positionNames.filter((name) => attributes[name])
  const weightNames = ['weights', 'nodWeights'].filter(
    (name) => attributes[name]
  )
  const canonical = new Map()
  const sourceVertices = []
  const remap = new Uint32Array(count)
  // 只有全部姿态和骨骼权重一致才焊接，避免把运动方式不同的接缝合并。
  for (let i = 0; i < count; i++) {
    const values = []
    for (const name of deformationNames)
      for (let axis = 0; axis < 3; axis++)
        values.push(attributes[name][i * 3 + axis])
    for (const name of weightNames) values.push(attributes[name][i])
    // 原镜像/材质接缝有浮点尾差，以原构建器的 1e-5 精度焊接，避免微缝被平滑放大。
    const key = values.map((value) => Math.round(value * 1e5)).join(':')
    if (!canonical.has(key)) {
      canonical.set(key, sourceVertices.length)
      sourceVertices.push(i)
    }
    remap[i] = canonical.get(key)
  }
  const arrays = Object.fromEntries(
    Object.entries(attributes)
      .filter(([name]) => name !== 'uvs')
      .map(([name, source]) => {
        const size = components(name)
        const output = new Float32Array(sourceVertices.length * size)
        sourceVertices.forEach((vertex, i) => {
          for (let axis = 0; axis < size; axis++)
            output[i * size + axis] = source[vertex * size + axis]
        })
        return [name, output]
      })
  )
  const indices = Uint32Array.from(sourceIndices, (vertex) => remap[vertex])
  const neighbors = Array.from(
    { length: sourceVertices.length },
    () => new Set()
  )
  const edges = new Map()
  const basePositions = arrays.positions
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3,
      b = indices[i + 1] * 3,
      c = indices[i + 2] * 3
    const u = [0, 1, 2].map(
      (axis) => basePositions[b + axis] - basePositions[a + axis]
    )
    const v = [0, 1, 2].map(
      (axis) => basePositions[c + axis] - basePositions[a + axis]
    )
    const normal = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ]
    const length = Math.hypot(...normal) || 1
    for (let axis = 0; axis < 3; axis++) normal[axis] /= length
    for (let edge = 0; edge < 3; edge++) {
      const a = indices[i + edge],
        b = indices[i + ((edge + 1) % 3)]
      if (a === b) continue
      neighbors[a].add(b)
      neighbors[b].add(a)
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      const record = edges.get(key) ?? { a, b, count: 0, normal, thin: false }
      // 保护反向折叠的薄壳边，避免减面把极薄的封闭区域压成反向重合面。
      if (
        record.count &&
        normal.reduce(
          (sum, value, axis) => sum + value * record.normal[axis],
          0
        ) < -0.8
      )
        record.thin = true
      record.count++
      edges.set(key, record)
    }
  }
  const positions = arrays.positions
  const scale = MeshoptSimplifier.getScale(positions, 3) || 1
  const locks = new Uint8Array(sourceVertices.length)
  const symmetryPlane = options.symmetryPlaneX
  for (const edge of edges.values())
    if (edge.count !== 2 || edge.thin) {
      locks[edge.a] = 1
      locks[edge.b] = 1
    }
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i++) {
    min[i % 3] = Math.min(min[i % 3], positions[i])
    max[i % 3] = Math.max(max[i % 3], positions[i])
  }
  const supports = new Map()
  for (let i = 0; i < sourceVertices.length; i++) {
    if (
      Number.isFinite(symmetryPlane) &&
      Math.abs(positions[i * 3] - symmetryPlane) < 0.0002
    )
      locks[i] = 1
    const slice = Math.min(
      9,
      Math.floor(
        ((positions[i * 3 + 1] - min[1]) / (max[1] - min[1] || 1)) * 10
      )
    )
    for (let direction = 0; direction < 8; direction++) {
      const angle = (direction * Math.PI) / 4
      const value =
        positions[i * 3] * Math.cos(angle) +
        positions[i * 3 + 2] * Math.sin(angle)
      const key = slice * 8 + direction
      if (!supports.has(key) || value > supports.get(key).value)
        supports.set(key, { i, value })
    }
    for (let axis = 0; axis < 3; axis++)
      if (
        positions[i * 3 + axis] === min[axis] ||
        positions[i * 3 + axis] === max[axis]
      )
        locks[i] = 1
    for (const name of weightNames)
      if (arrays[name][i] > 0 && arrays[name][i] < 1) locks[i] = 1
  }
  for (const { i } of supports.values()) locks[i] = 1
  // 单次轻量平滑限制位移，固定边界、四肢接地点、耳尖和各高度层的轮廓支撑点。
  let smoothedVertices = 0
  for (const name of deformationNames) {
    const source = arrays[name],
      smoothed = source.slice()
    for (let i = 0; i < sourceVertices.length; i++) {
      if (locks[i] || !neighbors[i].size) continue
      const delta = [0, 0, 0]
      for (const next of neighbors[i])
        for (let axis = 0; axis < 3; axis++)
          delta[axis] += source[next * 3 + axis]
      for (let axis = 0; axis < 3; axis++)
        delta[axis] =
          (delta[axis] / neighbors[i].size - source[i * 3 + axis]) * 0.18
      const factor = Math.min(1, (scale * 0.004) / (Math.hypot(...delta) || 1))
      for (let axis = 0; axis < 3; axis++)
        smoothed[i * 3 + axis] += delta[axis] * factor
      if (name === 'positions') smoothedVertices++
    }
    arrays[name] = smoothed
  }
  const channels = (deformationNames.length - 1) * 3 + weightNames.length
  const constraint = new Float32Array(sourceVertices.length * channels)
  for (let i = 0; i < sourceVertices.length; i++) {
    let channel = 0
    for (const name of deformationNames.slice(1))
      for (let axis = 0; axis < 3; axis++)
        constraint[i * channels + channel++] =
          (arrays[name][i * 3 + axis] - arrays.positions[i * 3 + axis]) / scale
    for (const name of weightNames)
      constraint[i * channels + channel++] = arrays[name][i]
  }
  const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
    indices,
    arrays.positions,
    3,
    constraint,
    channels,
    new Array(channels).fill(0.8),
    locks,
    Math.floor((indices.length * (options.targetRatio ?? 0.55)) / 3) * 3,
    options.maxError ?? 0.014,
    ['LockBorder']
  )
  // 薄壳简化后可能留下反向重合面；双面材质只需一份，避免深度竞争与亮斑。
  const faces = new Set()
  const retained = []
  for (let i = 0; i < simplified.length; i += 3) {
    const face = [simplified[i], simplified[i + 1], simplified[i + 2]]
    if (new Set(face).size < 3) continue
    const key = [...face].sort((a, b) => a - b).join(':')
    if (faces.has(key)) continue
    faces.add(key)
    retained.push(...face)
  }
  const reduced = Uint32Array.from(retained)
  // 法线重新与新拓扑对齐；运行时面法线从变形后的三角面求导，保持头部动作一致。
  for (const name of deformationNames) {
    const positions = arrays[name],
      normals = new Float32Array(positions.length)
    for (let i = 0; i < reduced.length; i += 3) {
      const a = reduced[i] * 3,
        b = reduced[i + 1] * 3,
        c = reduced[i + 2] * 3
      const ux = positions[b] - positions[a],
        uy = positions[b + 1] - positions[a + 1],
        uz = positions[b + 2] - positions[a + 2]
      const vx = positions[c] - positions[a],
        vy = positions[c + 1] - positions[a + 1],
        vz = positions[c + 2] - positions[a + 2]
      const nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx
      for (const vertex of [a, b, c]) {
        normals[vertex] += nx
        normals[vertex + 1] += ny
        normals[vertex + 2] += nz
      }
    }
    for (let i = 0; i < normals.length; i += 3) {
      if (
        Number.isFinite(symmetryPlane) &&
        Math.abs(positions[i] - symmetryPlane) < 0.0002 &&
        arrays.weights?.[i / 3] > 0.9
      )
        normals[i] = 0
      const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1
      normals[i] /= length
      normals[i + 1] /= length
      normals[i + 2] /= length
    }
    arrays[
      name === 'positions' ? 'normals' : name.replace('Positions', 'Normals')
    ] = normals
  }
  const vertices = [...new Set(reduced)]
  const lookup = new Map(vertices.map((vertex, i) => [vertex, i]))
  const packed = Object.fromEntries(
    Object.entries(arrays).map(([name, source]) => {
      const size = components(name),
        output = new Float32Array(vertices.length * size)
      vertices.forEach((vertex, i) => {
        for (let axis = 0; axis < size; axis++)
          output[i * size + axis] = source[vertex * size + axis]
      })
      return [name, output]
    })
  )
  return {
    attributes: packed,
    indices: Uint32Array.from(reduced, (vertex) => lookup.get(vertex)),
    stats: {
      style: 'faceted',
      inputFaces: sourceIndices.length / 3,
      faces: reduced.length / 3,
      smoothedVertices,
      simplificationError: error,
    },
  }
}
