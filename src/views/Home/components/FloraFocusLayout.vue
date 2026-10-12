<script setup lang="ts">
import { computed, type ComputedRef, inject, onMounted, ref } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'

import { FLORA_CHARACTER_WIDTH_RATIO } from '@/config/floraLayout'
import { useLayoutBorders } from '@/stores/layoutBorders'

const headerBottom = inject<ComputedRef<number>>(
  'site-header-bottom',
  computed(() => 0)
)
const footer = ref<HTMLElement | null>(null)
const footerOffset = ref(0)
const layoutBorders = useLayoutBorders()
const syncFooterOffset = () => {
  const element = footer.value
  footerOffset.value =
    element && getComputedStyle(element).display !== 'none'
      ? Math.max(0, window.innerHeight - element.getBoundingClientRect().top)
      : 0
}
onMounted(() => {
  footer.value = document.querySelector<HTMLElement>('.footer-com')
  syncFooterOffset()
})
useResizeObserver(footer, syncFooterOffset)
useEventListener('resize', syncFooterOffset)
</script>

<template>
  <div
    class="flora-focus-layout no-rem"
    :class="{ 'is-border-hidden': !layoutBorders.visible }"
    :style="{
      '--flora-header-bottom': `${headerBottom}px`,
      '--flora-footer-offset': `${footerOffset}px`,
      // 留白后仍以原模型中心划分左侧区域，不移动镜头来适应固定列宽。
      gridTemplateColumns: `minmax(0, calc(${
        FLORA_CHARACTER_WIDTH_RATIO * 100
      }vw - 2 * var(--flora-inline-inset))) minmax(0, 1fr)`,
    }"
    role="group"
    aria-label="花花小窝"
  >
    <section class="flora-focus-layout__character" aria-label="花花模型区">
      <header class="flora-number-bar">
        <span class="flora-number-bar__number" aria-label="编号 001"
          >№ 001</span
        >
        <div class="flora-number-bar__symbols" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
          <svg viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" />
          </svg>
          <svg viewBox="0 0 24 24"><path d="M12 2 23 22H1Z" /></svg>
          <svg viewBox="0 0 24 24">
            <path
              d="M12 22 2.6 12.6C-3.3 6.7 5.7-2.3 12 4c6.3-6.3 15.3 2.7 9.4 8.6Z"
            />
          </svg>
        </div>
      </header>
    </section>
    <section class="flora-focus-layout__content" aria-label="花花内容模块区" />
  </div>
</template>

<style scoped lang="less">
.flora-focus-layout.no-rem {
  --flora-inline-inset: var(--temple-content-inset, 24px);
  --flora-block-gap: 16px;

  position: absolute;
  top: calc(var(--flora-header-bottom) + var(--flora-block-gap));
  right: var(--flora-inline-inset);
  bottom: calc(var(--flora-footer-offset) + var(--flora-block-gap));
  left: var(--flora-inline-inset);
  // 边框位于三维画布上方，避免地面遮挡；点击仍穿透到场景。
  z-index: 2;
  display: grid;
  column-gap: 16px;
  pointer-events: none;

  > section {
    min-width: 0;
    box-sizing: border-box;
    border: 1px solid var(--border-color-strong, rgba(255, 255, 255, 0.22));
  }

  &.is-border-hidden > section {
    // 仅隐藏边框颜色，保留盒模型，避免编号栏与分区在切换时移动。
    border-color: transparent;
  }

  .flora-focus-layout__character {
    container-type: inline-size;
  }

  .flora-number-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: clamp(6px, 4cqw, 24px);
  }

  .flora-number-bar__number {
    font-family: 'UnboundedSans', 'Arial', sans-serif;
    font-size: clamp(10px, 7cqw, 32px);
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
  }

  .flora-number-bar__symbols {
    display: flex;
    align-items: center;
    gap: clamp(2px, 2cqw, 10px);
    color: #8a2c1b;

    svg {
      display: block;
      width: clamp(8px, 5cqw, 24px);
      height: clamp(8px, 5cqw, 24px);
      flex: none;
      fill: currentColor;
    }
  }
}
</style>
