import * as THREE from 'three'

// 只处理眼窝。按外皮的有向边封口，补面与原外皮共用顶点，避免独立补面产生硬边。
export function smoothMightyenaEyes(
  geometry: THREE.BufferGeometry,
  eyeVertices: Uint8Array,
  sourceKeys: string[]
) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const index = geometry.index!.array
  const canonical = new Map<string, number>()
  const ids = sourceKeys.map((key, i) => {
    if (!canonical.has(key)) canonical.set(key, i)
    return canonical.get(key)!
  })
  const edges = new Map<
    string,
    { a: number; b: number; kept: number; cut: number }
  >()
  const retained: number[] = []
  const groups = geometry.groups.slice()
  geometry.clearGroups()
  let removedFaces = 0
  for (const group of groups) {
    const start = retained.length
    for (
      let offset = group.start;
      offset < group.start + group.count;
      offset += 3
    ) {
      const face = [index[offset], index[offset + 1], index[offset + 2]]
      const cut = face.some((vertex) => eyeVertices[vertex] === 1)
      if (cut) removedFaces++
      else retained.push(...face)
      for (let side = 0; side < 3; side++) {
        const a = face[side],
          b = face[(side + 1) % 3]
        if (ids[a] === ids[b]) continue
        const key = [ids[a], ids[b]].sort((a, b) => a - b).join(':')
        const edge = edges.get(key) ?? { a, b, kept: 0, cut: 0 }
        if (cut) edge.cut++
        else Object.assign(edge, { a, b, kept: edge.kept + 1 })
        edges.set(key, edge)
      }
    }
    geometry.addGroup(start, retained.length - start, group.materialIndex)
  }
  const boundary = [...edges.values()].filter(
    (edge) => edge.kept === 1 && edge.cut > 0
  )
  const remaining = new Set(boundary)
  const nextByEnd = new Map<number, (typeof boundary)[number]>()
  for (const edge of boundary) {
    const end = ids[edge.b]
    if (nextByEnd.has(end)) throw new Error('Eye socket boundary is branched')
    nextByEnd.set(end, edge)
  }
  const seam = new Set<number>()
  const capStart = retained.length
  while (remaining.size) {
    const first = remaining.values().next().value!
    remaining.delete(first)
    // 封口绕序与外皮边相反，避免靠头部中心猜测补面正反方向。
    const loop = [first.b, first.a]
    while (ids[loop[loop.length - 1]] !== ids[loop[0]]) {
      const end = ids[loop[loop.length - 1]]
      const next = nextByEnd.get(end)
      if (!next || !remaining.has(next))
        throw new Error('Eye socket boundary is open or branched')
      remaining.delete(next)
      loop.push(next.a)
    }
    loop.pop()
    loop.forEach((vertex) => seam.add(ids[vertex]))
    const raw = loop.map(
      (vertex) =>
        new THREE.Vector3(
          ...(sourceKeys[vertex]
            .split(':')
            .map(Number)
            .map((value) => value / 1e5) as [number, number, number])
        )
    )
    const center = raw
      .reduce((sum, point) => sum.add(point), new THREE.Vector3())
      .divideScalar(raw.length)
    const planeNormal = new THREE.Vector3()
    raw.forEach((point, i) =>
      planeNormal.add(
        new THREE.Vector3().crossVectors(
          point.clone().sub(center),
          raw[(i + 1) % raw.length].clone().sub(center)
        )
      )
    )
    planeNormal.normalize()
    const u = raw[0].clone().sub(center).normalize()
    const v = new THREE.Vector3().crossVectors(planeNormal, u).normalize()
    const points = raw.map((point) => {
      const delta = point.clone().sub(center)
      return new THREE.Vector2(delta.dot(u), delta.dot(v))
    })
    const faces = THREE.ShapeUtils.triangulateShape(points, [])
    if (faces.length !== loop.length - 2)
      throw new Error('Eye socket patch triangulation incomplete')
    for (const face of faces) {
      const [a, b, c] = face.map((i) => raw[i])
      const winding = new THREE.Vector3()
        .crossVectors(b.clone().sub(a), c.clone().sub(a))
        .dot(planeNormal)
      retained.push(
        ...(winding > 0 ? face : [face[0], face[2], face[1]]).map(
          (i) => loop[i]
        )
      )
    }
  }
  if (retained.length > capStart)
    geometry.addGroup(capStart, retained.length - capStart, 0)
  geometry.setIndex(retained)
  // 面积加权法线覆盖所有 UV 接缝副本，只平滑眼窝连接处；嘴、爪与其余外皮保持原法线。
  const sums = new Map([...seam].map((id) => [id, new THREE.Vector3()]))
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3()
  for (let offset = 0; offset < retained.length; offset += 3) {
    const face = retained.slice(offset, offset + 3)
    if (!face.some((vertex) => seam.has(ids[vertex]))) continue
    a.fromBufferAttribute(position, face[0])
    b.fromBufferAttribute(position, face[1]).sub(a)
    c.fromBufferAttribute(position, face[2]).sub(a)
    b.cross(c)
    face.forEach((vertex) => sums.get(ids[vertex])?.add(b))
  }
  ids.forEach((id, vertex) => {
    const sum = sums.get(id)
    if (sum && sum.lengthSq() > 1e-12)
      normal.setXYZ(vertex, ...sum.clone().normalize().toArray())
  })
  return {
    removedFaces,
    cappedFaces: (retained.length - capStart) / 3,
    chinPreserved: true,
  }
}
