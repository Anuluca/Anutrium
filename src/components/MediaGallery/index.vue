<template>
  <div class="media-gallery">
    <article
      v-for="(media, index) in items"
      :key="media.url"
      class="media-gallery__card"
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

        <div v-if="$slots.info" class="media-gallery__info">
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
import { computed, ref, watch } from 'vue'
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
  }>(),
  {
    getMediaLabel: (media: GalleryMedia) => media.title || 'Photo',
  }
)

const VIDEO_FILE_PATTERN = /\.(?:mov|mp4|webm|m4v|ogv)(?:[?#].*)?$/i
const loadedMediaUrls = ref(new Set<string>())
const showViewer = ref(false)
const currentImageIndex = ref(0)

const isVideoUrl = (url: string) => VIDEO_FILE_PATTERN.test(url)
const getLabel = (media: GalleryMedia) => props.getMediaLabel(media)
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

watch(
  () => props.items,
  () => {
    showViewer.value = false
    loadedMediaUrls.value = new Set()
  }
)
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

.media-gallery__info {
  position: relative;
  width: 100%;
  min-width: 12rem;
  min-height: 28px;
  margin-top: 14px;
  background: rgba(5, 2, 6, 0.39);
  box-sizing: border-box;
}

@keyframes media-placeholder-shimmer {
  to {
    transform: translateX(100%);
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
</style>
