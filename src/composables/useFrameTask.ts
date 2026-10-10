import { onScopeDispose } from 'vue'

/** Coalesce events into one cancellable task per animation frame. */
export function useFrameTask(task: () => void) {
  let frame: number | null = null
  const cancel = () => {
    if (frame !== null) window.cancelAnimationFrame(frame)
    frame = null
  }
  const schedule = () => {
    if (frame !== null || typeof window === 'undefined') return
    frame = window.requestAnimationFrame(() => {
      frame = null
      task()
    })
  }
  onScopeDispose(cancel)
  return { schedule, cancel }
}
