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
        <div v-if="vlog.device.length" class="flr-devices">
          <span class="flr-device-label">
            {{ t('flanerie.deviceLabel') }}
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

      <div class="video-list">
        <div
          v-for="(vid, idx) in videos"
          :key="vid.bvid || idx"
          class="video-item"
          :class="
            vid.orientation === 'portrait'
              ? 'video-item--portrait'
              : 'video-item--landscape'
          "
        >
          <div class="video-item__label">
            <span class="vi-index">{{ String(idx + 1).padStart(2, '0') }}</span>
            <span class="vi-title">{{ vid.title }}</span>
          </div>
          <div class="video-frame">
            <iframe
              v-if="vid.embedUrl"
              :src="vid.embedUrl"
              :title="vid.title"
              allowfullscreen
              scrolling="no"
              frameborder="0"
              sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts"
            />
            <a v-else class="video-link" :href="vid.url" target="_blank">
              <span class="vl-play">▶</span>
              <span class="vl-text">PLAY VIDEO</span>
              <small class="vl-url">{{ vid.url }}</small>
            </a>
            <div class="corner corner--tl" />
            <div class="corner corner--tr" />
            <div class="corner corner--bl" />
            <div class="corner corner--br" />
          </div>
        </div>
      </div>
    </section>

    <section v-if="photos.length" ref="galleryRef" class="flr-gallery">
      <div class="section-head">
        <div class="head-left">
          <span class="head-slash">02 </span>
          <span class="head-label">{{ t('flanerie.photoLabel') }}</span>
        </div>
        <strong class="head-count">
          {{ t('flanerie.countLabel') }} {{ String(photos.length) }}
        </strong>
      </div>

      <div class="photo-grid">
        <button
          v-for="(photo, index) in paginatedPhotos"
          :key="photo.src"
          class="photo-card"
          type="button"
          @click="openViewer((currentPage - 1) * PAGE_SIZE + index)"
        >
          <div class="photo-image-stage">
            <img
              :src="photo.src"
              :alt="photo.title || ''"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div class="photo-footer">
            <div class="photo-crystal" aria-hidden="true">
              <CrystalLogo />
            </div>
            <strong v-if="photo.title" class="pm-title">
              {{ photo.title }}
            </strong>
          </div>
          <div class="photo-overlay" aria-hidden="true" />
        </button>
      </div>

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

    <ElImageViewer
      v-if="showViewer"
      :url-list="photoUrls"
      :initial-index="currentPhotoIndex"
      teleported
      @close="showViewer = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ElImageViewer } from 'element-plus'

import CrystalLogo from '@/components/CrystalLogo/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const router = useRouter()
const route = useRoute()
const { t, tm } = useI18n()

interface VideoItem {
  title: string
  bvid?: string
  url: string
  orientation?: 'landscape' | 'portrait'
  embedUrl?: string
}

interface PhotoItem {
  title: string
  src: string
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
const showViewer = ref(false)
const currentPhotoIndex = ref(0)

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
          autoplay: '0',
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

const photoUrls = computed(() => photos.value.map((p) => p.src))

const openViewer = (index: number) => {
  currentPhotoIndex.value = index
  showViewer.value = true
}

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
    showViewer.value = false
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
@mono: 'Unbounded Sans', 'Courier New', monospace;
@cjk: 'source-han-sans-simplified-c', sans-serif;

.flr-page {
  color: #fff;
  overflow: hidden;
}

.flr-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: @red;
  font-family: @mono;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.14em;
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

.flr-main-title {
  display: flex;
  justify-content: start;
  align-items: end;
  .title {
    margin: 0 0 6px;
    font-family: @cjk;
    font-size: clamp(1.6rem, 3.2vw, 2.4rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    line-height: 1.1;
    color: #fff;
  }
}

.flr-sub-date {
  letter-spacing: 0;
  font-size: 0.6rem;
  font-weight: 900;
  color: rgba(226, 52, 86, 0.7);
  padding-bottom: 6px;
}

.flr-tagline {
  font-family: @cjk;
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.04em;
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
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.flr-device-label {
  margin-right: 2px;
  color: rgba(226, 52, 86, 0.72);
}

.flr-device {
  padding: 4px 8px;
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

.video-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
}

.video-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  &--landscape {
    width: min(920px, 100%);
  }

  &--portrait {
    width: min(580px, 100%);
  }

  &__label {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;

    .vi-index {
      font-family: @mono;
      font-size: 0.6rem;
      color: rgba(226, 52, 86, 0.55);
      font-weight: 900;
    }

    .vi-title {
      font-family: 'source-han-sans-simplified-c';
      font-size: 0.66rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 700;
      text-transform: uppercase;
    }
  }
}

.video-frame {
  position: relative;
  width: 100%;
  border: 1px solid @line;
  background: linear-gradient(
      135deg,
      rgba(226, 52, 86, 0.12) 0%,
      transparent 28%
    ),
    @bg;
  box-shadow: 8px 10px 0 rgba(0, 0, 0, 0.5), 0 0 24px rgba(226, 52, 86, 0.08);

  .video-item--landscape & {
    aspect-ratio: 16 / 9;
  }

  .video-item--portrait & {
    aspect-ratio: 16 / 16;
  }

  iframe {
    position: absolute;
    inset: 12px;
    width: calc(100% - 24px);
    height: calc(100% - 24px);
    border: 0;
    background: #000;
  }
}

.video-link {
  position: absolute;
  inset: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.06);

  .vl-play {
    font-size: 2.2rem;
    color: @red;
    filter: drop-shadow(0 0 10px rgba(226, 52, 86, 0.6));
  }

  .vl-text {
    font-family: @mono;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.18em;
  }

  .vl-url {
    font-family: @mono;
    font-size: 0.52rem;
    color: rgba(255, 255, 255, 0.25);
  }

  &:hover .vl-play {
    filter: drop-shadow(0 0 18px rgba(226, 52, 86, 0.9));
  }
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.photo-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
  overflow: hidden;
  width: 100%;
  height: clamp(220px, 25vw, 360px);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid rgba(226, 52, 86, 0.2);
    pointer-events: none;
    z-index: 2;
  }
}

.photo-image-stage {
  position: absolute;
  inset: 12px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center;
    display: block;
    filter: saturate(0.88) contrast(1.06) brightness(0.82);
    transition: filter 0.28s ease, transform 0.28s ease;
  }
}

.photo-card:hover img {
  filter: saturate(1.12) contrast(1.1) brightness(0.94);
  transform: scale(1.015);
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(5, 2, 6, 0.65) 0%, transparent 44%);
  pointer-events: none;
  z-index: 3;
}

.photo-footer {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 15px;
  min-height: 40px;
  z-index: 6;
  pointer-events: none;
}

.photo-crystal {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.pm-title {
  position: absolute;
  right: -5px;
  bottom: 10px;
  z-index: 7;
  max-width: calc(100% - 44px);
  min-width: 0;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.68);
  font-family: 'STSong';
  font-size: 0.4rem;
  font-weight: 700;
  text-align: right;
  text-overflow: ellipsis;
  transform: translateY(50%);
  white-space: nowrap;
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
    gap: 8px;
  }

  .photo-card {
    height: clamp(150px, 42vw, 220px);
    box-shadow: 5px 6px 0 rgba(0, 0, 0, 0.44);
  }

  .photo-image-stage {
    inset: 8px 8px 46px;
  }

  .photo-footer {
    right: 8px;
    bottom: 4px;
    left: 8px;
    min-height: 36px;
  }

  .photo-crystal {
    transform: scale(0.8);
    transform-origin: left center;
  }

  .pm-title {
    font-size: 0.52rem;
  }
}
</style>
