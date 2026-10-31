<template>
  <span ref="viewport" class="overflow-marquee">
    <span
      class="overflow-marquee__track"
      :class="{ 'is-scrolling': overflowing }"
      :style="trackStyle"
    >
      <span ref="content" class="overflow-marquee__content"><slot /></span>
      <span
        v-if="overflowing"
        class="overflow-marquee__content overflow-marquee__copy"
        aria-hidden="true"
        ><slot
      /></span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

const viewport = ref<HTMLElement>()
const content = ref<HTMLElement>()
const overflowing = ref(false)
const width = ref(0)
let disposed = false
const measure = () => {
  if (!viewport.value || !content.value) return
  width.value = content.value.offsetWidth
  overflowing.value = width.value > viewport.value.clientWidth + 1
}
const trackStyle = computed(() => ({
  '--marquee-distance': `${width.value + 24}px`,
  '--marquee-duration': `${(width.value + 24) / 17.5}s`,
}))
useResizeObserver(viewport, measure)
useResizeObserver(content, measure)
onMounted(() => {
  void nextTick(measure)
  void document.fonts.ready.then(() => {
    if (!disposed) measure()
  })
})
onBeforeUnmount(() => {
  disposed = true
})
</script>

<style lang="less" scoped>
.overflow-marquee {
  display: block;
  overflow: hidden;
  white-space: nowrap;
}
.overflow-marquee__track {
  display: flex;
  width: max-content;
}
.overflow-marquee__content {
  flex: none;
}
.overflow-marquee__copy {
  padding-left: 24px;
}
.is-scrolling {
  animation: overflow-marquee-scroll var(--marquee-duration) linear infinite;
}
@keyframes overflow-marquee-scroll {
  to {
    transform: translateX(calc(-1 * var(--marquee-distance)));
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-scrolling {
    animation: none;
  }
}
</style>
