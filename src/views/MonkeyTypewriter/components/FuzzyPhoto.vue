<script setup lang="ts">
import { ref } from 'vue'

import FuzzyImage from './FuzzyImage.vue'

const props = withDefaults(
  defineProps<{
    active?: boolean
    animated?: boolean
    src: string
    alt: string
    width: number
    height: number
  }>(),
  { active: true, animated: true }
)
const ready = ref(false)
</script>

<template>
  <div
    class="fuzzy-photo no-rem"
    :class="{ 'is-fuzzy-ready': ready && animated }"
    :style="{ '--photo-source': 'url(' + props.src + ')' }"
  >
    <img
      :src="props.src"
      :alt="props.alt"
      :width="props.width"
      :height="props.height"
    />
    <FuzzyImage
      v-if="animated"
      class="photo-fuzzy-canvas"
      :active="active"
      :src="props.src"
      :width="props.width"
      :height="props.height"
      @ready="ready = true"
    />
    <div class="photo-scanlines" aria-hidden="true" />
    <slot />
  </div>
</template>

<style scoped lang="less">
.fuzzy-photo.no-rem {
  position: relative;
  pointer-events: none;
  > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  > img,
  .photo-fuzzy-canvas {
    -webkit-mask-image: linear-gradient(
      to bottom,
      #000 35%,
      rgba(0, 0, 0, 0.65) 62%,
      transparent
    );
    mask-image: linear-gradient(
      to bottom,
      #000 35%,
      rgba(0, 0, 0, 0.65) 62%,
      transparent
    );
  }
  .photo-fuzzy-canvas,
  .photo-scanlines {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  &.is-fuzzy-ready > img {
    opacity: 0;
  }
  .photo-scanlines {
    background: repeating-linear-gradient(
      to bottom,
      transparent 0 2px,
      rgba(0, 0, 0, 0.24) 2px 3px
    );
    -webkit-mask-image: var(--photo-source),
      linear-gradient(to bottom, #000 35%, rgba(0, 0, 0, 0.65) 62%, transparent);
    mask-image: var(--photo-source),
      linear-gradient(to bottom, #000 35%, rgba(0, 0, 0, 0.65) 62%, transparent);
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fuzzy-photo.no-rem {
    .photo-fuzzy-canvas {
      display: none;
    }
    &.is-fuzzy-ready > img {
      opacity: 1;
    }
  }
}
</style>
