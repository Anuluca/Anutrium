import * as THREE from 'three'

import type {
  TempleLabelQuality,
  TempleLabelTier,
} from '@/config/templeLabelQuality'
import {
  loadTempleLabelModel,
  type TempleLabelAsset,
} from '@/utils/templeLabelModel'

// 以 CSS 像素计量，DPR 不参与档位选择；进入/退出阈值分离，避免临界尺寸抖动。
export function chooseTempleLabelTier(
  current: TempleLabelTier,
  height: number,
  frontDot: number
): TempleLabelTier {
  if (
    !Number.isFinite(height) ||
    !Number.isFinite(frontDot) ||
    height <= 0 ||
    frontDot < 0.96
  )
    return 'high'
  if (current === 'flat' && height < 16 && frontDot >= 0.985) return 'flat'
  if (height <= 12 && frontDot >= 0.995) return 'flat'
  if (height >= (current === 'high' ? 28 : 36)) return 'high'
  return 'low'
}

export function fillTempleLabelGeometry(
  geometry: THREE.BufferGeometry,
  asset: TempleLabelAsset
) {
  for (const name of ['position', 'normal', 'statueLabelCharacter'] as const) {
    const attribute = asset.metadata.attributes[name]
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(
        new Float32Array(asset.buffer, attribute.offset, attribute.count),
        name === 'statueLabelCharacter' ? 1 : 3
      )
    )
  }
  const indices = asset.metadata.attributes.indices
  geometry.setIndex(
    new THREE.BufferAttribute(
      new Uint16Array(asset.buffer, indices.offset, indices.count),
      1
    )
  )
  return geometry
}

interface Options {
  mode: TempleLabelQuality
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
  initial: TempleLabelAsset
  register: (geometry: THREE.BufferGeometry) => THREE.BufferGeometry
  invalidate: () => void
  changed: (asset: TempleLabelAsset) => void
  load?: (tier: TempleLabelTier) => Promise<TempleLabelAsset>
}

export function createTempleLabelLod(options: Options) {
  const load = options.load ?? loadTempleLabelModel
  const assets = new Map<TempleLabelTier, TempleLabelAsset>([
    [options.initial.quality, options.initial],
  ])
  const geometries = new Map<TempleLabelTier, THREE.BufferGeometry>([
    [options.initial.quality, options.mesh.geometry],
  ])
  const pending = new Set<TempleLabelTier>()
  const retryAfter = new Map<TempleLabelTier, number>()
  const top = new THREE.Vector3(),
    bottom = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    direction = new THREE.Vector3()
  let current = options.initial.quality
  let disposed = false
  const apply = (tier: TempleLabelTier) => {
    if (current === tier || disposed) return
    const asset = assets.get(tier)
    if (!asset) {
      // 平面版离开适用范围时先恢复已缓存高档，不能等待网络而继续显示无厚度的字形。
      if (current === 'flat' && assets.has('high')) apply('high')
      if (pending.has(tier) || performance.now() < (retryAfter.get(tier) ?? 0))
        return
      pending.add(tier)
      void load(tier)
        .then((asset) => {
          if (disposed) return
          assets.set(tier, asset)
          // 数据到达只请求原有按需帧；暂停/驻留场景由 invalidate 自身拦截。
          // 不在异步回调里创建 GPU 几何或提交过期的档位请求。
          options.invalidate()
        })
        .catch(() => {
          if (!disposed) retryAfter.set(tier, performance.now() + 30000)
        })
        .finally(() => pending.delete(tier))
      return
    }
    let geometry = geometries.get(tier)
    if (!geometry) {
      geometry = options.register(
        fillTempleLabelGeometry(new THREE.BufferGeometry(), asset)
      )
      geometries.set(tier, geometry)
    }
    options.mesh.geometry = geometry
    current = tier
    options.changed(asset)
  }
  return {
    get current() {
      return current
    },
    update(
      height: number,
      frontDot: number,
      stable: boolean,
      visible: boolean
    ) {
      if (disposed || options.mode !== 'lod' || !visible) return current
      // 显现、运镜、缩放与返回一律先用已准备的高档；仅静止、小尺寸时降级。
      apply(stable ? chooseTempleLabelTier(current, height, frontDot) : 'high')
      return current
    },
    measure(
      camera: THREE.Camera,
      halfHeight: number,
      depth: number,
      viewportHeight: number,
      stable: boolean
    ) {
      if (disposed || options.mode !== 'lod' || !options.mesh.visible)
        return current
      // 运镜期间已确定必须用高档，不做无用的屏幕尺寸投影。
      if (!stable) return this.update(0, 0, false, true)
      const mesh = options.mesh
      // 标签直接挂在无变换的 Scene 上；使用本帧的姿态，避免读取上一帧 matrixWorld。
      top
        .set(0, halfHeight, depth / 2)
        .multiply(mesh.scale)
        .applyQuaternion(mesh.quaternion)
        .add(mesh.position)
        .project(camera)
      bottom
        .set(0, -halfHeight, depth / 2)
        .multiply(mesh.scale)
        .applyQuaternion(mesh.quaternion)
        .add(mesh.position)
        .project(camera)
      normal.set(0, 0, 1).applyQuaternion(mesh.quaternion)
      direction.copy(camera.position).sub(mesh.position).normalize()
      return this.update(
        (Math.abs(top.y - bottom.y) * viewportHeight) / 2,
        normal.dot(direction),
        stable,
        true
      )
    },
    dispose() {
      disposed = true
      assets.clear()
      geometries.clear()
      pending.clear()
      // 几何统一交给场景资源集合释放，避免宿主驻留期间重复释放共享缓冲。
    },
  }
}
