import {
  getCurrentInstance,
  onBeforeMount,
  onUnmounted,
  watch,
  type WatchSource,
  type WatchStopHandle,
} from 'vue'

import { setSmoothScrollLocked } from '@/utils/smoothScroll'

export const useOverlayScrollLock = (
  namespace: string,
  locked: WatchSource<boolean>
) => {
  const key = `${namespace}-${getCurrentInstance()?.uid ?? 'fallback'}`
  let stopWatching: WatchStopHandle | undefined

  onBeforeMount(() => {
    stopWatching = watch(
      locked,
      (isLocked) => setSmoothScrollLocked(key, isLocked),
      { flush: 'sync', immediate: true }
    )
  })

  onUnmounted(() => {
    stopWatching?.()
    setSmoothScrollLocked(key, false)
  })
}
