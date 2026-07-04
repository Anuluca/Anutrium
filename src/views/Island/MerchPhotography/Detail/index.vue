<template>
  <div v-if="collection" class="merch-detail-page main-container">
    <DetailPageHeader
      back-label="MERCH"
      back-path="/island/merch-photography"
      :counter="{
        value: String(collection.photos.length).padStart(2, '0'),
        label: 'ITEMS',
      }"
      :subtitle="collection.subtitle"
      :title="collection.title"
    />

    <main class="merch-gallery">
      <MediaGallery
        v-if="collection.photos.length"
        :entrance-step-ms="90"
        :items="collection.photos"
        :get-media-label="getMediaLabel"
        :show-media-info="showMediaInfo"
        staggered-entrance
      >
        <template #info="{ item: photo }">
          <div class="merch-photo-title">{{ photo.title }}</div>
        </template>
      </MediaGallery>
      <div v-else class="merch-gallery__empty">
        {{ t('island.merchEmpty') }}
      </div>
    </main>

    <PageFooter cn-title="周边摄影" en-title="MERCH PHOTOGRAPHY" />
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

interface MerchPhoto extends GalleryMedia {
  url: string
  title?: string
}

interface MerchCollection {
  id: string
  title: string
  subtitle: string
  cover: string
  photos: MerchPhoto[]
}

const route = useRoute()
const router = useRouter()
const { t, tm } = useI18n()
const collectionId = computed(() => route.params.collectionId as string)
const collection = computed(() => {
  const collections = tm(
    'island.dynamic.merchPhotographyCollections'
  ) as MerchCollection[]
  return collections.find((item) => item.id === collectionId.value)
})

const getMediaLabel = (media: GalleryMedia) =>
  media.title || t('island.merchPhotographyTitle')
const showMediaInfo = (media: GalleryMedia) => Boolean(media.title)

watch(
  collection,
  (currentCollection) => {
    if (!currentCollection) router.replace('/404')
  },
  { immediate: true }
)
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'cn-custom', 'Courier New', monospace;

.merch-detail-page {
  color: var(--text-color);
  overflow: hidden;

  :deep(.media-gallery) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :deep(.media-gallery__card::after) {
    display: none !important;
  }

  :deep(.media-gallery__card:nth-child(odd)::after) {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    display: block !important;
    width: 1px;
    content: '';
    background: rgba(255, 255, 255, 0.05);
  }
}

.merch-gallery {
  padding: 54px 0 36px;
}

.merch-photo-title {
  display: grid;
  place-items: center;
  min-height: 28px;
  padding: 4px 12px 5px;
  box-sizing: border-box;
  color: @red;
  font-family: @mono;
  font-size: 0.48rem;
  font-weight: 800;
  text-align: center;
}

.merch-gallery__empty {
  display: grid;
  place-items: center;
  min-height: 320px;
  color: var(--text-faint);
  font-family: @mono;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
}

@media (max-width: 900px) {
  .merch-detail-page {
    padding-top: 88px;
  }

  .merch-gallery {
    padding-top: 38px;
  }

  .merch-photo-title {
    min-height: 26px;
    padding: 3px 6px 4px;
    font-size: 0.4rem;
  }
}
</style>
