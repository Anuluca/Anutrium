import * as THREE from 'three'

interface Hsl {
  h: number
  s: number
  l: number
}

export interface ThemeTintEntry extends Hsl {
  color: THREE.Color
  current: THREE.Color
  start: THREE.Color
  target: THREE.Color
}

/** 只管理颜色目标与插值；场景负责材质规则、动画时间轴及渲染调度。 */
export function createThemeTint(baseColor: string) {
  const color = new THREE.Color(baseColor)
  const origin = color.getHSL({ h: 0, s: 0, l: 0 })
  const hsl = { h: 0, s: 0, l: 0 }
  const targets: ThemeTintEntry[] = []
  const byColor = new Map<THREE.Color, ThemeTintEntry>()

  const track = (value: THREE.Color) => {
    if (byColor.has(value)) return
    const base = value.getHSL({ h: 0, s: 0, l: 0 })
    if (base.s <= 0.08) return
    const entry = {
      color: value,
      ...base,
      current: value.clone(),
      start: value.clone(),
      target: value.clone(),
    }
    targets.push(entry)
    byColor.set(value, entry)
  }

  const prepare = (
    nextColor: string,
    palette: ReadonlyMap<THREE.Color, Hsl> | undefined,
    refine: (entry: ThemeTintEntry) => void
  ) => {
    color.set(nextColor).getHSL(hsl)
    for (const entry of targets) {
      const base = palette?.get(entry.color) || entry
      // 从当前过渡帧继续，连续切换时不跳回上一主题的起点。
      entry.start.copy(entry.current)
      entry.target.setHSL(
        base.h + hsl.h - origin.h,
        Math.min(1, (base.s * hsl.s) / origin.s),
        base.l
      )
      refine(entry)
    }
  }

  const apply = (progress: number) => {
    for (const entry of targets) {
      entry.current.copy(entry.start).lerp(entry.target, progress)
      entry.color.copy(entry.current)
    }
  }

  return { color, origin, targets, byColor, track, prepare, apply }
}
