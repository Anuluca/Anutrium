import { MeshoptSimplifier } from 'meshoptimizer'
import * as THREE from 'three'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import {
  mergeGeometries,
  mergeVertices,
} from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { readTranmPose, readTrsklScaleCompensation } from './readTranmPose'

// 构建时采样官方睡眠动画与贴图；首页使用静态烘焙结果，不运行骨骼动画或贴图解码。
export async function prepareSprigatitoGeometry({
  headTilt = 15,
  headLift = 14,
} = {}) {
  const path = '/scripts/assets/sprigatito/'
  const manager = new THREE.LoadingManager()
  const texturesReady = new Promise<void>((resolve) => {
    manager.onLoad = resolve
  })
  const xml = await fetch(`${path}pm1010_00_00.dae`).then((r) => r.text())
  const model = new ColladaLoader(manager).parse(xml, path).scene
  await texturesReady
  const names = new Map(
    Array.from(
      new DOMParser()
        .parseFromString(xml, 'text/xml')
        .querySelectorAll('visual_scene node[type="JOINT"]'),
      (node) => [node.getAttribute('sid'), node.getAttribute('name')!]
    )
  )
  model.traverse((object) => {
    if (names.has(object.name)) object.name = names.get(object.name)!
  })
  model.updateMatrixWorld(true)
  const [animation, skeleton] = await Promise.all(
    ['pm1010_00_00_00281_sleep01_loop.tranm', 'pm1010_00_00.trskl'].map(
      (file) =>
        fetch(`${path}${file}`).then((response) => response.arrayBuffer())
    )
  )
  const poses = readTranmPose(animation)
  for (const pose of poses) {
    // DAE 根节点附加了单位和 Z_UP 转换，不能被游戏中的同名单位根轨道覆盖。
    if (pose.name === 'pm1010_00_00') continue
    const bone = model.getObjectByName(pose.name)
    if (!bone) throw new Error(`Missing Sprigatito bone: ${pose.name}`)
    // 游戏动画以米为单位；该 DAE 的局部骨骼坐标以厘米导出，场景根节点再转换为米。
    if (pose.position) bone.position.copy(pose.position).multiplyScalar(100)
    if (pose.quaternion) bone.quaternion.copy(pose.quaternion)
    if (pose.scale) bone.scale.copy(pose.scale)
    bone.updateMatrix()
  }
  // 在官方睡姿上微调：头绕自身纵轴轻歪，尾巴分段向身体方向弯曲。
  const head = model.getObjectByName('head')!
  head.rotateZ(THREE.MathUtils.degToRad(headTilt))
  head.rotateY(THREE.MathUtils.degToRad(headLift))
  model.updateMatrixWorld(true)
  const tailRoot = model.getObjectByName('tail_a_01')!
  const tailNext = model.getObjectByName('tail_a_02')!
  const tailOrigin = tailRoot.getWorldPosition(new THREE.Vector3())
  const tailDirection = tailNext
    .getWorldPosition(new THREE.Vector3())
    .sub(tailOrigin)
  const bodyDirection = head
    .getWorldPosition(new THREE.Vector3())
    .sub(tailOrigin)
  const bendSign =
    Math.sign(
      new THREE.Vector3().crossVectors(tailDirection, bodyDirection).y
    ) || 1
  for (const [name, degrees] of [
    ['tail_a_01', 8],
    ['tail_a_02', 12],
    ['tail_a_03', 10],
    ['tail_a_04', 8],
  ] as const) {
    const bone = model.getObjectByName(name)!
    const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
      bone.getWorldQuaternion(new THREE.Quaternion()).invert()
    )
    bone.rotateOnAxis(localUp, THREE.MathUtils.degToRad(degrees * bendSign))
    model.updateMatrixWorld(true)
  }
  const compensated = readTrsklScaleCompensation(skeleton)
  const scales = new Map(poses.map((pose) => [pose.name, pose.scale]))
  model.traverse((bone) => {
    if (!compensated.has(bone.name) || !bone.parent) return
    // 仅抵消父骨骼的动画缩放；保留父骨骼对关节位置的移动与 DAE 根节点的单位转换。
    const parentScale = scales.get(bone.parent.name)
    if (!parentScale || parentScale.equals(new THREE.Vector3(1, 1, 1))) return
    bone.matrixAutoUpdate = false
    bone.matrix
      .makeTranslation(bone.position.x, bone.position.y, bone.position.z)
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
          bone.quaternion,
          bone.scale
        )
      )
  })
  model.updateMatrixWorld(true)
  const headScale = model
    .getObjectByName('head')!
    .getWorldScale(new THREE.Vector3())
    .toArray()
  if (Math.max(...headScale) - Math.min(...headScale) > 1e-6) {
    throw new Error('Sleep pose must preserve the original head proportions')
  }

  const parts: THREE.BufferGeometry[] = []
  await MeshoptSimplifier.ready
  let sourceFaces = 0
  let neckBefore = 0
  let neckAfter = 0
  model.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object.name.includes('lod') ||
      object.name.includes('eye_mesh') ||
      (object.material as THREE.MeshPhongMaterial).name === 'body_a_01'
    )
      return
    if (object instanceof THREE.SkinnedMesh) object.skeleton.update()
    const source = object.geometry
    const position = source.getAttribute('position')
    const uv = source.getAttribute('uv')
    const material = (
      Array.isArray(object.material) ? object.material[0] : object.material
    ) as THREE.MeshPhongMaterial
    const image = material.map!.image as HTMLImageElement
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, image.width, image.height).data
    const positions = new Float32Array(position.count * 3)
    const colors = new Float32Array(position.count * 3)
    const vertex = new THREE.Vector3()
    const color = new THREE.Color()
    const removeFace = new Uint8Array(position.count)
    for (let i = 0; i < position.count; i++) {
      if (object instanceof THREE.SkinnedMesh) {
        const skinIndex = source.getAttribute('skinIndex')
        const skinWeight = source.getAttribute('skinWeight')
        let coreWeight = 0
        let featureWeight = 0
        for (let slot = 0; slot < 4; slot++) {
          const name =
            object.skeleton.bones[skinIndex.getComponent(i, slot)].name
          const weight = skinWeight.getComponent(i, slot)
          if (name === 'head' || /eyelid|jaw|teeth/.test(name))
            coreWeight += weight
          if (/ear|feeler/.test(name)) featureWeight += weight
        }
        removeFace[i] = coreWeight > 0.5 && featureWeight < 0.25 ? 1 : 0
      }
      object
        .getVertexPosition(i, vertex)
        .applyMatrix4(object.matrixWorld)
        .toArray(positions, i * 3)
      const x = Math.max(
        0,
        Math.min(image.width - 1, Math.floor(uv.getX(i) * image.width))
      )
      const y = Math.max(
        0,
        Math.min(image.height - 1, Math.floor((1 - uv.getY(i)) * image.height))
      )
      const offset = (y * image.width + x) * 4
      color
        .setRGB(
          pixels[offset] / 255,
          pixels[offset + 1] / 255,
          pixels[offset + 2] / 255,
          THREE.SRGBColorSpace
        )
        .toArray(colors, i * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    if (source.index) geometry.setIndex(source.index.clone())
    else
      geometry.setIndex(
        Array.from({ length: position.count }, (_, index) => index)
      )
    const retained: number[] = []
    const indices = geometry.index!.array
    sourceFaces += indices.length / 3
    for (let offset = 0; offset < indices.length; offset += 3) {
      const face = [indices[offset], indices[offset + 1], indices[offset + 2]]
      if (!face.every((index) => removeFace[index])) retained.push(...face)
    }
    geometry.setIndex(retained)
    const welded = mergeVertices(geometry)
    const isNeck = object.name.includes('leaf_mesh')
    const before = welded.index!.count / 3
    if (isNeck) {
      neckBefore += before
      neckAfter += before
    }
    geometry.dispose()
    parts.push(welded)
  })
  // 用连续圆滑椭球替换面部核心，耳朵、侧须与身体仍沿用官方模型网格。
  const smoothHead = new THREE.SphereGeometry(1, 32, 24)
  smoothHead.deleteAttribute('normal')
  smoothHead.deleteAttribute('uv')
  smoothHead.scale(11.7, 13.6, 10.5)
  smoothHead.translate(7.8, 0, 0)
  smoothHead.applyMatrix4(head.matrixWorld)
  const headColors = new Float32Array(
    smoothHead.getAttribute('position').count * 3
  )
  for (let index = 0; index < headColors.length; index += 3)
    headColors.set([0.65, 0.8, 0.4], index)
  smoothHead.setAttribute('color', new THREE.BufferAttribute(headColors, 3))
  parts.push(smoothHead)
  const merged = mergeGeometries(parts)!
  const weldedSurface = mergeVertices(merged)
  // 移除被替换的五官所留下的未引用顶点，不降低保留部分的网格密度。
  const [remap, vertexCount] = MeshoptSimplifier.compactMesh(
    Uint32Array.from(weldedSurface.index!.array)
  )
  const surface = new THREE.BufferGeometry()
  for (const name of ['position', 'color']) {
    const attribute = weldedSurface.getAttribute(name)
    const values = new Float32Array(vertexCount * 3)
    for (let index = 0; index < remap.length; index++) {
      if (remap[index] >= vertexCount) continue
      values.set(
        [attribute.getX(index), attribute.getY(index), attribute.getZ(index)],
        remap[index] * 3
      )
    }
    surface.setAttribute(name, new THREE.BufferAttribute(values, 3))
  }
  surface.setIndex(
    Array.from(weldedSurface.index!.array, (index) => remap[index])
  )
  surface.computeVertexNormals()
  surface.computeBoundingBox()
  const bounds = surface.boundingBox!
  const center = bounds.getCenter(new THREE.Vector3())
  surface.translate(-center.x, -bounds.min.y, -center.z)
  const result = {
    positions: Array.from(surface.getAttribute('position').array),
    normals: Array.from(surface.getAttribute('normal').array),
    colors: Array.from(surface.getAttribute('color').array),
    indices: Array.from(surface.index!.array),
    size: bounds.getSize(new THREE.Vector3()).toArray(),
    origin: [center.x, bounds.min.y, center.z],
    stats: {
      sourceFaces,
      simplifiedFaces: surface.index!.count / 3,
      neckBefore,
      neckAfter,
    },
  }
  parts.forEach((geometry) => geometry.dispose())
  merged.dispose()
  weldedSurface.dispose()
  surface.dispose()
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      ;(material as THREE.MeshPhongMaterial).map?.dispose()
      material.dispose()
    }
  })
  return result
}
