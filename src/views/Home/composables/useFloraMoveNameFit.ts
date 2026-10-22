import { onBeforeUnmount, onMounted, type Ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'

import { useFrameTask } from '@/composables/useFrameTask'

/** 仅缩小移动端溢出的招式名称；集中读写四张卡片，不在动画帧中持续测量。 */
export function useFloraMoveNameFit(
  panel: Ref<HTMLElement | null>,
  mobile: () => boolean | undefined,
  content: () => unknown[]
) {
  const fit = () => {
    const names = Array.from(
      panel.value?.querySelectorAll<HTMLElement>(
        '.flora-move-card__name > span'
      ) ?? []
    )
    for (const name of names) name.style.removeProperty('font-size')
    if (!mobile()) return
    const sizes = names.map((name) => {
      const available = name.parentElement!.getBoundingClientRect().width
      const natural = name.getBoundingClientRect().width
      return { name, ratio: natural > 0 ? Math.min(1, available / natural) : 1 }
    })
    for (const { name, ratio } of sizes) {
      if (ratio < 1) name.style.fontSize = `${ratio * 100}%`
    }
  }
  const { schedule } = useFrameTask(fit)
  useResizeObserver(panel, schedule)
  watch(content, schedule, { flush: 'post' })
  onMounted(() => {
    schedule()
    void document.fonts.ready.then(schedule)
    document.fonts.addEventListener('loadingdone', schedule)
  })
  onBeforeUnmount(() =>
    document.fonts.removeEventListener('loadingdone', schedule)
  )
}
