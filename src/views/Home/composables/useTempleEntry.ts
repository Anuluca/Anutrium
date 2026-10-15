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

  const waitForRouteEnter = async () => {
    // 路由结束、加载线渐隐、页面准备依次开放；离场时解除等待和监听。
    await waitUntil(() => !routeEntryActive.value)
    await waitUntil(() => siteEntryActive.value)
    await waitUntil(() => siteLoading.presentationReady)
  }

  onBeforeUnmount(() => {
    disposed = true
    cancelWait?.()
  })

  return { siteEntryActive, waitForRouteEnter }
}
