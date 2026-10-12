import * as THREE from 'three'

// 读取朱紫 FlatBuffers 骨骼动画的首帧。仅供离线烘焙，不进入首页运行时。
// 格式与四种轨道类型参考 ChicoEevee/Pokemon-Switch-Model-Importer-Blender 的 GFLib/Anim。
function flatBufferReader(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const u32 = (offset: number) => view.getUint32(offset, true)
  const indirect = (offset: number) => offset + u32(offset)
  const field = (table: number, index: number) => {
    const vtable = table - view.getInt32(table, true)
    const slot = 4 + index * 2
    if (slot >= view.getUint16(vtable, true)) return 0
    const offset = view.getUint16(vtable + slot, true)
    return offset ? table + offset : 0
  }
  const string = (offset: number) => {
    const start = indirect(offset)
    return new TextDecoder().decode(
      new Uint8Array(buffer, start + 4, u32(start))
    )
  }
  return { view, u32, indirect, field, string }
}

export function readTranmPose(buffer: ArrayBuffer) {
  const { view, u32, indirect, field, string } = flatBufferReader(buffer)
  const coordinate = (track: number, slot: number) => {
    const typeOffset = field(track, slot)
    if (!typeOffset || !view.getUint8(typeOffset)) return 0
    const type = view.getUint8(typeOffset)
    if (type > 4) throw new Error(`Unsupported TRANM track: ${type}`)
    const table = indirect(field(track, slot + 1))
    if (type === 1) return field(table, 0)
    if (type >= 3) {
      const frames = indirect(field(table, 0))
      const first =
        type === 3
          ? view.getUint16(frames + 4, true)
          : view.getUint8(frames + 4)
      if (first !== 0) throw new Error('TRANM track has no initial keyframe')
    }
    return indirect(field(table, type === 2 ? 0 : 1)) + 4
  }
  const vector = (offset: number) =>
    new THREE.Vector3(
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true)
    )
  const quaternion = (offset: number) => {
    // 48 位压缩四元数：三项各 15 位，低 3 位记录缺省分量和整体符号。
    // 使用 BigInt 避免 JavaScript 的 32 位位运算截断高位。
    const packed =
      BigInt(view.getUint16(offset, true)) |
      (BigInt(view.getUint16(offset + 2, true)) << 16n) |
      (BigInt(view.getUint16(offset + 4, true)) << 32n)
    const values = [3n, 18n, 33n].map(
      (shift) =>
        Number((packed >> shift) & 0x7fffn) * (Math.PI / 2 / 0x7fff) -
        Math.PI / 4
    )
    values.splice(
      Number(packed & 3n),
      0,
      Math.sqrt(Math.max(0, 1 - values.reduce((sum, v) => sum + v * v, 0)))
    )
    const sign = packed & 4n ? -1 : 1
    return new THREE.Quaternion(
      values[0] * sign,
      values[1] * sign,
      values[2] * sign,
      values[3] * sign
    ).normalize()
  }
  const root = u32(0)
  const info = indirect(field(root, 0))
  if (!field(info, 0) || !u32(field(info, 0))) {
    throw new Error('Expected looping sleep animation')
  }
  const skeleton = indirect(field(root, 1))
  const tracks = indirect(field(skeleton, 0))
  return Array.from({ length: u32(tracks) }, (_, index) => {
    const track = indirect(tracks + 4 + index * 4)
    const position = coordinate(track, 5)
    const rotation = coordinate(track, 3)
    const scale = coordinate(track, 1)
    return {
      name: string(field(track, 0)),
      position: position ? vector(position) : undefined,
      quaternion: rotation ? quaternion(rotation) : undefined,
      scale: scale ? vector(scale) : undefined,
    }
  })
}

// TRSKL 的 InheritScale 标志表示分段缩放补偿，导入器将其映射到 inherit_scale=NONE。
// DAE 不保留此标志；不补偿会把 neck_01 的 0.7 缩放传给头部，造成扁头。
export function readTrsklScaleCompensation(buffer: ArrayBuffer) {
  const { view, u32, indirect, field, string } = flatBufferReader(buffer)
  const root = u32(0)
  const nodes = indirect(field(root, 1))
  const bones = indirect(field(root, 2))
  const compensated = new Set<string>()
  for (let index = 0; index < u32(nodes); index++) {
    const node = indirect(nodes + 4 + index * 4)
    const rig = field(node, 5)
    const rigIndex = rig ? view.getInt32(rig, true) : -1
    if (rigIndex < 0) continue
    if (rigIndex >= u32(bones)) throw new Error('Invalid TRSKL bone index')
    const bone = indirect(bones + 4 + rigIndex * 4)
    const flag = field(bone, 0)
    if (flag && view.getUint8(flag)) compensated.add(string(field(node, 0)))
  }
  return compensated
}
