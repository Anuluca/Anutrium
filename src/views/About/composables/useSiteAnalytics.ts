import {
  computed,
  onBeforeUnmount,
  type Ref,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useDocumentVisibility } from '@vueuse/core'

import { useIntersectionActivation } from '@/composables/useIntersectionActivation'
import {
  readAnalyticsRealtime,
  readAnalyticsSummary,
} from '@/utils/analyticsResource'

import type { RealtimeAnalytics, SiteAnalytics } from '@/types/siteAnalytics'

export function useSiteAnalytics(root: Ref<HTMLElement | undefined>) {
  const days = ref(30)
  const data = shallowRef<SiteAnalytics | null>(null)
  const realtime = shallowRef<RealtimeAnalytics | null>(null)
  const loading = ref(false)
  const error = ref('')
  const activated = ref(false)
  const nearViewport = ref(false)
  const visibility = useDocumentVisibility()
  let disposed = false
  let summaryController: AbortController | undefined
  let realtimeController: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  const active = computed(
    () => nearViewport.value && visibility.value !== 'hidden'
  )

  async function load(force = false) {
    const current = ++generation
    summaryController?.abort()
    const controller = new AbortController()
    summaryController = controller
    loading.value = true
    error.value = ''
    try {
      const result = await readAnalyticsSummary(
        days.value,
        controller.signal,
        force
      )
      if (current === generation && !disposed) data.value = result
    } catch (cause) {
      if (current === generation && !controller.signal.aborted && !disposed)
        error.value =
          cause instanceof Error && cause.message === 'setup'
            ? 'setup'
            : 'network'
    } finally {
      if (current === generation) loading.value = false
    }
  }

  async function loadRealtime(force = false) {
    if (!active.value || realtimeController) return
    clearTimeout(timer)
    const controller = new AbortController()
    realtimeController = controller
    try {
      const result = await readAnalyticsRealtime(controller.signal, force)
      if (!controller.signal.aborted && !disposed) realtime.value = result
    } catch {
      if (!controller.signal.aborted && !disposed) realtime.value = null
    } finally {
      if (realtimeController === controller) {
        realtimeController = undefined
        if (active.value)
          timer = setTimeout(() => {
            void load()
            void loadRealtime()
          }, 60000)
      }
    }
  }
  const pause = () => {
    clearTimeout(timer)
    timer = undefined
    summaryController?.abort()
    realtimeController?.abort()
    realtimeController = undefined
  }
  watch(active, (enabled) => {
    if (!enabled) {
      pause()
      return
    }
    activated.value = true
    void load()
    void loadRealtime()
  })
  const retry = () => {
    void load(true)
    void loadRealtime(true)
  }
  watch(days, () => {
    if (activated.value && active.value) void load()
  })
  useIntersectionActivation(
    () => root.value || null,
    ([entry]) => {
      nearViewport.value = entry?.isIntersecting ?? false
    },
    {
      rootMargin: '240px',
      onUnsupported: () => {
        nearViewport.value = true
      },
    }
  )
  onBeforeUnmount(() => {
    disposed = true
    generation++
    pause()
  })
  return { days, data, realtime, loading, error, activated, retry }
}
