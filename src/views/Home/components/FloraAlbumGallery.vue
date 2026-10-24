<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  inject,
  nextTick,
  type Ref,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { Loading, Picture } from '@element-plus/icons-vue'

import FilterRail from '@/components/FilterRail/index.vue'
import MediaGallery from '@/components/MediaGallery/index.vue'
import MediaPhotoInfo from '@/components/MediaPhotoInfo/index.vue'
import {
  floraFriendAlbums,
  floraFriendsFeatured,
} from '@/locales/dynamic/floraFriends'
import { petAlbums } from '@/locales/dynamic/petAlbums'
import {
  floraAlbumStages,
  floraAlbumTags,
  getFloraAlbumStage,
  matchesFloraAlbumTag,
} from '@/utils/floraAlbum'
import { getFloraCaptureDate, mediaAlbums } from '@/utils/floratriumMedia'

import { useFloraAlbum } from '../composables/useFloraAlbum'
import { useFloraMediaPanel } from '../composables/useFloraMediaPanel'
import FloraAlbumPagination from './FloraAlbumPagination.vue'
import FloraAlbumStrip from './FloraAlbumStrip.vue'
import FloraExpandButton from './FloraExpandButton.vue'
import FloraFriendsIcon from './FloraFriendsIcon.vue'

const props = defineProps<{ petId: string; title: string; mobile?: boolean }>()
const decorationFilterId = `flora-decoration-tint-${getCurrentInstance()?.uid}`
const decorationTarget = inject<Ref<HTMLElement | null>>(
  'flora-decoration-target',
  ref(null)
)
const emit = defineEmits<{
  (event: 'expanded-change', expanded: boolean): void
}>()
const { t, locale } = useI18n({
  useScope: 'local',
  messages: {
    zhCn: {
      previous: '上一页',
      next: '下一页',
      loading: '加载中',
      error: '相册暂不可用',
      retry: '重试',
      empty: '暂无图片或视频',
      unknownDate: '日期未知',
      page: '第 {page} 页',
      friends: '花花的邻居们',
      filters: '花花相册分类',
      unclassified: '未分类',
    },
    en: {
      previous: 'Previous',
      next: 'Next',
      loading: 'Loading',
      error: 'Album unavailable',
      retry: 'Retry',
      empty: 'No photos or videos',
      unknownDate: 'Unknown date',
      page: 'Page {page}',
      friends: 'Flora’s Neighbors',
      filters: 'Flora album filters',
      unclassified: 'Unclassified',
    },
  },
})
const {
  expanded,
  hasToggled,
  overflowMask,
  toggle,
  toggleFromSurface,
  closeExpanded,
} = useFloraMediaPanel(
  () => props.mobile,
  (value) => emit('expanded-change', value)
)
const viewport = ref<HTMLElement | null>(null)
const album = computed(() => petAlbums[props.petId])
const activeTab = ref<'album' | 'friends'>('album')
const isFriends = computed(
  () => props.petId === 'huahua' && activeTab.value === 'friends'
)
const activeTitle = computed(() =>
  isFriends.value ? t('friends') : props.title
)
const featuredItems = computed(() =>
  isFriends.value ? floraFriendsFeatured : album.value.defaults
)
// 朋友相册使用静态清单，切换过去后暂停原相册的请求和轮询。
const mainAlbumExpanded = computed({
  get: () => expanded.value && !isFriends.value,
  set: (value: boolean) => {
    if (!value) expanded.value = false
  },
})
const {
  allItems,
  loading,
  error,
  pageCursors,
  pageIndex,
  totalPages,
  totalItems,
  refresh,
  goToPage: loadPage,
} = useFloraAlbum(() => props.petId, mainAlbumExpanded, cancelPageMedia, {
  complete: () => props.petId === 'huahua',
})
const activeTag = ref('all')
const tagItems = computed(() =>
  floraAlbumTags.map((tag) => ({
    id: tag.id,
    title: tag[locale.value === 'en' ? 'en' : 'zhCn'],
    count: allItems.value.filter((item) => matchesFloraAlbumTag(item, tag.id))
      .length,
  }))
)
const collectionPage = ref(1)
const matchedItems = computed(() => {
  if (props.petId !== 'huahua') return allItems.value
  if (activeTag.value !== 'all')
    return allItems.value
      .filter((item) => matchesFloraAlbumTag(item, activeTag.value))
      .sort((a, b) =>
        (a.key.split('/').pop() || '').localeCompare(
          b.key.split('/').pop() || ''
        )
      )
  // 先按阶段排好完整清单，再分页，避免相同阶段在不同页之间交错。
  const stages = [...floraAlbumStages.map((stage) => stage.id), 'unknown']
  return stages.flatMap((stage) =>
    allItems.value.filter((item) => getFloraAlbumStage(item) === stage)
  )
})
const collectionPageCount = computed(() =>
  Math.max(1, Math.ceil(matchedItems.value.length / mediaAlbums.flora.pageSize))
)
const visibleItems = computed(() =>
  props.petId === 'huahua'
    ? matchedItems.value.slice(
        (collectionPage.value - 1) * mediaAlbums.flora.pageSize,
        collectionPage.value * mediaAlbums.flora.pageSize
      )
    : allItems.value
)
watch([() => props.petId, activeTag, mainAlbumExpanded], () => {
  collectionPage.value = 1
})
watch(collectionPageCount, (count) => {
  collectionPage.value = Math.min(collectionPage.value, count)
})
const albumGroups = computed(() => {
  if (props.petId !== 'huahua')
    return [{ id: 'main', title: '', items: visibleItems.value }]
  if (activeTag.value !== 'all')
    return [
      {
        id: activeTag.value,
        title: '',
        items: visibleItems.value,
      },
    ]
  const buckets = new Map<string, typeof allItems.value>()
  for (const item of visibleItems.value) {
    const stage = getFloraAlbumStage(item)
    const items = buckets.get(stage) || []
    items.push(item)
    buckets.set(stage, items)
  }
  const groups = floraAlbumStages.map((stage) => ({
    id: stage.id as string,
    title: `【${stage[locale.value === 'en' ? 'en' : 'zhCn']}（${
      stage.range
    }）】`,
    items: buckets.get(stage.id) || [],
  }))
  const unknown = buckets.get('unknown')
  if (unknown?.length)
    groups.push({ id: 'unknown', title: t('unclassified'), items: unknown })
  return groups.filter((group) => group.items.length)
})
const selectTag = (tag: string) => {
  if (activeTag.value === tag) return
  cancelPageMedia()
  activeTag.value = tag
  void resetScroll()
}
function cancelPageMedia() {
  // 先释放旧页的图片候选源和视频连接，避免资源继续占用新页下载队列。
  viewport.value
    ?.querySelectorAll('picture source')
    .forEach((source) => source.removeAttribute('srcset'))
  viewport.value?.querySelectorAll('img').forEach((image) => {
    image.removeAttribute('srcset')
    image.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
  })
  viewport.value?.querySelectorAll('video').forEach((video) => {
    video.pause()
    video.removeAttribute('data-video-src')
    video.removeAttribute('src')
    video.load()
  })
}
const resetScroll = async () => {
  await nextTick()
  viewport.value?.scrollTo({ top: 0 })
}
const selectTab = (tab: 'album' | 'friends') => {
  if (activeTab.value === tab) return
  cancelPageMedia()
  activeTab.value = tab
  void resetScroll()
}
const navigateTabs = (event: KeyboardEvent) => {
  if (props.petId !== 'huahua') return
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  selectTab(
    event.key === 'Home'
      ? 'album'
      : event.key === 'End'
      ? 'friends'
      : isFriends.value
      ? 'album'
      : 'friends'
  )
  const tabs = event.currentTarget as HTMLElement
  void nextTick(() =>
    tabs.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus()
  )
}
watch(
  () => props.petId,
  () => {
    activeTab.value = 'album'
    activeTag.value = 'all'
  }
)
const goToPage = async (target: number) => {
  if (props.petId === 'huahua') {
    if (
      !Number.isInteger(target) ||
      target < 1 ||
      target > collectionPageCount.value ||
      target === collectionPage.value
    )
      return
    cancelPageMedia()
    collectionPage.value = target
    await resetScroll()
    return
  }
  if (await loadPage(target)) await resetScroll()
}
defineExpose({ closeExpanded })
</script>

<template>
  <section
    class="flora-album-gallery flora-media-panel no-rem"
    :class="{
      'is-expanded': expanded,
      'is-clickable': true,
      'has-toggled': hasToggled,
      'flora-album-gallery--mobile': mobile,
      'has-friends-tabs': petId === 'huahua',
    }"
    :style="{
      '--album-overflow-mask': overflowMask,
      '--album-title-fit': locale === 'en' ? '4.7cqw' : '7.5cqw',
    }"
    :aria-label="activeTitle"
    @click.stop="toggleFromSurface"
  >
    <div
      :key="String(expanded)"
      class="flora-album-gallery__background"
      aria-hidden="true"
    >
      <span
        v-for="blade in 12"
        :key="blade"
        :style="{ '--blade-index': blade - 1 }"
      />
    </div>
    <div
      class="flora-album-gallery__title"
      :class="{ 'flora-album-gallery__tabs': petId === 'huahua' }"
      :role="petId === 'huahua' ? 'tablist' : undefined"
      :aria-label="title"
      @keydown="navigateTabs"
    >
      <h2>
        <button
          :id="`flora-album-tab-${petId}`"
          type="button"
          :role="petId === 'huahua' ? 'tab' : undefined"
          :aria-selected="petId === 'huahua' ? !isFriends : undefined"
          :tabindex="petId === 'huahua' && isFriends ? -1 : 0"
          :aria-controls="`flora-album-content-${petId}`"
          :aria-expanded="petId !== 'huahua' ? expanded : undefined"
          @click.stop="petId === 'huahua' ? selectTab('album') : toggle()"
        >
          <Picture aria-hidden="true" focusable="false" />
          <span>{{ title }}</span>
        </button>
      </h2>
      <Transition name="flora-friends-heading-fade" appear>
        <h2
          v-if="petId === 'huahua'"
          class="flora-album-gallery__friends-heading"
        >
          <button
            :id="`flora-friends-tab-${petId}`"
            type="button"
            role="tab"
            :aria-selected="isFriends"
            :tabindex="isFriends ? 0 : -1"
            :aria-controls="`flora-album-content-${petId}`"
            @click.stop="selectTab('friends')"
          >
            <FloraFriendsIcon
              class="flora-album-gallery__cat-icon"
              aria-hidden="true"
              focusable="false"
            />
            <span>{{ t('friends') }}</span>
          </button>
        </h2>
      </Transition>
    </div>
    <div
      :id="`flora-album-content-${petId}`"
      class="flora-album-gallery__content"
      :role="petId === 'huahua' ? 'tabpanel' : undefined"
      :aria-labelledby="
        isFriends ? `flora-friends-tab-${petId}` : `flora-album-tab-${petId}`
      "
    >
      <Transition name="album-mode" mode="out-in">
        <FloraAlbumStrip
          v-if="!expanded"
          :key="`selected-${activeTab}`"
          :items="featuredItems"
          :title="activeTitle"
        />
        <div
          v-else
          :key="`all-${activeTab}`"
          class="flora-album-gallery__expanded"
          :class="{ 'has-tag-filters': petId === 'huahua' && !isFriends }"
        >
          <FilterRail
            v-if="petId === 'huahua' && !isFriends"
            class="flora-album-gallery__filters"
            horizontal
            :items="tagItems"
            :model-value="activeTag"
            :show-avatar="false"
            accent-color="var(--flora-theme-color)"
            :aria-label="t('filters')"
            @click.stop
            @update:model-value="selectTag"
          />
          <div
            ref="viewport"
            class="flora-album-gallery__viewport"
            data-lenis-nested-scroll
          >
            <template v-if="isFriends">
              <section
                v-for="group in floraFriendAlbums"
                :key="group.id"
                class="flora-album-gallery__friend-group"
              >
                <MediaGallery
                  :columns="4"
                  :items="group.items"
                  :get-media-label="
                    () => group.name[locale === 'en' ? 'en' : 'zhCn']
                  "
                  preserve-image-colors
                >
                  <template #toolbar-start>
                    <h3>{{ group.name[locale === 'en' ? 'en' : 'zhCn'] }}</h3>
                  </template>
                  <template #info="{ item }">
                    <MediaPhotoInfo
                      :item="{
                        time: getFloraCaptureDate(item.url) || t('unknownDate'),
                      }"
                      :time-divider-padding="0"
                    />
                  </template>
                </MediaGallery>
              </section>
            </template>
            <div
              v-else-if="loading && !allItems.length"
              class="flora-album-gallery__loading"
              role="status"
              :aria-label="t('loading')"
            >
              <el-icon :size="28" class="is-loading" aria-hidden="true">
                <Loading />
              </el-icon>
            </div>
            <p
              v-else-if="error && !allItems.length"
              class="flora-album-gallery__notice"
              role="alert"
            >
              {{ t('error') }}
              <button type="button" @click="refresh()">{{ t('retry') }}</button>
            </p>
            <p v-else-if="!allItems.length" class="flora-album-gallery__notice">
              {{ t('empty') }}
            </p>
            <template v-else>
              <p
                v-if="!albumGroups.some((group) => group.items.length)"
                class="flora-album-gallery__notice"
              >
                {{ t('empty') }}
              </p>
              <section
                v-for="group in albumGroups"
                :key="`${petId}-${activeTag}-${collectionPage}-${group.id}`"
                :class="{
                  'flora-album-gallery__stage-group': petId === 'huahua',
                }"
                :data-stage="group.id"
              >
                <MediaGallery
                  :columns="4"
                  :items="group.items"
                  :get-media-label="() => title"
                  preserve-image-colors
                >
                  <template v-if="group.title" #toolbar-start>
                    <h3>{{ group.title }}</h3>
                  </template>
                  <template #info="{ item }">
                    <MediaPhotoInfo
                      :item="{
                        time: getFloraCaptureDate(item.url) || t('unknownDate'),
                      }"
                      :time-divider-padding="0"
                    />
                  </template>
                </MediaGallery>
              </section>
            </template>
          </div>
        </div>
      </Transition>
    </div>
    <svg width="0" height="0" aria-hidden="true" style="position: absolute">
      <defs>
        <filter :id="decorationFilterId" color-interpolation-filters="sRGB">
          <feFlood
            style="flood-color: var(--flora-theme-color)"
            flood-opacity="0.35"
          />
          <feComposite in2="SourceAlpha" operator="in" result="tint" />
          <feBlend in="tint" in2="SourceGraphic" mode="color" />
        </filter>
      </defs>
    </svg>
    <Teleport
      :to="decorationTarget || 'body'"
      :disabled="!mobile || !decorationTarget"
    >
      <img
        v-if="petId === 'huahua'"
        class="flora-album-gallery__decoration no-rem"
        :style="{
          filter: `url(#${decorationFilterId}) drop-shadow(0 5px 8px rgb(0 0 0 / 85%))`,
        }"
        src="https://assets.anuluca.com/Floratrium/decorations/flora-corner-v1.avif"
        width="480"
        height="223"
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable="false"
      />
    </Teleport>
    <FloraExpandButton
      class="flora-album-gallery__expand"
      icon-class="flora-album-gallery__expand-icon"
      :expanded="expanded"
      :mobile="mobile"
      @click="toggle"
    />
    <footer v-if="expanded && !isFriends" class="flora-album-gallery__footer">
      <FloraAlbumPagination
        :total-items="petId === 'huahua' ? matchedItems.length : totalItems"
        :page="petId === 'huahua' ? collectionPage : pageIndex + 1"
        :page-count="
          petId === 'huahua'
            ? collectionPageCount
            : totalPages ?? pageCursors.length
        "
        :available-pages="
          petId === 'huahua' ? collectionPageCount : pageCursors.length
        "
        :mobile="mobile"
        @select="goToPage"
      />
    </footer>
  </section>
</template>

<style scoped lang="less">
@import '../styles/floraMedia.less';
.flora-album-gallery__decoration.no-rem {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 2;
  width: clamp(140px, 28%, 240px);
  height: auto;
  transform: translate(12%, 66%);
  clip-path: inset(0 0 0 10%);
  pointer-events: none;
  user-select: none;
  opacity: 1;
  transition: opacity 300ms ease, visibility 0s;
}
.flora-album-gallery.no-rem {
  .flora-media-panel();
  display: flex;
  flex-direction: column;
  --album-background: var(--flora-theme-color);
  animation: album-fade-in 450ms ease;

  &.has-friends-tabs {
    container-type: inline-size;
    --flora-media-expanded-heading-space: calc(
      min(var(--flora-media-title-size, 72px), var(--album-title-fit)) *
        var(--flora-media-title-line-height, 1.2) -
        var(--flora-media-title-overlap, 4px)
    );
  }

  .flora-album-gallery__content {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .flora-album-gallery__friend-group,
  .flora-album-gallery__stage-group {
    margin-bottom: 28px;

    h3 {
      grid-area: 1 / 1;
      min-width: 0;
      margin: 0;
      padding-inline: 0;
      box-sizing: border-box;
      text-align: left;
      pointer-events: none;
      color: #fff;
      font: 900 24px / 1.4 'alibaba-puhuiti', sans-serif;
      text-shadow: 0 2px 6px rgb(0 0 0 / 35%);
    }

    :deep(.media-gallery__toolbar) {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 38px 38px;
      align-items: center;

      > button:first-of-type {
        grid-area: 1 / 2;
        z-index: 1;
      }

      > button:last-of-type {
        grid-area: 1 / 3;
        z-index: 1;
      }
    }

    &:last-child {
      margin-bottom: 60px;
    }
  }

  .flora-album-gallery__stage-group h3 {
    font-size: 20px;
    overflow-wrap: anywhere;
  }
  .flora-album-gallery__expanded {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }
  :deep(.flora-album-gallery__filters.filter-rail--horizontal) {
    flex-shrink: 0;
    margin: 0 30px 20px;
    padding-top: 12px;
  }
  .has-tag-filters .flora-album-gallery__viewport {
    padding-top: 0;
  }
  &.is-expanded {
    .flora-album-gallery__background {
      opacity: 0.4;
    }
    .flora-album-gallery__expanded {
      margin-top: 20px;
      &.has-tag-filters {
        margin-top: 0;
      }
    }
    &::before {
      background: color-mix(in srgb, var(--flora-theme-color) 40%, transparent);
    }
    .flora-album-gallery__title {
      max-width: 100%;
    }
  }
  &::before {
    position: absolute;
    top: -32px;
    right: 0;
    left: 0;
    height: 32px;
    transition: background-color 850ms ease, opacity 200ms ease;
    background: color-mix(in srgb, var(--flora-theme-color) 60%, transparent);
    -webkit-mask-image: var(--album-overflow-mask);
    mask-image: var(--album-overflow-mask);
    content: '';
    pointer-events: none;
  }
  .album-mode-enter-active {
    transition: opacity 420ms ease,
      transform 550ms cubic-bezier(0.22, 1, 0.36, 1), clip-path 550ms ease;
  }
  .album-mode-leave-active {
    pointer-events: none;
    transition: opacity 350ms 150ms ease, transform 500ms ease,
      clip-path 500ms ease;
    :deep(.flora-album-strip__photo) {
      transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
    }
  }
  .album-mode-leave-to :deep(.flora-album-strip__photo) {
    transform: translate(-50%, -50%) perspective(1400px) rotateY(0deg)
      scale(1.08);
  }
  .album-mode-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.94);
    clip-path: inset(15% 0 0 0);
  }
  .album-mode-leave-to {
    opacity: 0;
    transform: translateY(-24px) scale(1.1);
    clip-path: inset(0 0 15% 0);
  }
  &:not(.is-expanded) {
    .album-mode-enter-from {
      transform: translateY(-16px) scale(1.04);
      clip-path: inset(0 0 15% 0);
    }
    .album-mode-leave-to {
      transform: translateY(16px) scale(0.94);
      clip-path: inset(15% 0 0 0);
    }
  }
  .flora-album-gallery__viewport {
    position: relative;
    z-index: 0;
    min-height: 0;
    flex: 1;
    padding-top: 12px;
    padding-inline: 30px;
    overflow: auto;
    overscroll-behavior: contain;
  }
  @media (max-width: 900px) {
    .flora-album-gallery__viewport {
      padding-inline: 35px;
    }
    :deep(.flora-album-gallery__filters.filter-rail--horizontal) {
      margin-inline: 35px;
    }
    &.is-expanded .flora-album-gallery__footer {
      padding-bottom: 76px;
    }
  }
  .flora-album-gallery__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px;
  }
  .flora-album-gallery__title {
    .flora-media-title();
    max-width: 100%;
    z-index: 2;
    pointer-events: auto;
    transition: opacity 200ms ease;
    h2 {
      margin: 0;
      font: inherit;
    }
    button {
      .flora-media-title-content();
      padding: 0;
      font: inherit;
      text-align: left;
      &:disabled {
        opacity: 1;
      }
    }
  }
  .flora-album-gallery__tabs {
    display: flex;
    align-items: center;
    gap: 0.35em;
    max-width: calc(100% - 2 * var(--media-title-offset, 12px));
    font-size: min(var(--flora-media-title-size, 72px), var(--album-title-fit));

    button {
      opacity: 1;
      transition: opacity 200ms ease;
      padding: 0;

      &[aria-selected='false'] {
        opacity: 0.5;

        span {
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px currentColor;
        }
      }

      .flora-album-gallery__cat-icon {
        stroke-width: 2;
      }
    }
  }
  .flora-album-gallery__background {
    position: absolute;
    inset: 0;
    z-index: -1;
    display: grid;
    grid-template-rows: repeat(12, minmax(0, 1fr));
    opacity: 0.6;
    transition: opacity 200ms ease;
    -webkit-mask-image: repeating-linear-gradient(
      to bottom,
      transparent 0 var(--flora-background-scanline-gap, 1px),
      #000 var(--flora-background-scanline-gap, 1px)
        var(--flora-background-scanline-period, 4px)
    );
    mask-image: repeating-linear-gradient(
      to bottom,
      transparent 0 var(--flora-background-scanline-gap, 1px),
      #000 var(--flora-background-scanline-gap, 1px)
        var(--flora-background-scanline-period, 4px)
    );
    pointer-events: none;
    span {
      margin-bottom: -1px;
      background: var(--album-background);
      transition: background-color 850ms ease;
      transform-origin: center bottom;
    }
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
      &::before {
        opacity: 0.8;
      }
      .flora-album-gallery__background {
        opacity: 0.48;
      }
      &.is-expanded .flora-album-gallery__background {
        opacity: 0.32;
      }
    }
    .flora-album-gallery__title:hover {
      opacity: 0.8;
    }
  }
  &.has-toggled .flora-album-gallery__background span {
    animation: album-blade-close 600ms ease both;
    animation-delay: calc((11 - var(--blade-index)) * 24ms);
  }
  &.is-expanded .flora-album-gallery__background span {
    transform-origin: center top;
    animation-name: album-blade-open;
    animation-delay: calc(var(--blade-index) * 24ms);
  }
  button:where(:not(.flora-expand-button)) {
    padding: 4px 6px;
    border: 0;
    background: transparent;
    color: inherit;
    font: 700 14px / 1.4 'alibaba-puhuiti', sans-serif;
    cursor: pointer;
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
    &:focus-visible {
      outline: 1px solid currentColor !important;
      outline-offset: 2px;
    }
  }
  .flora-album-gallery__loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--flora-theme-color);
  }
  .flora-album-gallery__notice {
    padding: 16px;
    margin: 0;
    font-size: 14px;
  }
  &.flora-album-gallery--mobile {
    --album-toggle-width: 80px;
    --album-toggle-right: 8px;

    .flora-album-gallery__friend-group h3,
    .flora-album-gallery__stage-group h3 {
      font-size: 20px;
    }

    &:not(.is-expanded) .flora-album-gallery__tabs {
      min-height: calc(
        var(--flora-media-title-size) *
          var(--flora-media-title-line-height, 1.2)
      );
    }

    :deep(.flora-album-strip.no-rem) {
      width: 100%;
      padding: 6px 8px;
    }

    :deep(.media-gallery__card) {
      --media-gallery-max-height: clamp(180px, 52vw, 270px);
    }

    &.is-expanded {
      &.has-friends-tabs {
        .flora-album-gallery__title {
          top: 8px;
          bottom: auto;
        }

        .flora-album-gallery__expanded {
          margin-top: calc(
            min(var(--flora-media-title-size, 72px), var(--album-title-fit)) *
              var(--flora-media-title-line-height, 1.2) + 16px
          );
          &.has-tag-filters {
            margin-top: calc(
              min(var(--flora-media-title-size, 72px), var(--album-title-fit)) *
                var(--flora-media-title-line-height, 1.2) + 8px
            );
          }
        }
      }

      .flora-album-gallery__expanded {
        margin-top: 20px;
      }
      :deep(.flora-album-gallery__filters.filter-rail--horizontal) {
        margin-inline: 8px;
        padding-top: 8px;
      }
      .flora-album-gallery__viewport {
        padding: 8px;
      }
      .has-tag-filters .flora-album-gallery__viewport {
        padding-top: 0;
      }

      .flora-album-gallery__footer {
        justify-content: flex-start;
        padding: 8px
          calc(var(--album-toggle-right) + var(--album-toggle-width) + 8px) 8px
          8px;
      }

      .flora-album-gallery__pagination {
        min-height: 30px;
      }
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .album-mode-enter-active,
    .album-mode-leave-active {
      transition: none;
      :deep(.flora-album-strip__photo) {
        transition: none;
      }
    }

    &.flora-album-gallery--mobile {
      transition: none;

      .flora-album-gallery__background span {
        animation: none;
      }

      button.flora-album-gallery__expand {
        transition: none;
      }
    }

    transition: none;
    animation: none;
    .flora-album-gallery__background span {
      animation: none;
      transition: none;
    }
    &::before {
      transition: none;
    }
    button.flora-album-gallery__expand {
      transition: none;
    }
    button.flora-album-gallery__expand:hover,
    button.flora-album-gallery__expand:focus-visible {
      animation: none;
    }
  }
}
@keyframes album-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes album-blade-open {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}
@keyframes album-blade-close {
  0% {
    transform: scaleY(1);
  }
  35% {
    transform: scaleY(0.15);
  }
  100% {
    transform: scaleY(1);
  }
}

.flora-friends-heading-fade-enter-active,
.flora-friends-heading-fade-leave-active {
  transition: opacity 350ms ease;
}
.flora-friends-heading-fade-enter-from,
.flora-friends-heading-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .flora-friends-heading-fade-enter-active,
  .flora-friends-heading-fade-leave-active {
    transition: none;
  }
}
</style>
