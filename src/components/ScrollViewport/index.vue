<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

import PageScrollProgress from '@/components/PageScrollProgress/index.vue'

const props = defineProps<{
  edgeProgress?: boolean
  edgeFade?: boolean
  progressZIndex?: number
}>()
const progressTop = ref(0)
const progressBottom = ref(0)
const progressStyle = computed(() =>
  props.edgeProgress
    ? {
        position: 'fixed' as const,
        top: `${progressTop.value}px`,
        bottom: `${progressBottom.value}px`,
        right: '0px',
        left: 'auto',
        zIndex: props.progressZIndex,
      }
    : undefined
)
const scrollRoot = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const canScrollUp = ref(false)
const canScrollDown = ref(false)
const measure = () => {
  const element = scrollRoot.value
  if (!element) return
  canScrollUp.value = element.scrollTop > 1
  canScrollDown.value =
    element.scrollTop + element.clientHeight < element.scrollHeight - 1
  const bounds = element.getBoundingClientRect()
  progressTop.value = bounds.top
  progressBottom.value = Math.max(0, window.innerHeight - bounds.bottom)
}
useResizeObserver([scrollRoot, content], measure)
onMounted(() => nextTick(measure))
defineExpose({ scrollRoot, measure })
</script>

<template>
  <div
    class="scroll-viewport no-rem"
    :class="{
      'has-fixed-header': !!$slots.header,
    }"
  >
    <slot name="header" />
    <div
      ref="scrollRoot"
      class="scroll-viewport__scroll no-rem"
      :class="{
        'fade-top': edgeFade && canScrollUp,
        'fade-bottom': edgeFade && canScrollDown,
      }"
      @scroll.passive="measure"
      data-lenis-prevent
      data-lenis-nested-scroll
      tabindex="0"
    >
      <div ref="content"><slot :scroll-root="scrollRoot" /></div>
    </div>
    <Teleport to="body" :disabled="!props.edgeProgress">
      <PageScrollProgress
        embedded
        :scroll-target="scrollRoot"
        :style="progressStyle"
      />
    </Teleport>
  </div>
</template>

<style lang="less" scoped>
.scroll-viewport.no-rem {
  position: relative;
  min-height: 0;
  flex: 1;
  height: 100%;
  &.has-fixed-header {
    display: flex;
    flex-direction: column;
    .scroll-viewport__scroll {
      flex: 1;
      min-height: 0;
      height: auto;
    }
  }
}
.scroll-viewport__scroll.no-rem {
  --scroll-fade-top: 0px;
  --scroll-fade-bottom: 0px;
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  overflow-anchor: none;
  scrollbar-width: none;
  padding-right: 12px;
  box-sizing: border-box;
  &.fade-top,
  &.fade-bottom {
    mask-image: linear-gradient(
      to bottom,
      transparent,
      #000 var(--scroll-fade-top),
      #000 calc(100% - var(--scroll-fade-bottom)),
      transparent
    );
  }
  &.fade-top {
    --scroll-fade-top: 32px;
  }
  &.fade-bottom {
    --scroll-fade-bottom: 48px;
  }
  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
