import { computed } from 'vue'
import {
  createSharedComposable,
  useDocumentVisibility,
  usePreferredReducedMotion,
} from '@vueuse/core'

// 共享系统状态与订阅；各动画仍独立按需调度，不创建常驻 RAF。
export const useMotionActivity = createSharedComposable(() => {
  const visibility = useDocumentVisibility()
  const reducedMotion = usePreferredReducedMotion()
  const motionAllowed = computed(
    () => visibility.value !== 'hidden' && reducedMotion.value !== 'reduce'
  )
  return { visibility, reducedMotion, motionAllowed }
})
