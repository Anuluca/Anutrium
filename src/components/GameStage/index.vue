<template>
  <section class="game-stage" :style="stageStyle">
    <div class="game-stage__background" aria-hidden="true" />
    <div class="game-stage__overlay" aria-hidden="true" />
    <div class="game-stage__content"><slot /></div>
  </section>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    aspectRatio?: string
    backgroundImage?: string
    backgroundPosition?: string
    overlayColor?: string
  }>(),
  {
    aspectRatio: 'auto',
    backgroundImage: '',
    backgroundPosition: 'center',
    overlayColor: 'rgba(0, 0, 0, 0)',
  }
)

const stageStyle = computed(
  () =>
    ({
      '--game-stage-aspect-ratio': props.aspectRatio,
      '--game-stage-background-image': props.backgroundImage
        ? `url("${props.backgroundImage}")`
        : 'none',
      '--game-stage-background-position': props.backgroundPosition,
      '--game-stage-overlay': props.overlayColor,
    } as CSSProperties)
)
</script>

<style lang="less" scoped>
.game-stage {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  min-height: 0;
  aspect-ratio: var(--game-stage-aspect-ratio);
  box-sizing: border-box;
  overflow: hidden;
  container-type: size;
  background: #050505;

  &__background,
  &__overlay,
  &__content {
    position: absolute;
    inset: 0;
  }

  &__background {
    z-index: -2;
    background-image: var(--game-stage-background-image);
    background-position: var(--game-stage-background-position);
    background-size: cover;
    background-repeat: no-repeat;
  }

  &__overlay {
    z-index: -1;
    background: var(--game-stage-overlay);
    pointer-events: none;
  }

  &__content {
    z-index: 1;
  }
}
</style>
