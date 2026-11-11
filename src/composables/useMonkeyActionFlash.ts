import { onBeforeUnmount } from 'vue'

import { flashActionButton } from '@/utils/flashActionButton'

export function useMonkeyActionFlash(
  options: {
    immediate?: (button: HTMLElement) => boolean
  } = {}
) {
  const flashing = new Map<HTMLElement, Animation | undefined>()
  const replaying = new WeakSet<HTMLElement>()
  let disposed = false
  onBeforeUnmount(() => {
    disposed = true
    flashing.forEach((animation) => animation?.cancel())
    flashing.clear()
  })
  async function flashBeforeAction(event: MouseEvent) {
    const button = (event.target as Element | null)?.closest<HTMLElement>(
      'button'
    )
    if (
      !button ||
      button.matches(':disabled, [data-image-entry]') ||
      replaying.has(button) ||
      options.immediate?.(button)
    )
      return
    // 分享与闪烁并行，保留浏览器原生分享所需的当前点击激活。
    if (button.classList.contains('share-button')) {
      const flash = flashActionButton(button, 240, { accentColor: '#1dcba9' })
      if (flash) {
        flashing.set(button, flash)
        void flash.finished
          .catch(() => {})
          .finally(() => flashing.delete(button))
      }
      return
    }
    event.preventDefault()
    event.stopImmediatePropagation()
    if (flashing.has(button)) return
    const flash = flashActionButton(button, 240, { accentColor: '#1dcba9' })
    flashing.set(button, flash)
    try {
      if (flash) await flash.finished
      if (disposed || !button.isConnected || button.matches(':disabled')) return
      replaying.add(button)
      try {
        button.click()
      } finally {
        replaying.delete(button)
      }
    } catch {
      /* 离场取消闪烁时，不重放点击。 */
    } finally {
      flashing.delete(button)
    }
  }
  return { flashBeforeAction }
}
