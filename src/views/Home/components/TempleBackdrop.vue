<script setup lang="ts">
import { ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

import { useTempleNavigation } from '@/stores/templeNavigation'

const navigation = useTempleNavigation()
const root = ref<HTMLElement | null>(null)
const text = ref<HTMLElement | null>(null)
const zenText = ref<HTMLElement | null>(null)
const fit = () => {
  if (!root.value) return
  for (const element of [text.value, zenText.value]) {
    if (!element?.scrollWidth) continue
    const scale = String(root.value.clientWidth / element.scrollWidth)
    if (element.style.getPropertyValue('--backdrop-scale') === scale) continue
    element.style.setProperty('--backdrop-scale', scale)
  }
}
useResizeObserver([root, text, zenText], fit)
</script>

<template>
  <div
    ref="root"
    class="temple-backdrop no-rem"
    :class="{ 'is-immersive': navigation.immersive }"
    aria-hidden="true"
  >
    <div class="temple-backdrop__clip">
      <h1>
        <span ref="text" class="temple-backdrop__brand">ANUTRIUM</span>
        <span ref="zenText" class="temple-backdrop__zen">ZEN MODE</span>
      </h1>
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
  pointer-events: none;
}
.temple-backdrop__clip {
  overflow: hidden;
}
h1 {
  position: relative;
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
.temple-backdrop__brand {
  transition: opacity 400ms ease;
}
.temple-backdrop__zen {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
}
.is-immersive {
  .temple-backdrop__brand {
    opacity: 0;
  }
  .temple-backdrop__zen {
    animation: temple-zen-reveal 800ms ease 400ms both;
  }
}
@keyframes temple-zen-reveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .temple-backdrop__brand {
    transition: none;
  }
  .is-immersive .temple-backdrop__zen {
    animation-duration: 0s;
    animation-delay: 0s;
  }
}
</style>
