// 构建时运行，运行时页面直接加载烘焙结果，避免重复解码、摆姿势和减面。
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  mergeGeometries,
  mergeVertices,
} from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import {
  prepareModelSimplifier,
  simplifyHeadGeometry,
  simplifyModelGeometry,
  simplifyNeckGeometry,
  simplifyWeldedNeckGeometry,
} from '../../src/utils/simplifyModelGeometry'

export async function prepareLucarioGeometry() {
  await prepareModelSimplifier()
  const decoder = new DRACOLoader()
    .setDecoderPath('/draco/')
    .setDecoderConfig({ type: 'wasm' })
  const gltf = await new GLTFLoader()
    .setDRACOLoader(decoder)
    .loadAsync('/models/lucario.glb')
  try {
    // 骨骼本地轴并非标准人体坐标，将世界空间的姿势调整转换回父骨骼空间。
    const rotateBoneInWorld = (
      bone: InstanceType<typeof THREE.Object3D>,
      rotation: InstanceType<typeof THREE.Quaternion>
    ) => {
      const parentRotation = bone.parent!.getWorldQuaternion(
        new THREE.Quaternion()
      )
      const localRotation = parentRotation
        .clone()
        .invert()
        .multiply(rotation)
        .multiply(parentRotation)
      bone.quaternion.premultiply(localRotation)
      gltf.scene.updateMatrixWorld(true)
    }
    gltf.scene.updateMatrixWorld(true)
    const tail = gltf.scene.getObjectByName('Tail1')
    const tailNext = gltf.scene.getObjectByName('Tail2')
    if (tail && tailNext) {
      const direction = tailNext
        .getWorldPosition(new THREE.Vector3())
        .sub(tail.getWorldPosition(new THREE.Vector3()))
        .normalize()
      rotateBoneInWorld(
        tail,
        new THREE.Quaternion().setFromUnitVectors(
          direction,
          new THREE.Vector3(0.45, -0.5, -1).normalize()
        )
      )
    }
    const waist = gltf.scene.getObjectByName('Spine1')
    if (waist) {
      rotateBoneInWorld(
        waist,
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          THREE.MathUtils.degToRad(-6)
        )
      )
    }
    for (const side of ['L', 'R']) {
      const arm = gltf.scene.getObjectByName(`${side}Arm`)
      const elbow = gltf.scene.getObjectByName(`${side}ForeArm`)
      if (!arm || !elbow) continue
      const shoulderPosition = arm.getWorldPosition(new THREE.Vector3())
      const currentDirection = elbow
        .getWorldPosition(new THREE.Vector3())
        .sub(shoulderPosition)
        .normalize()
      // 略向身体外侧留出间距，避免垂下的手臂穿入躯干。
      const targetDirection = new THREE.Vector3(
        Math.sign(shoulderPosition.x) * 0.26,
        -1,
        0.08
      ).normalize()
      rotateBoneInWorld(
        arm,
        new THREE.Quaternion().setFromUnitVectors(
          currentDirection,
          targetDirection
        )
      )
    }
    const neck = gltf.scene.getObjectByName('Neck')
    if (neck) {
      rotateBoneInWorld(
        neck,
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          THREE.MathUtils.degToRad(16)
        )
      )
    }
    // 分段朝重力方向弯曲，根部稍向后避开脖颈，末端逐渐趋于竖直。
    for (const side of ['L', 'R']) {
      for (const strand of ['A', 'B']) {
        for (let segment = 1; segment <= 3; segment += 1) {
          const bone = gltf.scene.getObjectByName(
            `${side}Feeler${strand}${segment}`
          )
          const next = gltf.scene.getObjectByName(
            `${side}Feeler${strand}${segment + 1}`
          )
          if (!bone || !next) continue
          const position = bone.getWorldPosition(new THREE.Vector3())
          const direction = next
            .getWorldPosition(new THREE.Vector3())
            .sub(position)
            .normalize()
          const target = new THREE.Vector3(
            Math.sign(position.x) * (0.16 / segment),
            -1,
            -0.28 / segment
          ).normalize()
          rotateBoneInWorld(
            bone,
            new THREE.Quaternion().setFromUnitVectors(direction, target)
          )
        }
      }
    }
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh) object.computeBoundingBox()
    })

    // 以腰部骨骼为旋转中心，避免向后伸出的尾巴把包围盒中心拉偏。
    const bounds = new THREE.Box3().setFromObject(gltf.scene)
    const center = waist
      ? waist.getWorldPosition(new THREE.Vector3())
      : bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const headPivot =
      neck?.getWorldPosition(new THREE.Vector3()) ?? center.clone()
    const neckBottom = headPivot.clone().add(new THREE.Vector3(0, -0.1, 0))
    const neckTop = (
      gltf.scene
        .getObjectByName('Head')
        ?.getWorldPosition(new THREE.Vector3()) ?? headPivot.clone()
    ).add(new THREE.Vector3(0, 0.04, 0))
    const neckAxis = neckTop.clone().sub(neckBottom)
    const neckLength = neckAxis.length()
    neckAxis.normalize()
    const neckOffset = new THREE.Vector3()
    const headBones = new Set<InstanceType<typeof THREE.Object3D>>()
    neck?.traverse((bone) => headBones.add(bone))
    const surfaceParts: InstanceType<typeof THREE.BufferGeometry>[] = []
    const globalHeadWeights = new Map<string, number>()
    const globalNodWeights = new Map<string, number>()
    const globalNeckWeights = new Map<string, number>()
    const globalStrandWeights = new Map<string, number>()
    const authoredNormals = new Map<
      string,
      InstanceType<typeof THREE.Vector3>
    >()
    const vertexKey = (x: number, y: number, z: number) =>
      `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`
    const tailBones = new Set<InstanceType<typeof THREE.Object3D>>()
    tail?.traverse((bone) => tailBones.add(bone))
    let originalFaces = 0
    let simplifiedFaces = 0
    let previousFaces = 0
    let maximumError = 0
    let contourPreserved = true
    let faceSurfacePreserved = true
    let neckFacesBefore = 0
    let neckFacesAfter = 0
    let neckError = 0
    let neckContourPreserved = true
    let headFacesBefore = 0
    let headFacesAfter = 0
    let headError = 0
    let headContourPreserved = true
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      if (object instanceof THREE.SkinnedMesh) object.skeleton.update()
      // 将垂臂低头后的骨骼姿势烘焙到顶点，避免描线回到原始 T-pose。
      const geometry = object.geometry.clone()
      const positions = geometry.getAttribute('position')
      const sourceNormals = geometry.getAttribute('normal')
      const vertex = new THREE.Vector3()
      const headWeights = new Map<string, number>()
      const nodWeights = new Map<string, number>()
      const tailWeights = new Map<string, number>()
      const neckWeights = new Map<string, number>()
      const strandWeights = new Map<string, number>()
      const skinIndices = geometry.getAttribute('skinIndex')
      const skinWeights = geometry.getAttribute('skinWeight')
      for (let index = 0; index < positions.count; index += 1) {
        object.getVertexPosition(index, vertex).applyMatrix4(object.matrixWorld)
        positions.setXYZ(index, vertex.x, vertex.y, vertex.z)
        // 烘焙原模型的平滑法线；直接重算法线会把眼部贴图面的三角拓扑显成面罩。
        const normal = new THREE.Vector3().fromBufferAttribute(
          sourceNormals,
          index
        )
        const normalTransform = object.matrixWorld.clone()
        if (object instanceof THREE.SkinnedMesh && skinIndices && skinWeights) {
          const skinTransform = new THREE.Matrix4().multiplyScalar(0)
          for (let channel = 0; channel < 4; channel += 1) {
            const boneTransform = new THREE.Matrix4().fromArray(
              object.skeleton.boneMatrices,
              skinIndices.getComponent(index, channel) * 16
            )
            const influence = skinWeights.getComponent(index, channel)
            for (let component = 0; component < 16; component += 1)
              skinTransform.elements[component] +=
                boneTransform.elements[component] * influence
          }
          normalTransform
            .multiply(object.bindMatrixInverse)
            .multiply(skinTransform)
            .multiply(object.bindMatrix)
        }
        normal.applyNormalMatrix(
          new THREE.Matrix3().getNormalMatrix(normalTransform)
        )
        authoredNormals.set(vertexKey(vertex.x, vertex.y, vertex.z), normal)
        let weight = 0
        let nodWeight = 0
        let tailWeight = 0
        let neckWeight = 0
        let strandWeight = 0
        if (object instanceof THREE.SkinnedMesh && skinIndices && skinWeights) {
          for (let channel = 0; channel < 4; channel += 1) {
            const bone =
              object.skeleton.bones[skinIndices.getComponent(index, channel)]
            const influence = skinWeights.getComponent(index, channel)
            if (bone === neck) neckWeight += influence
            if (headBones.has(bone) && bone !== neck) nodWeight += influence
            if (bone.name.includes('Feeler')) strandWeight += influence
            if (
              tailBones.has(
                object.skeleton.bones[skinIndices.getComponent(index, channel)]
              )
            ) {
              tailWeight += skinWeights.getComponent(index, channel)
            }
            if (
              headBones.has(
                object.skeleton.bones[skinIndices.getComponent(index, channel)]
              )
            ) {
              weight += skinWeights.getComponent(index, channel)
            }
          }
        }
        const key = vertexKey(
          positions.getX(index),
          positions.getY(index),
          positions.getZ(index)
        )
        headWeights.set(key, Math.max(headWeights.get(key) ?? 0, weight))
        nodWeights.set(key, Math.max(nodWeights.get(key) ?? 0, nodWeight))
        tailWeights.set(key, Math.max(tailWeights.get(key) ?? 0, tailWeight))
        neckWeights.set(key, Math.max(neckWeights.get(key) ?? 0, neckWeight))
        strandWeights.set(
          key,
          Math.max(strandWeights.get(key) ?? 0, strandWeight)
        )
      }
      originalFaces += (geometry.index?.count ?? positions.count) / 3
      // 金属表面必须保持面部连通；锁住脸部顶点，使用保拓扑减面替代强制顶点折叠。
      const preserveFace = (point: InstanceType<typeof THREE.Vector3>) => {
        const key = vertexKey(point.x, point.y, point.z)
        return (
          (headWeights.get(key) ?? 0) > 0.9 &&
          (strandWeights.get(key) ?? 0) < 0.2 &&
          point.y > neckTop.y + 0.02
        )
      }
      for (const name of Object.keys(geometry.attributes)) {
        if (name !== 'position') geometry.deleteAttribute(name)
      }
      const originalInfluence = new Float32Array(positions.count)
      for (let index = 0; index < positions.count; index += 1) {
        originalInfluence[index] =
          headWeights.get(
            vertexKey(
              positions.getX(index),
              positions.getY(index),
              positions.getZ(index)
            )
          ) ?? 0
      }
      geometry.setAttribute(
        'headInfluence',
        new THREE.Float32BufferAttribute(originalInfluence, 1)
      )
      const baseResult = simplifyModelGeometry(geometry, {
        targetRatio: 0.2,
        maxError: 0.012,
        preservePoint: preserveFace,
      })
      faceSurfacePreserved &&= baseResult.detailsPreserved
      const simplified = baseResult.geometry
      // 简化后的左右拓扑会产生偏差：沿腰部中线裁切左侧再镜像，尾巴保留当前偏转。
      const source = simplified.getAttribute('position')
      const indices = simplified.index
      const symmetricPositions: number[] = []
      const leftPositions: number[] = []
      const tailPositions: number[] = []
      const keyOf = (point: InstanceType<typeof THREE.Vector3>) =>
        vertexKey(point.x, point.y, point.z)
      const append = (
        points: InstanceType<typeof THREE.Vector3>[],
        mirror = false,
        destination = symmetricPositions
      ) => {
        // 中线裁切可能产生重合端点，零面积面不能进入实体表面和减面校验。
        if (
          points[1]
            .clone()
            .sub(points[0])
            .cross(points[2].clone().sub(points[0]))
            .lengthSq() < 1e-14
        )
          return
        for (const point of mirror ? [...points].reverse() : points) {
          const x = mirror ? center.x * 2 - point.x : point.x
          destination.push(x, point.y, point.z)
          if (mirror) {
            const originalNormal = authoredNormals.get(keyOf(point))
            if (originalNormal)
              authoredNormals.set(
                vertexKey(x, point.y, point.z),
                new THREE.Vector3(
                  -originalNormal.x,
                  originalNormal.y,
                  originalNormal.z
                )
              )
          }
          for (const weights of [
            headWeights,
            nodWeights,
            strandWeights,
            neckWeights,
          ]) {
            weights.set(
              vertexKey(x, point.y, point.z),
              weights.get(keyOf(point)) ?? 0
            )
          }
        }
      }
      for (
        let index = 0;
        index < (indices?.count ?? source.count);
        index += 3
      ) {
        const triangle = [0, 1, 2].map((offset) =>
          new THREE.Vector3().fromBufferAttribute(
            source,
            indices ? indices.getX(index + offset) : index + offset
          )
        )
        if (
          triangle.some((point) => (tailWeights.get(keyOf(point)) ?? 0) > 0.35)
        ) {
          append(triangle, false, tailPositions)
          continue
        }
        const clipped: InstanceType<typeof THREE.Vector3>[] = []
        for (let edge = 0; edge < 3; edge += 1) {
          const a = triangle[edge]
          const b = triangle[(edge + 1) % 3]
          const insideA = a.x <= center.x
          const insideB = b.x <= center.x
          if (insideA) clipped.push(a)
          if (insideA !== insideB) {
            const ratio = (center.x - a.x) / (b.x - a.x)
            const intersection = a.clone().lerp(b, ratio)
            intersection.x = center.x
            const normalA = authoredNormals.get(keyOf(a))
            const normalB = authoredNormals.get(keyOf(b))
            if (normalA && normalB)
              authoredNormals.set(
                keyOf(intersection),
                normalA.clone().lerp(normalB, ratio).normalize()
              )
            for (const weights of [
              headWeights,
              nodWeights,
              strandWeights,
              neckWeights,
            ]) {
              weights.set(
                keyOf(intersection),
                (weights.get(keyOf(a)) ?? 0) * (1 - ratio) +
                  (weights.get(keyOf(b)) ?? 0) * ratio
              )
            }
            clipped.push(intersection)
          }
        }
        for (let index = 1; index + 1 < clipped.length; index += 1) {
          const face = [clipped[0], clipped[index], clipped[index + 1]]
          append(face, false, leftPositions)
        }
      }
      previousFaces += (leftPositions.length * 2 + tailPositions.length) / 9
      const reducePart = (points: number[], mirror: boolean) => {
        if (!points.length) return
        const part = new THREE.BufferGeometry()
        part.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(points, 3)
        )
        const influence = new Float32Array(points.length / 3)
        for (let index = 0; index < influence.length; index += 1) {
          influence[index] =
            headWeights.get(
              vertexKey(
                points[index * 3],
                points[index * 3 + 1],
                points[index * 3 + 2]
              )
            ) ?? 0
        }
        part.setAttribute(
          'headInfluence',
          new THREE.Float32BufferAttribute(influence, 1)
        )
        const result = simplifyModelGeometry(part, {
          preservePoint: preserveFace,
        })
        faceSurfacePreserved &&= result.detailsPreserved
        if (mirror) {
          const neckResult = simplifyNeckGeometry(result.geometry, (point) => {
            const key = vertexKey(point.x, point.y, point.z)
            neckOffset.copy(point).sub(neckBottom)
            const height = neckOffset.dot(neckAxis)
            const radius = neckOffset
              .addScaledVector(neckAxis, -height)
              .length()
            return (
              ((neckWeights.get(key) ?? 0) > 0.2 ||
                (height >= 0 && height <= neckLength && radius < 0.3)) &&
              (strandWeights.get(key) ?? 0) < 0.2
            )
          })
          neckFacesBefore += neckResult.before * 2
          neckFacesAfter += neckResult.after * 2
          neckError = Math.max(neckError, neckResult.error)
          neckContourPreserved &&= neckResult.contourPreserved
          const headResult = simplifyHeadGeometry(result.geometry, preserveFace)
          headFacesBefore += headResult.before * 2
          headFacesAfter += headResult.after * 2
          headError = Math.max(headError, headResult.error)
          headContourPreserved &&= headResult.contourPreserved
        }
        maximumError = Math.max(maximumError, result.error)
        contourPreserved &&= result.contourPreserved
        const positions = result.geometry.getAttribute('position')
        const indices = result.geometry.index!
        for (let index = 0; index < indices.count; index += 3) {
          const face = [0, 1, 2].map((offset) =>
            new THREE.Vector3().fromBufferAttribute(
              positions,
              indices.getX(index + offset)
            )
          )
          append(face)
          if (mirror) append(face, true)
        }
        result.geometry.dispose()
        part.dispose()
      }
      // 左侧细减后镜像保证对齐；尾巴单独减面，保留现有偏转和轮廓。
      reducePart(leftPositions, true)
      reducePart(tailPositions, false)
      const symmetric = new THREE.BufferGeometry()
      symmetric.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(symmetricPositions, 3)
      )
      simplifiedFaces += symmetricPositions.length / 9
      surfaceParts.push(symmetric)
      const surfacePositions = symmetric.getAttribute('position')
      for (let index = 0; index < surfacePositions.count; index += 1) {
        const key = vertexKey(
          surfacePositions.getX(index),
          surfacePositions.getY(index),
          surfacePositions.getZ(index)
        )
        globalHeadWeights.set(
          key,
          Math.max(globalHeadWeights.get(key) ?? 0, headWeights.get(key) ?? 0)
        )
        globalNodWeights.set(
          key,
          Math.max(globalNodWeights.get(key) ?? 0, nodWeights.get(key) ?? 0)
        )
        globalNeckWeights.set(
          key,
          Math.max(globalNeckWeights.get(key) ?? 0, neckWeights.get(key) ?? 0)
        )
        globalStrandWeights.set(
          key,
          Math.max(
            globalStrandWeights.get(key) ?? 0,
            strandWeights.get(key) ?? 0
          )
        )
      }
      simplified.dispose()
      geometry.dispose()
    })
    // 原贴图材质边界不再是金属表面的边界，跨网格焊接后统一计算法线。
    const combined = mergeGeometries(surfaceParts, false)!
    const surface = mergeVertices(combined)
    combined.dispose()
    surfaceParts.forEach((part) => part.dispose())
    const headPositions = surface.getAttribute('position')
    const headIndices = surface.index!
    const neighbors = Array.from(
      { length: headPositions.count },
      () => new Set<number>()
    )
    for (let offset = 0; offset < headIndices.count; offset += 3) {
      const triangle = [0, 1, 2].map((item) => headIndices.getX(offset + item))
      for (let edge = 0; edge < 3; edge += 1) {
        const a = triangle[edge],
          b = triangle[(edge + 1) % 3]
        neighbors[a].add(b)
        neighbors[b].add(a)
      }
    }
    // 原模型有独立的微小牙齿壳体，统一金属后会穿出下巴；仅移除这些孤立壳体。
    const visited = new Set<number>()
    const dentalVertices = new Set<number>()
    for (let index = 0; index < headPositions.count; index += 1) {
      if (visited.has(index)) continue
      const pending = [index],
        component: number[] = []
      const bounds = new THREE.Box3()
      let headOnly = true
      while (pending.length) {
        const current = pending.pop()!
        if (visited.has(current)) continue
        visited.add(current)
        component.push(current)
        const point = new THREE.Vector3().fromBufferAttribute(
          headPositions,
          current
        )
        bounds.expandByPoint(point)
        headOnly &&=
          (globalHeadWeights.get(vertexKey(point.x, point.y, point.z)) ?? 0) >
          0.9
        for (const next of neighbors[current])
          if (!visited.has(next)) pending.push(next)
      }
      if (
        headOnly &&
        component.length <= 12 &&
        bounds.getSize(new THREE.Vector3()).length() < 0.08
      )
        component.forEach((item) => dentalVertices.add(item))
    }
    const visibleIndices: number[] = []
    for (let offset = 0; offset < headIndices.count; offset += 3) {
      const triangle = [0, 1, 2].map((item) => headIndices.getX(offset + item))
      if (!triangle.some((item) => dentalVertices.has(item)))
        visibleIndices.push(...triangle)
    }
    const removedDentalFaces = (headIndices.count - visibleIndices.length) / 3
    simplifiedFaces -= removedDentalFaces
    surface.setIndex(visibleIndices)
    surface.setAttribute(
      'headInfluence',
      new THREE.Float32BufferAttribute(
        Array.from(
          { length: headPositions.count },
          (_, index) =>
            globalHeadWeights.get(
              vertexKey(
                headPositions.getX(index),
                headPositions.getY(index),
                headPositions.getZ(index)
              )
            ) ?? 0
        ),
        1
      )
    )
    const weldedNeck = simplifyWeldedNeckGeometry(
      surface,
      (point) => {
        const key = vertexKey(point.x, point.y, point.z)
        neckOffset.copy(point).sub(neckBottom)
        const height = neckOffset.dot(neckAxis)
        const radius = neckOffset.addScaledVector(neckAxis, -height).length()
        return (
          ((globalNeckWeights.get(key) ?? 0) > 0.2 ||
            (height >= 0 && height <= neckLength && radius < 0.3)) &&
          (globalStrandWeights.get(key) ?? 0) < 0.2
        )
      },
      center.x
    )
    neckFacesBefore = weldedNeck.before
    neckFacesAfter = weldedNeck.after
    neckError = weldedNeck.error
    neckContourPreserved &&= weldedNeck.contourPreserved
    simplifiedFaces = surface.index!.count / 3
    const restHeadPositions = new Float32Array(headPositions.array)
    surface.computeVertexNormals()
    const surfacePositions = surface.getAttribute('position') as InstanceType<
      typeof THREE.BufferAttribute
    >
    const normals = surface.getAttribute('normal') as InstanceType<
      typeof THREE.BufferAttribute
    >
    for (let index = 0; index < surfacePositions.count; index += 1) {
      const key = vertexKey(
        restHeadPositions[index * 3],
        restHeadPositions[index * 3 + 1],
        restHeadPositions[index * 3 + 2]
      )
      const originalNormal = authoredNormals.get(key)
      if (originalNormal && (globalHeadWeights.get(key) ?? 0) > 0.9) {
        // 下巴采用焊接后的平滑法线，并向上渐变回原法线，保留眼部原有造型。
        const chinBlend =
          (1 -
            THREE.MathUtils.smoothstep(
              surfacePositions.getY(index),
              headPivot.y + 0.12,
              headPivot.y + 0.22
            )) *
          THREE.MathUtils.smoothstep(surfacePositions.getZ(index), 0, 0.1)
        const normal = originalNormal
          .clone()
          .lerp(
            new THREE.Vector3().fromBufferAttribute(normals, index),
            chinBlend
          )
        normal.normalize()
        normals.setXYZ(index, normal.x, normal.y, normal.z)
      }
      // 镜像中线只有一个共享顶点，不能直接沿用某一侧的法线横向分量。
      // 将中线法线投影到对称平面，避免下巴两侧出现反向的金属反射接缝。
      if (
        (globalHeadWeights.get(key) ?? 0) > 0.9 &&
        Math.abs(surfacePositions.getX(index) - center.x) < 0.0002
      ) {
        const normal = new THREE.Vector3(
          0,
          normals.getY(index),
          normals.getZ(index)
        ).normalize()
        normals.setXYZ(index, normal.x, normal.y, normal.z)
      }
    }
    const weights = new Float32Array(surfacePositions.count)
    const nodWeights = new Float32Array(surfacePositions.count)
    for (let index = 0; index < surfacePositions.count; index += 1) {
      weights[index] =
        globalHeadWeights.get(
          vertexKey(
            restHeadPositions[index * 3],
            restHeadPositions[index * 3 + 1],
            restHeadPositions[index * 3 + 2]
          )
        ) ?? 0
      nodWeights[index] =
        globalNodWeights.get(
          vertexKey(
            restHeadPositions[index * 3],
            restHeadPositions[index * 3 + 1],
            restHeadPositions[index * 3 + 2]
          )
        ) ?? 0
    }
    return {
      positions: Array.from(surfacePositions.array),
      normals: Array.from(normals.array),
      weights: Array.from(weights),
      nodWeights: Array.from(nodWeights),
      indices: Array.from(surface.index!.array),
      center: center.toArray(),
      headPivot: headPivot.toArray(),
      headNodPivot: neckTop
        .clone()
        .add(new THREE.Vector3(0, -0.04, 0))
        .toArray(),
      size: size.toArray(),
      stats: {
        originalFaces,
        simplifiedFaces,
        removedDentalFaces,
        previousFaces,
        simplificationError: maximumError,
        contourPreserved,
        faceSurfacePreserved,
        neckFacesBefore,
        neckFacesAfter,
        neckError,
        neckContourPreserved,
        headFacesBefore,
        headFacesAfter,
        headError,
        headContourPreserved,
      },
    }
  } finally {
    decoder.dispose()
  }
}
