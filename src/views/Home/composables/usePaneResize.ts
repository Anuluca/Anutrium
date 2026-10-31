import { nextTick, ref } from 'vue'

interface PaneResizeOptions {
  pane: HTMLElement
  content: HTMLElement[]
  scroll: HTMLElement
  update: () => void
  refresh: () => void
}

// 二级和三级模块共用：外层调整边界，内层抵消水平缩放。
export function usePaneResize() {
  const resizing = ref(false)
  const animations = new Set<Animation>()
  let revision = 0
  const cancel = () => {
    revision++
    animations.forEach((animation) => animation.cancel())
    animations.clear()
    resizing.value = false
  }
  const animate = (
    element: HTMLElement,
    frames: Keyframe[],
    duration: number
  ) => {
    const animation = element.animate(frames, {
      duration,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'both',
    })
    animations.add(animation)
    return animation.finished
  }
  const run = async ({
    pane,
    content,
    scroll,
    update,
    refresh,
  }: PaneResizeOptions) => {
    if (resizing.value) return
    const current = ++revision
    resizing.value = true
    const scrollTop = scroll.scrollTop
    const before = pane.getBoundingClientRect()
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    try {
      update()
      await nextTick()
      if (current !== revision) return
      const after = pane.getBoundingClientRect()
      scroll.scrollTop = scrollTop
      const scale = before.width / after.width
      const offset = before.x - after.x
      const duration = reduced ? 1 : 1200
      const inverseFrames = Array.from({ length: 33 }, (_, index) => {
        const progress = index / 32
        return {
          offset: progress,
          transform: `scaleX(${1 / (scale + (1 - scale) * progress)})`,
        }
      })
      await Promise.all([
        animate(
          pane,
          [
            { transform: `translateX(${offset}px) scaleX(${scale})` },
            { transform: 'none' },
          ],
          duration
        ),
        ...content.map((element) => animate(element, inverseFrames, duration)),
      ])
      if (current !== revision) return
      animations.forEach((animation) => animation.cancel())
      animations.clear()
      scroll.scrollTop = scrollTop
      refresh()
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        throw error
    } finally {
      if (current === revision) resizing.value = false
    }
  }
  return { resizing, cancel, run }
}
