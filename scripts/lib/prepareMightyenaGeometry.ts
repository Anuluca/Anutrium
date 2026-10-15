import * as THREE from 'three'
import {
  mergeGeometries,
  mergeVertices,
} from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import {
  flatBufferReader,
  readTranmPose,
  readTrsklScaleCompensation,
} from './readTranmPose'
import { smoothMightyenaEyes } from './smoothMightyenaEyes'

const sourceFiles = new Map<string, Promise<ArrayBuffer>>()
const readSource = (path: string) => {
  let pending = sourceFiles.get(path)
  if (!pending) {
    pending = fetch(path)
      .then((response) => {
        if (!response.ok) throw new Error(`Missing pet source ${path}`)
        return response.arrayBuffer()
      })
      .catch((error) => {
        sourceFiles.delete(path)
        throw error
      })
    sourceFiles.set(path, pending)
  }
  return pending
}

// TRMSH/TRMBF/TRSKL 字段来自 ChicoEevee 的开源导入器；只用于离线构建。
export async function prepareMightyenaGeometry(
  raised = false,
  followYaw = 0,
  followPitch = 0
) {
  const model = 'mightyena'
  const prefix = 'pm0262_00_00'
  const base = `/scripts/assets/${model}/${prefix}`
  const files = await Promise.all(
    ['.trmsh', '.trmbf', '.trskl', '_00271_rest01_loop.tranm'].map((suffix) =>
      readSource(base + suffix)
    )
  )
  const sk = flatBufferReader(files[2])
  const vector = (offset: number, fallback: THREE.Vector3) =>
    offset
      ? new THREE.Vector3(
          ...([0, 4, 8].map((axis) =>
            sk.view.getFloat32(offset + axis, true)
          ) as [number, number, number])
        )
      : fallback
  const tableList = (
    reader: ReturnType<typeof flatBufferReader>,
    table: number,
    slot: number
  ) => {
    const field = reader.field(table, slot)
    if (!field) return []
    const list = reader.indirect(field)
    return Array.from({ length: reader.u32(list) }, (_, index) =>
      reader.indirect(list + 4 + index * 4)
    )
  }
  const poses = new Map(readTranmPose(files[3]).map((p) => [p.name, p]))
  const compensated = readTrsklScaleCompensation(files[2])
  const bones = tableList(sk, sk.u32(0), 2)
  const nodes = tableList(sk, sk.u32(0), 1).map((table) => {
    const transform = sk.indirect(sk.field(table, 1))
    const name = sk.string(sk.field(table, 0))
    const rotation = vector(sk.field(transform, 1), new THREE.Vector3())
    return {
      name,
      parent: sk.field(table, 4)
        ? sk.view.getInt32(sk.field(table, 4), true)
        : -1,
      rig: sk.field(table, 5) ? sk.view.getInt32(sk.field(table, 5), true) : -1,
      position: vector(sk.field(transform, 2), new THREE.Vector3()),
      scale: vector(sk.field(transform, 0), new THREE.Vector3(1, 1, 1)),
      quaternion: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rotation.x, rotation.y, rotation.z, 'ZYX')
      ),
      rest: new THREE.Matrix4(),
      posed: new THREE.Matrix4(),
    }
  })
  const visited = new Set<number>()
  const buildNode = (index: number) => {
    if (visited.has(index)) return
    visited.add(index)
    const n = nodes[index],
      pose = poses.get(n.name)
    if (n.parent >= 0) buildNode(n.parent)
    // ParentIdx 是从 0 起算；原始欧拉角按 Blender XYZ（对应 Three ZYX）组合。
    n.rest.compose(n.position, n.quaternion, n.scale)
    const q = (pose?.quaternion ?? n.quaternion).clone()
    if (raised && n.name === 'head') {
      const worldQ =
        n.parent >= 0
          ? new THREE.Quaternion()
              .setFromRotationMatrix(nodes[n.parent].posed)
              .multiply(q)
          : q.clone()
      const localAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(
        worldQ.invert()
      )
      q.multiply(
        new THREE.Quaternion().setFromAxisAngle(
          localAxis,
          THREE.MathUtils.degToRad(-18)
        )
      )
    }
    if (n.name === 'head') {
      for (const [axis, angle] of [
        [new THREE.Vector3(0, 1, 0), followYaw],
        [new THREE.Vector3(1, 0, 0), followPitch],
      ] as const) {
        const worldQ = new THREE.Quaternion()
          .setFromRotationMatrix(nodes[n.parent].posed)
          .multiply(q)
        q.multiply(
          new THREE.Quaternion().setFromAxisAngle(
            axis.clone().applyQuaternion(worldQ.invert()),
            THREE.MathUtils.degToRad(angle)
          )
        )
      }
    }
    n.posed.compose(pose?.position ?? n.position, q, pose?.scale ?? n.scale)
    if (n.parent >= 0) {
      const parent = nodes[n.parent]
      if (compensated.has(n.name)) {
        const parentScale = poses.get(parent.name)?.scale
        if (parentScale) {
          const position = pose?.position ?? n.position
          n.posed
            .makeTranslation(position.x, position.y, position.z)
            .multiply(
              new THREE.Matrix4().makeScale(
                1 / parentScale.x,
                1 / parentScale.y,
                1 / parentScale.z
              )
            )
            .multiply(
              new THREE.Matrix4().compose(
                new THREE.Vector3(),
                q,
                pose?.scale ?? n.scale
              )
            )
        }
      }
      n.rest.premultiply(parent.rest)
      n.posed.premultiply(parent.posed)
    }
  }
  nodes.forEach((_, index) => buildNode(index))
  // 用文件内的原始逆绑定矩阵校验重建骨架，防止父级索引或欧拉角顺序错误。
  for (const n of nodes.filter((node) => node.rig >= 0)) {
    const matrix = sk.indirect(sk.field(bones[n.rig], 2))
    const original = new THREE.Matrix4().fromArray(
      [0, 1, 2, 3].flatMap((column) => [
        ...vector(sk.field(matrix, column), new THREE.Vector3()).toArray(),
        column === 3 ? 1 : 0,
      ])
    )
    const rebuilt = n.rest.clone().invert()
    const error = Math.max(
      ...original.elements.map((value, i) =>
        Math.abs(value - rebuilt.elements[i])
      )
    )
    if (error > 0.0001)
      throw new Error(`${model} inverse bind mismatch: ${n.name} (${error})`)
  }
  const skin = new Map(
    nodes
      .filter((n) => n.rig >= 0)
      .map((n) => [n.rig, n.posed.clone().multiply(n.rest.clone().invert())])
  )
  const msh = flatBufferReader(files[0]),
    bf = flatBufferReader(files[1])
  const buffers = tableList(bf, bf.u32(0), 1)
  const parts: THREE.BufferGeometry[] = []
  const eyeRegions: THREE.Box3[] = []
  const faceEdits = {
    clawsRemoved: false,
    clawVertices: 0,
    eyesRemoved: true,
    chinPreserved: true,
    removedFaces: 0,
    cappedFaces: 0,
  }
  const eyelidBones = new Set(
    nodes.filter((n) => /eyelid/i.test(n.name)).map((n) => n.rig)
  )
  const normalSkin = new Map(
    [...skin].map(([id, matrix]) => [
      id,
      new THREE.Matrix3().getNormalMatrix(matrix),
    ])
  )
  const half = (bits: number) => {
    const sign = bits & 0x8000 ? -1 : 1,
      exponent = (bits >> 10) & 31,
      fraction = bits & 1023
    return (
      sign *
      (exponent
        ? (1 + fraction / 1024) * 2 ** (exponent - 15)
        : fraction * 2 ** -24)
    )
  }
  const vertex = new THREE.Vector3(),
    output = new THREE.Vector3(),
    weighted = new THREE.Vector3()
  for (const [index, mesh] of tableList(msh, msh.u32(0), 1).entries()) {
    const name = msh.string(msh.field(mesh, 0))
    if (/mouth|flower|bom_[abc]/i.test(name)) continue
    const accessors = tableList(msh, mesh, 3)[0]
    const attributes = tableList(msh, accessors, 0).map((a) => ({
      semantic: msh.field(a, 1) ? msh.u32(msh.field(a, 1)) : 0,
      format: msh.field(a, 3) ? msh.u32(msh.field(a, 3)) : 0,
      offset: msh.field(a, 4) ? msh.u32(msh.field(a, 4)) : 0,
    }))
    const stride = msh.u32(msh.field(tableList(msh, accessors, 1)[0], 0))
    const buffer = buffers[index]
    const vertices = tableList(bf, buffer, 1)[0]
    const data = bf.indirect(bf.field(vertices, 0))
    const count = bf.u32(data) / stride
    const position = attributes.find((a) => a.semantic === 1)!
    if (/eye/i.test(name)) {
      // 眼窝边缘部分只绑定 head，不能仅靠 eyelid 权重识别；用原眼球的绑定空间包围盒补充。
      const regions = [new THREE.Box3(), new THREE.Box3()]
      for (let i = 0; i < count; i++) {
        const start = data + 4 + i * stride + position.offset
        vertex.set(
          bf.view.getFloat32(start, true),
          bf.view.getFloat32(start + 4, true),
          bf.view.getFloat32(start + 8, true)
        )
        regions[vertex.x < 0 ? 0 : 1].expandByPoint(vertex)
      }
      eyeRegions.push(
        ...regions
          .filter((region) => !region.isEmpty())
          .map((region) => region.expandByScalar(0.02))
      )
      continue
    }
    const uv = attributes.find((a) => a.semantic === 6)!
    const normal = attributes.find((a) => a.semantic === 2)!
    const joints = attributes.find((a) => a.semantic === 7)
    const weights = attributes.find((a) => a.semantic === 8)
    if (position.format !== 0x33)
      throw new Error(`Unsupported position ${position.format}`)
    const values = new Float32Array(count * 3)
    const featureVertices = new Uint8Array(count)
    const sourceVertexKeys: string[] = []
    const uvs = new Float32Array(count * 2),
      normals = new Float32Array(count * 3)
    const originalNormal = new THREE.Vector3(),
      posedNormal = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      const start = data + 4 + i * stride
      vertex.set(
        bf.view.getFloat32(start + position.offset, true),
        bf.view.getFloat32(start + position.offset + 4, true),
        bf.view.getFloat32(start + position.offset + 8, true)
      )
      sourceVertexKeys.push(
        vertex
          .toArray()
          .map((value) => Math.round(value * 1e5))
          .join(':')
      )
      const eyeRegion = eyeRegions.some((region) =>
        region.containsPoint(vertex)
      )
      let eyelidWeight = 0
      originalNormal.set(
        ...([0, 2, 4].map((axis) =>
          half(bf.view.getUint16(start + normal.offset + axis, true))
        ) as [number, number, number])
      )
      posedNormal.set(0, 0, 0)
      uvs[i * 2] = bf.view.getFloat32(start + uv.offset, true)
      uvs[i * 2 + 1] = bf.view.getFloat32(start + uv.offset + 4, true)
      output.set(0, 0, 0)
      if (joints && weights) {
        for (let s = 0; s < 4; s++) {
          const bone =
            joints.format === 0x16
              ? bf.view.getUint8(start + joints.offset + s)
              : bf.view.getUint32(start + joints.offset + s * 4, true)
          const weight =
            bf.view.getUint16(start + weights.offset + s * 2, true) / 65535
          if (!weight) continue
          if (eyelidBones.has(bone)) eyelidWeight += weight
          const matrix = skin.get(bone)
          if (!matrix) throw new Error(`Missing skin joint ${bone}`)
          weighted.copy(vertex).applyMatrix4(matrix)
          output.addScaledVector(weighted, weight)
          posedNormal.addScaledVector(
            weighted.copy(originalNormal).applyMatrix3(normalSkin.get(bone)!),
            weight
          )
        }
      } else {
        output.copy(vertex)
        posedNormal.copy(originalNormal)
      }
      featureVertices[i] = eyelidWeight > 0.05 || eyeRegion ? 1 : 0
      posedNormal.normalize().toArray(normals, i * 3)
      output.toArray(values, i * 3)
    }
    const idx = tableList(bf, buffer, 0)[0]
    const idxData = bf.indirect(bf.field(idx, 0))
    const format = msh.field(mesh, 2) ? msh.u32(msh.field(mesh, 2)) : 0
    const bytes = format === 1 ? 2 : 4
    const indices = Array.from({ length: bf.u32(idxData) / bytes }, (_, i) =>
      bytes === 2
        ? bf.view.getUint16(idxData + 4 + i * bytes, true)
        : bf.view.getUint32(idxData + 4 + i * bytes, true)
    )
    const g = new THREE.BufferGeometry()
      .setAttribute('position', new THREE.BufferAttribute(values, 3))
      .setAttribute('normal', new THREE.BufferAttribute(normals, 3))
      .setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
      .setIndex(indices)
    const materialGroups = tableList(msh, mesh, 4)
    for (const [materialIndex, group] of materialGroups.entries())
      g.addGroup(
        msh.field(group, 1) ? msh.u32(msh.field(group, 1)) : 0,
        msh.u32(msh.field(group, 0)),
        materialIndex
      )
    const edits = smoothMightyenaEyes(g, featureVertices, sourceVertexKeys)
    faceEdits.removedFaces += edits.removedFaces
    faceEdits.cappedFaces += edits.cappedFaces
    // 原始材质分组映射到两个带边缘留白的图集区块；保留 UV 接缝。
    for (const group of g.groups) {
      const materialName = msh.string(
        msh.field(materialGroups[group.materialIndex!], 3)
      )
      const tile = materialName.startsWith('body_b') ? 1 : 0
      const offset = group.start
      const length = group.count
      const part = g
        .clone()
        .setIndex(Array.from(g.index!.array).slice(offset, offset + length))
        .toNonIndexed()
      const mapped = part.getAttribute('uv')
      for (let i = 0; i < mapped.count; i++)
        mapped.setXY(
          i,
          (tile * 512 + 2 + mapped.getX(i) * 508) / 1024,
          (2 + mapped.getY(i) * 508) / 512
        )
      parts.push(part)
    }
    g.dispose()
  }
  const merged = mergeGeometries(parts)!
  const result = mergeVertices(merged)
  result.rotateY(-Math.PI / 2)

  result.computeBoundingBox()
  const bounds = result.boundingBox!,
    center = bounds.getCenter(new THREE.Vector3())
  const out = {
    positions: Array.from(result.attributes.position.array),
    normals: Array.from(result.attributes.normal.array),
    indices: Array.from(result.index!.array),
    uvs: Array.from(result.attributes.uv.array),
    size: bounds.getSize(new THREE.Vector3()).toArray(),
    origin: [center.x, bounds.min.y, center.z],
    bones: nodes.map((n) => n.name),
    faceEdits,
    facingDirection: (() => {
      const head = nodes.find((n) => n.name === 'head')!
      return new THREE.Vector3(0, 0, 1)
        .transformDirection(head.rest.clone().invert())
        .transformDirection(head.posed)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)
        .toArray()
    })(),
  }
  // 对齐以睡姿原点为准，动作烘焙时由构建器保持原点一致。
  parts.forEach((p) => p.dispose())
  merged.dispose()
  result.dispose()
  return out
}
