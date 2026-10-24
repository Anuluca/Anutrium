<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEventListener, useResizeObserver } from '@vueuse/core'

import MediaGallery from '@/components/MediaGallery/index.vue'
import MediaPhotoInfo from '@/components/MediaPhotoInfo/index.vue'
import ModalContentTitle from '@/components/ModalContentTitle/index.vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import ScrollViewport from '@/components/ScrollViewport/index.vue'
import type { CreativeDesign } from '@/config/creativeDesign'
import { getCreativeImageInfo } from '@/utils/creativeMedia'

import { useCreativeDesignAlbum } from './composables/useCreativeDesignAlbum'

const props = defineProps<{ work: CreativeDesign; inline: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { locale } = useI18n()
const { items, loading, error, refresh } = useCreativeDesignAlbum(
  () => props.work.id
)
const title = computed(() =>
  locale.value === 'en' ? props.work.titleEn : props.work.title
)
const gallery = ref<InstanceType<typeof MediaGallery> | null>(null)
const body = ref<HTMLElement | null>(null)
const previewStageHeight = ref(240)
// 按详情可用高度给大图和缩略图分配空间，半屏与弹窗共用居中布局。
useResizeObserver(
  computed(() =>
    body.value?.closest<HTMLElement>(
      '.scroll-viewport__scroll, .modal-scroll-region'
    )
  ),
  ([entry]) => {
    if (!body.value || !entry) return
    const style = getComputedStyle(body.value)
    const padding =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    previewStageHeight.value = Math.max(
      120,
      entry.target.clientHeight - padding - 104 - 78
    )
  }
)
const galleryItems = computed(() => {
  const ordered = [...items.value]
  const secondImage = props.work.secondImage
  const index = secondImage
    ? ordered.findIndex((item) => item.key.endsWith(`/${secondImage}`))
    : -1
  if (index > 0) {
    const [image] = ordered.splice(index, 1)
    ordered.splice(1, 0, image)
  }
  return ordered.map((item) => {
    const info = getCreativeImageInfo(item.url)
    return {
      ...item,
      title: title.value,
      device:
        locale.value === 'en'
          ? info.titleEn || info.title
          : info.title || info.titleEn,
    }
  })
})
const modalOpen = ref(true)
const wrapperProps = computed(() =>
  props.inline
    ? {
        class: 'design-detail-inline',
        role: 'region',
        'aria-label': title.value,
      }
    : {
        modelValue: modalOpen.value,
        width: 'min(1120px, 92vw)',
        title: title.value,
      }
)

useEventListener(
  typeof document === 'undefined' ? undefined : document,
  'keydown',
  (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    if (gallery.value?.closeViewer()) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    if (!props.inline) return
    if (
      document.querySelector('.about-overlay') ||
      [
        ...document.querySelectorAll<HTMLElement>(
          '.el-overlay-dialog, .el-image-viewer__wrapper'
        ),
      ].some((element) => element.getClientRects().length > 0)
    )
      return
    event.preventDefault()
    event.stopImmediatePropagation()
    emit('close')
  },
  { capture: true }
)
</script>

<template>
  <component
    :is="inline ? ScrollViewport : ModalWrapper"
    v-bind="wrapperProps"
    @update:model-value="modalOpen = $event"
    @closed="emit('close')"
  >
    <template #header>
      <header class="design-detail__header no-rem">
        <ModalContentTitle :title="title" />
      </header>
    </template>
    <div
      ref="body"
      class="design-detail design-detail__body no-rem"
      :style="{ '--design-preview-stage-height': `${previewStageHeight}px` }"
    >
      <p v-if="loading" role="status">
        {{ locale === 'en' ? 'Loading' : '加载中' }}
      </p>
      <p v-else-if="error" role="alert">
        {{ locale === 'en' ? 'Album unavailable' : '相册暂不可用' }}
        <button type="button" @click="refresh">
          {{ locale === 'en' ? 'Retry' : '重试' }}
        </button>
      </p>
      <p v-else-if="!items.length">
        {{ locale === 'en' ? 'No images' : '暂无图片' }}
      </p>
      <MediaGallery
        v-else
        ref="gallery"
        :key="work.id"
        :items="galleryItems"
        :columns="work.id === 'appleMusicCover' ? 4 : 3"
        :get-media-label="(item) => item.device || title"
        preserve-image-colors
      >
        <template v-if="work.showImageInfo" #info="{ item }">
          <MediaPhotoInfo :item="item" />
        </template>
      </MediaGallery>
    </div>
  </component>
</template>

<style scoped lang="less">
.design-detail {
  color: #fff;
}
.design-detail__header.no-rem {
  position: relative;
}
.design-detail__body.no-rem {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 0 16px 16px;
  container-type: inline-size;
  :deep(.media-gallery) {
    position: relative;
    flex: 1;
    padding-top: 52px;
    align-content: start;
  }
  :deep(.media-gallery--preview) {
    align-content: center;
    padding-block: 52px;
  }
  :deep(.media-gallery--four-columns) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  :deep(.media-gallery__toolbar) {
    position: absolute;
    top: 0;
    right: 0;
  }
  :deep(.inline-image-preview__stage) {
    --inline-stage-height: var(--design-preview-stage-height, 240px);
    --inline-canvas-padding: 20px;
  }
  :deep(.inline-image-preview__canvas) {
    padding-inline: calc(clamp(36px, 9cqi, 80px) + 20px);
  }
  :deep(.el-image-viewer__prev),
  :deep(.el-image-viewer__next) {
    width: clamp(36px, 9cqi, 80px);
    height: 80%;
  }
  :deep(.safe-image-viewer__nav-label) {
    font-size: clamp(28px, 6cqi, 52px);
  }
  :deep(.inline-image-preview__thumbnail) {
    flex-basis: 80px;
    height: 60px;
  }
  :deep(.photo-info__device) {
    font-family: 'alibaba-puhuiti', sans-serif;
  }
}
.design-detail-inline {
  height: 100%;
  min-height: 0;
  background: rgba(20, 20, 20, 0.88);
  transform-origin: center;
  :deep(.scroll-viewport__scroll > div) {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }
  &.design-detail-panel-enter-active {
    animation: anutriumCrtOn 0.46s cubic-bezier(0.19, 1, 0.22, 1) both;
  }
  &.design-detail-panel-leave-active {
    pointer-events: none;
    animation: anutriumCrtOff 0.42s cubic-bezier(0.2, 1, 0.22, 1) both;
  }
}
@media (max-width: 768px) {
  .design-detail__body.no-rem {
    padding: 12px 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .design-detail-inline {
    animation-duration: 0.01ms !important;
  }
}
</style>
