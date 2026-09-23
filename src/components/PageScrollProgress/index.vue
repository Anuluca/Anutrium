<template>
  <span
    ref="progressElement"
    class="page-scroll-progress no-rem"
    :style="{ '--page-scroll-progress-top': `${props.top}px` }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    top?: number
  }>(),
  {
    top: 0,
  }
)

const progressElement = ref<HTMLElement | null>(null)
const setProgress = (progress: number) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress))
  progressElement.value?.style.setProperty(
    '--page-scroll-progress',
    `${normalizedProgress}%`
  )
  progressElement.value?.style.setProperty(
    '--page-scroll-progress-scale',
    `${normalizedProgress / 100}`
  )
}

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
