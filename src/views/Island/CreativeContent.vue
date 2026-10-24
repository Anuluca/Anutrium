<template>
  <div class="creative-content">
    <section v-for="(section, index) in sections" :key="section.titleEn">
      <Sections
        :section-number="index + 1"
        :title="locale === 'en' ? section.titleEn : section.title"
        :title-en="section.titleEn"
        :navigation="false"
        :reveal="false"
      >
        <template v-if="section.count != null" #actions>
          <SectionCount :count="section.count" :label="section.countLabel" />
        </template>
        <div
          v-if="index === 0"
          class="creative-photography creative-media"
          :data-expanded="photography.expanded"
        >
          <div
            :ref="photography.setViewport"
            class="creative-photography__viewport creative-media__viewport"
          >
            <Transition
              name="creative-photo-fade"
              @before-leave="photography.holdHeight"
              @enter="(panel) => photography.animateHeight(panel, 200)"
            >
              <ImageMarquee
                v-if="!photography.expanded"
                key="preview"
                class="creative-photography__preview"
                :items="creativePhotographyPreview"
                :title="locale === 'en' ? 'Photography' : '摄影'"
              />
              <div
                v-else
                key="all"
                class="creative-photography__all creative-media__all"
              >
                <p
                  v-if="photography.loading && !photography.items.length"
                  class="creative-media__notice"
                  role="status"
                >
                  {{ locale === 'en' ? 'Loading' : '加载中' }}
                </p>
                <p
                  v-else-if="photography.error && !photography.items.length"
                  class="creative-media__notice"
                  role="alert"
                >
                  {{ locale === 'en' ? 'Album unavailable' : '相册暂不可用' }}
                  <button type="button" @click="photography.refresh()">
                    {{ locale === 'en' ? 'Retry' : '重试' }}
                  </button>
                </p>
                <p
                  v-else-if="!photography.items.length"
                  class="creative-media__notice"
                >
                  {{ locale === 'en' ? 'No images' : '暂无图片' }}
                </p>
                <MediaGallery
                  v-else
                  :key="photography.page"
                  :items="photography.items"
                  :columns="navigation.expanded ? 4 : 3"
                  :get-media-label="
                    () => (locale === 'en' ? 'Photography' : '摄影')
                  "
                  preserve-image-colors
                />
                <div
                  class="creative-photography__pagination creative-media__pagination no-rem"
                >
                  <FloraAlbumPagination
                    :total-items="photography.totalItems"
                    :page="photography.page"
                    :page-count="photography.pageCount"
                    :mobile="mobile"
                    @select="photography.goToPage"
                  />
                </div>
              </div>
            </Transition>
          </div>
          <FloraExpandButton
            class="creative-photography__toggle creative-media__toggle"
            :class="{
              'creative-media__toggle--collapse': photography.expanded,
              'creative-media__toggle--hidden': photography.switching,
            }"
            :expanded="photography.buttonExpanded"
            :disabled="photography.switching"
            :aria-hidden="photography.switching || undefined"
            :mobile="mobile"
            @click="photography.toggle"
          />
        </div>
        <div
          v-else-if="index === 1"
          class="creative-illustration creative-media"
          :data-expanded="illustration.expanded"
        >
          <div
            :ref="illustration.setViewport"
            class="creative-illustration__viewport creative-media__viewport"
          >
            <Transition
              name="creative-photo-fade"
              @before-leave="illustration.holdHeight"
              @enter="(panel) => illustration.animateHeight(panel, 200)"
            >
              <ImageMarquee
                v-if="!illustration.expanded"
                key="preview"
                class="creative-illustration__preview"
                :items="illustrationPreviewItems"
                :title="locale === 'en' ? 'Illustration' : '绘画'"
                direction="right"
              >
                <template #info="{ item }">
                  <MediaPhotoInfo
                    :item="{
                      device: item.title,
                      time: item.time,
                    }"
                  />
                </template>
              </ImageMarquee>
              <div
                v-else
                key="all"
                class="creative-illustration__all creative-media__all"
              >
                <p
                  v-if="illustration.loading && !illustration.items.length"
                  class="creative-media__notice"
                  role="status"
                >
                  {{ locale === 'en' ? 'Loading' : '加载中' }}
                </p>
                <p
                  v-else-if="illustration.error && !illustration.items.length"
                  class="creative-media__notice"
                  role="alert"
                >
                  {{ locale === 'en' ? 'Album unavailable' : '相册暂不可用' }}
                  <button type="button" @click="illustration.refresh()">
                    {{ locale === 'en' ? 'Retry' : '重试' }}
                  </button>
                </p>
                <p
                  v-else-if="!illustration.items.length"
                  class="creative-media__notice"
                >
                  {{ locale === 'en' ? 'No images' : '暂无图片' }}
                </p>
                <MediaGallery
                  v-else
                  :key="illustration.page"
                  :items="illustrationItems"
                  :columns="navigation.expanded ? 4 : 3"
                  :get-media-label="
                    () => (locale === 'en' ? 'Illustration' : '绘画')
                  "
                  preserve-image-colors
                >
                  <template #info="{ item }">
                    <MediaPhotoInfo
                      :item="{
                        device: item.title,
                        time: item.time,
                      }"
                    />
                  </template>
                </MediaGallery>
                <div
                  class="creative-illustration__pagination creative-media__pagination no-rem"
                >
                  <FloraAlbumPagination
                    :total-items="illustration.totalItems"
                    :page="illustration.page"
                    :page-count="illustration.pageCount"
                    :mobile="mobile"
                    @select="illustration.goToPage"
                  />
                </div>
              </div>
            </Transition>
          </div>
          <FloraExpandButton
            v-if="illustration.expanded"
            class="creative-illustration__process creative-media__toggle creative-media__process"
            :class="{
              'creative-media__toggle--hidden': illustration.switching,
            }"
            :disabled="illustration.switching"
            :label="locale === 'en' ? 'PROCESS' : '绘画过程'"
            :icon="EditPen"
            :mobile="mobile"
            aria-haspopup="dialog"
            @click="showIllustrationProcess = true"
          />
          <FloraExpandButton
            class="creative-illustration__toggle creative-media__toggle"
            :class="{
              'creative-media__toggle--collapse': illustration.expanded,
              'creative-media__toggle--hidden': illustration.switching,
            }"
            :expanded="illustration.buttonExpanded"
            :disabled="illustration.switching"
            :aria-hidden="illustration.switching || undefined"
            :mobile="mobile"
            @click="illustration.toggle"
          />
        </div>
        <DesignContent
          v-else-if="index === 2"
          ref="design"
          :expanded="navigation.expanded"
          :detail-target="props.detailTarget"
          :inline-details="props.inlineDetails"
        />
        <CraftContent
          v-else-if="index === 3"
          embedded
          :expanded="navigation.expanded"
        />
      </Sections>
    </section>
    <ModalWrapper
      v-model="showIllustrationProcess"
      :title="processTitle"
      width="min(1120px, 92vw)"
    >
      <template #header>
        <ModalContentTitle
          class="creative-process__title"
          :title="processTitle"
        />
      </template>
      <div class="creative-process">
        <p v-if="processLoading && !processItems.length" role="status">
          {{ locale === 'en' ? 'Loading' : '加载中' }}
        </p>
        <p v-else-if="processError && !processItems.length" role="alert">
          {{ locale === 'en' ? 'Album unavailable' : '相册暂不可用' }}
          <button type="button" @click="refreshProcess()">
            {{ locale === 'en' ? 'Retry' : '重试' }}
          </button>
        </p>
        <p v-else-if="!processItems.length">
          {{ locale === 'en' ? 'No images' : '暂无图片' }}
        </p>
        <MediaGallery
          v-else
          :key="processPage"
          :items="processItems"
          :get-media-label="() => processTitle"
          preserve-image-colors
        />
        <FloraAlbumPagination
          v-if="processPageCount > 1"
          class="creative-process__pagination"
          :page="processPage"
          :page-count="processPageCount"
          :mobile="mobile"
          @select="loadProcessPage"
        />
      </div>
    </ModalWrapper>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { EditPen } from '@element-plus/icons-vue'
import { useMediaQuery } from '@vueuse/core'

import ImageMarquee from '@/components/ImageMarquee/index.vue'
import MediaGallery from '@/components/MediaGallery/index.vue'
import MediaPhotoInfo from '@/components/MediaPhotoInfo/index.vue'
import ModalContentTitle from '@/components/ModalContentTitle/index.vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import SectionCount from '@/components/SectionCount/index.vue'
import Sections from '@/components/Sections/index.vue'
import { creativeIllustrationPreview } from '@/locales/dynamic/creativeIllustration'
import { creativePhotographyPreview } from '@/locales/dynamic/creativePhotography'
import { useTempleNavigation } from '@/stores/templeNavigation'
import { getCreativeImageInfo } from '@/utils/creativeMedia'
import CraftContent from '@/views/Craft/CraftContent.vue'
import FloraAlbumPagination from '@/views/Home/components/FloraAlbumPagination.vue'
import FloraExpandButton from '@/views/Home/components/FloraExpandButton.vue'
import { useFloraAlbum } from '@/views/Home/composables/useFloraAlbum'

import { useCreativeMediaPanel } from './composables/useCreativeMediaPanel'
import DesignContent from './DesignContent.vue'

const props = defineProps<{
  detailTarget?: HTMLElement | null
  inlineDetails?: boolean
}>()
const design = ref<InstanceType<typeof DesignContent>[] | null>(null)
defineExpose({
  closeInlineDetail: () => design.value?.[0]?.closeInlineDetail() ?? false,
})
const { locale, tm } = useI18n()
const navigation = useTempleNavigation()
const mobile = useMediaQuery('(max-width: 768px)')
const photography = reactive(useCreativeMediaPanel('photography'))
const illustration = reactive(useCreativeMediaPanel('illustration'))
const withIllustrationInfo = <T extends { url: string }>(item: T) => {
  const info = getCreativeImageInfo(item.url)
  return {
    ...item,
    title:
      locale.value === 'en'
        ? info.titleEn || info.title
        : info.title || info.titleEn,
    time: info.date || undefined,
  }
}
const illustrationPreviewItems = computed(() =>
  creativeIllustrationPreview.map(withIllustrationInfo)
)
const illustrationItems = computed(() =>
  illustration.items.map(withIllustrationInfo)
)
const processTitle = computed(() =>
  locale.value === 'en' ? 'DRAW PROGRESS' : '绘画过程'
)
const showIllustrationProcess = ref(false)
const {
  allItems: processItems,
  loading: processLoading,
  error: processError,
  totalPages: processTotalPages,
  pageCursors: processPageCursors,
  pageIndex: processPageIndex,
  refresh: refreshProcess,
  goToPage: loadProcessPage,
} = useFloraAlbum(() => 'illustrationProcess', showIllustrationProcess)
const processPage = computed(() => processPageIndex.value + 1)
const processPageCount = computed(
  () => processTotalPages.value ?? processPageCursors.value.length
)
const sections = computed(() => [
  {
    title: '摄影',
    titleEn: 'PHOTOGRAPHY',
    count: photography.totalItems,
    countLabel: 'PHOTOS',
  },
  {
    title: '绘画',
    titleEn: 'ILLUSTRATION',
    count: illustration.totalItems,
    countLabel: 'WORKS',
  },
  { title: '设计创作', titleEn: 'DESIGN', count: 4, countLabel: 'WORKS' },
  {
    title: '工具',
    titleEn: 'CRAFT',
    count: (tm('craft.dynamic.tools') as unknown[]).length,
    countLabel: 'TOOLS',
  },
])
</script>

<style lang="less" scoped>
.creative-content {
  width: 100%;

  > section {
    padding: 30px 0;
  }
}

.creative-media {
  position: relative;
  container-type: inline-size;

  :deep(.photo-info__device) {
    font-family: 'alibaba-puhuiti', sans-serif;
  }
}

.creative-media__all {
  min-height: clamp(180px, 24vw, 280px);
}

.creative-media__notice {
  padding: 20px 0;
}

.creative-media__viewport {
  position: relative;
}

.creative-media__pagination.no-rem {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 80px;
  padding: 12px 130px;

  @media (max-width: 768px) {
    padding-inline: 110px;
    min-height: 54px;
  }
}

.creative-photo-fade-enter-active,
.creative-photo-fade-leave-active {
  transition: opacity 400ms ease 200ms;
}

.creative-photo-fade-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.creative-photo-fade-enter-from,
.creative-photo-fade-leave-to {
  opacity: 0;
}

.creative-media__toggle.flora-expand-button.no-rem {
  opacity: 1;
  transition: opacity 200ms ease;

  // 窄模块中按容器宽度收敛字号，给居中的分页器保留点击区域。
  &:not(.is-mobile) {
    font-size: clamp(18px, calc(4cqi - 1px), 36px);

    &.creative-media__toggle--collapse,
    &.creative-media__process {
      min-height: 56px;
      box-sizing: border-box;
    }
  }

  &.creative-media__toggle--hidden {
    opacity: 0;
    pointer-events: none;
  }

  &.creative-media__process {
    left: 0;
    right: auto;
    bottom: 12px;
    width: auto;
    gap: 8px;

    :deep(.flora-media-expand-icon) {
      position: static;
      flex: none;
      transform: none;
    }

    &::before {
      left: 100%;
      right: auto;
      -webkit-mask-image: linear-gradient(to right, #000, transparent);
      mask-image: linear-gradient(to right, #000, transparent);
    }
  }

  &.creative-media__toggle--collapse {
    right: 0;
    bottom: 12px;
  }

  &:not(.creative-media__toggle--collapse):not(.creative-media__process) {
    position: relative;
    right: auto;
    bottom: auto;
    width: 100%;
    height: auto;
    box-sizing: border-box;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
    padding: 12px 24px;

    &::before {
      display: none;
    }

    :deep(.flora-media-expand-icon) {
      position: static;
      flex: none;
      transform: none;
    }

    @media (max-width: 768px) {
      padding: 10px 12px;
    }
  }
}

.creative-process__pagination {
  justify-content: center;
  margin-top: 24px;
}

@media (prefers-reduced-motion: reduce) {
  .creative-media__toggle.flora-expand-button.no-rem {
    transition: none;
  }

  .creative-photo-fade-enter-active,
  .creative-photo-fade-leave-active {
    transition: none;
  }
}
</style>
