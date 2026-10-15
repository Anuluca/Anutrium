<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useDocumentVisibility, useResizeObserver } from '@vueuse/core'

import SafeImageViewer from '@/components/SafeImageViewer/index.vue'
import type { FloraMedia } from '@/utils/floratriumMedia'
import { getCardThumbnailUrl } from '@/utils/imageVariant'

const props = defineProps<{ items: FloraMedia[]; title: string }>()
const root = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const firstGroup = ref<HTMLElement | null>(null)
const groupWidth = ref(0)
const copies = ref(2)
const readyUrls = ref(new Set<string>())
const imageRatios = ref(new Map<string, number>())
const imageHeight = ref(0)
const layoutReady = ref(false)
const viewerIndex = ref<number | null>(null)
const visibility = useDocumentVisibility()
const urls = computed(() => props.items.map((item) => item.url))
const running = computed(
  () =>
    visibility.value === 'visible' &&
    layoutReady.value &&
    viewerIndex.value === null &&
    props.items.every((item) => readyUrls.value.has(item.url))
)
const setGroup = (element: unknown, copy: number) => {
  if (copy === 0)
    firstGroup.value = element instanceof HTMLElement ? element : null
}
const measureGroups = () => {
  const width = firstGroup.value?.offsetWidth || 0
  if (!width) return
  groupWidth.value = width
  // 与页脚循环滚动相同：复制足够轮次覆盖视口，位移一整轮后无缝接回。
  copies.value = Math.max(
    2,
    Math.ceil((viewport.value?.clientWidth || 0) / width) + 1
  )
}
useResizeObserver([viewport, firstGroup], async () => {
  imageHeight.value = viewport.value?.clientHeight || 0
  await nextTick()
  measureGroups()
})
watch(
  () => props.items,
  () => {
    readyUrls.value = new Set()
    imageRatios.value = new Map()
    layoutReady.value = false
    viewerIndex.value = null
  }
)
const markReady = async (url: string, event: Event) => {
  const image = event.target as HTMLImageElement
  // 各轮复用同一宽高比，避免尚未加载的副本缩窄后露出大块空白。
  imageRatios.value.set(
    url,
    image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1
  )
  readyUrls.value.add(url)
  await nextTick()
  measureGroups()
  layoutReady.value = props.items.every((item) => readyUrls.value.has(item.url))
}
</script>

<template>
  <div
    ref="root"
    class="flora-album-strip no-rem"
    :class="{ 'is-running': running }"
    :style="{
      '--strip-distance': `${groupWidth}px`,
      '--strip-duration': `${Math.max(16, groupWidth / 24)}s`,
    }"
  >
    <div ref="viewport" class="flora-album-strip__viewport">
      <div class="flora-album-strip__track">
        <div
          v-for="copy in copies"
          :key="copy"
          :ref="(element) => setGroup(element, copy - 1)"
          class="flora-album-strip__group"
          :aria-hidden="copy > 1 ? true : undefined"
        >
          <button
            v-for="(item, index) in items"
            :key="item.url"
            class="flora-album-strip__photo"
            type="button"
            :aria-label="title"
            :tabindex="copy > 1 ? -1 : 0"
            :style="{
              width: `${imageHeight * (imageRatios.get(item.url) || 1)}px`,
            }"
            @click="viewerIndex = index"
          >
            <img
              :src="getCardThumbnailUrl(item.url)"
              :alt="title"
              decoding="async"
              @load="markReady(item.url, $event)"
              @error="markReady(item.url, $event)"
            />
          </button>
        </div>
      </div>
    </div>
    <SafeImageViewer
      v-if="viewerIndex !== null"
      :url-list="urls"
      :initial-index="viewerIndex"
      @close="viewerIndex = null"
    />
  </div>
</template>

<style scoped lang="less">
.flora-album-strip.no-rem {
  height: 100%;
  width: calc(100% - 68px);
  box-sizing: border-box;
  padding: 12px 20px;

  .flora-album-strip__viewport {
    height: 100%;
    overflow: hidden;
  }

  .flora-album-strip__track {
    display: flex;
    width: max-content;
    height: 100%;
    animation: flora-album-marquee var(--strip-duration) linear infinite;
    animation-play-state: paused;
  }
  &.is-running .flora-album-strip__track {
    animation-play-state: running;
  }
  &:focus-within .flora-album-strip__track {
    animation-play-state: paused;
  }
  .flora-album-strip__group {
    display: flex;
    align-items: center;
    height: 100%;
    flex: none;
    gap: 12px;
    padding-right: 12px;
  }
  .flora-album-strip__photo {
    position: relative;
    overflow: hidden;
    display: flex;
    height: 100%;
    flex: none;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: zoom-in;
    &::before {
      position: absolute;
      inset: 0;
      z-index: 1;
      transition: opacity 400ms ease;
      background: repeating-linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.3) 0 1px,
        transparent 1px 4px
      );
      pointer-events: none;
      content: '';
    }
    &::after {
      position: absolute;
      inset: 0;
      background: var(--flora-theme-color);
      opacity: 0.1;
      transition: opacity 400ms ease;
      mix-blend-mode: color;
      pointer-events: none;
      content: '';
    }
    &:focus-visible {
      outline: 1px solid #fffff4 !important;
      outline-offset: 3px;
    }
  }
  img {
    display: block;
    height: 100%;
    width: 100%;
    object-fit: contain;
    filter: brightness(0.9);
    transition: transform 400ms ease, filter 400ms ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .flora-album-strip__photo:hover img {
      transform: scale(1.08);
      filter: none;
    }
    .flora-album-strip__photo:hover::before,
    .flora-album-strip__photo:hover::after {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    img,
    .flora-album-strip__photo::before,
    .flora-album-strip__photo::after {
      transition: none;
    }
    .flora-album-strip__viewport {
      overflow-x: auto;
    }
    .flora-album-strip__track {
      animation: none;
    }
    .flora-album-strip__group[aria-hidden='true'] {
      display: none;
    }
  }
}
@keyframes flora-album-marquee {
  to {
    transform: translate3d(calc(-1 * var(--strip-distance)), 0, 0);
  }
}
</style>
