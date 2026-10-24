<template>
  <div
    ref="viewport"
    class="image-marquee"
    :class="{ 'is-entering': entryStarted }"
    :style="{ '--image-marquee-overlap': `${PHOTO_OVERLAP}px` }"
    :data-direction="direction"
    :data-entry-state="
      entryFinished ? 'complete' : entryStarted ? 'revealing' : 'waiting'
    "
    :aria-label="title"
  >
    <div
      class="image-marquee__track"
      :class="{ 'is-paused': !active || viewerIndex !== null }"
      :style="{
        '--image-marquee-loop': `${repeatCount ? -100 / repeatCount : 0}%`,
        '--image-marquee-duration': `${groupWidth / 35}s`,
        animationDirection: direction === 'right' ? 'reverse' : 'normal',
      }"
    >
      <div
        v-for="copy in repeatCount"
        :key="copy"
        class="image-marquee__group"
        :aria-hidden="copy > 1 ? 'true' : undefined"
      >
        <button
          v-for="(photo, index) in photos"
          :key="photo.url"
          class="image-marquee__photo"
          type="button"
          :tabindex="copy > 1 ? -1 : 0"
          :style="{
            '--photo-ratio': photo.width / photo.height,
            '--photo-entry-index': index,
          }"
          :aria-label="`${title} ${index + 1}`"
          @pointerenter="start"
          @pointerleave="leave"
          @pointercancel="stop"
          @click="openViewer(index)"
        >
          <picture>
            <source
              media="(max-width: 768px)"
              :srcset="photo.mobileThumbnail"
            />
            <img
              :src="photo.thumbnail"
              :alt="`${title} ${index + 1}`"
              :width="photo.width"
              :height="photo.height"
              decoding="async"
              draggable="false"
              @load="settledImages.add(index)"
              @error="settledImages.add(index)"
            />
          </picture>
          <span
            v-if="!entryFinished"
            :key="entryRevision"
            class="image-marquee__entry-mask"
            aria-hidden="true"
            @animationend="finishEntry(index)"
          />
        </button>
      </div>
    </div>
    <SafeImageViewer
      v-if="viewerIndex !== null"
      :url-list="urls"
      :titles="titles"
      :initial-index="viewerIndex"
      @close="viewerIndex = null"
    >
      <template v-if="$slots.info" #info="{ index }">
        <slot name="info" :item="items[index]" :index="index" />
      </template>
    </SafeImageViewer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { usePreferredReducedMotion, useResizeObserver } from '@vueuse/core'

import type { GalleryMedia } from '@/components/MediaGallery/index.vue'
import SafeImageViewer from '@/components/SafeImageViewer/index.vue'
import { useDecorationActivity } from '@/composables/useDecorationActivity'
import { useImageCincoHover } from '@/composables/useImageCincoHover'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'

const props = withDefaults(
  defineProps<{
    items: Array<GalleryMedia & { width: number; height: number }>
    title: string
    direction?: 'left' | 'right'
  }>(),
  { direction: 'left' }
)
const PHOTO_OVERLAP = 2
const viewport = ref<HTMLElement | null>(null)
const active = useDecorationActivity(viewport)
const reducedMotion = usePreferredReducedMotion()
const settledImages = ref(new Set<number>())
const entryStarted = ref(false)
const entryFinished = ref(
  reducedMotion.value === 'reduce' || !props.items.length
)
const entryRevision = ref(0)
const finishEntry = (index: number) => {
  if (index === props.items.length - 1) entryFinished.value = true
}
// 等图片加载完成并进入可见区域后再揭开遮罩；副本与原组使用相同的逐张延迟。
watch(
  [active, () => settledImages.value.size, reducedMotion],
  () => {
    if (reducedMotion.value === 'reduce') entryFinished.value = true
    else if (
      !entryFinished.value &&
      active.value &&
      settledImages.value.size >= props.items.length
    )
      entryStarted.value = true
  },
  { immediate: true }
)
const viewerIndex = ref<number | null>(null)
const { start, leave, stop } = useImageCincoHover()
const photos = computed(() =>
  props.items.map((photo) => ({
    ...photo,
    thumbnail: getCardThumbnailUrl(photo.url),
    mobileThumbnail: getCardMobileThumbnailUrl(photo.url),
  }))
)
const urls = computed(() => props.items.map((photo) => photo.url))
const titles = computed(() => props.items.map((photo) => photo.title || ''))
const width = ref(0)
const height = ref(280)
const aspectSum = computed(() =>
  props.items.reduce((sum, photo) => sum + photo.width / photo.height, 0)
)
const groupWidth = computed(
  () => height.value * aspectSum.value - props.items.length * PHOTO_OVERLAP
)
// 补足一个完整循环组，保证宽屏与反向滚动在循环交界处都不会露出空白。
const repeatCount = computed(() =>
  props.items.length
    ? Math.max(2, Math.ceil(width.value / Math.max(1, groupWidth.value)) + 1)
    : 0
)
useResizeObserver(viewport, ([entry]) => {
  if (!entry) return
  width.value = entry.contentRect.width
  height.value = entry.contentRect.height
})
const openViewer = (index: number) => {
  stop()
  viewerIndex.value = index
}
watch(
  () => props.items,
  async () => {
    stop()
    viewerIndex.value = null
    const revision = ++entryRevision.value
    entryStarted.value = false
    entryFinished.value =
      reducedMotion.value === 'reduce' || !props.items.length
    settledImages.value = new Set()
    await nextTick()
    if (revision !== entryRevision.value) return
    // 缓存命中的同名图片不会再次触发 load。
    viewport.value
      ?.querySelectorAll<HTMLImageElement>(
        '.image-marquee__group:first-child img'
      )
      .forEach((image, index) => {
        if (image.complete) settledImages.value.add(index)
      })
  }
)
</script>

<style lang="less" scoped>
@import '@/assets/style/mediaCincoHover.less';

.image-marquee {
  --image-marquee-height: clamp(180px, 24vw, 280px);
  height: var(--image-marquee-height);
  overflow: hidden;
}

.image-marquee__track {
  display: flex;
  width: max-content;
  height: 100%;
  animation: image-marquee-scroll var(--image-marquee-duration) linear infinite;
  &.is-paused {
    animation-play-state: paused;
  }
}

@media (hover: hover) and (pointer: fine) {
  .image-marquee:hover .image-marquee__track {
    animation-play-state: paused;
  }
}

.image-marquee__group {
  display: flex;
  flex: none;
  height: 100%;
}

.image-marquee__photo {
  .media-cinco-hover();
  position: relative;
  overflow: hidden;
  display: block;
  flex: none;
  width: calc(var(--image-marquee-height) * var(--photo-ratio));
  height: 100%;
  margin: 0;
  margin-right: calc(-1 * var(--image-marquee-overlap));
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
  picture,
  img {
    display: block;
    width: 100%;
    height: 100%;
  }
  img {
    object-fit: contain;
  }
  &:focus-visible {
    outline: 2px solid var(--page-theme-color);
    outline-offset: -2px;
  }
}

.image-marquee__entry-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: var(--page-theme-color, #8b5cc7);
  transform: scaleY(1);
  transform-origin: bottom;
  pointer-events: none;
}

.image-marquee.is-entering .image-marquee__entry-mask {
  animation: image-marquee-uncover 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(500ms + var(--photo-entry-index) * 140ms);
}

@keyframes image-marquee-uncover {
  to {
    transform: scaleY(0);
  }
}

@keyframes image-marquee-scroll {
  to {
    transform: translate3d(var(--image-marquee-loop), 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .image-marquee {
    overflow-x: auto;
  }
  .image-marquee__track {
    animation: none;
  }
  .image-marquee__group:not(:first-child) {
    display: none;
  }
}
</style>
