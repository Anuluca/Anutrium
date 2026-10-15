import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'

import { templePresentations } from '@/config/templePresentation'
import { visualState } from '@/stores'

// 首页构图与加载线使用同一设备判定，保证触屏桌面设备的地平线也能接续。
export function useTemplePresentation() {
  const visual = visualState()
  const touchDevice = useMediaQuery('(pointer: coarse)')
  return computed(() =>
    visual.deviceType === 'desktop' && !touchDevice.value
      ? templePresentations.desktop
      : templePresentations.mobile
  )
}
