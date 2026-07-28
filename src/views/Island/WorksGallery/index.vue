<template>
  <div class="works-gallery-page main-container">
    <DetailPageHeader
      back-label="ISLAND"
      back-path="/test"
      :title="work.title"
    />

    <main class="works-gallery">
      <MediaGallery
        v-if="work.photos.length"
        :entrance-step-ms="90"
        :items="work.photos"
        :get-media-label="getMediaLabel"
        :show-media-info="showMediaInfo"
        staggered-entrance
      >
        <template #info="{ item: photo }">
          <div class="works-photo-title">{{ photo.title }}</div>
        </template>
      </MediaGallery>
      <div v-else class="works-gallery__empty">
        {{ t(`island.modules.works.${moduleKey}.empty`) }}
      </div>
    </main>

    <PageFooter :cn-title="footerTitle.cn" :en-title="footerTitle.en" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import MediaGallery, {
  type GalleryMedia,
} from '@/components/MediaGallery/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

type WorkModuleKey = 'illustration' | 'trainerCard'

interface WorkPhoto extends GalleryMedia {
  url: string
  title?: string
}

interface WorkGalleryData {
  id: string
  title: string
  photos: WorkPhoto[]
}

interface WorkPageConfig {
  footerTitle: {
    cn: string
    en: string
  }
  moduleKey: WorkModuleKey
}

const WORK_PAGE_CONFIG: Record<string, WorkPageConfig> = {
  ISLAND_ILLUSTRATION: {
    moduleKey: 'illustration',
    footerTitle: {
      cn: '绘画',
      en: 'ILLUSTRATION',
    },
  },
  ISLAND_TRAINER_CARD: {
    moduleKey: 'trainerCard',
    footerTitle: {
      cn: '训练家卡',
      en: 'TRAINER CARD',
    },
  },
}

const route = useRoute()
const { t, tm } = useI18n()
const pageConfig = computed(
  () =>
    WORK_PAGE_CONFIG[String(route.name)] || WORK_PAGE_CONFIG.ISLAND_ILLUSTRATION
)
const moduleKey = computed(() => pageConfig.value.moduleKey)
const footerTitle = computed(() => pageConfig.value.footerTitle)
const work = computed(
  () => tm(`island.modules.works.${moduleKey.value}.data`) as WorkGalleryData
)

const getMediaLabel = (media: GalleryMedia) => media.title || work.value.title
const showMediaInfo = (media: GalleryMedia) => Boolean(media.title)
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'cn-custom', 'Courier New', monospace;

.works-gallery-page {
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

.works-gallery {
  padding: 54px 0 36px;
}

.works-photo-title {
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

.works-gallery__empty {
  display: grid;
  place-items: center;
  min-height: 320px;
  color: var(--text-faint);
  font-family: @mono;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
}

@media (max-width: 900px) {
  .works-gallery-page {
    padding-top: 88px;
  }

  .works-gallery {
    padding-top: 38px;
  }

  .works-photo-title {
    min-height: 26px;
    padding: 3px 6px 4px;
    font-size: 0.4rem;
  }
}
</style>
