import type { Object3D, Scene } from 'three'

/** 固定拓扑场景：只重组发生变化的局部矩阵，渲染前统一传播一次世界矩阵。 */
export function createSceneMatrixUpdater(
  scene: Scene,
  moving: Iterable<Object3D>
) {
  const records = Array.from(new Set(moving), (object) => ({
    object,
    values: new Float64Array(10).fill(NaN),
  }))
  scene.traverse((object) => {
    object.updateMatrix()
    object.matrixAutoUpdate = false
  })
  scene.updateMatrixWorld(true)
  // 只关闭 Scene 根的渲染器自动入口；子对象仍由 updateMatrixWorld 正常传播父变换。
  scene.matrixWorldAutoUpdate = false
  return () => {
    let dirty = false
    for (const { object, values } of records) {
      const { position: p, quaternion: q, scale: s } = object
      if (
        values[0] === p.x &&
        values[1] === p.y &&
        values[2] === p.z &&
        values[3] === q.x &&
        values[4] === q.y &&
        values[5] === q.z &&
        values[6] === q.w &&
        values[7] === s.x &&
        values[8] === s.y &&
        values[9] === s.z
      )
        continue
      values[0] = p.x
      values[1] = p.y
      values[2] = p.z
      values[3] = q.x
      values[4] = q.y
      values[5] = q.z
      values[6] = q.w
      values[7] = s.x
      values[8] = s.y
      values[9] = s.z
      object.updateMatrix()
      dirty = true
    }
    if (dirty) scene.updateMatrixWorld()
    return dirty
  }
}
