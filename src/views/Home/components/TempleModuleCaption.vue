<script setup lang="ts">
import { computed } from 'vue'

import {
  templeCategoryById,
  type TempleCategoryId,
} from '@/config/templeNavigation'
import { createScanlineCharacters } from '@/utils/scanlineMask'

import { useFooterViewportOffset } from '../composables/useFooterViewportOffset'

const props = defineProps<{ category: TempleCategoryId }>()
const category = computed(() => templeCategoryById.get(props.category)!)
const characters = computed(() =>
  createScanlineCharacters(category.value.label, {
    seed: `temple-module-caption:${props.category}`,
  })
)
const footerOffset = useFooterViewportOffset()
</script>

<template>
  <p
    class="temple-module-caption no-rem"
    :class="{ 'temple-module-caption--right': category.x > 0 }"
    :style="{
      '--caption-footer-offset': `${footerOffset}px`,
      '--caption-stagger': `${(characters.length - 1) * 100}ms`,
    }"
    :data-category="props.category"
    aria-hidden="true"
  >
    <span
      v-for="(item, index) in characters"
      :key="index"
      class="temple-module-caption__character"
      :style="{
        '--caption-scan-mask': item.maskImage,
        '--caption-character-delay': `${index * 100}ms`,
      }"
      >{{ item.character }}</span
    >
  </p>
</template>

<style scoped lang="less">
.temple-module-caption.no-rem {
  position: absolute;
  z-index: 100;
  left: var(--temple-content-inset);
  bottom: calc(var(--caption-footer-offset) + 24px);
  display: flex;
  max-width: calc(50vw - 2 * var(--temple-content-inset));
  margin: 0;
  color: var(--page-theme-color);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(72px, 8.25vw, 144px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.08em;
  opacity: 0.6;
  -webkit-mask-image: linear-gradient(to top, #000, rgba(0, 0, 0, 0.166667));
  mask-image: linear-gradient(to top, #000, rgba(0, 0, 0, 0.166667));
  transform: scaleX(1.3);
  transform-origin: left bottom;
  pointer-events: none;

  &.temple-caption-enter-active {
    // 根节点时长包含逐字延迟，避免 Vue 提前结束过渡并卸载文字。
    transition: transform calc(400ms + var(--caption-stagger)) ease-out;

    .temple-module-caption__character {
      transition: opacity 400ms ease-out, transform 400ms ease-out;
      transition-delay: var(--caption-character-delay);
    }
  }

  &.temple-caption-leave-active {
    transition: transform calc(280ms + var(--caption-stagger)) ease-in;

    .temple-module-caption__character {
      transition: opacity 280ms ease-in, transform 280ms ease-in;
      transition-delay: var(--caption-character-delay);
    }
  }

  &.temple-caption-enter-from,
  &.temple-caption-leave-to {
    .temple-module-caption__character {
      opacity: 0;
      transform: translateY(-24px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &.temple-caption-enter-active,
    &.temple-caption-leave-active {
      transition-duration: 1ms;

      .temple-module-caption__character {
        transition-duration: 1ms;
        transition-delay: 0ms;
      }
    }
  }

  &.temple-module-caption--right {
    right: var(--temple-content-inset);
    left: auto;
    transform-origin: right bottom;
  }

  .temple-module-caption__character {
    display: inline-block;
    -webkit-mask-image: var(--caption-scan-mask);
    mask-image: var(--caption-scan-mask);
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }
}
</style>
