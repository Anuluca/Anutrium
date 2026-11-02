<template>
  <div v-if="collection" class="merch-detail-page main-container">
    <DetailPageHeader
      back-label="MERCH"
      back-path="/atrium/collections"
      :title="collection.title"
    />

    <main class="merch-gallery">
      <MediaGallery
        v-if="collection.photos.length"
        :columns="{ desktop: 2 }"
        :entrance-step-ms="90"
        :items="collection.photos"
        :get-media-label="getMediaLabel"
        :show-media-info="showMediaInfo"
        staggered-entrance
      >
        <template #info="{ item: photo }">
          <div class="merch-media-title">{{ photo.title }}</div>
        </template>
      </MediaGallery>
      <div v-else class="merch-gallery__empty">
        {{ t('island.modules.photography.merch.empty') }}
      </div>
    </main>

    <PageFooter />
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

import type { MerchCollection, MerchGroups } from '@/types/merch'

const route = useRoute()
const router = useRouter()
const { t, tm } = useI18n()
const collectionId = computed(() => route.params.collectionId as string)
// 数据或语言变化时重建索引；仅切换详情参数时直接复用。
const collectionIndex = computed(() => {
  const groups = tm('island.modules.photography.merch.data') as MerchGroups
  const index = new Map<string, MerchCollection>()
  for (const collections of Object.values(groups))
    for (const item of collections) index.set(item.id, item)
  return index
})
const collection = computed(() => collectionIndex.value.get(collectionId.value))

const getMediaLabel = (media: GalleryMedia) =>
  media.title || t('island.modules.photography.merch.title')
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
@mono: 'UnboundedSans', 'Courier New', monospace;

.merch-detail-page {
  color: var(--text-color);
  overflow: hidden;
  transform-origin: center center;

  &.route-pre-leave,
  &.route-leave-to {
    opacity: 0;
    transform: scale(0.9);
  }

  &.route-pre-leave,
  &.route-leave-active {
    transition: opacity 0.18s ease,
      transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
    transition-delay: 0s;
    will-change: opacity, transform;
  }
}

.merch-gallery {
  padding: 54px 0 36px;
}

.merch-media-title {
  display: grid;
  place-items: center;
  min-height: 28px;
  padding: 4px 12px 5px;
  box-sizing: border-box;
  color: @red;
  font-family: 'alibaba-puhuiti', sans-serif;
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

  .merch-media-title {
    min-height: 26px;
    padding: 3px 6px 4px;
    font-size: 0.4rem;
  }
}
</style>
