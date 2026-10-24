import * as THREE from 'three'

type Renderable = THREE.Mesh | THREE.Line | THREE.Sprite

/** 独立材质快照隔离并行编译轮询；入场帧不会改写待编译材质的 currentProgram。 */
export function createShaderWarmup(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  focusedUnlit: (material: THREE.Material) => boolean = () => false
) {
  const retained = new Set<THREE.Material>()
  const scratch = new THREE.WebGLRenderTarget(1, 1)
  const empty = new THREE.Scene()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  let cancelled = false
  let resumeIdle: (() => void) | undefined
  let cancelIdle: (() => void) | undefined
  const capture = (spotCount: number, clipCount: number) => {
    const copies = new Map<THREE.Material, THREE.Material>()
    const objects: Renderable[] = []
    scene.traverse((object) => {
      if (
        !(
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Sprite
        )
      )
        return
      const values = Array.isArray(object.material)
        ? object.material
        : [object.material]
      if (
        !values.some(
          (value) =>
            value.visible &&
            (value.clippingPlanes?.length || 0) === clipCount &&
            (spotCount === 0 ||
              value instanceof THREE.MeshStandardMaterial ||
              (value instanceof THREE.ShaderMaterial && value.lights) ||
              focusedUnlit(value) ||
              object instanceof THREE.Line)
        )
      )
        return
      const snapshot = Object.create(object) as Renderable
      const clone = (value: THREE.Material) => {
        let copy = copies.get(value)
        if (!copy) {
          copy = value.clone()
          copy.onBeforeCompile = value.onBeforeCompile
          const key = value.customProgramCacheKey()
          copy.customProgramCacheKey = () => key
          // ShaderMaterial.clone 默认复制纹理 uniform；预热引用原资源，不上传贴图副本。
          if (
            copy instanceof THREE.ShaderMaterial &&
            value instanceof THREE.ShaderMaterial
          )
            copy.uniforms = value.uniforms
          copies.set(value, copy)
          retained.add(copy)
        }
        return copy
      }
      snapshot.material = Array.isArray(object.material)
        ? values.map(clone)
        : clone(values[0])
      objects.push(snapshot)
    })
    const root = new THREE.Group()
    root.traverse = (visit) => objects.forEach(visit)
    const lighting = new THREE.Scene()
    lighting.environment = scene.environment
    lighting.environmentIntensity = scene.environmentIntensity
    lighting.environmentRotation.copy(scene.environmentRotation)
    lighting.fog = scene.fog
    scene.traverseVisible((object) => {
      if (object instanceof THREE.Light && !(object instanceof THREE.SpotLight))
        lighting.add(object.clone(false))
    })
    for (let i = 0; i < spotCount; i++) lighting.add(new THREE.SpotLight())
    return async () => {
      if (cancelled) return
      const target = renderer.getRenderTarget()
      const planes = renderer.clippingPlanes
      let compiling: Promise<unknown>
      // compileAsync 的编译提交为同步阶段。只在该阶段临时设置裁切槽数；await 前完整恢复。
      // 空场景写入 1×1 离屏目标，不清空用户正在观看的默认帧缓冲。
      try {
        renderer.clippingPlanes = clipCount ? [plane] : []
        renderer.setRenderTarget(scratch)
        renderer.render(empty, camera)
        renderer.setRenderTarget(target)
        compiling = renderer.compileAsync(root, camera, lighting)
      } finally {
        renderer.clippingPlanes = planes
        renderer.setRenderTarget(scratch)
        renderer.render(empty, camera)
        renderer.setRenderTarget(target)
      }
      await compiling
    }
  }
  const yieldToBrowser = () =>
    new Promise<void>((resolve) => {
      if (cancelled) {
        resolve()
        return
      }
      const resume = () => {
        resumeIdle = undefined
        cancelIdle = undefined
        resolve()
      }
      resumeIdle = resume
      if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(resume, { timeout: 50 })
        cancelIdle = () => cancelIdleCallback(id)
      } else {
        const id = setTimeout(resume, 0)
        cancelIdle = () => clearTimeout(id)
      }
    })
  return {
    capture,
    async run(jobs: (() => Promise<void>)[], idle = false) {
      for (const job of jobs) {
        if (idle) await yieldToBrowser()
        if (cancelled) return
        await job()
      }
    },
    cancel() {
      cancelled = true
      cancelIdle?.()
      resumeIdle?.()
    },
    dispose() {
      retained.forEach((value) => value.dispose())
      retained.clear()
      scratch.dispose()
    },
  }
}
