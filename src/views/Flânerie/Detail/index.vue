<template>
  <div v-if="vlog" class="flr-page main-container">
    <section class="flr-hero">
      <button class="flr-back" type="button" @click="router.push('/flanerie')">
        <span>FLANERIE</span>
      </button>

      <div class="flr-title-block">
        <h1 class="flr-main-title">
          <span class="title">{{ vlog.title }}</span>
          <span class="flr-sub-date">{{ vlog.date }}</span>
        </h1>
        <p class="flr-tagline">{{ vlog.tagline }}</p>
        <div v-if="vlog.device?.length" class="flr-devices">
          <span class="flr-device-label">
            {{ t('flanerie.deviceLabel') }}: 
          </span>
          <span v-for="device in vlog.device" :key="device" class="flr-device">
            {{ device }}
          </span>
        </div>
      </div>
    </section>

    <section v-if="videos.length" class="flr-video-panel">
      <div class="section-head">
        <div class="head-left">
          <span class="head-slash">01 </span>
          <span class="head-label">{{ t('flanerie.videoLabel') }}</span>
        </div>
        <strong class="head-count">
          {{ t('flanerie.countLabel') }} {{ String(videos.length) }}
        </strong>
      </div>

      <JourneyVideoPlayer :videos="videos" />
    </section>

    <section v-if="photos.length" ref="galleryRef" class="flr-gallery">
      <div class="section-head">
        <div class="head-left">
          <span class="head-slash">{{ videos.length ? '02' : '01' }} </span>
          <span class="head-label">{{ t('flanerie.photoLabel') }}</span>
        </div>
        <strong class="head-count">
          {{ t('flanerie.countLabel') }} {{ String(photos.length) }}
        </strong>
      </div>

      <MediaGallery :items="paginatedPhotos" :get-media-label="getMediaLabel">
        <template #info="{ item: photo }">
          <div class="photo-info__inner">
            <span class="photo-info__device">{{ photo.device || '' }}</span>
            <span
              class="photo-info__time"
              :class="{
                'photo-info__time--divided': photo.time && photo.location,
              }"
            >
              {{ photo.time || '' }}
            </span>
            <span class="photo-info__location">
              <Location
                v-if="photo.location"
                class="photo-info__location-icon"
                aria-hidden="true"
              />
              <span>{{ photo.location || '' }}</span>
            </span>
          </div>
        </template>
      </MediaGallery>

      <nav
        v-if="totalPages > 1"
        class="photo-pagination"
        :aria-label="t('flanerie.pageLabel')"
      >
        <button
          type="button"
          :disabled="currentPage === 1"
          @click="setPage(currentPage - 1)"
        >
          {{ t('flanerie.previousPage') }}
        </button>
        <button
          v-for="page in totalPages"
          :key="page"
          type="button"
          :class="{ active: page === currentPage }"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="setPage(page)"
        >
          {{ page }}
        </button>
        <button
          type="button"
          :disabled="currentPage === totalPages"
          @click="setPage(currentPage + 1)"
        >
          {{ t('flanerie.nextPage') }}
        </button>
      </nav>
    </section>
    <PageFooter cn-title="旅程" en-title="FLÂNERIE" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Location } from '@element-plus/icons-vue'

import JourneyVideoPlayer from '@/components/JourneyVideoPlayer/index.vue'
import MediaGallery, {
  type GalleryMedia,
} from '@/components/MediaGallery/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const router = useRouter()
const route = useRoute()
const { t, tm } = useI18n()

interface VideoItem {
  title: string
  cover: string
  bvid?: string
  url: string
  orientation?: 'landscape' | 'portrait'
  embedUrl?: string
}

interface PhotoItem {
  title?: string
  location?: string
  device?: string
  time?: string
  url: string
}

interface VlogItem {
  id: string
  title: string
  date: string
  tagline: string
  device: string[]
  videos: Omit<VideoItem, 'embedUrl'>[]
  photos: PhotoItem[]
}

const PAGE_SIZE = 30
const galleryRef = ref<HTMLElement | null>(null)
const currentPage = ref(1)

const vlogId = computed(() => route.params.vlogId as string)
const vlog = computed<VlogItem | undefined>(() => {
  const vlogs = tm('flanerie.dynamic.vlogs') as VlogItem[]
  return vlogs.find((item) => item.id === vlogId.value)
})

const videos = computed<VideoItem[]>(() => {
  return (vlog.value?.videos || []).map((v) => ({
    ...v,
    embedUrl: v.bvid
      ? `https://player.bilibili.com/player.html?${new URLSearchParams({
          bvid: v.bvid,
          page: '1',
          high_quality: '1',
          danmaku: '0',
          autoplay: '1',
        })}`
      : '',
  }))
})

const photos = computed<PhotoItem[]>(() => vlog.value?.photos || [])
const totalPages = computed(() => Math.ceil(photos.value.length / PAGE_SIZE))
const paginatedPhotos = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return photos.value.slice(start, start + PAGE_SIZE)
})

const getMediaLabel = (media: GalleryMedia) =>
  media.location || media.title || 'Photo'

const setPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return

  currentPage.value = page
  galleryRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(
  vlog,
  (currentVlog) => {
    if (!currentVlog) {
      router.replace('/404')
      return
    }

    currentPage.value = 1
  },
  { immediate: true }
)
</script>

<style lang="less" scoped>
@red: #e23456;
@purple: #9a76ff;
@panel: rgba(18, 5, 12, 0.72);
@line: rgba(226, 52, 86, 0.28);
@bg: #050206;
@mono: 'cn-custom', 'Courier New', monospace;
@cjk: 'alibaba-puhuiti', sans-serif;

.flr-page {
  color: #fff;
  overflow: hidden;
}

.flr-back {
  display: inline-flex;
  justify-content: start;
  background: none;
  border: none;
  color: @red;
  font-family: @mono;
  font-size: 0.66rem;
  padding: 0;
  font-weight: 900;
  cursor: pointer;
  opacity: 0.65;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }

  .back-bracket {
    opacity: 0.5;
  }
}

.flr-hero {
  margin-bottom: 0;
}

.flr-title-block {
  padding-left: 18px;
  border-left: 8px solid @red;
}

.flr-main-title {
  display: flex;
  justify-content: start;
  align-items: end;

  .title {
    margin: 0 0 6px;
    font-family: @mono;
    font-size: clamp(1.6rem, 3.2vw, 2.4rem);
    font-weight: 900;
    line-height: 1;
    color: #fff;
  }
}

.flr-sub-date {
  letter-spacing: 0;
  font-size: 0.6rem;
  font-weight: 900;
    font-family: @mono;
    background-color: #E23456;
  color: #000;
  padding: 3px 10px;
  margin-bottom: 5px;
  margin-left: 20px;
}

.flr-tagline {
  font-family: @cjk;
  font-size: 0.76rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
}

.flr-devices {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.flr-device-label,
.flr-device {
  font-family: @mono;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.flr-device-label {
  margin-right: 2px;
  color: rgb(226, 52, 87);
  font-weight: 100;
}

.flr-device {
  padding: 4px 8px;
  font-size: 15px;
  letter-spacing: 0;
  border: 1px solid rgba(226, 52, 86, 0.22);
  color: rgba(255, 255, 255, 0.58);
  background: rgba(226, 52, 86, 0.06);
}

.flr-video-panel,
.flr-gallery {
  margin-top: 30px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid @line;

  .head-left {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .head-slash {
    font-family: @mono;
    font-size: 0.68rem;
    color: rgba(226, 52, 86, 0.55);
    font-weight: 900;
  }

  .head-label {
    font-family: @cjk;
    font-size: 0.68rem;
    color: @red;
    font-weight: 900;
    margin-left: 5px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .head-count {
    font-family: @cjk;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.3);
    font-weight: 600;
  }
}

.corner {
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: @red;
  border-style: solid;
  pointer-events: none;
  opacity: 0.6;

  &--tl {
    top: 6px;
    left: 6px;
    border-width: 1px 0 0 1px;
  }
  &--tr {
    top: 6px;
    right: 6px;
    border-width: 1px 1px 0 0;
  }
  &--bl {
    bottom: 6px;
    left: 6px;
    border-width: 0 0 1px 1px;
  }
  &--br {
    bottom: 6px;
    right: 6px;
    border-width: 0 1px 1px 0;
  }
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  align-items: stretch;
}

.photo-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  width: 100%;
  padding: 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  box-sizing: border-box;
  --photo-media-max-height: clamp(220px, 25vw, 360px);

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

.photo-media-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  margin-right: auto;
  margin-left: auto;
}

.photo-visual {
  position: relative;
  width: fit-content;
  max-width: 100%;
}

.photo-image-frame {
  position: relative;
  z-index: 1;
  width: fit-content;
  max-width: 100%;
  max-height: var(--photo-media-max-height);

  &.is-loading {
    width: 12rem;
    height: var(--photo-media-max-height);
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
      animation: photo-placeholder-shimmer 1.6s ease-in-out infinite;
    }

    .photo-image-stage {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  }
}

.photo-image-stage {
  width: fit-content;
  max-width: 100%;
  max-height: var(--photo-media-max-height);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  .photo-open {
    display: flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    max-width: 100%;
    max-height: var(--photo-media-max-height);
    padding: 0;
    border: 0;
    background: transparent;
    cursor: zoom-in;
  }

  img {
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: var(--photo-media-max-height);
    object-fit: contain;
    object-position: center;
    filter: saturate(0.88) contrast(1.06) brightness(0.82);
    transition: filter 0.28s ease, transform 0.28s ease;
  }

  video {
    position: relative;
    z-index: 4;
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: var(--photo-media-max-height);
    object-fit: contain;
    background: #000;
  }
}

.photo-open:hover img,
.photo-open:focus-visible img {
  filter: saturate(1.12) contrast(1.1) brightness(0.94);
  transform: scale(1.015);
}

@keyframes photo-placeholder-shimmer {
  to {
    transform: translateX(100%);
  }
}

.photo-info {
  position: relative;
  width: 100%;
  min-width: 12rem;
  min-height: 28px;
  margin-top: 14px;
  background: rgba(5, 2, 6, 0.39);
  box-sizing: border-box;

  &__inner {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    min-height: 28px;
    padding: 4px 12px 5px;
    color: #fff;
    font-family: @cjk;
    font-size: 0.48rem;
    line-height: 1.25;
    text-align: center;

    > span {
      position: relative;
      min-width: 0;
      overflow: hidden;
      padding: 0 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__device {
    color: @red;
    font-family: @mono;
    font-weight: 800;
    text-align: left;
  }

  &__time {
    padding-right: 16px !important;

    &--divided {
      background: linear-gradient(
          rgba(117, 18, 38, 0.9),
          rgba(117, 18, 38, 0.9)
        )
        right center / 8px 1px no-repeat;
    }
  }

  &__location {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    overflow: visible !important;
    padding-left: 8px !important;
    text-align: right;
    white-space: normal !important;

    span {
      overflow-wrap: anywhere;
    }
  }

  &__location-icon {
    flex: 0 0 auto;
    width: 14px;
    height: 14px;
    color: @red;
  }
}

.photo-pagination {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 34px;

  button {
    min-width: 36px;
    height: 34px;
    padding: 0 12px;
    border: 1px solid rgba(226, 52, 86, 0.28);
    color: rgba(255, 255, 255, 0.62);
    background: rgba(18, 5, 12, 0.72);
    cursor: pointer;
    font-family: @mono;
    font-size: 0.56rem;
    transition: border-color 0.2s, color 0.2s, background 0.2s;

    &:hover:not(:disabled),
    &.active {
      border-color: @red;
      color: #fff;
      background: rgba(226, 52, 86, 0.18);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.28;
    }
  }
}

@media (max-width: 900px) {
  .flr-page {
    padding-top: 88px;
  }

  .photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
  }

  .photo-image-frame {
    max-height: clamp(150px, 42vw, 220px);
  }

  .photo-card {
    padding: 10px 5px;
    border-bottom-color: rgba(255, 255, 255, 0.04);
    --photo-media-max-height: clamp(150px, 42vw, 220px);

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

  .photo-info {
    min-height: 26px;
  }

  .photo-info__inner {
    min-height: 26px;
    padding-top: 3px;
    padding-right: 6px;
    padding-bottom: 4px;
    padding-left: 6px;
    font-size: 0.4rem;

    > span {
      padding: 0 5px;
    }
  }
}
</style>
