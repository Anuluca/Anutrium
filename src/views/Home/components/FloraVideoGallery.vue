<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MoreFilled, VideoCamera } from '@element-plus/icons-vue'

import JourneyVideoPlayer from '@/components/JourneyVideoPlayer/index.vue'
import { petVideos } from '@/locales/dynamic/petVideos'
import { getBilibiliEmbedUrl } from '@/utils/bilibiliVideo'
import { getCardThumbnailUrl } from '@/utils/imageVariant'

import { useFloraMediaPanel } from '../composables/useFloraMediaPanel'
import FloraExpandButton from './FloraExpandButton.vue'

const props = defineProps<{ petId: string; title: string; mobile: boolean }>()
const emit = defineEmits<{
  (event: 'expanded-change', expanded: boolean): void
}>()
const { locale } = useI18n()
const { expanded, overflowMask, toggle, toggleFromSurface, closeExpanded } =
  useFloraMediaPanel(
    () => props.mobile,
    (value) => emit('expanded-change', value)
  )
const allVideos = computed(() =>
  (petVideos[props.petId]?.videos || []).map((video) => ({
    ...video,
    title: video.title[locale.value === 'en' ? 'en' : 'zhCn'],
    cover: getCardThumbnailUrl(video.cover),
    embedUrl: getBilibiliEmbedUrl(video.bvid),
  }))
)
const featuredVideos = computed(() => {
  const featured = allVideos.value
    .filter((video) => petVideos[props.petId]?.featured.includes(video.bvid))
    .slice(0, 1)
  return featured.length === allVideos.value.length ? allVideos.value : featured
})
const videos = computed(() =>
  expanded.value ? allVideos.value : featuredVideos.value
)
watch(
  () => props.petId,
  () => {
    expanded.value = false
  }
)
defineExpose({ closeExpanded })
</script>

<template>
  <section
    class="flora-video-gallery flora-media-panel no-rem is-clickable"
    :class="{ 'is-mobile': mobile, 'is-expanded': expanded }"
    :style="{ '--preview-overflow-mask': overflowMask }"
    :aria-label="title"
    @click.stop="toggleFromSurface"
  >
    <h2>
      <VideoCamera aria-hidden="true" focusable="false" />
      <span>{{ title }}</span>
    </h2>
    <div class="flora-video-gallery__viewport" data-lenis-nested-scroll>
      <JourneyVideoPlayer
        :key="petId"
        :videos="videos"
        :align="expanded ? 'left' : 'center'"
      >
        <template #after-videos>
          <div v-if="expanded" class="flora-video-gallery__upcoming">
            - 更新中 -
          </div>
        </template>
      </JourneyVideoPlayer>
      <MoreFilled
        v-if="!expanded"
        class="flora-video-gallery__more"
        aria-hidden="true"
        focusable="false"
      />
    </div>
    <FloraExpandButton
      class="flora-video-gallery__expand"
      :expanded="expanded"
      :mobile="mobile"
      @click="toggle"
    />
  </section>
</template>

<style scoped lang="less">
@import '../styles/floraMedia.less';
.flora-video-gallery.no-rem {
  .flora-media-panel();
  padding: 36px 60px;
  .flora-video-gallery__viewport {
    container-type: size;
    height: 100%;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
  }
  :deep(.video-list) {
    grid-template-columns: minmax(0, 300px);
    gap: 24px;
  }
  &:not(.is-expanded):not(.is-mobile) {
    padding-inline: 32px;
  }
  &:not(.is-expanded) .flora-video-gallery__viewport {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40px;
    :deep(.video-list) {
      flex: 0 1 360px;
      min-width: 0;
      width: 360px;
      grid-template-columns: minmax(0, 360px);
    }
  }
  .flora-video-gallery__more {
    flex: 0 0 96px;
    width: 96px;
    height: 96px;
    mask-image: linear-gradient(to right, transparent, rgb(0 0 0 / 50%));
    -webkit-mask-image: linear-gradient(
      to right,
      transparent,
      rgb(0 0 0 / 50%)
    );
  }
  .flora-video-gallery__upcoming {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 16 / 9;
    color: rgb(255 255 255 / 50%);
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 18px;
    font-weight: 900;
  }
  :deep(.video-title) {
    font-size: 14px;
  }
  :deep(.video-frame) {
    box-sizing: border-box;
  }
  :deep(.video-list .video-item) {
    animation: none;
    opacity: 1;
    filter: none;
    transform: none;
  }
  &.is-expanded :deep(.video-list) {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 300px));
  }

  pointer-events: auto;
  cursor: pointer;
  isolation: isolate;
  color: #fffff4;
  &::before,
  &::after {
    position: absolute;
    z-index: -1;
    background: #bd4d71;
    filter: grayscale(1);
    opacity: 0.3;
    content: '';
    pointer-events: none;
    transition: opacity 200ms ease;
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(
        :has(
            button:hover,
            a:hover,
            input:hover,
            video:hover,
            [role='button']:hover
          )
      ) {
      &::before,
      &::after {
        opacity: 0.24;
      }
    }
  }
  &::after {
    top: -32px;
    right: 0;
    left: 0;
    height: 32px;
    -webkit-mask-image: var(--preview-overflow-mask);
    mask-image: var(--preview-overflow-mask);
  }
  &::before {
    inset: 0;
    mask-image: repeating-linear-gradient(
      to bottom,
      transparent 0 var(--flora-background-scanline-gap, 1px),
      #000 var(--flora-background-scanline-gap, 1px)
        var(--flora-background-scanline-period, 4px)
    );
  }
  h2 {
    .flora-media-title();
    .flora-media-title-content();
  }
  &.is-mobile {
    .flora-video-gallery__more {
      transform: none;
    }
    padding: 18px 24px;
    padding-bottom: 42px;
    &:not(.is-expanded) {
      .flora-video-gallery__viewport {
        position: absolute;
        inset: -2px 24px 2px;
        height: auto;
        gap: 24px;
        overflow: hidden;
      }
      .flora-video-gallery__more {
        flex-basis: min(96px, 70cqh);
        width: min(96px, 70cqh);
        height: min(96px, 70cqh);
      }
      :deep(.video-list) {
        flex-basis: min(180px, calc((100cqh - 22px) * 16 / 9));
        grid-template-columns: minmax(0, 1fr);
      }
    }
    :deep(.video-title) {
      font-size: 12px;
    }
    :deep(.video-item) {
      gap: 4px;
    }
    :deep(.video-play) {
      width: 32px;
      height: 32px;
      font-size: 18px;
    }
    &.is-expanded {
      padding: 20px 8px 46px;
      :deep(.video-list) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::before,
    &::after {
      transition: none;
    }
  }
}
</style>
