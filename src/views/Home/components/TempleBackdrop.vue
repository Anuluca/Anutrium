<script setup lang="ts">
import { ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

const root = ref<HTMLElement | null>(null)
const text = ref<HTMLElement | null>(null)
const fit = () => {
  if (root.value && text.value?.scrollWidth)
    root.value.style.setProperty(
      '--backdrop-scale',
      String(root.value.clientWidth / text.value.scrollWidth)
    )
}
useResizeObserver([root, text], fit)
</script>

<template>
  <div ref="root" class="temple-backdrop no-rem" aria-hidden="true">
    <div class="temple-backdrop__clip">
      <h1><span ref="text">ANUTRIUM</span></h1>
    </div>
  </div>
</template>

<style lang="less" scoped>
.temple-backdrop {
  position: absolute;
  bottom: calc(100% - var(--temple-horizon-y, 70%));
  z-index: 0;
  width: 100%;
  color: var(--page-theme-color, #e23456);
  transition: color 1.1s ease-in-out;
  pointer-events: none;
}
.temple-backdrop__clip {
  overflow: hidden;
}
h1 {
  display: block;
  width: 100%;
  margin: 0;
  font: 900 clamp(3.25rem, 11vw, 14rem) / 0.82 'UnboundedSans', sans-serif;
  mask-image: linear-gradient(
    to bottom,
    #000 0%,
    rgba(0, 0, 0, 0.55) 30%,
    transparent 100%
  );
}
h1 > span {
  display: inline-block;
  width: max-content;
  transform: scaleX(var(--backdrop-scale, 1));
  transform-origin: left center;
  mask-image: repeating-linear-gradient(
    to bottom,
    #000 0 4px,
    transparent 4px 6px
  );
}
</style>
