<template>
  <div
    ref="galleryRef"
    class="media-gallery"
    :class="{
      'media-gallery--staggered': staggeredEntrance,
      'media-gallery--preserve-image-colors': preserveImageColors,
      'is-entered': entranceStarted,
    }"
  >
    <article
      v-for="(media, index) in items"
      :key="media.url"
      class="media-gallery__card"
      :style="getEntranceStyle(index)"
    >
      <div class="media-gallery__shell">
        <div
          class="media-gallery__frame"
          :class="{ 'is-loading': !loadedMediaUrls.has(media.url) }"
        >
          <div class="media-gallery__stage">
            <video
              v-if="isVideoUrl(media.url)"
              :src="media.url"
              :aria-label="getLabel(media)"
              autoplay
              controls
              loop
              muted
              playsinline
              preload="metadata"
              @loadedmetadata="markMediaLoaded(media.url)"
            />
            <button
              v-else
              class="media-gallery__open"
              type="button"
              :aria-label="getLabel(media)"
              @click="openViewer(media.url)"
            >
              <img
                :src="media.url"
                :alt="getLabel(media)"
                loading="lazy"
                decoding="async"
                @load="markMediaLoaded(media.url)"
              />
            </button>
          </div>
        </div>

        <div
          v-if="$slots.info && shouldShowMediaInfo(media)"
          class="media-gallery__info"
        >
          <slot name="info" :item="media" :index="index" />
        </div>
      </div>
    </article>

    <ElImageViewer
      v-if="showViewer"
      :url-list="imageUrls"
      :initial-index="currentImageIndex"
      hide-on-click-modal
      teleported
      @close="showViewer = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElImageViewer } from 'element-plus'

import 'element-plus/es/components/image-viewer/style/css'

export interface GalleryMedia {
  url: string
  title?: string
  device?: string
  location?: string
  time?: string
}

const props = withDefaults(
  defineProps<{
    items: GalleryMedia[]
    getMediaLabel?: (media: GalleryMedia) => string
    showMediaInfo?: (media: GalleryMedia) => boolean
    staggeredEntrance?: boolean
    entranceReady?: boolean
    entranceStepMs?: number
    preserveImageColors?: boolean
  }>(),
  {
    getMediaLabel: (media: GalleryMedia) => media.title || 'Photo',
    showMediaInfo: () => true,
    staggeredEntrance: false,
    entranceReady: true,
    entranceStepMs: 70,
    preserveImageColors: false,
  }
)

const VIDEO_FILE_PATTERN = /\.(?:mov|mp4|webm|m4v|ogv)(?:[?#].*)?$/i
const galleryRef = ref<HTMLElement | null>(null)
const loadedMediaUrls = ref(new Set<string>())
const showViewer = ref(false)
const currentImageIndex = ref(0)
const entranceStarted = ref(!props.staggeredEntrance)
let galleryObserver: IntersectionObserver | null = null
let isGalleryVisible = false

const isVideoUrl = (url: string) => VIDEO_FILE_PATTERN.test(url)
const getLabel = (media: GalleryMedia) => props.getMediaLabel(media)
const shouldShowMediaInfo = (media: GalleryMedia) => props.showMediaInfo(media)
const getEntranceStyle = (index: number) =>
  props.staggeredEntrance
    ? {
        '--media-gallery-entry-delay': `${Math.max(
          0,
          index * props.entranceStepMs
        )}ms`,
      }
    : undefined
const imageUrls = computed(() =>
  props.items
    .filter((media) => !isVideoUrl(media.url))
    .map((media) => media.url)
)

const markMediaLoaded = (url: string) => {
  if (loadedMediaUrls.value.has(url)) return
  loadedMediaUrls.value = new Set([...loadedMediaUrls.value, url])
}

const openViewer = (url: string) => {
  const imageIndex = imageUrls.value.indexOf(url)
  if (imageIndex < 0) return
  currentImageIndex.value = imageIndex
  showViewer.value = true
}

const replayEntrance = async () => {
  if (!props.staggeredEntrance) return

  entranceStarted.value = false
  await nextTick()

  if (isGalleryVisible && props.entranceReady) {
    entranceStarted.value = true
  }
}

watch(
  () => props.items,
  () => {
    showViewer.value = false
    loadedMediaUrls.value = new Set()
    replayEntrance()
  }
)

watch(
  () => props.entranceReady,
  (isReady) => {
    if (!props.staggeredEntrance) return

    if (!isReady) {
      entranceStarted.value = false
      return
    }

    if (isGalleryVisible) {
      entranceStarted.value = true
    }
  }
)

onMounted(() => {
  if (!props.staggeredEntrance) return

  if (!('IntersectionObserver' in window)) {
    isGalleryVisible = true
    entranceStarted.value = true
    return
  }

  galleryObserver = new IntersectionObserver(
    ([entry]) => {
      isGalleryVisible = entry.isIntersecting

      if (
        entry.isIntersecting &&
        props.entranceReady &&
        !entranceStarted.value
      ) {
        entranceStarted.value = true
      }
    },
    {
      threshold: 0.08,
      rootMargin: '0px 0px -8% 0px',
    }
  )

  if (galleryRef.value) {
    galleryObserver.observe(galleryRef.value)
  }
})

onBeforeUnmount(() => {
  galleryObserver?.disconnect()
})
</script>

<style lang="less" scoped>
.media-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  align-items: stretch;
}

.media-gallery__card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  width: 100%;
  padding: 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  box-sizing: border-box;
  --media-gallery-max-height: clamp(220px, 25vw, 360px);

  &:not(:nth-child(3n))::after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 1px;
    content: '';
    background: rgba(255, 255, 255, 0.05);
    pointer-events: none;
  }
}

.media-gallery--staggered:not(.is-entered) .media-gallery__frame {
  opacity: 0.2;
  clip-path: inset(49% 49%);
  filter: brightness(1.25) contrast(1.08);
  transform: scale(0.9);
}

.media-gallery--staggered:not(.is-entered) .media-gallery__info {
  opacity: 0;
  transform: translateY(8px);
}

.media-gallery--staggered.is-entered .media-gallery__frame {
  transform-origin: center;
  animation: media-gallery-shutter-in 0.88s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--media-gallery-entry-delay, 0ms);
}

.media-gallery--staggered.is-entered .media-gallery__frame::after {
  position: absolute;
  inset: calc(50% - 10px);
  z-index: 5;
  content: '';
  background: linear-gradient(currentColor 0 0) top left / 22px 1px no-repeat,
    linear-gradient(currentColor 0 0) top left / 1px 22px no-repeat,
    linear-gradient(currentColor 0 0) top right / 22px 1px no-repeat,
    linear-gradient(currentColor 0 0) top right / 1px 22px no-repeat,
    linear-gradient(currentColor 0 0) bottom left / 22px 1px no-repeat,
    linear-gradient(currentColor 0 0) bottom left / 1px 22px no-repeat,
    linear-gradient(currentColor 0 0) bottom right / 22px 1px no-repeat,
    linear-gradient(currentColor 0 0) bottom right / 1px 22px no-repeat;
  color: rgba(255, 255, 255, 0.78);
  opacity: 0;
  pointer-events: none;
  animation: media-gallery-corners-expand 0.9s cubic-bezier(0.22, 1, 0.36, 1)
    both;
  animation-delay: var(--media-gallery-entry-delay, 0ms);
}

.media-gallery--staggered.is-entered .media-gallery__info {
  animation: media-gallery-info-in 0.36s ease-out both;
  animation-delay: calc(var(--media-gallery-entry-delay, 0ms) + 0.54s);
}

.media-gallery__shell,
.media-gallery__frame,
.media-gallery__stage {
  width: fit-content;
  max-width: 100%;
}

.media-gallery__shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: auto;
  margin-left: auto;
}

.media-gallery__frame {
  position: relative;
  z-index: 1;
  max-height: var(--media-gallery-max-height);

  &.is-loading {
    width: 12rem;
    height: var(--media-gallery-max-height);
    overflow: hidden;
    background: rgba(226, 52, 86, 0.04);

    &::before {
      position: absolute;
      inset: 0;
      content: '';
      background: linear-gradient(
        105deg,
        transparent 30%,
        rgba(226, 52, 86, 0.12) 50%,
        transparent 70%
      );
      transform: translateX(-100%);
      animation: media-placeholder-shimmer 1.6s ease-in-out infinite;
    }

    .media-gallery__stage {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  }
}

.media-gallery__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: var(--media-gallery-max-height);
  overflow: hidden;

  img,
  video {
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: var(--media-gallery-max-height);
    object-fit: contain;
  }

  img {
    object-position: center;
    filter: saturate(0.88) contrast(1.06) brightness(0.82);
    transition: filter 0.28s ease, transform 0.28s ease;
  }

  video {
    position: relative;
    z-index: 4;
    background: #000;
  }
}

.media-gallery__open {
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  max-width: 100%;
  max-height: var(--media-gallery-max-height);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;

  &:hover img,
  &:focus-visible img {
    filter: saturate(1.12) contrast(1.1) brightness(0.94);
    transform: scale(1.015);
  }
}

.media-gallery--preserve-image-colors {
  .media-gallery__stage img,
  .media-gallery__open:hover img,
  .media-gallery__open:focus-visible img {
    filter: none;
  }
}

.media-gallery__info {
  position: relative;
  width: 100%;
  min-width: 12rem;
  min-height: 28px;
  margin-top: 14px;
  background: rgb(35 35 35 / 40%);
  box-sizing: border-box;
}

@keyframes media-placeholder-shimmer {
  to {
    transform: translateX(100%);
  }
}

@keyframes media-gallery-shutter-in {
  from {
    opacity: 0.2;
    clip-path: inset(49% 49%);
    filter: brightness(1.25) contrast(1.08);
    transform: scale(0.9);
  }

  56% {
    opacity: 1;
    clip-path: inset(12% 12%);
  }

  to {
    opacity: 1;
    clip-path: inset(0);
    filter: brightness(1) contrast(1);
    transform: scale(1);
  }
}

@keyframes media-gallery-corners-expand {
  0% {
    opacity: 0;
    inset: calc(50% - 10px);
    transform: scale(0.72);
  }

  12% {
    opacity: 0.82;
  }

  52% {
    inset: -8px;
    opacity: 0.76;
    transform: scale(1);
  }

  64% {
    inset: -8px;
    opacity: 0.24;
  }

  72% {
    inset: -8px;
    opacity: 0;
  }

  100% {
    inset: -8px;
    opacity: 0;
    transform: scale(1);
  }
}

@keyframes media-gallery-info-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .media-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .media-gallery__card {
    padding: 10px 5px;
    border-bottom-color: rgba(255, 255, 255, 0.04);
    --media-gallery-max-height: clamp(150px, 42vw, 220px);

    &::after,
    &:not(:nth-child(3n))::after {
      display: none;
    }

    &:nth-child(odd)::after {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      display: block;
      width: 1px;
      content: '';
      background: rgba(255, 255, 255, 0.04);
      pointer-events: none;
    }
  }

  .media-gallery__info {
    min-height: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-gallery--staggered:not(.is-entered) .media-gallery__frame,
  .media-gallery--staggered:not(.is-entered) .media-gallery__info {
    opacity: 1;
    clip-path: none;
    filter: none;
    transform: none;
  }

  .media-gallery--staggered.is-entered .media-gallery__frame,
  .media-gallery--staggered.is-entered .media-gallery__frame::after,
  .media-gallery--staggered.is-entered .media-gallery__info {
    animation: none;
  }
}
</style>
