<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import { useFrameTask } from '@/composables/useFrameTask'
import { useNestedSmoothScroll } from '@/composables/useNestedSmoothScroll'
import { useScrollScanlines } from '@/composables/useScrollScanlines'

const props = defineProps<{
  edgeProgress?: boolean
  edgeFade?: boolean
  edgeScanlines?: boolean
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
    : { top: `${progressTop.value}px`, bottom: `${progressBottom.value}px` }
)
const viewportRoot = ref<HTMLElement | null>(null)
const scrollRoot = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
useNestedSmoothScroll(() => scrollRoot.value)
useScrollScanlines(() => (props.edgeScanlines ? scrollRoot.value : null))
const canScrollUp = ref(false)
const canScrollDown = ref(false)
const readGeometry = () => {
  const element = scrollRoot.value
  if (!element) return
  canScrollUp.value = element.scrollTop > 1
  canScrollDown.value =
    element.scrollTop + element.clientHeight < element.scrollHeight - 1
  const viewport = viewportRoot.value
  if (!viewport) return
  if (props.edgeProgress) {
    const bounds = element.getBoundingClientRect()
    progressTop.value = bounds.top
    progressBottom.value = Math.max(0, window.innerHeight - bounds.bottom)
  } else {
    // 使用布局尺寸避开父级 CRT 缩放，只覆盖固定头尾之间的实际滚动区域。
    progressTop.value = element.offsetTop
    progressBottom.value = Math.max(
      0,
      viewport.clientHeight - element.offsetTop - element.offsetHeight
    )
  }
}
const { schedule: measure } = useFrameTask(readGeometry)
useResizeObserver([scrollRoot, content, viewportRoot], measure)
onMounted(() => nextTick(measure))
defineExpose({ scrollRoot, measure })
</script>

<template>
  <div
    ref="viewportRoot"
    class="scroll-viewport no-rem"
    :class="{
      'has-fixed-header': !!$slots.header,
      'has-fixed-footer': !!$slots.footer,
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
      data-lenis-prevent
      data-lenis-nested-scroll
      tabindex="0"
      @scroll.passive="measure"
    >
      <div ref="content"><slot :scroll-root="scrollRoot" /></div>
    </div>
    <slot name="footer" />
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
  &.has-fixed-header,
  &.has-fixed-footer {
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
