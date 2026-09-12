<template>
  <h2
    class="scroll-section-title home-section-title"
    :style="{ '--scroll-section-title-color': color }"
  >
    {{ title }}
  </h2>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    color?: string
  }>(),
  {
    color: '#e23456',
  }
)
</script>

<style lang="less" scoped>
.scroll-section-title {
  position: absolute;
  top: clamp(0.75rem, 2dvh, 1.5rem);
  left: 50%;
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--scroll-section-title-color);
  font-family: 'anton', sans-serif;
  font-size: clamp(1.625rem, 4vw, 3.75rem);
  font-weight: 400;
  line-height: 0.88;
  letter-spacing: 0;
  text-shadow: 0 0.08em 0.24em rgba(0, 0, 0, 0.72);
  transform: translateX(-50%);
  white-space: nowrap;
}

@media screen and (max-aspect-ratio: 1) {
  .scroll-section-title {
    font-size: clamp(1.375rem, 7vw, 2.75rem);
  }
}
</style>
