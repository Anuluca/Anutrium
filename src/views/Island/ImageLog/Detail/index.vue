<template>
  <div v-if="album" class="image-log-detail-page main-container">
    <DetailPageHeader
      back-label="IMAGE LOG"
      back-path="/island/image-log"
      :counter="{
        value: String(album.photos.length).padStart(2, '0'),
        label: 'ITEMS',
      }"
      :subtitle="album.subtitle"
      :title="album.title"
    />

    <main class="image-log-gallery">
      <MediaGallery
        v-if="album.photos.length"
        :entrance-step-ms="90"
        :items="album.photos"
        :get-media-label="getMediaLabel"
        :show-media-info="showMediaInfo"
        staggered-entrance
      >
        <template #info="{ item: photo }">
          <div class="image-log-photo-title">{{ photo.title }}</div>
        </template>
      </MediaGallery>

      <div v-else class="image-log-gallery__empty">
        {{ t('island.imageLogEmpty') }}
      </div>
    </main>

    <PageFooter cn-title="图像记录" en-title="IMAGE LOG" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import MediaGallery, {
  type GalleryMedia,
} from '@/components/MediaGallery/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

interface ImageLogPhoto extends GalleryMedia {
  url: string
  title?: string
}

interface ImageLogAlbum {
  id: string
  title: string
  subtitle: string
  accentColor?: string
  photos: ImageLogPhoto[]
}

const route = useRoute()
const router = useRouter()
const { t, tm } = useI18n()
const albumId = computed(() => route.params.albumId as string)
const albums = computed(() => tm('island.dynamic.imageLog') as ImageLogAlbum[])
const album = computed(() =>
  albums.value.find((item) => item.id === albumId.value)
)

const getMediaLabel = (media: GalleryMedia) =>
  media.title || t('island.imageLogTitle')
const showMediaInfo = (media: GalleryMedia) => Boolean(media.title)

watch(
  album,
  (currentAlbum) => {
    if (!currentAlbum) router.replace('/404')
  },
  { immediate: true }
)
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'cn-custom', 'Courier New', monospace;

.image-log-detail-page {
  color: var(--text-color);
  overflow: hidden;

  :deep(.media-gallery__card::after) {
    background: rgba(255, 255, 255, 0.05);
  }
}

.image-log-gallery {
  padding: 54px 0 36px;
}

.image-log-photo-title {
  display: grid;
  min-height: 28px;
  padding: 4px 12px 5px;
  place-items: center;
  box-sizing: border-box;
  color: @red;
  font-family: @mono;
  font-size: 0.48rem;
  font-weight: 800;
  text-align: center;
}

.image-log-gallery__empty {
  display: grid;
  min-height: 320px;
  place-items: center;
  color: var(--text-faint);
  font-family: @mono;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
}

@media (max-width: 900px) {
  .image-log-detail-page {
    padding-top: 88px;
  }

  .image-log-gallery {
    padding-top: 38px;
  }

  .image-log-photo-title {
    min-height: 26px;
    padding: 3px 6px 4px;
    font-size: 0.4rem;
  }
}
</style>
