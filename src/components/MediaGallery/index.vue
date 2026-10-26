<template>
  <div
    ref="galleryRef"
    class="media-gallery"
    :class="{
      'media-gallery--four-columns': columns === 4,
      'media-gallery--preview': displayMode === 'preview',
      'media-gallery--staggered': staggeredEntrance,
      'media-gallery--preserve-image-colors': preserveImageColors,
      'is-entered': entranceStarted,
    }"
  >
    <div
      v-if="items.length"
      class="media-gallery__toolbar no-rem"
      role="group"
      :aria-label="locale === 'en' ? 'Gallery mode' : '相册显示模式'"
    >
      <slot name="toolbar-start" />
      <button
        type="button"
        :aria-pressed="displayMode === 'list'"
        :aria-label="locale === 'en' ? 'LIST' : '列表模式'"
        :title="locale === 'en' ? 'LIST' : '列表模式'"
        @click="setDisplayMode('list')"
      >
        <Grid aria-hidden="true" />
      </button>
      <button
        type="button"
        :aria-pressed="displayMode === 'preview'"
        :aria-label="locale === 'en' ? 'PREVIEW' : '大图预览'"
        :title="locale === 'en' ? 'PREVIEW' : '大图预览'"
        @click="setDisplayMode('preview')"
      >
        <PictureIcon aria-hidden="true" />
      </button>
    </div>
    <template v-if="displayMode === 'list'">
      <article
        v-for="(media, index) in items"
        :key="media.url"
        class="media-gallery__card"
        :style="entranceStyles[index]"
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
              <button
                v-if="mediaIndex.videoUrls.has(media.url)"
                class="media-gallery__open"
                type="button"
                :aria-label="previewLabels[index]"
                @click="openViewer(index)"
              >
                <video
                  :ref="(element) => setVideoElement(media.url, element)"
                  :src="nearbyVideoUrls.has(media.url) ? media.url : undefined"
                  :data-video-src="media.url"
                  :aria-label="previewLabels[index]"
                  loop
                  muted
                  playsinline
                  preload="none"
                  @loadedmetadata="markVideoLoaded($event, media.url)"
                />
              </button>
              <button
                v-else
                class="media-gallery__open media-gallery__open--image"
                type="button"
                :aria-label="previewLabels[index]"
                @click="openViewer(index)"
                @pointerenter="startCincoHover"
                @pointerleave="leaveCincoHover"
                @pointercancel="stopCincoHover"
              >
                <picture>
                  <source
                    media="(max-width: 768px)"
                    :srcset="getMediaMobileThumbnailUrl(media)"
                  />
                  <img
                    :src="getMediaThumbnailUrl(media)"
                    :alt="previewLabels[index]"
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
            v-if="showInfo && $slots.info && shouldShowMediaInfo(media)"
            class="media-gallery__info"
          >
            <slot name="info" :item="media" :index="index" />
          </div>
        </div>
      </article>
    </template>
    <SafeImageViewer
      v-else-if="items.length"
      class="media-gallery__preview"
      inline
      :url-list="previewUrls"
      :labels="previewLabels"
      :titles="previewTitles"
      :initial-index="previewIndex"
      @switch="previewIndex = $event"
      @open="openViewer"
    >
      <template v-if="$slots.info" #info="{ index }">
        <div
          v-if="items[index] && shouldShowMediaInfo(items[index])"
          class="media-gallery__info"
        >
          <slot name="info" :item="items[index]" :index="index" />
        </div>
      </template>
    </SafeImageViewer>

    <SafeImageViewer
      v-if="showViewer"
      :url-list="previewUrls"
      :titles="previewTitles"
      :initial-index="previewIndex"
      @switch="previewIndex = $event"
      @close="showViewer = false"
    >
      <template v-if="$slots.info && hasPreviewInfo" #info="{ index }">
        <slot name="info" :item="items[index]" :index="index" />
      </template>
    </SafeImageViewer>
  </div>
</template>

<script setup lang="ts">
import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { Grid, Picture as PictureIcon } from '@element-plus/icons-vue'
import { useDocumentVisibility } from '@vueuse/core'

import SafeImageViewer from '@/components/SafeImageViewer/index.vue'
import { useImageCincoHover } from '@/composables/useImageCincoHover'
import { useIntersectionActivation } from '@/composables/useIntersectionActivation'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'
import { isVideoUrl } from '@/utils/mediaPreview'

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
    showInfo?: boolean
    staggeredEntrance?: boolean
    entranceReady?: boolean
    entranceStepMs?: number
    preserveImageColors?: boolean
    columns?: 3 | 4
  }>(),
  {
    getMediaLabel: (media: GalleryMedia) => media.title || 'Photo',
    showMediaInfo: () => true,
    showInfo: false,
    staggeredEntrance: false,
    entranceReady: true,
    entranceStepMs: 70,
    preserveImageColors: false,
    columns: 3,
  }
)

const { locale } = useI18n()
const documentVisibility = useDocumentVisibility()
const displayMode = ref<'list' | 'preview'>('list')
const previewIndex = ref(0)
const setDisplayMode = async (mode: 'list' | 'preview') => {
  if (displayMode.value === mode) return
  stopCincoHover()
  getVideoElements().forEach((video) => video.pause())
  displayMode.value = mode
  await nextTick()
  observeNearbyVideos()
  observeVisibleVideos()
}

const galleryRef = ref<HTMLElement | null>(null)
const {
  start: startCincoHover,
  leave: leaveCincoHover,
  stop: stopCincoHover,
} = useImageCincoHover()
const loadedMediaUrls = reactive(new Set<string>())
const mediaAspectRatios = reactive(new Map<string, number>())
const nearbyVideoUrls = reactive(new Set<string>())
const showViewer = ref(false)
defineExpose({
  closeViewer: () => {
    if (!showViewer.value) return false
    showViewer.value = false
    return true
  },
})
const entranceStarted = ref(!props.staggeredEntrance)
let isGalleryVisible = false

const mediaIndex = computed(() => {
  const urls = new Set<string>()
  const videoUrls = new Set<string>()
  const thumbnails = new Map<string, { desktop: string; mobile: string }>()
  for (const media of props.items) {
    urls.add(media.url)
    if (isVideoUrl(media.url)) {
      videoUrls.add(media.url)
      continue
    }
    thumbnails.set(media.url, {
      desktop: getCardThumbnailUrl(media.url),
      mobile: getCardMobileThumbnailUrl(media.url),
    })
  }
  return { urls, videoUrls, thumbnails }
})
const previewUrls = computed(() => props.items.map((media) => media.url))
const previewTitles = computed(() =>
  props.items.map((media) => media.title || '')
)
const previewLabels = computed(() => props.items.map(props.getMediaLabel))
// 加载状态与宽高比会多次触发渲染，缩略图 URL 只在媒体列表变化时解析。
const getMediaThumbnailUrl = (media: GalleryMedia) =>
  mediaIndex.value.thumbnails.get(media.url)?.desktop
const getMediaMobileThumbnailUrl = (media: GalleryMedia) =>
  mediaIndex.value.thumbnails.get(media.url)?.mobile
const shouldShowMediaInfo = (media: GalleryMedia) => props.showMediaInfo(media)
// 列表信息的开关不影响全屏预览；切图后只展示当前媒体实际携带的信息。
const hasPreviewInfo = computed(() => {
  const media = props.items[previewIndex.value]
  return Boolean(
    media &&
      !mediaIndex.value.videoUrls.has(media.url) &&
      shouldShowMediaInfo(media) &&
      (media.title || media.device || media.location || media.time)
  )
})
const videoElements = new Map<string, HTMLVideoElement>()
const setVideoElement = (
  url: string,
  element: Element | ComponentPublicInstance | null
) => {
  if (element instanceof HTMLVideoElement) videoElements.set(url, element)
  else videoElements.delete(url)
}
const getVideoElements = () => [...videoElements.values()]
const shouldObserveVideos = () =>
  displayMode.value === 'list' && mediaIndex.value.videoUrls.size > 0
const entranceStyles = computed(() =>
  props.staggeredEntrance
    ? props.items.map((_media, index) => ({
        '--media-gallery-entry-delay': `${Math.max(
          0,
          index * props.entranceStepMs
        )}ms`,
      }))
    : []
)
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

const openViewer = (index: number) => {
  if (index < 0 || index >= props.items.length) return
  previewIndex.value = index
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
const pendingVideoPlays = new WeakSet<HTMLVideoElement>()
let disposed = false
const canPlayVideo = (video: HTMLVideoElement) =>
  !disposed &&
  !showViewer.value &&
  documentVisibility.value === 'visible' &&
  visibleVideoElements.has(video) &&
  video.isConnected
const playVisibleVideo = async (video: HTMLVideoElement) => {
  const source = video.dataset.videoSrc
  if (!source || pendingVideoPlays.has(video)) return
  pendingVideoPlays.add(video)
  try {
    nearbyVideoUrls.add(source)
    await nextTick()
    if (!canPlayVideo(video)) return
    await video.play().catch(() => undefined)
    // play() 异步完成时，用户可能已切图、关闭页面或滚出可视区。
    if (!canPlayVideo(video)) video.pause()
  } finally {
    pendingVideoPlays.delete(video)
  }
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
    enabled: shouldObserveVideos,
    rootMargin: '400px 0px',
    threshold: 0,
    onUnsupported: () => {
      getVideoElements().forEach((video) => {
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
    enabled: shouldObserveVideos,
    threshold: [0, 0.1],
    onUnsupported: () => {
      getVideoElements().forEach((video) => {
        visibleVideoElements.add(video)
        void playVisibleVideo(video)
      })
    },
  }
)

watch(
  () => props.items,
  async (_items, _previous, onCleanup) => {
    let cancelled = false
    onCleanup(() => (cancelled = true))
    stopCincoHover()
    showViewer.value = false
    previewIndex.value = 0
    const currentUrls = currentMediaUrls.value
    // 列表切换会复用同 URL 的图片节点，不能清空其状态并等待不会重发的 load 事件。
    for (const url of loadedMediaUrls)
      if (!currentUrls.has(url)) loadedMediaUrls.delete(url)
    for (const url of mediaAspectRatios.keys())
      if (!currentUrls.has(url)) mediaAspectRatios.delete(url)
    nearbyVideoUrls.clear()
    void replayEntrance()
    await nextTick()
    if (cancelled) return
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

watch([showViewer, documentVisibility], ([open, visibility]) => {
  if (open) stopCincoHover()
  getVideoElements().forEach((video) => {
    if (open || visibility !== 'visible') video.pause()
    else if (visibleVideoElements.has(video)) void playVisibleVideo(video)
  })
})

onBeforeUnmount(() => {
  disposed = true
  getVideoElements().forEach((video) => video.pause())
})
</script>

<style lang="less" scoped>
@import '@/assets/style/mediaCincoHover.less';
.media-gallery {
  --media-gallery-columns: 3;
  display: grid;
  grid-template-columns: repeat(var(--media-gallery-columns), minmax(0, 1fr));
  gap: 0;
  align-items: start;
  align-content: start;
}

.media-gallery__toolbar.no-rem {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 0;
  padding: 0 0 16px;

  button {
    display: grid;
    place-items: center;
    width: 38px;
    height: 36px;
    padding: 8px;
    border: 1px solid transparent;
    color: var(--text-color);
    background: transparent;
    font: 12px 'alibaba-puhuiti', sans-serif;
    cursor: pointer;

    svg {
      width: 20px;
      height: 20px;
    }

    &[aria-pressed='true'] {
      color: var(--page-theme-color, #e23456);
      border-color: currentColor;
    }

    &:focus-visible {
      outline: 2px solid var(--page-theme-color, #e23456);
      outline-offset: 3px;
    }
  }
}

.media-gallery__preview {
  grid-column: 1 / -1;
  min-width: 0;

  .media-gallery__info {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

.media-gallery__card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: subgrid;
  grid-row: span 2;
  align-items: stretch;
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
  &:nth-of-type(3n)::after {
    display: none;
  }
}

.media-gallery--staggered:not(.is-entered) .media-gallery__frame {
  opacity: 0.2;
  clip-path: inset(49% 49%);
  filter: brightness(1.25) contrast(1.08);
  transform: scale(0.9);
}

.media-gallery--staggered:not(.is-entered):not(.media-gallery--preview)
  .media-gallery__info {
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

.media-gallery--staggered.is-entered:not(.media-gallery--preview)
  .media-gallery__info {
  animation: media-gallery-info-in 0.36s ease-out both;
  animation-delay: calc(var(--media-gallery-entry-delay, 0ms) + 0.54s);
}

.media-gallery__shell,
.media-gallery__frame,
.media-gallery__stage {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.media-gallery__shell {
  // 宽度按媒体比例收敛；两层子网格共享每行的图片区和信息栏高度。
  width: min(
    100%,
    calc(var(--media-gallery-max-height) * var(--media-aspect-ratio))
  );
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: subgrid;
  grid-row: span 2;
  align-items: stretch;
  margin-right: auto;
  margin-left: auto;
}

.media-gallery__frame {
  position: relative;
  z-index: 1;
  height: auto;
  aspect-ratio: var(--media-aspect-ratio, 1);
  align-self: stretch;
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
    overflow: hidden;

    &::before {
      // 参照 Motion Skeleton Shimmer：固定占位区域，仅横向移动明暗渐变。
      background: linear-gradient(
        90deg,
        rgb(255 255 255 / 6%) 25%,
        rgb(255 255 255 / 12%) 50%,
        rgb(255 255 255 / 6%) 75%
      );
      background-size: 200% 100%;
      background-position: -200% 0;
      opacity: 1;
      animation: media-placeholder-shimmer 1.5s ease-in-out infinite;
    }

    img,
    video {
      opacity: 0;
    }
  }
}

.media-gallery__stage {
  position: absolute;
  inset: 0;
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
  }

  video {
    position: relative;
    z-index: 4;
    background: #000;
  }
}

.media-gallery__open {
  position: relative;
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

  .media-cinco-hover();
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
  from {
    background-position: -200% 0;
  }

  to {
    background-position: 200% 0;
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
  .media-gallery:not(.media-gallery--four-columns)
    .media-gallery__card:nth-of-type(3n + 1):nth-last-of-type(-n + 3) {
    &,
    & ~ .media-gallery__card {
      border-bottom-color: transparent;
    }
  }

  .media-gallery__card:nth-of-type(3n + 1) {
    padding-left: 0;
  }
  .media-gallery__card:nth-of-type(3n) {
    padding-right: 0;
  }
  .media-gallery--four-columns {
    --media-gallery-columns: 4;

    .media-gallery__card:nth-of-type(4n + 1):nth-last-of-type(-n + 4) {
      &,
      & ~ .media-gallery__card {
        border-bottom-color: transparent;
      }
    }

    .media-gallery__card {
      padding-right: 10px;
      padding-left: 10px;

      &::after {
        display: block;
      }
      &:nth-of-type(4n + 1) {
        padding-left: 0;
      }
      &:nth-of-type(4n) {
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
    --media-gallery-columns: 2;
  }

  .media-gallery__card:nth-of-type(2n + 1):nth-last-of-type(-n + 2) {
    &,
    & ~ .media-gallery__card {
      border-bottom-color: transparent;
    }
  }

  .media-gallery__card {
    padding: 10px 5px;
    border-bottom-color: rgba(255, 255, 255, 0.04);
    --media-gallery-max-height: clamp(150px, 42vw, 220px);

    &:nth-of-type(odd) {
      padding-left: 0;
    }
    &:nth-of-type(even) {
      padding-right: 0;
    }

    &::after {
      display: none;
    }

    &:nth-of-type(odd)::after {
      display: block;
      background: rgba(255, 255, 255, 0.04);
    }
  }

  .media-gallery__info {
    min-height: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-gallery__frame.is-loading::before {
    animation: none;
    background-position: 50% 0;
  }

  .media-gallery--staggered:not(.is-entered) .media-gallery__frame,
  .media-gallery--staggered:not(.is-entered):not(.media-gallery--preview)
    .media-gallery__info {
    opacity: 1;
    clip-path: none;
    filter: none;
    transform: none;
  }

  .media-gallery--staggered.is-entered .media-gallery__frame,
  .media-gallery--staggered.is-entered .media-gallery__frame::after,
  .media-gallery--staggered.is-entered:not(.media-gallery--preview)
    .media-gallery__info {
    animation: none;
  }
}
</style>
