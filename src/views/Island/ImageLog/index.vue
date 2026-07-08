<template>
  <div class="image-log-page main-container">
    <DetailPageHeader
      back-label="ISLAND"
      back-path="/test"
      :counter="{
        value: String(albums.length).padStart(2, '0'),
        label: 'ALBUMS',
      }"
      :subtitle="t('island.imageLogTagline')"
      :title="t('island.imageLogTitle')"
    />

    <main class="image-log-index">
      <div v-if="albums.length" class="image-log-grid">
        <ImageLogAlbumCard
          v-for="(album, albumIndex) in albums"
          :key="album.id"
          :album="album"
          :entrance-index="albumIndex"
          @select="openAlbum"
        />
      </div>

      <div v-else class="image-log-empty">
        {{ t('island.imageLogEmpty') }}
      </div>
    </main>

    <PageFooter cn-title="图像记录" en-title="IMAGE LOG" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import ImageLogAlbumCard, {
  type ImageLogAlbumCardData,
} from '@/components/ImageLogAlbumCard/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const { t, tm } = useI18n()
const router = useRouter()

const albums = computed<ImageLogAlbumCardData[]>(() => {
  return tm('island.dynamic.imageLog') as ImageLogAlbumCardData[]
})

const openAlbum = (albumId: string) => {
  router.push(`/island/image-log/${albumId}`)
}
</script>

<style lang="less" scoped>
@mono: 'cn-custom', 'Courier New', monospace;

.image-log-page {
  color: #fff;
}

.image-log-index {
  padding: 54px 0 40px;
}

.image-log-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  justify-content: space-between;
  gap: 18px clamp(28px, 4vw, 72px);
  padding: 0 clamp(34px, 5vw, 82px);
  box-sizing: border-box;
  content-visibility: auto;
  contain-intrinsic-size: 760px;
}

.image-log-empty {
  display: grid;
  place-items: center;
  min-height: 260px;
  color: var(--text-faint);
  font-family: @mono;
  font-size: 0.64rem;
  letter-spacing: 0.08em;
}

@media (max-width: 900px) {
  .image-log-page {
    padding-top: 88px;
  }

  .image-log-index {
    padding-top: 38px;
  }
}

@media (max-width: 768px) {
  .image-log-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: stretch;
    gap: 28px 10px;
    padding: 0 clamp(20px, 5vw, 34px);
  }
}

@media (min-width: 769px) and (max-width: 1180px) {
  .image-log-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: space-between;
    padding: 0 clamp(28px, 4vw, 58px);
  }
}
</style>
