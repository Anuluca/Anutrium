import { inject, onBeforeUnmount, type Ref, ref, watch } from 'vue'

import { useSiteLoading } from '@/stores/siteLoading'

export function useTempleEntry() {
  const routeEntryActive = inject<Ref<boolean>>(
    'route-entry-active',
    ref(false)
  )
  const siteEntryActive = inject<Ref<boolean>>(
    'site-scene-entry-active',
    ref(true)
  )
  const siteLoading = useSiteLoading()
  let disposed = false
  let cancelWait: (() => void) | undefined

  const waitUntil = (ready: () => boolean) =>
    new Promise<void>((resolve) => {
      if (disposed || ready()) return resolve()
      const stop = watch(ready, (value) => {
        if (value) cancelWait?.()
      })
      cancelWait = () => {
        stop()
        cancelWait = undefined
        resolve()
      }
    })

  // 三项条件须同时满足，避免等待加载期间路由重新进入过渡时提前播放场景。
  const waitForRouteEnter = () =>
    waitUntil(
      () =>
        !routeEntryActive.value &&
        siteEntryActive.value &&
        siteLoading.presentationReady
    )

  onBeforeUnmount(() => {
    disposed = true
    cancelWait?.()
  })

  return { siteEntryActive, waitForRouteEnter }
}
