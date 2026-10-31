import { onScopeDispose, ref, watch } from 'vue'

/** 加载线与百分比共用同一推进规则，卸载时取消尚未执行的帧。 */
export function useAnimatedProgress(
  progress: () => number,
  animate: () => boolean
) {
  const displayed = ref(animate() ? 0 : progress())
  let frame: number | undefined
  let lastTime = 0
  const cancel = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  }
  const advance = (now: number) => {
    frame = undefined
    displayed.value = Math.min(
      progress(),
      displayed.value + Math.min((now - lastTime) / 1000, 0.1) * 100
    )
    lastTime = now
    if (displayed.value < progress()) frame = requestAnimationFrame(advance)
  }
  watch(
    [progress, animate],
    ([value, animated]) => {
      if (!animated || value < displayed.value) {
        cancel()
        displayed.value = value
      } else if (
        frame === undefined &&
        value > displayed.value &&
        typeof window !== 'undefined'
      ) {
        lastTime = performance.now()
        frame = requestAnimationFrame(advance)
      }
    },
    { immediate: true }
  )
  onScopeDispose(cancel)
  return displayed
}
