import * as THREE from 'three'

/** 控制灯不挂入场景；最多两盏真实灯承接聚焦交接，稳定总览不保留零亮度槽位。 */
export function createSpotLightPool(
  scene: THREE.Scene,
  sources: readonly THREE.SpotLight[]
) {
  const lights = Array.from({ length: 2 }, () => {
    const light = new THREE.SpotLight()
    light.visible = false
    light.intensity = 0
    scene.add(light, light.target)
    return light
  })
  const selected: (THREE.SpotLight | undefined)[] = [undefined, undefined]
  const assignments: (THREE.SpotLight | undefined)[] = [undefined, undefined]
  let warmupCount: number | null = null
  const update = (enabled = true) => {
    selected.fill(undefined)
    if (warmupCount !== null) {
      for (let i = 0; i < warmupCount; i++) selected[i] = sources[i]
    } else if (enabled) {
      for (const source of sources) {
        // 仅截断不可见的浮点尾数；快速连续切换时保留最强的两个贡献。
        if (source.intensity <= 0.0001) continue
        if (!selected[0] || source.intensity > selected[0].intensity) {
          selected[1] = selected[0]
          selected[0] = source
        } else if (!selected[1] || source.intensity > selected[1].intensity)
          selected[1] = source
      }
    }
    let changed = false
    // 已占用的源尽量留在原槽，避免交接时无意义地互换灯的 uniform。
    for (let i = 0; i < lights.length; i++) {
      const previous = assignments[i]
      if (previous && selected.includes(previous)) {
        assignments[i] = previous
        selected[selected.indexOf(previous)] = undefined
      } else assignments[i] = undefined
    }
    for (let i = 0; i < lights.length; i++) {
      if (!assignments[i]) {
        const index = selected.findIndex((source) => source !== undefined)
        if (index !== -1) {
          assignments[i] = selected[index]
          selected[index] = undefined
        }
      }
      const light = lights[i]
      const source = assignments[i]
      const visible = source !== undefined
      changed ||= light.visible !== visible
      light.visible = visible
      if (!source) {
        light.intensity = 0
        continue
      }
      const intensity = warmupCount === null ? source.intensity : 1
      changed ||=
        light.intensity !== intensity ||
        !light.color.equals(source.color) ||
        !light.position.equals(source.position) ||
        !light.target.position.equals(source.target.position) ||
        light.distance !== source.distance ||
        light.angle !== source.angle ||
        light.penumbra !== source.penumbra ||
        light.decay !== source.decay
      light.color.copy(source.color)
      light.position.copy(source.position)
      light.target.position.copy(source.target.position)
      light.intensity = intensity
      light.distance = source.distance
      light.angle = source.angle
      light.penumbra = source.penumbra
      light.decay = source.decay
    }
    return changed
  }
  return {
    lights,
    sources,
    objects: lights.flatMap((light) => [light, light.target]),
    get activeCount() {
      let count = 0
      for (const light of lights) if (light.visible) count++
      return count
    },
    update,
    setWarmupCount(value: number | null) {
      warmupCount = value
    },
    dispose() {
      for (const light of lights) {
        scene.remove(light, light.target)
        light.dispose()
      }
    },
  }
}
