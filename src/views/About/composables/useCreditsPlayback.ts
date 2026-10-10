import { type Ref, ref, watch } from 'vue'
import {
  useDocumentVisibility,
  useElementVisibility,
  usePreferredReducedMotion,
  useRafFn,
  useResizeObserver,
  useTimeoutFn,
} from '@vueuse/core'

import { useFrameTask } from '@/composables/useFrameTask'

export function useCreditsPlayback(
  enabled: Ref<boolean>,
  panelScrollRef: Ref<HTMLElement | null>
) {
  const crewContentRef = ref<HTMLElement | null>(null)
  const crewEntered = ref(false)
  const crewPlaybackReady = ref(false)
  const crewHovered = ref(false)
  const crewFocused = ref(false)
  const reducedMotion = usePreferredReducedMotion()
  const documentVisibility = useDocumentVisibility()
  const contentVisible = useElementVisibility(crewContentRef)
  const scrollEnd = ref(0)
  const measureScrollRange = () => {
    const scroller = panelScrollRef.value
    scrollEnd.value =
      scroller && crewContentRef.value
        ? Math.max(0, scroller.scrollHeight - scroller.clientHeight)
        : 0
  }
  // Geometry is refreshed when content or viewport size changes, not per frame.
  useResizeObserver([panelScrollRef, crewContentRef], measureScrollRange)
  watch([panelScrollRef, crewContentRef], measureScrollRange, { flush: 'post' })
  const { start: startCrewPlaybackDelay, stop: stopCrewPlaybackDelay } =
    useTimeoutFn(
      () => {
        if (enabled.value && crewEntered.value) crewPlaybackReady.value = true
      },
      200,
      { immediate: false }
    )
  let crewScrollPosition = 0
  let crewLoopWait = 0
  let crewAtEnd = false

  const { pause: pauseCrewPlayback, resume: resumeCrewPlayback } = useRafFn(
    ({ delta }) => {
      const scroller = panelScrollRef.value
      if (!scroller) return
      const elapsed = Math.min(delta, 50)
      if (crewLoopWait > 0) {
        crewLoopWait -= elapsed
        return
      }
      if (crewAtEnd) {
        scroller.scrollTop = 0
        crewScrollPosition = 0
        crewLoopWait = 800
        crewAtEnd = false
        return
      }
      const end = scrollEnd.value
      if (end <= 0) return
      // 保留小数位置，让低速滚动在不同刷新率下保持一致。
      const actualPosition = scroller.scrollTop
      // Respect manual scrolling in both directions while retaining subpixels.
      if (Math.abs(actualPosition - crewScrollPosition) > 1)
        crewScrollPosition = actualPosition
      crewScrollPosition += elapsed * 0.022
      const nextPosition = Math.min(end, Math.round(crewScrollPosition))
      if (nextPosition !== actualPosition) scroller.scrollTop = nextPosition
      if (crewScrollPosition >= end) {
        crewAtEnd = true
        crewLoopWait = 1800
      }
    },
    { immediate: false }
  )

  watch(
    [
      crewPlaybackReady,
      crewHovered,
      crewFocused,
      enabled,
      reducedMotion,
      documentVisibility,
      contentVisible,
      scrollEnd,
    ],
    () => {
      if (
        crewPlaybackReady.value &&
        !crewHovered.value &&
        !crewFocused.value &&
        enabled.value &&
        contentVisible.value &&
        documentVisibility.value === 'visible' &&
        scrollEnd.value > 0 &&
        reducedMotion.value !== 'reduce'
      ) {
        const scroller = panelScrollRef.value
        if (scroller) crewScrollPosition = scroller.scrollTop
        resumeCrewPlayback()
      } else pauseCrewPlayback()
    }
  )

  let pointerPosition: { x: number; y: number } | null = null
  let characterRange: Range | null = null
  const hitTestCrewText = (x: number, y: number): boolean => {
    const caretDocument = document as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number
      ) => {
        offsetNode: Node
        offset: number
      } | null
    }
    const caret = caretDocument.caretPositionFromPoint?.(x, y)
    const range = caret ? null : document.caretRangeFromPoint?.(x, y)
    const node = caret?.offsetNode ?? range?.startContainer
    const offset = caret?.offset ?? range?.startOffset ?? 0
    if (
      !node ||
      node.nodeType !== Node.TEXT_NODE ||
      !crewContentRef.value?.contains(node) ||
      node.parentElement?.closest('[aria-hidden="true"]')
    )
      return false
    // 命中单个文字的实际区域，避免整行 p / h3 的空白也触发暂停。
    const text = node.textContent ?? ''
    for (const index of [offset - 1, offset]) {
      if (index < 0 || index >= text.length || /\s/u.test(text[index])) continue
      const character =
        characterRange ?? (characterRange = document.createRange())
      character.setStart(node, index)
      character.setEnd(node, index + 1)
      const rects = character.getClientRects()
      for (let rectIndex = 0; rectIndex < rects.length; rectIndex++) {
        const rect = rects[rectIndex]
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        )
          return true
      }
    }
    return false
  }

  const { cancel: cancelHoverCheck, schedule: scheduleHoverCheck } =
    useFrameTask(() => {
      if (pointerPosition && enabled.value)
        crewHovered.value = hitTestCrewText(
          pointerPosition.x,
          pointerPosition.y
        )
    })

  const updateCrewHover = (event: PointerEvent) => {
    pointerPosition = { x: event.clientX, y: event.clientY }
    scheduleHoverCheck()
  }
  const clearCrewHover = () => {
    cancelHoverCheck()
    pointerPosition = null
    crewHovered.value = false
  }
  const updateCrewFocus = (event: FocusEvent) => {
    crewFocused.value =
      crewContentRef.value?.contains(event.relatedTarget as Node | null) ??
      false
  }

  const preparePanelEnter = () => {
    stopCrewPlaybackDelay()
    crewEntered.value = false
    crewPlaybackReady.value = false
    clearCrewHover()
    characterRange = null
    crewFocused.value = false
    crewScrollPosition = 0
    crewLoopWait = 0
    crewAtEnd = false
  }

  const finishPanelEnter = () => {
    if (!enabled.value || !crewContentRef.value) return
    crewEntered.value = true
    if (reducedMotion.value === 'reduce') crewPlaybackReady.value = true
  }

  const finishCrewEntrance = (event: AnimationEvent) => {
    if (
      event.target === crewContentRef.value &&
      event.animationName.startsWith('staff-credits-entrance') &&
      enabled.value
    )
      startCrewPlaybackDelay()
  }

  watch(enabled, (open) => {
    if (!open) {
      stopCrewPlaybackDelay()
      clearCrewHover()
      characterRange = null
    }
  })
  return {
    crewContentRef,
    crewEntered,
    crewFocused,
    updateCrewHover,
    clearCrewHover,
    updateCrewFocus,
    preparePanelEnter,
    finishPanelEnter,
    finishCrewEntrance,
  }
}
