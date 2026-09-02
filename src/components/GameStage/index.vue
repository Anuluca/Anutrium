<template>
  <section
    class="game-stage"
    :class="{ 'game-stage--contained-content': contentAspectRatio > 0 }"
    :style="stageStyle"
  >
    <div class="game-stage__viewport">
      <div class="game-stage__background" aria-hidden="true" />
      <div class="game-stage__overlay" aria-hidden="true" />
      <div class="game-stage__content"><slot /></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    aspectRatio?: string
    backgroundImage?: string
    backgroundPosition?: string
    contentAspectRatio?: number
    overlayColor?: string
  }>(),
  {
    aspectRatio: 'auto',
    backgroundImage: '',
    backgroundPosition: 'center',
    contentAspectRatio: 0,
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
      '--game-stage-content-ratio': props.contentAspectRatio,
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
    z-index: 0;
    background-image: var(--game-stage-background-image);
    background-position: var(--game-stage-background-position);
    background-size: cover;
    background-repeat: no-repeat;
  }

  &__overlay {
    z-index: 1;
    background: var(--game-stage-overlay);
    pointer-events: none;
  }

  &__content {
    z-index: 2;
  }

  &__viewport {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    isolation: isolate;
  }

  &--contained-content &__viewport {
    width: min(100cqw, calc(100cqh * var(--game-stage-content-ratio)));
    height: auto;
    aspect-ratio: var(--game-stage-content-ratio);
    margin: auto;
    container-type: size;
  }
}
</style>
