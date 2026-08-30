<template>
  <span
    class="text-highlight"
    :style="{
      '--text-highlight-delay': `${delay}ms`,
      '--text-highlight-duration': `${duration}ms`,
      '--text-highlight-end-color': textEndColor,
    }"
  >
    <span class="text-highlight__content"><slot /></span>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    delay?: number
    duration?: number
    textEndColor?: string
  }>(),
  {
    delay: 0,
    duration: 600,
    textEndColor: 'inherit',
  }
)
</script>

<style lang="less" scoped>
.text-highlight {
  position: relative;
  display: inline-block;
  isolation: isolate;
  color: inherit;

  &::before {
    content: '';
    position: absolute;
    inset: 0.08em -0.08em 0;
    z-index: -1;
    background: var(
      --text-highlight-background,
      linear-gradient(90deg, #a5b4fc, #d8b4fe)
    );
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform var(--text-highlight-duration) ease
      var(--text-highlight-delay);
  }

  &:hover,
  &:focus-within {
    color: var(--text-highlight-end-color);

    &::before {
      transform: scaleX(1);
    }
  }
}

.text-highlight__content {
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  .text-highlight::before {
    transition-duration: 0.01ms;
    transition-delay: 0s;
  }
}
</style>
