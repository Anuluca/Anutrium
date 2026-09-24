<template>
  <div class="photography-page main-container">
    <DetailPageHeader
      back-label="ISLAND"
      back-path="/test"
      :title="t('island.modules.photography.photoWorks.title')"
    />

    <main ref="libraryRef" class="photo-library">
      <CollectionTabs
        :aria-label="
          t('island.modules.photography.photoWorks.collectionNavigation')
        "
        :items="collectionTabs"
        :model-value="activeGroupId"
        size="big"
        @update:model-value="selectGroupTab"
      />

      <section
        v-if="activeGroup"
        :key="activeGroupId"
        class="library-workspace"
        :class="{
          'has-subject-filter': activeGroup.photoGroups?.length,
        }"
      >
        <FilterRail
          v-if="activeGroup.photoGroups?.length"
          :aria-label="
            t('island.modules.photography.photoWorks.subjectNavigation')
          "
          :items="photoGroupFilters"
          :model-value="activePhotoGroupId"
          @update:model-value="selectPhotoGroup"
        />

        <MediaGallery
          v-if="paginatedPhotos.length"
          :key="galleryRenderKey"
          :items="paginatedPhotos"
          :get-media-label="getMediaLabel"
          preserve-image-colors
        >
          <template #info="{ item: photo }">
            <MediaPhotoInfo :item="photo" />
          </template>
        </MediaGallery>

        <div
          v-else
          :key="`${galleryRenderKey}:empty`"
          class="photography-empty"
        >
          {{ t('island.modules.photography.photoWorks.empty') }}
        </div>

        <nav
          v-if="totalPages > 1"
          class="photo-pagination"
          :aria-label="t('pagination.pageLabel')"
        >
          <button
            type="button"
            :disabled="currentPage === 1"
            @click="setPage(currentPage - 1)"
          >
            {{ t('pagination.previousPage') }}
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
            {{ t('pagination.nextPage') }}
          </button>
        </nav>
      </section>
    </main>

    <PageFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'

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
import MediaPhotoInfo from '@/components/MediaPhotoInfo/index.vue'
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

const PAGE_SIZE = 15
const { locale, t, tm } = useI18n()
const route = useRoute()
const router = useRouter()
const libraryRef = ref<HTMLElement | null>(null)
const activeGroupId = ref<PhotographyGroup['id']>('outside')
const activePhotoGroupId = ref('all')
const currentPage = ref(1)

const photoWorkGroups = computed<PhotographyGroup[]>(() => {
  return tm(
    'island.modules.photography.photoWorks.data.groups'
  ) as PhotographyGroup[]
})

const activeGroup = computed(() =>
  photoWorkGroups.value.find((group) => group.id === activeGroupId.value)
)

const getGroupPhotoCount = (group: PhotographyGroup) =>
  group.photos?.length ||
  group.photoGroups?.reduce((total, item) => total + item.photos.length, 0) ||
  0

const collectionTabs = computed<CollectionTabItem[]>(() =>
  photoWorkGroups.value.map((group) => ({
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
      title: t('island.modules.photography.photoWorks.allPhotos'),
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

const getRouteQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value

const normalizeGroupId = (value: unknown): PhotographyGroup['id'] =>
  value === 'home' ? 'home' : 'outside'

const normalizePhotoGroupId = (
  value: unknown,
  group: PhotographyGroup | undefined
) => {
  const photoGroups = group?.photoGroups || []
  const subjectId = getRouteQueryValue(value)
  const subjectIds = ['all', ...photoGroups.map((item) => item.id)]

  return subjectIds.includes(String(subjectId)) ? String(subjectId) : 'all'
}

const updatePhotoRoute = (
  groupId: PhotographyGroup['id'],
  photoGroupId = 'all'
) => {
  const nextGroup = photoWorkGroups.value.find((group) => group.id === groupId)
  const nextQuery: LocationQueryRaw = { ...route.query, type: groupId }

  if (nextGroup?.photoGroups?.length) {
    nextQuery.subject = normalizePhotoGroupId(photoGroupId, nextGroup)
  } else {
    delete nextQuery.subject
  }

  router.push({
    path: route.path,
    query: nextQuery,
  })
}

const replaceCanonicalPhotoRoute = (
  groupId: PhotographyGroup['id'],
  photoGroupId: string,
  group: PhotographyGroup | undefined
) => {
  const nextQuery: LocationQueryRaw = { ...route.query, type: groupId }
  const shouldKeepSubject = Boolean(group?.photoGroups?.length)
  const currentType = getRouteQueryValue(route.query.type)
  const currentSubject = getRouteQueryValue(route.query.subject)

  if (shouldKeepSubject) {
    nextQuery.subject = photoGroupId
  } else {
    delete nextQuery.subject
  }

  const isCanonical =
    currentType === groupId &&
    (shouldKeepSubject
      ? currentSubject === photoGroupId
      : currentSubject === undefined)

  if (isCanonical) return

  router.replace({
    path: route.path,
    query: nextQuery,
  })
}

const selectGroupTab = (groupId: string) => {
  if (groupId === 'outside' || groupId === 'home') {
    updatePhotoRoute(groupId)
  }
}

const selectPhotoGroup = (groupId: string) => {
  updatePhotoRoute(activeGroupId.value, groupId)
}

const setPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return

  currentPage.value = page
  libraryRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const getMediaLabel = (media: GalleryMedia) =>
  media.location ||
  media.title ||
  t('island.modules.photography.photoWorks.photoFallback')

watch(
  [() => route.query.type, () => route.query.subject, photoWorkGroups],
  ([type, subject]) => {
    const nextGroupId = normalizeGroupId(getRouteQueryValue(type))
    const nextGroup = photoWorkGroups.value.find(
      (group) => group.id === nextGroupId
    )
    const nextPhotoGroupId = normalizePhotoGroupId(subject, nextGroup)
    const hasChanged =
      activeGroupId.value !== nextGroupId ||
      activePhotoGroupId.value !== nextPhotoGroupId

    replaceCanonicalPhotoRoute(nextGroupId, nextPhotoGroupId, nextGroup)

    if (!hasChanged) return

    activeGroupId.value = nextGroupId
    activePhotoGroupId.value = nextPhotoGroupId
    currentPage.value = 1
  },
  { immediate: true }
)
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'UnboundedSans', 'Courier New', monospace;

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
    grid-template-columns: 212px minmax(0, 1fr);
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
}
</style>
