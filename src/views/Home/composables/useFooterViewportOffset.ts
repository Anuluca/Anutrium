import { onMounted, ref } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'

// 聚焦布局和标题共用页脚避让测量；监听器由组件作用域自动清理。
export function useFooterViewportOffset() {
  const footer = ref<HTMLElement | null>(null)
  const offset = ref(0)
  const sync = () => {
    const element = footer.value
    offset.value =
      element && getComputedStyle(element).display !== 'none'
        ? Math.max(0, window.innerHeight - element.getBoundingClientRect().top)
        : 0
  }
  onMounted(() => {
    footer.value = document.querySelector<HTMLElement>('.footer-com')
    sync()
  })
  useResizeObserver(footer, sync)
  useEventListener('resize', sync)
  return offset
}
