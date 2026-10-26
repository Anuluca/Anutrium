import * as THREE from 'three'

/** 一次合并相机矩阵、每个对象一次合并世界矩阵，复用输出向量。 */
export function createScreenProjection() {
  const cameraProjection = new THREE.Matrix4()
  const objectProjection = new THREE.Matrix4()
  return {
    camera(camera: THREE.Camera) {
      cameraProjection.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      )
    },
    object(matrixWorld: THREE.Matrix4) {
      objectProjection.multiplyMatrices(cameraProjection, matrixWorld)
    },
    point(point: THREE.Vector3) {
      return point.applyMatrix4(objectProjection)
    },
  }
}
