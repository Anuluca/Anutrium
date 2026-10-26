import { computed, inject, type InjectionKey, type Ref, ref } from 'vue'

import { useIntersectionActivation } from './useIntersectionActivation'
import { useMotionActivity } from './useMotionActivity'

export const decorationActivityKey: InjectionKey<Ref<boolean>> = Symbol(
  'decoration-activity'
)

export function useDecorationActivity(element: Ref<HTMLElement | null>) {
  const permitted = inject(decorationActivityKey, ref(true))
  const visible = ref(false)
  const { visibility } = useMotionActivity()
  useIntersectionActivation(
    element,
    ([entry]) => {
      visible.value = entry?.isIntersecting ?? false
    },
    { onUnsupported: () => (visible.value = true) }
  )
  return computed(
    () => permitted.value && visible.value && visibility.value !== 'hidden'
  )
}
