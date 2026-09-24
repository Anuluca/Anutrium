<template>
  <div v-if="vlog" class="flr-page main-container">
    <DetailPageHeader
      back-label="FLANERIE"
      back-path="/flanerie"
      :title="vlog.title"
    />

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
          <MediaPhotoInfo :item="photo" :time-divider-padding="18" />
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
    <PageFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import DetailSections from '@/components/DetailSections/index.vue'
import JourneyVideoPlayer from '@/components/JourneyVideoPlayer/index.vue'
import MediaGallery, {
  type GalleryMedia,
} from '@/components/MediaGallery/index.vue'
import MediaPhotoInfo from '@/components/MediaPhotoInfo/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import { markJourneyReturn } from '@/utils/journeyReturnState'

import type { JourneyItem, JourneyPhoto, JourneyVideo } from '@/types/flanerie'

const router = useRouter()
const route = useRoute()
const { t, tm } = useI18n()

interface VideoItem extends JourneyVideo {
  embedUrl?: string
}

const PAGE_SIZE = 30
const galleryRef = ref<{
  scrollIntoView: (options?: ScrollIntoViewOptions) => void
} | null>(null)
const currentPage = ref(1)
const videoEntranceHandoff = ref(false)

const vlogId = computed(() => route.params.vlogId as string)
const vlog = computed<JourneyItem | undefined>(() => {
  const vlogs = tm('flanerie.dynamic.vlogs') as JourneyItem[]
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

const photos = computed<JourneyPhoto[]>(() => vlog.value?.photos || [])
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

onBeforeRouteLeave((to) => {
  if (to.name === 'FLANERIE') markJourneyReturn(vlogId.value)
})

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
@mono: 'UnboundedSans', 'Courier New', monospace;

.flr-page {
  color: #fff;
  overflow: hidden;
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
}
</style>
