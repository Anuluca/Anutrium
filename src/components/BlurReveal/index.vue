<template>
  <component
    :is="tag"
    class="blur-reveal"
    :class="{ 'is-active': active }"
    :style="revealStyle"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    active?: boolean
    blur?: string
    delay?: number
    duration?: number
    tag?: string
    yOffset?: number
  }>(),
  {
    active: true,
    blur: '20px',
    delay: 0.2,
    duration: 0.75,
    tag: 'div',
    yOffset: 20,
  }
)

const revealStyle = computed(() => ({
  '--blur-reveal-blur': props.blur,
  '--blur-reveal-delay': `${props.delay}s`,
  '--blur-reveal-duration': `${props.duration}s`,
  '--blur-reveal-y-offset': `${props.yOffset}px`,
}))
</script>

<style scoped lang="less">
.blur-reveal {
  opacity: 0;
  filter: blur(var(--blur-reveal-blur));
  transform: translate3d(0, var(--blur-reveal-y-offset), 0);

  &.is-active {
    animation: blurRevealEnter var(--blur-reveal-duration)
      cubic-bezier(0.22, 1, 0.36, 1) var(--blur-reveal-delay) both;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blur-reveal.is-active {
    animation-delay: 0s;
    animation-duration: 0.01ms;
  }
}

@keyframes blurRevealEnter {
  from {
    opacity: 0;
    filter: blur(var(--blur-reveal-blur));
    transform: translate3d(0, var(--blur-reveal-y-offset), 0);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: translate3d(0, 0, 0);
  }
}
</style>
