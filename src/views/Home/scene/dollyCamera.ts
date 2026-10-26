import * as THREE from 'three'

// 两端速度、加速度均为零；前 40% 平滑提速，后段缓慢收尾，区别于页面转场。
export function easeIslandFocusZoom(progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  return t * t * t * (20 + t * (-45 + t * (36 - 10 * t)))
}

interface CameraPose {
  position: THREE.Vector3
  target: THREE.Vector3
}

// 保存调用时的真实机位；中途反向时从当前状态继续，不跳回预设起点。
export function createDollyCameraMotion(
  camera: THREE.PerspectiveCamera,
  lookAt: THREE.Vector3,
  pose: CameraPose,
  targetFov: number,
  targetZoom?: number,
  updateProjection = () => camera.updateProjectionMatrix()
) {
  const startZoom = camera.zoom
  const startFov = camera.fov
  const startTarget = lookAt.clone()
  const endTarget = pose.target.clone()
  const startDirection = camera.position.clone().sub(startTarget)
  const endDirection = pose.position.clone().sub(endTarget)
  const startProjectedDistance =
    startDirection.length() * Math.tan(THREE.MathUtils.degToRad(startFov / 2))
  const endProjectedDistance =
    endDirection.length() * Math.tan(THREE.MathUtils.degToRad(targetFov / 2))
  startDirection.normalize()
  endDirection.normalize()

  return (progress: number, fovProgress = progress) => {
    if (targetZoom !== undefined)
      camera.zoom = THREE.MathUtils.lerp(startZoom, targetZoom, progress)
    camera.fov = THREE.MathUtils.lerp(startFov, targetFov, fovProgress)
    lookAt.copy(startTarget).lerp(endTarget, progress)
    const projectedDistance = THREE.MathUtils.lerp(
      startProjectedDistance,
      endProjectedDistance,
      progress
    )
    // 归一化方向后再还原距离，避免混合角度意外改变投影尺度；每帧复用向量。
    camera.position
      .copy(startDirection)
      .lerp(endDirection, progress)
      .normalize()
      .multiplyScalar(
        projectedDistance / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      )
      .add(lookAt)
    updateProjection()
  }
}
