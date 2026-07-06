<template>
  <div class="photography-page main-container">
    <DetailPageHeader
      back-label="ISLAND"
      back-path="/test"
      :subtitle="t('island.photographyTagline')"
      :title="t('island.photographyTitle')"
    />

    <main ref="libraryRef" class="photo-library">
      <CollectionTabs
        :aria-label="t('island.collectionNavigation')"
        :items="collectionTabs"
        :model-value="activeGroupId"
        size="big"
        @update:model-value="selectGroupTab"
      />

      <Transition name="collection-switch" mode="out-in">
        <section
          v-if="activeGroup"
          :key="activeGroupId"
          class="library-workspace"
          :class="{
            'has-subject-filter': activeGroup.photoGroups?.length,
          }"
        >
          <header class="library-toolbar">
            <div class="library-context">
              <span>PHOTOGRAPHY</span>
              <i>/</i>
              <strong>{{ activeGroup.title }}</strong>
            </div>
            <span class="library-total">
              <span>{{ activePhotos.length }}</span>
              <span>ITEMS</span>
            </span>
          </header>

          <FilterRail
            v-if="activeGroup.photoGroups?.length"
            :aria-label="t('island.subjectNavigation')"
            :items="photoGroupFilters"
            :model-value="activePhotoGroupId"
            @update:model-value="selectPhotoGroup"
          />

          <Transition name="gallery-switch" mode="out-in">
            <MediaGallery
              v-if="paginatedPhotos.length"
              :key="galleryRenderKey"
              :entrance-step-ms="90"
              :items="paginatedPhotos"
              :get-media-label="getMediaLabel"
              preserve-image-colors
              staggered-entrance
            >
              <template #info="{ item: photo }">
                <div class="photo-info__inner">
                  <span class="photo-info__device">
                    {{ photo.device || '' }}
                  </span>
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

            <div
              v-else
              :key="`${galleryRenderKey}:empty`"
              class="photography-empty"
            >
              {{ t('island.emptyPhotos') }}
            </div>
          </Transition>

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
              :class="{ 'is-active': page === currentPage }"
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
        </section>
      </Transition>
    </main>

    <PageFooter cn-title="摄影作品" en-title="PHOTOGRAPHY" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Location } from '@element-plus/icons-vue'

import CollectionTabs, {
  type CollectionTabItem,
} from '@/components/CollectionTabs/index.vue'
import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import FilterRail, {
  type FilterRailItem,
} from '@/components/FilterRail/index.vue'
import MediaGallery, {
  type GalleryMedia,
} from '@/components/MediaGallery/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

interface PhotographyPhoto extends GalleryMedia {
  url: string
  title?: string
  location?: string
  device?: string
  time?: string
}

interface PhotographyPhotoGroup {
  id: string
  title: string
  avatarUrl: string
  photos: PhotographyPhoto[]
}

interface PhotographyGroup {
  id: 'outside' | 'home'
  title: string
  titleEn: string
  railLabel: string
  coverUrl: string
  coverPosition: string
  photos?: PhotographyPhoto[]
  photoGroups?: PhotographyPhotoGroup[]
}

const PAGE_SIZE = 30
const { locale, t, tm } = useI18n()
const libraryRef = ref<HTMLElement | null>(null)
const activeGroupId = ref<PhotographyGroup['id']>('outside')
const activePhotoGroupId = ref('all')
const currentPage = ref(1)

const photographyGroups = computed<PhotographyGroup[]>(() => {
  return tm('island.dynamic.photographyGroups') as PhotographyGroup[]
})

const activeGroup = computed(() =>
  photographyGroups.value.find((group) => group.id === activeGroupId.value)
)

const getGroupPhotoCount = (group: PhotographyGroup) =>
  group.photos?.length ||
  group.photoGroups?.reduce((total, item) => total + item.photos.length, 0) ||
  0

const collectionTabs = computed<CollectionTabItem[]>(() =>
  photographyGroups.value.map((group) => ({
    id: group.id,
    title: group.title,
    subtitle: locale.value !== 'en' ? group.titleEn : undefined,
    count: getGroupPhotoCount(group),
    coverUrl: group.coverUrl,
    coverPosition: group.coverPosition,
  }))
)

const photoGroupFilters = computed<FilterRailItem[]>(() => {
  const photoGroups = activeGroup.value?.photoGroups || []
  return [
    {
      id: 'all',
      title: t('island.allPhotos'),
      count: photoGroups.reduce(
        (total, group) => total + group.photos.length,
        0
      ),
      imageUrls: photoGroups.slice(0, 2).map((group) => group.avatarUrl),
    },
    ...photoGroups.map((group) => ({
      id: group.id,
      title: group.title,
      count: group.photos.length,
      imageUrls: [group.avatarUrl],
    })),
  ]
})

const activePhotos = computed<PhotographyPhoto[]>(() => {
  if (!activeGroup.value) return []
  if (activeGroup.value.photos) return activeGroup.value.photos

  const photoGroups = activeGroup.value.photoGroups || []
  if (activePhotoGroupId.value === 'all') {
    return photoGroups.flatMap((group) => group.photos)
  }

  return (
    photoGroups.find((group) => group.id === activePhotoGroupId.value)
      ?.photos || []
  )
})

const totalPages = computed(() =>
  Math.ceil(activePhotos.value.length / PAGE_SIZE)
)

const paginatedPhotos = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return activePhotos.value.slice(start, start + PAGE_SIZE)
})

const galleryRenderKey = computed(
  () =>
    `${activeGroupId.value}:${activePhotoGroupId.value}:${currentPage.value}`
)

const selectGroup = (groupId: PhotographyGroup['id']) => {
  activeGroupId.value = groupId
  activePhotoGroupId.value = 'all'
  currentPage.value = 1
}

const selectGroupTab = (groupId: string) => {
  if (groupId === 'outside' || groupId === 'home') selectGroup(groupId)
}

const selectPhotoGroup = (groupId: string) => {
  activePhotoGroupId.value = groupId
  currentPage.value = 1
}

const setPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return

  currentPage.value = page
  libraryRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const getMediaLabel = (media: GalleryMedia) =>
  media.location || media.title || t('island.photoFallback')
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'cn-custom', 'Courier New', monospace;
@cjk: 'alibaba-puhuiti', sans-serif;

.photography-page {
  color: #fff;
  overflow: hidden;
}

.photo-library {
  padding: 58px 0 34px;
  scroll-margin-top: 90px;
}

.library-workspace {
  min-height: 480px;
  padding-top: 34px;

  &.has-subject-filter {
    display: grid;
    grid-template-columns: 172px minmax(0, 1fr);
    align-items: start;
    column-gap: clamp(18px, 2.5vw, 34px);

    .library-toolbar {
      grid-column: 1 / -1;
    }

    :deep(.media-gallery),
    .photography-empty,
    .photo-pagination {
      grid-column: 2;
    }
  }
}

.collection-switch-enter-active {
  transition: opacity 0.35s ease, transform 0.48s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.35s ease;
}

.collection-switch-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.collection-switch-enter-from {
  opacity: 0;
  filter: blur(5px);
  transform: translateY(14px);
}

.collection-switch-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.gallery-switch-enter-active {
  transition: opacity 0.32s ease, transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.32s ease;
}

.gallery-switch-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.gallery-switch-enter-from {
  opacity: 0;
  filter: blur(4px);
  transform: translateX(12px);
}

.gallery-switch-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

.library-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 10px 14px;
  border-bottom: 1px solid rgba(226, 52, 86, 0.22);
}

.library-context,
.library-total {
  font-family: @mono;
  font-size: 0.56rem;
  letter-spacing: 0.08em;
}

.library-context {
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    color: var(--text-faint);
  }

  i {
    color: @red;
    font-style: normal;
  }

  strong {
    color: @red;
  }
}

.library-total {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  color: var(--text-faint);
  font-family: @mono;
  font-size: 0.56rem;
  font-weight: 100;
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
    padding-right: 16px !important;

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

.photography-empty {
  display: grid;
  place-items: center;
  min-height: 260px;
  color: var(--text-faint);
  font-family: @mono;
  font-size: 0.64rem;
  letter-spacing: 0.08em;
}

.photo-pagination {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 38px;

  button {
    min-width: 38px;
    height: 36px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    background: transparent;
    font-family: @mono;
    font-size: 0.52rem;
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;

    &:hover:not(:disabled),
    &.is-active {
      border-color: @red;
      color: var(--text-color);
      background: rgba(226, 52, 86, 0.1);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.25;
    }
  }
}

@media (max-width: 900px) {
  .photography-page {
    padding-top: 88px;
  }

  .photo-library {
    padding-top: 38px;
  }

  .library-workspace {
    padding-top: 24px;

    &.has-subject-filter {
      display: block;
    }
  }

  .library-toolbar {
    padding-right: 5px;
    padding-left: 5px;
  }

  .photo-info__inner {
    min-height: 26px;
    padding: 3px 6px 4px;
    font-size: 0.4rem;

    > span {
      padding: 0 5px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .collection-switch-enter-active,
  .collection-switch-leave-active,
  .gallery-switch-enter-active,
  .gallery-switch-leave-active {
    transition: none;
  }
}
</style>
