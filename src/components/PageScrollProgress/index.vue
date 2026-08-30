<template>
  <span
    class="page-scroll-progress no-rem"
    :style="progressStyle"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    progress: number
    anchorSelector?: string
  }>(),
  {
    anchorSelector: '.el-menu-layout-all',
  }
)

const progressTop = ref<string>()
let anchorElement: HTMLElement | null = null
let anchorResizeObserver: ResizeObserver | null = null
let measureRafId: number | null = null

const progressStyle = computed(() => {
  const normalizedProgress = Math.min(100, Math.max(0, props.progress))

  return {
    '--page-scroll-progress': `${normalizedProgress}%`,
    '--page-scroll-progress-scale': normalizedProgress / 100,
    '--page-scroll-progress-top': progressTop.value,
  }
})

const syncProgressTop = () => {
  measureRafId = null
  if (!anchorElement) return

  const nextTop = `${Math.max(
    0,
    anchorElement.getBoundingClientRect().bottom
  )}px`
  if (progressTop.value === nextTop) return

  progressTop.value = nextTop
}

const scheduleProgressTopSync = () => {
  if (measureRafId !== null) return
  measureRafId = window.requestAnimationFrame(syncProgressTop)
}

onMounted(() => {
  anchorElement = document.querySelector<HTMLElement>(props.anchorSelector)
  scheduleProgressTopSync()
  window.addEventListener('resize', scheduleProgressTopSync, { passive: true })

  if (anchorElement) {
    anchorResizeObserver = new ResizeObserver(scheduleProgressTopSync)
    anchorResizeObserver.observe(anchorElement)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleProgressTopSync)
  if (measureRafId !== null) window.cancelAnimationFrame(measureRafId)
  measureRafId = null
  anchorResizeObserver?.disconnect()
  anchorResizeObserver = null
  anchorElement = null
})
</script>

<style lang="less" scoped>
.page-scroll-progress.no-rem {
  position: fixed;
  top: var(--page-scroll-progress-top, 3.37rem);
  right: 0;
  z-index: 1200;
  width: 4px;
  height: calc(100dvh - var(--page-scroll-progress-top, 3.37rem));
  overflow: hidden;
  background: #000;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: #e23456;
    transform: scaleY(var(--page-scroll-progress-scale, 0));
    transform-origin: top;
    will-change: transform;
  }
}
</style>
