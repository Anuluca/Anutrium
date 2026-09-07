<template>
  <h2
    class="scroll-section-title home-section-title"
    :class="[
      `is-marker-${markerDirection}`,
      { 'is-marker-active': markerActive },
    ]"
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
    markerDirection?: 'down' | 'left' | 'right' | 'up'
    markerActive?: boolean
  }>(),
  {
    color: '#e23456',
    markerDirection: 'down',
    markerActive: true,
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

  &::after {
    position: absolute;
    width: 0.28em;
    height: 0.28em;
    background: #fff;
    content: '';
    opacity: 0;
    pointer-events: none;
  }

  &.is-marker-down::after {
    top: calc(100% + 0.18em);
    right: 0;
    left: 0;
    height: 0.187em;
    margin-inline: auto;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  &.is-marker-up::after {
    bottom: calc(100% + 0.18em);
    right: 0;
    left: 0;
    height: 0.187em;
    margin-inline: auto;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  &.is-marker-left::after {
    top: 0;
    bottom: 0;
    right: calc(100% + 0.12em);
    width: 0.21em;
    margin-block: auto;
    translate: 0 0.1lh;
    clip-path: polygon(0 50%, 100% 0, 100% 100%);
  }

  &.is-marker-right::after {
    top: 0;
    bottom: 0;
    left: calc(100% + 0.12em);
    width: 0.21em;
    margin-block: auto;
    translate: 0 0.1lh;
    clip-path: polygon(100% 50%, 0 0, 0 100%);
  }

  &.is-marker-active.is-marker-down::after {
    animation: scroll-section-marker-enter-down 0.48s
      cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  &.is-marker-active.is-marker-up::after {
    animation: scroll-section-marker-enter-up 0.48s
      cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  &.is-marker-active.is-marker-left::after {
    animation: scroll-section-marker-enter-left 0.48s
      cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  &.is-marker-active.is-marker-right::after {
    animation: scroll-section-marker-enter-right 0.48s
      cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}

@keyframes scroll-section-marker-enter-down {
  from {
    opacity: 0.8;
    transform: translateY(-0.45em);
  }

  to {
    opacity: 0.8;
    transform: translateY(0);
  }
}

@keyframes scroll-section-marker-enter-up {
  from {
    opacity: 0.8;
    transform: translateY(0.45em);
  }

  to {
    opacity: 0.8;
    transform: translateY(0);
  }
}

@keyframes scroll-section-marker-enter-left {
  from {
    opacity: 0.8;
    transform: translateX(0.45em);
  }

  to {
    opacity: 0.8;
    transform: translateX(0);
  }
}

@keyframes scroll-section-marker-enter-right {
  from {
    opacity: 0.8;
    transform: translateX(-0.45em);
  }

  to {
    opacity: 0.8;
    transform: translateX(0);
  }
}
@media screen and (max-aspect-ratio: 1) {
  .scroll-section-title {
    font-size: clamp(1.375rem, 7vw, 2.75rem);
  }
}
</style>
