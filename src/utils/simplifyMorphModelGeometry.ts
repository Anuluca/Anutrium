import { MeshoptSimplifier } from 'meshoptimizer'
import type { BufferGeometry } from 'three'

export async function simplifyMorphModelGeometry(source: BufferGeometry) {
  await MeshoptSimplifier.ready
  const positions = source.getAttribute('position').array as Float32Array
  const raised = source.morphAttributes.position[0].array as Float32Array
  const remap = MeshoptSimplifier.generatePositionRemap(positions, 3)
  const indices = Uint32Array.from(source.index!.array, (index) => remap[index])
  const scale = MeshoptSimplifier.getScale(positions, 3)
  // 焊接材质接缝，以归一化的姿态差作为误差约束，避免减面后抬头动作失真。
  const morph = Float32Array.from(
    raised,
    (value, index) => (value - positions[index]) / scale
  )
  const [reduced] = MeshoptSimplifier.simplifyWithAttributes(
    indices,
    positions,
    3,
    morph,
    3,
    [0.5, 0.5, 0.5],
    null,
    Math.floor((indices.length * 0.4) / 3) * 3,
    0.006,
    ['LockBorder']
  )
  // 保留两种姿态的顶点与法线；只替换索引，实体资产仍可用于恢复。
  source.setIndex(Array.from(reduced))
}
