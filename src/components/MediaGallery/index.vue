<template>
  <div
    ref="galleryRef"
    class="media-gallery"
    :class="{
      'media-gallery--four-columns': columns === 4,
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
      <div
        class="media-gallery__shell"
        :style="{
          '--media-aspect-ratio': mediaAspectRatios.get(media.url) || 1,
        }"
      >
        <div
          class="media-gallery__frame"
          :class="{ 'is-loading': !loadedMediaUrls.has(media.url) }"
        >
          <div class="media-gallery__stage">
            <video
              v-if="isVideoUrl(media.url)"
              :src="nearbyVideoUrls.has(media.url) ? media.url : undefined"
              :data-video-src="media.url"
              :aria-label="getLabel(media)"
              controls
              loop
              muted
              playsinline
              preload="none"
              @loadedmetadata="markVideoLoaded($event, media.url)"
            />
            <button
              v-else
              class="media-gallery__open"
              type="button"
              :aria-label="getLabel(media)"
              @click="openViewer(media.url)"
            >
              <picture>
                <source
                  media="(max-width: 768px)"
                  :srcset="getMediaMobileThumbnailUrl(media)"
                />
                <img
                  :src="getMediaThumbnailUrl(media)"
                  :alt="getLabel(media)"
                  :data-media-url="media.url"
                  loading="lazy"
                  decoding="async"
                  width="768"
                  height="576"
                  @load="markImageDecoded($event, media.url)"
                />
              </picture>
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

    <SafeImageViewer
      v-if="showViewer"
      :url-list="imageUrls"
      :initial-index="currentImageIndex"
      @close="showViewer = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'

import SafeImageViewer from '@/components/SafeImageViewer/index.vue'
import { useIntersectionActivation } from '@/composables/useIntersectionActivation'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'

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
    columns?: 3 | 4
  }>(),
  {
    getMediaLabel: (media: GalleryMedia) => media.title || 'Photo',
    showMediaInfo: () => true,
    staggeredEntrance: false,
    entranceReady: true,
    entranceStepMs: 70,
    preserveImageColors: false,
    columns: 3,
  }
)

const VIDEO_FILE_PATTERN = /\.(?:mov|mp4|webm|m4v|ogv)(?:[?#].*)?$/i
const galleryRef = ref<HTMLElement | null>(null)
const loadedMediaUrls = reactive(new Set<string>())
const mediaAspectRatios = reactive(new Map<string, number>())
const nearbyVideoUrls = reactive(new Set<string>())
const showViewer = ref(false)
const currentImageIndex = ref(0)
const entranceStarted = ref(!props.staggeredEntrance)
let isGalleryVisible = false

const isVideoUrl = (url: string) => VIDEO_FILE_PATTERN.test(url)
const mediaIndex = computed(() => {
  const urls = new Set<string>()
  const images: string[] = []
  const thumbnails = new Map<string, { desktop: string; mobile: string }>()
  for (const media of props.items) {
    urls.add(media.url)
    if (isVideoUrl(media.url)) continue
    images.push(media.url)
    thumbnails.set(media.url, {
      desktop: getCardThumbnailUrl(media.url),
      mobile: getCardMobileThumbnailUrl(media.url),
    })
  }
  return { urls, images, thumbnails }
})
// 加载状态与宽高比会多次触发渲染，缩略图 URL 只在媒体列表变化时解析。
const getMediaThumbnailUrl = (media: GalleryMedia) =>
  mediaIndex.value.thumbnails.get(media.url)?.desktop
const getMediaMobileThumbnailUrl = (media: GalleryMedia) =>
  mediaIndex.value.thumbnails.get(media.url)?.mobile
const getLabel = (media: GalleryMedia) => props.getMediaLabel(media)
const shouldShowMediaInfo = (media: GalleryMedia) => props.showMediaInfo(media)
const getVideoElements = () =>
  galleryRef.value?.querySelectorAll<HTMLVideoElement>(
    'video[data-video-src]'
  ) ?? []
const getEntranceStyle = (index: number) =>
  props.staggeredEntrance
    ? {
        '--media-gallery-entry-delay': `${Math.max(
          0,
          index * props.entranceStepMs
        )}ms`,
      }
    : undefined
const imageUrls = computed(() => mediaIndex.value.images)
const currentMediaUrls = computed(() => mediaIndex.value.urls)

const markMediaLoaded = (url: string) => {
  if (currentMediaUrls.value.has(url)) loadedMediaUrls.add(url)
}

const markImageDecoded = async (event: Event, url: string) => {
  if (!currentMediaUrls.value.has(url)) return
  const image = event.currentTarget as HTMLImageElement
  if (image.naturalHeight)
    mediaAspectRatios.set(url, image.naturalWidth / image.naturalHeight)

  try {
    await image.decode()
  } catch {
    // 部分浏览器在图片已完成解码时会拒绝重复 decode，仍可安全显示。
  }

  markMediaLoaded(url)
}
const markVideoLoaded = (event: Event, url: string) => {
  if (!currentMediaUrls.value.has(url)) return
  const video = event.currentTarget as HTMLVideoElement
  if (video.videoHeight)
    mediaAspectRatios.set(url, video.videoWidth / video.videoHeight)
  markMediaLoaded(url)
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

const { refresh: observeGalleryEntrance } = useIntersectionActivation(
  galleryRef,
  ([entry]) => {
    isGalleryVisible = entry?.isIntersecting ?? false

    if (isGalleryVisible && props.entranceReady && !entranceStarted.value) {
      entranceStarted.value = true
    }
  },
  {
    enabled: () => props.staggeredEntrance,
    threshold: 0.08,
    rootMargin: '0px 0px -8% 0px',
    onUnsupported: () => {
      isGalleryVisible = true
      entranceStarted.value = true
    },
  }
)

const visibleVideoElements = new WeakSet<HTMLVideoElement>()
const playVisibleVideo = async (video: HTMLVideoElement) => {
  const source = video.dataset.videoSrc
  if (!source) return

  nearbyVideoUrls.add(source)
  await nextTick()
  if (!visibleVideoElements.has(video) || !video.isConnected) return
  await video.play().catch(() => undefined)
}

const { refresh: observeNearbyVideos } = useIntersectionActivation(
  getVideoElements,
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const video = entry.target as HTMLVideoElement
      const source = video.dataset.videoSrc
      if (source) nearbyVideoUrls.add(source)
    })
  },
  {
    rootMargin: '400px 0px',
    threshold: 0,
    onUnsupported: () => {
      getVideoElements()?.forEach((video) => {
        const source = video.dataset.videoSrc
        if (source) nearbyVideoUrls.add(source)
      })
    },
  }
)

const { refresh: observeVisibleVideos } = useIntersectionActivation(
  getVideoElements,
  (entries) => {
    entries.forEach((entry) => {
      const video = entry.target as HTMLVideoElement

      if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
        visibleVideoElements.add(video)
        void playVisibleVideo(video)
      } else {
        visibleVideoElements.delete(video)
        video.pause()
      }
    })
  },
  {
    threshold: [0, 0.1],
    onUnsupported: () => {
      getVideoElements()?.forEach((video) => {
        visibleVideoElements.add(video)
        void playVisibleVideo(video)
      })
    },
  }
)

watch(
  () => props.items,
  async () => {
    showViewer.value = false
    const currentUrls = currentMediaUrls.value
    // 列表切换会复用同 URL 的图片节点，不能清空其状态并等待不会重发的 load 事件。
    for (const url of loadedMediaUrls)
      if (!currentUrls.has(url)) loadedMediaUrls.delete(url)
    for (const url of mediaAspectRatios.keys())
      if (!currentUrls.has(url)) mediaAspectRatios.delete(url)
    nearbyVideoUrls.clear()
    void replayEntrance()
    await nextTick()
    // 缓存图片可能在 DOM 更新前已完成加载；仅将真正加载成功的图片解除占位状态。
    galleryRef.value
      ?.querySelectorAll<HTMLImageElement>('img[data-media-url]')
      .forEach((image) => {
        if (
          image.complete &&
          image.naturalWidth > 0 &&
          image.dataset.mediaUrl
        ) {
          mediaAspectRatios.set(
            image.dataset.mediaUrl,
            image.naturalWidth / image.naturalHeight
          )
          markMediaLoaded(image.dataset.mediaUrl)
        }
      })
    observeGalleryEntrance()
    observeNearbyVideos()
    observeVisibleVideos()
  }
)

onBeforeUnmount(() => {
  getVideoElements()?.forEach((video) => video.pause())
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

  &::after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 1px;
    content: '';
    background: rgba(255, 255, 255, 0.05);
    pointer-events: none;
  }
  &:nth-child(3n)::after {
    display: none;
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
  color: color-mix(in srgb, var(--page-theme-color, #e23456) 78%, transparent);
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
  width: 100%;
  max-width: 100%;
}

.media-gallery__shell {
  // 以实际媒体比例计算宽度；固定图片区高度仍用于对齐信息栏。
  width: min(
    100%,
    calc(var(--media-gallery-max-height) * var(--media-aspect-ratio))
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: auto;
  margin-left: auto;
}

.media-gallery__frame {
  position: relative;
  z-index: 1;
  height: var(--media-gallery-max-height);
  flex: none;
  max-height: var(--media-gallery-max-height);

  &::before {
    position: absolute;
    inset: 0;
    z-index: 2;
    content: '';
    background: color-mix(
      in srgb,
      var(--page-theme-color, #e23456) 4%,
      transparent
    );
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.24s ease;
  }

  &.is-loading {
    height: var(--media-gallery-max-height);
    overflow: hidden;

    &::before {
      background: linear-gradient(
        105deg,
        color-mix(in srgb, var(--page-theme-color, #e23456) 4%, transparent) 30%,
        color-mix(in srgb, var(--page-theme-color, #e23456) 12%, transparent)
          50%,
        color-mix(in srgb, var(--page-theme-color, #e23456) 4%, transparent) 70%
      );
      opacity: 1;
      transform: translateX(-100%);
      animation: media-placeholder-shimmer 1.6s ease-in-out infinite;
    }

    .media-gallery__stage {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    img,
    video {
      opacity: 0;
    }
  }
}

.media-gallery__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  max-height: var(--media-gallery-max-height);
  overflow: hidden;

  img,
  video {
    display: block;
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: var(--media-gallery-max-height);
    object-fit: contain;
    opacity: 1;
    transition: opacity 0.28s ease;
  }

  img {
    object-position: center;
    filter: saturate(0.88) contrast(1.06) brightness(0.82);
    transition: opacity 0.28s ease, filter 0.28s ease, transform 0.28s ease;
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
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: var(--media-gallery-max-height);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;

  picture {
    display: contents;
  }

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
  min-width: 0;
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

@media (min-width: 901px) {
  .media-gallery__card:nth-child(3n + 1) {
    padding-left: 0;
  }
  .media-gallery__card:nth-child(3n) {
    padding-right: 0;
  }
  .media-gallery--four-columns {
    grid-template-columns: repeat(4, minmax(0, 1fr));

    .media-gallery__card {
      padding-right: 10px;
      padding-left: 10px;

      &::after {
        display: block;
      }
      &:nth-child(4n + 1) {
        padding-left: 0;
      }
      &:nth-child(4n) {
        padding-right: 0;
        &::after {
          display: none;
        }
      }
    }
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

    &:nth-child(odd) {
      padding-left: 0;
    }
    &:nth-child(even) {
      padding-right: 0;
    }

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
