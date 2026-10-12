// 加载线与三维场景共用机位、地平线和投影偏移，避免两段动画衔接时跳位。
export const templeCamera = {
  fov: 38,
  homeY: 1,
  entranceY: 5.6,
  targetY: 4.25,
  targetZ: -2,
  horizonY: -0.012,
  horizonZ: -40,
  verticalOffset: 0.0125,
} as const

export function getTempleEntranceHorizon(
  width: number,
  height: number,
  framing: { minDistance: number; aspectDistance: number },
  simpleEntrance = false
) {
  const cameraZ = Math.max(
    framing.minDistance,
    framing.aspectDistance / (width / height)
  )
  const cameraY = simpleEntrance ? templeCamera.homeY : templeCamera.entranceY
  const pitch = Math.atan2(
    templeCamera.targetY - cameraY,
    cameraZ - templeCamera.targetZ
  )
  const dy = templeCamera.horizonY - cameraY
  const distanceZ = cameraZ - templeCamera.horizonZ
  // 将地平线转换到相机空间，再应用透视投影及场景的纵向偏移。
  const projectedY = dy * Math.cos(pitch) - distanceZ * Math.sin(pitch)
  const depth = dy * Math.sin(pitch) + distanceZ * Math.cos(pitch)
  const ndcY = projectedY / depth / Math.tan((templeCamera.fov * Math.PI) / 360)
  return (0.5 - ndcY / 2 + templeCamera.verticalOffset) * height
}
