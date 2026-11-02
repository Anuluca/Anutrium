import { watchEffect } from 'vue'
import { useMediaQuery, usePreferredReducedMotion } from '@vueuse/core'
import type Lenis from 'lenis'

interface SmoothBinding {
  users: number
  instance: Lenis | null
  disposed: boolean
}
const bindings = new WeakMap<HTMLElement, SmoothBinding>()

/** 内嵌容器复用页面滚动参数；触屏和减少动态效果模式保留原生滚动。 */
export function useNestedSmoothScroll(
  target: () => HTMLElement | null | undefined
) {
  const reducedMotion = usePreferredReducedMotion()
  const touch = useMediaQuery('(hover: none) and (pointer: coarse)')
  watchEffect(
    (onCleanup) => {
      const element = target()
      if (!element || reducedMotion.value === 'reduce' || touch.value) return
      let binding = bindings.get(element)
      if (!binding) {
        binding = { users: 0, instance: null, disposed: false }
        bindings.set(element, binding)
        const current = binding
        void import('lenis').then(({ default: Lenis }) => {
          if (current.disposed) return
          current.instance = new Lenis({
            wrapper: element,
            content: (element.firstElementChild as HTMLElement) || element,
            autoRaf: true,
            autoToggle: false,
            smoothWheel: true,
            syncTouch: false,
            lerp: 0.16,
            wheelMultiplier: 1,
            // 内层确实可滚动时交给内层处理，避免一次输入滚动两个容器。
            prevent: (node) =>
              node.hasAttribute('data-lenis-nested-scroll') &&
              node.scrollHeight > node.clientHeight,
            virtualScroll: ({ event }) => {
              if (
                event.defaultPrevented ||
                (event instanceof WheelEvent && event.ctrlKey)
              )
                return false
              // 仅在内容高度变化时校准，避免 resize 重置连续滚轮的累计目标。
              if (
                current.instance &&
                current.instance.limit !==
                  Math.max(0, element.scrollHeight - element.clientHeight)
              )
                current.instance.resize()
              return true
            },
          })
        })
      }
      binding.users++
      const current = binding
      onCleanup(() => {
        if (--current.users) return
        current.disposed = true
        current.instance?.destroy()
        bindings.delete(element)
      })
    },
    { flush: 'post' }
  )
}

/** 同步内嵌 Lenis 的目标与实际位置，原生滚动模式保持相同行为。 */
export function scrollNestedTo(
  element: HTMLElement,
  top: number,
  immediate = false,
  options: { smoothNative?: boolean } = {}
) {
  const instance = bindings.get(element)?.instance
  if (instance) {
    instance.resize()
    instance.scrollTo(top, { immediate })
  } else
    element.scrollTo({
      top,
      behavior: !immediate && options.smoothNative ? 'smooth' : 'auto',
    })
}
