<template>
  <div v-if="vlog" class="flr-page main-container">
    <DetailPageHeader
      back-label="FLANERIE"
      back-path="/flanerie"
      :subtitle="vlog.tagline"
      :title="vlog.title"
    >
      <template #title-extra>
        <span v-if="vlog.date" class="flr-sub-date">{{ vlog.date }}</span>
      </template>
      <div v-if="devices.length" class="flr-devices">
        <span class="flr-device-label">{{ t('flanerie.deviceLabel') }}:</span>
        <span v-for="device in devices" :key="device" class="flr-device">
          {{ device }}
        </span>
      </div>
    </DetailPageHeader>

    <DetailSections
      v-if="videos.length"
      class="flr-video-panel"
      section-number="1"
      :title="t('flanerie.videoLabel')"
      :item-count="videos.length"
    >
      <JourneyVideoPlayer
        :videos="videos"
        @entrance-handoff="videoEntranceHandoff = true"
      />
    </DetailSections>

    <DetailSections
      v-if="photos.length"
      ref="galleryRef"
      class="flr-gallery"
      :section-number="videos.length ? 2 : 1"
      :title="t('flanerie.photoLabel')"
      :item-count="photos.length"
    >
      <MediaGallery
        :items="paginatedPhotos"
        :get-media-label="getMediaLabel"
        :entrance-ready="!videos.length || videoEntranceHandoff"
        :entrance-step-ms="90"
        preserve-image-colors
        staggered-entrance
      >
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
    </DetailSections>
    <PageFooter cn-title="旅程" en-title="FLÂNERIE" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Location } from '@element-plus/icons-vue'

import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import DetailSections from '@/components/DetailSections/index.vue'
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
  videos: Omit<VideoItem, 'embedUrl'>[]
  photos: PhotoItem[]
}

const PAGE_SIZE = 30
const galleryRef = ref<{
  scrollIntoView: (options?: ScrollIntoViewOptions) => void
} | null>(null)
const currentPage = ref(1)
const videoEntranceHandoff = ref(false)

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
const devices = computed(() => [
  ...new Set(
    photos.value
      .map((photo) => photo.device?.trim())
      .filter((device): device is string => Boolean(device))
  ),
])
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

    videoEntranceHandoff.value = false
    currentPage.value = 1
  },
  { immediate: true }
)
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'cn-custom', 'Courier New', monospace;
@cjk: 'alibaba-puhuiti', sans-serif;

.flr-page {
  color: #fff;
  overflow: hidden;
}

.flr-sub-date {
  letter-spacing: 0;
  font-size: 0.6rem;
  font-weight: 900;
  font-family: @mono;
  background-color: #e23456;
  color: #000;
  padding: 3px 10px;
  margin-bottom: 5px;
  margin-left: 20px;
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

.photo-info {
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
    padding-right: 18px !important;

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
