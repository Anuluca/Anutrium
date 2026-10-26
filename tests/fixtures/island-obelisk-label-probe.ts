import * as THREE from 'three'

export function installObeliskLabelProbe() {
  const beforeRender = THREE.Object3D.prototype.onBeforeRender
  const stoneFrames = new WeakMap<THREE.BufferGeometry, number>()
  const samples: {
    reveal: number
    alpha: number
    rear: boolean
    stoneDrawn: boolean
  }[] = []
  THREE.Object3D.prototype.onBeforeRender = function (...args) {
    beforeRender.apply(this, args)
    const renderer = args[0]
    if (
      this instanceof THREE.Mesh &&
      this.name === 'pillar-batch' &&
      this.material instanceof THREE.MeshStandardMaterial &&
      this.material.vertexColors &&
      this.material.depthWrite
    )
      stoneFrames.set(this.geometry, renderer.info.render.frame)
    const stage = document.querySelector<HTMLElement>('.temple-stage')
    const reveal = Number(stage?.dataset.templeReveal ?? 1)
    if (reveal <= 0 || reveal >= 1) return
    if (!(this instanceof THREE.Mesh)) return
    const material = this.material as THREE.MeshBasicMaterial
    if (!material.customProgramCacheKey().startsWith('temple-label-accent-v1'))
      return
    // 读取实际编译材质的 uniform，覆盖材质 opacity 未变但着色器仍渐隐的情况。
    const uniforms = renderer.properties.get(material).uniforms
    if (!uniforms) return
    const body = this.parent?.children.find(
      (object) =>
        object instanceof THREE.Mesh &&
        object.material instanceof THREE.MeshStandardMaterial &&
        object.material.vertexColors
    ) as THREE.Mesh | undefined
    samples.push({
      reveal,
      alpha: material.opacity * (uniforms.templeReveal?.value ?? 1),
      rear: (this.parent?.parent?.position.z ?? 0) < 0,
      stoneDrawn:
        !!body && stoneFrames.get(body.geometry) === renderer.info.render.frame,
    })
  }
  return {
    samples,
    reset() {
      samples.length = 0
    },
    restore() {
      THREE.Object3D.prototype.onBeforeRender = beforeRender
    },
  }
}
