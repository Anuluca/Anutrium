<template>
  <span
    ref="progressElement"
    class="page-scroll-progress no-rem"
    :class="{ 'is-embedded': props.embedded }"
    :style="{ '--page-scroll-progress-top': `${props.top}px` }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'

const props = withDefaults(
  defineProps<{
    top?: number
    embedded?: boolean
    scrollTarget?: HTMLElement | null
  }>(),
  {
    top: 0,
    embedded: false,
    scrollTarget: null,
  }
)

const progressElement = ref<HTMLElement | null>(null)
const targetContent = ref<HTMLElement | SVGElement | null>(null)
let maxScroll = 0
let previousProgress: number | null = null
const setProgress = (progress: number) => {
  if (!progressElement.value) return
  const normalizedProgress = Math.min(100, Math.max(0, progress))
  if (normalizedProgress === previousProgress) return
  previousProgress = normalizedProgress
  progressElement.value?.style.setProperty(
    '--page-scroll-progress',
    `${normalizedProgress}%`
  )
  progressElement.value?.style.setProperty(
    '--page-scroll-progress-scale',
    `${normalizedProgress / 100}`
  )
}

const updateTargetProgress = () => {
  const target = props.scrollTarget
  if (!target) return
  setProgress(maxScroll > 0 ? (target.scrollTop / maxScroll) * 100 : 0)
}

const measureTarget = () => {
  const target = props.scrollTarget
  maxScroll = target
    ? Math.max(0, target.scrollHeight - target.clientHeight)
    : 0
  updateTargetProgress()
}

useEventListener(() => props.scrollTarget, 'scroll', updateTargetProgress, {
  passive: true,
})
useResizeObserver([() => props.scrollTarget, targetContent], measureTarget)
watch(
  () => props.scrollTarget,
  (target) => {
    targetContent.value =
      (target?.firstElementChild as HTMLElement | SVGElement | null) ?? null
    measureTarget()
  },
  { immediate: true, flush: 'post' }
)
watch(progressElement, () => {
  previousProgress = null
  measureTarget()
})

defineExpose({ setProgress })
</script>

<style lang="less" scoped>
.page-scroll-progress.no-rem {
  position: fixed;
  top: calc(
    var(--page-scroll-progress-top, 3.37rem) +
      var(--page-scroll-progress-offset, 0px)
  );
  right: var(--mobile-screen-frame-inline-size, 0px);
  bottom: var(--mobile-screen-frame-size, 0px);
  z-index: 1200;
  width: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
  transition: top 0.24s ease;

  &.is-embedded {
    --page-scroll-progress-transition-duration: 0ms;
    position: absolute;
    inset: 0 0 0 auto;
    z-index: 2;
    transition: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: var(--page-theme-color, #e23456);
    transform: scaleY(var(--page-scroll-progress-scale, 0));
    transform-origin: top;
    transition: transform var(--page-scroll-progress-transition-duration, 0ms)
      cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform;
  }
}

@media (max-width: 768px) {
  .page-scroll-progress.no-rem {
    background: transparent;
  }
}
</style>
