<template>
  <div
    ref="contentRoot"
    class="island-collections-content"
    :class="{ 'skip-shelf-entry': skipShelfEntry }"
    :style="{ '--collection-columns': columns }"
  >
    <main class="collection-index">
      <div
        ref="tabsViewport"
        class="collection-tabs no-rem"
        aria-label="收藏品分类"
      >
        <div ref="tabsRow" class="collection-tabs__row">
          <button
            v-for="group in collectionGroups"
            :key="group.id"
            class="collection-section__head"
            :class="{ 'is-active': group.id === selectedCategory }"
            :aria-pressed="group.id === selectedCategory"
            type="button"
            @click="selectCategory(group.id)"
          >
            <span class="collection-section__title">{{ group.title }}</span>
          </button>
        </div>
      </div>
      <section class="collection-section">
        <div
          ref="gridRoot"
          class="collection-grid"
          :class="{ 'is-empty': !activeCollections.length }"
        >
          <div class="collection-grid__pegboard" aria-hidden="true" />
          <template
            v-for="{
              collection,
              rowIndex,
              entryStyle,
              shelfStyle,
              skipEntry,
            } in collectionEntries"
            :key="collection.id"
          >
            <MerchCollectionCard
              :id="`merch-collection-${collection.id}`"
              :data-collection-row="rowIndex"
              :collection="collection"
              :mobile="mobile"
              :expanded="openedCollection?.id === collection.id"
              :expanded-target="
                openedCollection?.id === collection.id ? collectionHost : null
              "
              :closing="
                openedCollection?.id === collection.id && collectionClosing
              "
              :returning="
                openedCollection?.id === collection.id && collectionReturning
              "
              :count-label="
                t('island.modules.photography.merch.collectionLabel')
              "
              :style="entryStyle"
              :class="{ 'skip-card-entry': skipEntry }"
              @select="openCollection"
            >
              <template #gallery>
                <MediaGallery
                  v-if="collection.photos.length"
                  :items="collection.photos"
                  :show-media-info="(photo) => Boolean(photo.title)"
                  :get-media-label="(photo) => photo.title || collection.title"
                >
                  <template #info="{ item: photo }">
                    <p class="collection-detail__caption">
                      {{ photo.title }}
                    </p>
                  </template>
                </MediaGallery>
                <p v-else class="collection-detail__empty">
                  {{ t('island.modules.photography.merch.empty') }}
                </p>
              </template>
            </MerchCollectionCard>
            <div
              v-if="shelfStyle"
              class="collection-grid__row-shelf"
              :data-collection-row="rowIndex"
              :style="shelfStyle"
              aria-hidden="true"
            >
              <span class="collection-grid__row-shelf-surface" />
              <span class="collection-grid__row-shelf-base" />
            </div>
          </template>
          <div v-if="!activeCollections.length" class="collection-shelf-empty">
            <span>EMPTY DISPLAY</span>
          </div>
          <div
            v-if="!activeCollections.length"
            class="collection-grid__shelf"
            aria-hidden="true"
          >
            <span class="collection-grid__shelf-surface" />
            <span class="collection-grid__shelf-base" />
          </div>
        </div>
      </section>
    </main>
    <ModalWrapper
      v-model="collectionVisible"
      dialog-class="collection-detail-modal"
      width="min(1280px, calc(100vw - 48px))"
      :origin-element="collectionOrigin"
      close-title="关闭收藏品 (ESC)"
      @close="collectionClosing = true"
      @origin-return="returnCollectionToShelf"
      @closed="finishCollectionClose"
    >
      <div ref="collectionHost" class="collection-detail__host" />
    </ModalWrapper>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredReducedMotion, useResizeObserver } from '@vueuse/core'

import MediaGallery from '@/components/MediaGallery/index.vue'
import MerchCollectionCard from '@/components/MerchCollectionCard/index.vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'

import { useCollectionDialog } from '../../composables/useCollectionDialog'

import type { MerchCategoryId, MerchGroups } from '@/types/merch'

interface MerchCategoryMeta {
  id: MerchCategoryId
  title: string
}

const merchCategoryMeta: MerchCategoryMeta[] = [
  {
    id: 'pokemon',
    title: 'POKÉMON',
  },
  {
    id: 'tokusatsu',
    title: 'TOKUSATSU',
  },
  {
    id: 'other',
    title: 'OTHER',
  },
]

const props = defineProps<{ expanded?: boolean; mobile?: boolean }>()
const columns = computed(() => (props.mobile ? 2 : props.expanded ? 5 : 4))
const { t, tm } = useI18n()
const {
  openedCollection,
  collectionOrigin,
  collectionVisible,
  collectionClosing,
  collectionHost,
  collectionReturning,
  returnCollectionToShelf,
  finishCollectionClose,
  openCollection,
} = useCollectionDialog()
const savedCategory =
  typeof window === 'undefined'
    ? null
    : sessionStorage.getItem('merch-category')
const selectedCategory = ref<MerchCategoryId>(
  merchCategoryMeta.find((category) => category.id === savedCategory)?.id ||
    'pokemon'
)
const TARGET_SHELF_DISTANCE_ROW_INDEX = 2
const SHELF_DISTANCE_ROW_STEP = 2.82

const merch = computed<MerchGroups>(() => {
  return tm('island.modules.photography.merch.data') as MerchGroups
})

const collectionGroups = merchCategoryMeta
const activeCollections = computed(
  () => merch.value[selectedCategory.value] || []
)

const skipShelfEntry = ref(false)
// 列数变化会重建行尾底座；重排生成的节点无需再次播放首次入场动画。
watch(columns, () => {
  skipShelfEntry.value = true
})
const selectCategory = (category: MerchCategoryId) => {
  if (category === selectedCategory.value) return
  skipShelfEntry.value = true
  selectedCategory.value = category
  sessionStorage.setItem('merch-category', category)
}

// 仅在分类、列数或入场状态变化时生成布局，弹窗开关不重复创建所有卡片样式。
const collectionEntries = computed(() =>
  activeCollections.value.map((collection, index, collections) => ({
    collection,
    rowIndex: Math.floor(index / columns.value),
    skipEntry: index >= columns.value * 2,
    entryStyle: {
      '--card-entry-delay': `calc(var(--section-entry-delay) + ${
        skipShelfEntry.value
          ? '0ms'
          : 'var(--island-detail-content-ready-delay, 0ms)'
      } + ${180 + index * 180}ms)`,
    },
    shelfStyle:
      (index + 1) % columns.value === 0 || index === collections.length - 1
        ? {
            '--row-shelf-translate': `${
              (Math.floor(index / columns.value) -
                TARGET_SHELF_DISTANCE_ROW_INDEX) *
              SHELF_DISTANCE_ROW_STEP
            }px`,
          }
        : null,
  }))
)

const contentRoot = ref<HTMLElement | null>(null)
const gridRoot = ref<HTMLElement | null>(null)
const tabsViewport = ref<HTMLElement | null>(null)
const tabsRow = ref<HTMLElement | null>(null)
// 大字号超出窄屏时保留居中初始位置，两端标签均可横向滑动到达。
useResizeObserver([tabsViewport, tabsRow], () => {
  const viewport = tabsViewport.value
  if (viewport && getComputedStyle(viewport).overflowX === 'auto')
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2
})
const reducedMotion = usePreferredReducedMotion()
let scrollViewport: HTMLElement | null = null
let parallaxFrame = 0

// 同行商品与底座使用相同位移，保持落架关系；独立 translate 不覆盖入场和悬停动画。
const updateRowParallax = () => {
  parallaxFrame = 0
  const grid = gridRoot.value
  if (!grid || !scrollViewport) return
  const viewport = scrollViewport.getBoundingClientRect()
  const gridTop = grid.getBoundingClientRect().top
  const offsets = new Map<string, number>()
  const elements = Array.from(
    grid.querySelectorAll<HTMLElement>('[data-collection-row]')
  )
  // 先读几何再写样式，避免逐卡触发同步布局。
  for (const element of elements) {
    const row = element.dataset.collectionRow!
    if (offsets.has(row)) continue
    const center = gridTop + element.offsetTop + element.offsetHeight / 2
    const distance = center - (viewport.top + viewport.height / 2)
    offsets.set(
      row,
      reducedMotion.value === 'reduce'
        ? 0
        : Math.max(-48, Math.min(48, distance * 0.12))
    )
  }
  for (const element of elements) {
    element.style.setProperty(
      '--collection-row-parallax',
      `${offsets.get(element.dataset.collectionRow!) || 0}px`
    )
  }
}
const scheduleRowParallax = () => {
  if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateRowParallax)
}
useResizeObserver([gridRoot, contentRoot], scheduleRowParallax)
watch([collectionEntries, reducedMotion], () => nextTick(scheduleRowParallax))
onMounted(() => {
  scrollViewport =
    contentRoot.value?.closest('.scroll-viewport__scroll') || null
  scrollViewport?.addEventListener('scroll', scheduleRowParallax, {
    passive: true,
  })
  scheduleRowParallax()
})
onBeforeUnmount(() => {
  scrollViewport?.removeEventListener('scroll', scheduleRowParallax)
  cancelAnimationFrame(parallaxFrame)
})
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'UnboundedSans', 'Courier New', monospace;
@cjk: 'alibaba-puhuiti', sans-serif;
.island-collections-content {
  color: var(--text-color);
  overflow: clip;
}

.collection-index {
  padding: 0 0 24px;
}

.collection-tabs {
  --section-entry-delay: 0ms;
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: -13px;

  &__row {
    display: contents;
  }
}

.collection-section {
  --section-entry-delay: 0ms;

  position: relative;
  padding: 0;
  isolation: isolate;

  &__head {
    position: relative;
    top: 16px;
    z-index: 5;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: max-content;
    min-height: calc(23px + 0.6rem);
    margin: 0;
    padding: 10px 26px 11px;
    box-sizing: border-box;
    border: 0;
    background: transparent;
    cursor: pointer;
    transition: filter 0.25s ease;
    animation: merch-sign-entry 0.72s cubic-bezier(0.18, 0.78, 0.22, 1)
      backwards;
    animation-delay: calc(var(--section-entry-delay) + 360ms);

    &:not(.is-active) {
      filter: brightness(0.55);

      .collection-section__title {
        color: transparent;
        -webkit-text-stroke: 1.5px #fff;
      }

      &:hover {
        filter: brightness(1);
      }
    }

    &:focus-visible {
      outline: 2px solid @red;
      outline-offset: 2px;
    }
  }

  &__title {
    color: #fff;
    font-family: 'UnboundedSans', sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }
}

.collection-grid {
  --card-shelf-gutter: clamp(12px, 2cqw, 28px);
  --grid-side-padding: clamp(24px, 4cqw, 64px);

  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--collection-columns), minmax(0, 1fr));
  align-items: end;
  column-gap: var(--card-shelf-gutter);
  row-gap: 0;
  min-height: 280px;
  padding: clamp(64px, 6vw, 88px) var(--grid-side-padding) 48px;

  :deep(.collection-card-entry),
  &__row-shelf {
    translate: 0 var(--collection-row-parallax, 0px);
  }

  :deep(.collection-card-entry) {
    z-index: 4;
    animation: merch-card-entry 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)
      backwards;
    animation-delay: var(--card-entry-delay);
    &.skip-card-entry {
      animation: none;
    }
  }

  &__pegboard {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    background: radial-gradient(
          circle at center,
          #030303 0 2px,
          rgba(255, 255, 255, 0.035) 2.5px 3px,
          transparent 3.5px
        )
        0 0 / 24px 24px,
      linear-gradient(90deg, #252525, #313131 50%, #252525);
    box-shadow: inset 0 14px 28px rgba(0, 0, 0, 0.4);
    mask-image: linear-gradient(
      to bottom,
      #000 0,
      #000 calc(100% - 118px),
      rgba(0, 0, 0, 0.7) calc(100% - 58px),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      #000 0,
      #000 calc(100% - 118px),
      rgba(0, 0, 0, 0.7) calc(100% - 58px),
      transparent 100%
    );
    animation: merch-pegboard-entry 0.88s ease-out backwards;
    animation-delay: calc(var(--section-entry-delay) + 120ms);

    &::after {
      position: absolute;
      inset: 0;
      content: '';
      background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.04),
        transparent 24%
      );
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.045);
    }
  }

  &__shelf {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 3;
    height: 56px;
    pointer-events: none;
  }

  &__row-shelf {
    position: relative;
    z-index: 3;
    grid-column: 1 / -1;
    height: 45px;
    margin-right: calc(var(--grid-side-padding) * -1);
    margin-left: calc(var(--grid-side-padding) * -1);
    pointer-events: none;
    transform: translateY(var(--row-shelf-translate));

    &:not(:last-child) {
      margin-bottom: 12px;
    }
  }

  &__shelf,
  &__row-shelf {
    transform-origin: top center;
    animation: merch-shelf-entry 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)
      backwards;
    animation-delay: calc(var(--section-entry-delay) + 180ms);
  }

  .skip-shelf-entry &__shelf,
  .skip-shelf-entry &__row-shelf {
    animation: none;
  }

  &__shelf-surface,
  &__shelf-base,
  &__row-shelf-surface,
  &__row-shelf-base {
    position: absolute;
    display: block;
  }

  &__shelf-surface,
  &__row-shelf-surface {
    right: 0;
    left: 0;
    height: 22px;
    z-index: 1;
    background: linear-gradient(to bottom, #353535, #161616 78%);
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.2);
    clip-path: polygon(4% 0, 96% 0, 98% 100%, 2% 100%);
  }

  &__shelf-surface {
    bottom: 34px;
  }

  &__row-shelf-surface {
    top: -6px;
    box-shadow: none;
  }

  &__shelf-base,
  &__row-shelf-base {
    right: 2%;
    left: 2%;
    height: 34px;
    z-index: 2;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    background: #0e0e0e;
    box-shadow: 0 12px 26px rgba(0, 0, 0, 0.4);
  }

  &__shelf-base {
    bottom: 0;
  }

  &__row-shelf-base {
    top: 16px;
  }

  &.is-empty {
    min-height: 190px;
    padding-bottom: 44px;

    .collection-grid__pegboard {
      bottom: 42px;
    }
  }
}

@keyframes merch-pegboard-entry {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@keyframes merch-sign-entry {
  0% {
    opacity: 0;
    transform: translateY(-24px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes merch-shelf-entry {
  0% {
    opacity: 0;
    transform: translateY(calc(-16px + var(--row-shelf-translate, 0px)));
  }

  100% {
    opacity: 1;
    transform: translateY(var(--row-shelf-translate, 0px));
  }
}

@keyframes merch-card-entry {
  0% {
    opacity: 0;
    transform: translateY(-16px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .collection-section__head,
  .collection-grid__pegboard,
  .collection-grid__shelf,
  .collection-grid__row-shelf,
  .collection-grid :deep(.collection-card-entry) {
    animation: none;
  }
}

.collection-shelf-empty {
  position: absolute;
  inset: 0 0 44px;
  z-index: 1;
  display: grid;
  place-items: center;
  color: color-mix(in srgb, var(--text-color) 12%, transparent);
  font-family: @mono;
  font-size: 0.52rem;
  letter-spacing: 0.22em;

  span {
    padding: 10px 16px;
    border: 1px dashed color-mix(in srgb, var(--text-color) 10%, transparent);
  }
}

@media (max-width: 900px) {
  .collection-tabs.no-rem {
    top: 16px;
    display: block;
    margin-bottom: 0;
    overflow-x: auto;

    .collection-tabs__row {
      display: flex;
      justify-content: center;
      gap: 12px;
      width: max-content;
      min-width: 100%;
    }

    .collection-section__head {
      top: 0;
      flex: none;
      min-width: 44px;
      min-height: 44px;
      padding: 10px 2px;

      &:not(.is-active) {
        filter: brightness(0.8);

        .collection-section__title {
          -webkit-text-stroke-width: 0.5px;
        }
      }
    }

    .collection-section__title {
      font-family: 'Anton', sans-serif;
      font-size: clamp(18px, 5.5vw, 24px);
      letter-spacing: -0.25px;
      white-space: nowrap;
    }
  }

  .collection-grid {
    min-height: 220px;
    padding: 80px var(--grid-side-padding) 48px;

    &__pegboard {
      background-size: 18px 18px, auto;
    }

    &__shelf {
      height: 45px;
    }

    &__shelf-surface {
      bottom: 27px;
      height: 18px;
    }

    &__shelf-base {
      height: 27px;
    }

    &__row-shelf {
      z-index: 1;
      height: 36px;
    }

    &__row-shelf-surface {
      top: -4px;
      height: 18px;
    }

    &__row-shelf-base {
      top: 14px;
      height: 27px;
    }

    &.is-empty {
      padding-bottom: 35px;

      .collection-grid__pegboard {
        bottom: 34px;
      }
    }
  }

  .collection-shelf-empty {
    bottom: 34px;
  }

  .collection-section {
    &__head {
      height: calc(19px + 0.6rem);
      padding: 8px 20px 9px;
    }
  }
}
.collection-detail__caption {
  padding: 8px;
  font-size: 13px;
  text-align: center;
}
.collection-detail__empty {
  padding: 64px 16px;
  text-align: center;
  color: var(--text-faint);
}
</style>

<style lang="less">
.collection-detail-modal.modal-wrapper-dialog {
  height: 76dvh;
  max-height: calc(100dvh - 140px) !important;
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  .modal-scroll-region {
    overflow: visible;
  }
  .modal-scanlines,
  .modal-scroll-progress {
    display: none;
  }
  .collection-detail__host {
    position: relative;
    height: 100%;
    min-height: 0;
    flex: 1;
  }
}

// 嵌入卡片的预览按容器分配空间，避免全屏导航和视口高度挤占缩略图。
.collection-detail-modal.no-rem {
  .media-gallery--preview {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    height: 100%;
    min-height: 0;
  }
  .media-gallery--preview .media-gallery__toolbar {
    flex: none;
    padding-bottom: 6px;
  }
  .inline-image-preview {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 16px;
  }
  .inline-image-preview__stage {
    container-type: size;
    min-height: 0;
    height: 100%;
    --inline-canvas-padding: 20px;
    --inline-image-max-height: max(
      1px,
      calc(100cqh - 40px - var(--inline-info-height, 0px))
    );
  }
  .inline-image-preview__canvas {
    padding: 20px 112px;
  }
  .inline-image-preview__thumbnails {
    padding: 8px 8px;
  }
  .inline-image-preview__thumbnail {
    flex-basis: 80px;
    height: 60px;
  }
  .inline-image-preview__stage .el-image-viewer__prev,
  .inline-image-preview__stage .el-image-viewer__next {
    width: 88px;
    height: min(82%, 360px);
  }
  .inline-image-preview__stage .el-image-viewer__prev {
    left: 0;
  }
  .inline-image-preview__stage .el-image-viewer__next {
    right: 0;
  }
  .safe-image-viewer__nav-label {
    font-size: 52px;
  }
  @media (max-width: 768px) {
    .inline-image-preview__canvas {
      padding-inline: 60px;
    }
    .inline-image-preview__stage .el-image-viewer__prev,
    .inline-image-preview__stage .el-image-viewer__next {
      width: 44px;
      height: min(78%, 240px);
    }
    .safe-image-viewer__nav-label {
      font-size: 32px;
    }
  }
}
</style>
