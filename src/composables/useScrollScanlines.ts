import { watchEffect } from 'vue'

import '@/assets/style/scrollScanlines.less'

interface ScanlineBinding {
  users: number
  dispose: () => void
}

const bindings = new WeakMap<HTMLElement, ScanlineBinding>()

/** 多个组件共享滚动容器时只绑定一次，最后一个使用者卸载后清理。 */
export function useScrollScanlines(
  target: () => HTMLElement | null | undefined
) {
  watchEffect(
    (onCleanup) => {
      const element = target()
      if (!element) return
      let binding = bindings.get(element)
      if (!binding) {
        let frame = 0
        const measure = () => {
          frame = 0
          element.classList.toggle('scanlines-top', element.scrollTop > 1)
          element.classList.toggle(
            'scanlines-bottom',
            element.scrollTop + element.clientHeight < element.scrollHeight - 1
          )
        }
        const schedule = () => {
          if (!frame) frame = requestAnimationFrame(measure)
        }
        const resize = new ResizeObserver(schedule)
        // 观察内容尺寸，覆盖异步图片加载、切换分类和折叠面板。
        const observeContent = () => {
          resize.disconnect()
          resize.observe(element)
          for (const child of element.children) resize.observe(child)
          schedule()
        }
        const mutation = new MutationObserver(observeContent)
        mutation.observe(element, { childList: true })
        element.classList.add('no-rem-scroll-scanlines')
        element.addEventListener('scroll', schedule, { passive: true })
        element.addEventListener('load', schedule, true)
        observeContent()
        binding = {
          users: 0,
          dispose: () => {
            cancelAnimationFrame(frame)
            resize.disconnect()
            mutation.disconnect()
            element.removeEventListener('scroll', schedule)
            element.removeEventListener('load', schedule, true)
            element.classList.remove(
              'no-rem-scroll-scanlines',
              'scanlines-top',
              'scanlines-bottom'
            )
            bindings.delete(element)
          },
        }
        bindings.set(element, binding)
      }
      binding.users++
      onCleanup(() => {
        if (--binding.users === 0) binding.dispose()
      })
    },
    { flush: 'post' }
  )
}

/** 图片列表复用最近的实际滚动容器，避免在内容层重复叠加遮罩。 */
export function findScanlineScrollRoot(content: HTMLElement | null) {
  let parent = content?.parentElement
  while (
    parent &&
    parent !== document.body &&
    parent !== document.documentElement
  ) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent
    parent = parent.parentElement
  }
  return null
}
