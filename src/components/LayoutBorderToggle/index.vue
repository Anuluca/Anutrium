<script setup lang="ts">
import { useLayoutBorders } from '@/stores/layoutBorders'

const layoutBorders = useLayoutBorders()
</script>

<template>
  <button
    class="layout-border-toggle no-rem"
    type="button"
    :aria-label="layoutBorders.visible ? '隐藏分区边框' : '显示分区边框'"
    :aria-pressed="layoutBorders.visible"
    @click.stop="layoutBorders.visible = !layoutBorders.visible"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="6" height="16" />
      <rect x="13" y="4" width="8" height="16" />
    </svg>
  </button>
</template>

<style scoped lang="less">
.layout-border-toggle.no-rem {
  position: fixed;
  left: 0;
  bottom: 0;
  margin: 0;
  // 仅隐藏绘制内容，保留原有点击区域与键盘操作。
  opacity: 0;
  z-index: 10001;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--border-color-strong);
  border-radius: 0;
  background: var(--surface-color-solid);
  color: var(--page-theme-color, #8a2c1b);
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
  }

  &[aria-pressed='false'] svg {
    opacity: 0.45;
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 3px;
  }
}
</style>
