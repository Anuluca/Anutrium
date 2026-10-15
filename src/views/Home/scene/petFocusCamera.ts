import * as THREE from 'three'

import { type PetProfile, pets } from '@/locales/dynamic/pets'
import type { FloraPetModelAsset } from '@/utils/floraPetModel'

interface PetFocusContext {
  geometry: THREE.BufferGeometry
  reference?: FloraPetModelAsset
  camera: THREE.PerspectiveCamera
  pet: PetProfile
  position: THREE.Vector3
  scale: THREE.Vector3
  size: THREE.Vector3
  mobile: boolean
  referenceWidth: number
}
interface CameraPose {
  position: THREE.Vector3
  target: THREE.Vector3
}
const copyPose = (pose: CameraPose): CameraPose => ({
  position: pose.position.clone(),
  target: pose.target.clone(),
})

// 头部跟随只改变形权重，不改变这里的最终姿态构图；矩阵未变时无需再次遍历整模型。
export function createPetScreenBounds() {
  const projection = new THREE.Matrix4()
  const previous = new Float64Array(16).fill(NaN)
  const point = new THREE.Vector3()
  let previousGeometry: THREE.BufferGeometry | undefined
  let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  return (mesh: THREE.Mesh, camera: THREE.PerspectiveCamera) => {
    mesh.updateWorldMatrix(true, false)
    projection
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .multiply(mesh.matrixWorld)
    if (
      previousGeometry === mesh.geometry &&
      projection.elements.every((value, index) => value === previous[index])
    )
      return bounds
    previousGeometry = mesh.geometry
    previous.set(projection.elements)
    const positions = mesh.geometry.morphAttributes.position[0]
    bounds = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    }
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(projection)
      bounds.minX = Math.min(bounds.minX, point.x)
      bounds.maxX = Math.max(bounds.maxX, point.x)
      bounds.minY = Math.min(bounds.minY, point.y)
      bounds.maxY = Math.max(bounds.maxY, point.y)
    }
    return bounds
  }
}

// 模型世界矩阵是仿射变换，直接填充连续缓冲，避免逐顶点对象及重复透视除法。
const transformPoints = (
  positions: ArrayLike<number>,
  world: THREE.Matrix4
) => {
  const points = new Float64Array(positions.length)
  const m = world.elements
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i],
      y = positions[i + 1],
      z = positions[i + 2]
    points[i] = m[0] * x + m[4] * y + m[8] * z + m[12]
    points[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
    points[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
  }
  return points
}

// 每个几何体只缓存最后一种构图。弱引用不会阻止已释放宠物几何体被回收。
export function createPetFocusCamera() {
  const cache = new WeakMap<
    THREE.BufferGeometry,
    { key: string; reference?: FloraPetModelAsset; pose: CameraPose }
  >()
  return (context: PetFocusContext): CameraPose => {
    const {
      geometry,
      reference: floraReferenceModel,
      camera,
      pet: currentPet,
      position,
      scale,
      size: sprigatitoSize,
      mobile,
      referenceWidth,
    } = context
    const key = [
      camera.fov,
      camera.aspect,
      camera.near,
      camera.far,
      currentPet.rotationY.focus,
      currentPet.focusPitch,
      currentPet.focusScale ?? 1,
      mobile,
      referenceWidth,
      ...position.toArray(),
      ...scale.toArray(),
      ...sprigatitoSize.toArray(),
      pets[0].rotationY.focus,
      pets[0].focusPitch,
    ].join(':')
    const cached = cache.get(geometry)
    if (cached?.key === key && cached.reference === floraReferenceModel)
      return copyPose(cached.pose)
    // 战斗姿比睡姿高，取景必须使用最终姿态的包围盒。
    const focusBounds = new THREE.Box3().setFromBufferAttribute(
      geometry.morphAttributes.position[0]
    )
    const focusSize = focusBounds
      .getSize(new THREE.Vector3())
      .multiplyScalar(scale.x)
    const target = focusBounds
      .getCenter(new THREE.Vector3())
      .multiplyScalar(scale.x)
      .applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(currentPet.rotationY.focus)
      )
      .add(position)
    let distance =
      Math.max(focusSize.y, focusSize.x / camera.aspect) /
        (2 *
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          (mobile ? 0.22 : 0.45)) +
      focusSize.z / 2
    const pitch = THREE.MathUtils.degToRad(currentPet.focusPitch)
    // 镜头方位独立于模型旋转，旋转宠物不会把镜头一起带到背面。
    const azimuth = THREE.MathUtils.degToRad(-70)
    const focusRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        0,
        THREE.MathUtils.degToRad(currentPet.rotationY.focus),
        0
      )
    )
    if (floraReferenceModel) {
      // 以花花最终投影为基准，focusScale 单独控制当前宠物的聚焦显示尺寸。
      const world = new THREE.Matrix4().compose(position, focusRotation, scale)
      const positions = geometry.morphAttributes.position[0]
      const vertices = transformPoints(positions.array, world)
      const sinAzimuth = Math.sin(azimuth),
        cosAzimuth = Math.cos(azimuth)
      const projectionScale =
        1 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      // 将顶点预投到固定方位的相机基底，二分距离时只调整俯仰与深度。
      const preparePoints = (points: Float64Array, aim: THREE.Vector3) => {
        const result = points
        for (let i = 0; i < points.length; i += 3) {
          const x = points[i] - aim.x,
            y = points[i + 1] - aim.y,
            z = points[i + 2] - aim.z
          result[i] = x * cosAzimuth - z * sinAzimuth
          result[i + 1] = y
          result[i + 2] = x * sinAzimuth + z * cosAzimuth
        }
        return result
      }
      const points = preparePoints(vertices, target)
      let measuredElevation = pitch
      const measure = (
        radius: number,
        projected = points,
        aim = target,
        elevation = pitch
      ) => {
        const horizontalDistance = radius * Math.cos(elevation)
        const height =
          Math.max(0.12, aim.y + radius * Math.sin(elevation)) - aim.y
        const distance = Math.hypot(horizontalDistance, height)
        const sinElevation = height / distance,
          cosElevation = horizontalDistance / distance
        measuredElevation = Math.atan2(height, horizontalDistance)
        let min = Infinity,
          max = -Infinity,
          minY = Infinity,
          maxY = -Infinity
        for (let i = 0; i < projected.length; i += 3) {
          const x = projected[i],
            y = projected[i + 1],
            z = projected[i + 2]
          const depth = distance - z * cosElevation - y * sinElevation
          const inverseDepth = projectionScale / depth
          const screenX = (x * inverseDepth) / camera.aspect
          const screenY = (y * cosElevation - z * sinElevation) * inverseDepth
          min = Math.min(min, screenX)
          max = Math.max(max, screenX)
          minY = Math.min(minY, screenY)
          maxY = Math.max(maxY, screenY)
        }
        return {
          extent: Math.max((max - min) * camera.aspect, maxY - minY) / 2,
          center: (max + min) / 2,
          centerY: (maxY + minY) / 2,
        }
      }
      const reference = floraReferenceModel
      const referenceScale = (mobile ? 0.7 : 1.1) / referenceWidth
      const base = reference.metadata.attributes.positions
      const raised = reference.metadata.attributes.raisedPositions
      const basePositions = new Float32Array(
        reference.buffer,
        base.offset,
        base.count
      )
      let minY = Infinity
      for (let i = 1; i < basePositions.length; i += 3)
        minY = Math.min(minY, basePositions[i])
      const refPosition = position.clone()
      refPosition.y = 0.035 - minY * referenceScale
      const refWorld = new THREE.Matrix4().compose(
        refPosition,
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            0,
            THREE.MathUtils.degToRad(pets[0].rotationY.focus),
            0
          )
        ),
        new THREE.Vector3(referenceScale, referenceScale, referenceScale)
      )
      const refPositions = new Float32Array(
        reference.buffer,
        raised.offset,
        raised.count
      )
      const refVertices = transformPoints(refPositions, refWorld)
      const refBounds = new THREE.Box3().setFromBufferAttribute(
        new THREE.BufferAttribute(refVertices, 3)
      )
      const refFinalSize = refBounds.getSize(new THREE.Vector3())
      const refTarget = refBounds.getCenter(new THREE.Vector3())
      const refDistance =
        Math.max(refFinalSize.y, refFinalSize.x / camera.aspect) /
          (2 *
            Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
            (mobile ? 0.22 : 0.45)) +
        refFinalSize.z / 2
      const extent =
        measure(
          refDistance,
          preparePoints(refVertices, refTarget),
          refTarget,
          THREE.MathUtils.degToRad(pets[0].focusPitch)
        ).extent * (currentPet.focusScale ?? 1)
      let near = sprigatitoSize.length() * 0.55,
        far = sprigatitoSize.length() * 20
      for (let i = 0; i < 12; i++) {
        const middle = (near + far) / 2
        if (measure(middle).extent > extent) near = middle
        else far = middle
      }
      distance = far
      const measured = measure(distance)
      const center = measured.center
      const cameraRight = new THREE.Vector3(cosAzimuth, 0, -sinAzimuth)
      target.addScaledVector(
        cameraRight,
        center *
          distance *
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          camera.aspect
      )
      target.addScaledVector(
        new THREE.Vector3(
          -sinAzimuth * Math.sin(measuredElevation),
          Math.cos(measuredElevation),
          -cosAzimuth * Math.sin(measuredElevation)
        ),
        measured.centerY *
          distance *
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      )
    }
    const radius = distance * Math.cos(pitch)
    const pose = {
      position: new THREE.Vector3(
        target.x + Math.sin(azimuth) * radius,
        Math.max(0.12, target.y + distance * Math.sin(pitch)),
        target.z + Math.cos(azimuth) * radius
      ),
      target,
    }
    cache.set(geometry, { key, reference: floraReferenceModel, pose })
    return copyPose(pose)
  }
}
