import { computed, ref, watch } from 'vue'

import { createScanlineMask } from '@/utils/scanlineMask'

/** 相册与视频共用展开交互；网络请求、分页和媒体释放仍由各自模块负责。 */
export function useFloraMediaPanel(
  mobile: () => boolean | undefined,
  onExpandedChange: (expanded: boolean) => void
) {
  const expanded = ref(false)
  const hasToggled = ref(false)
  const overflowMask = computed(() =>
    createScanlineMask({
      seed: 'flora-album-overflow',
      lines: mobile() ? 16 : 8,
      solidFrom: 0.9,
      irregularity: 0.65,
    })
  )
  watch(expanded, (value) => {
    hasToggled.value = true
    onExpandedChange(value)
  })
  const toggle = () => {
    expanded.value = !expanded.value
  }
  const toggleFromSurface = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return
    // 交互元素保留自身行为；面板空白区域才切换展开状态。
    if (event.target.closest('button, a, input, video, [role="button"]')) return
    toggle()
  }
  const closeExpanded = () => {
    if (!expanded.value) return false
    expanded.value = false
    return true
  }
  return {
    expanded,
    hasToggled,
    overflowMask,
    toggle,
    toggleFromSurface,
    closeExpanded,
  }
}
