<template>
  <div
    class="island-collections-content is-embedded"
    :style="{ '--collection-columns': columns }"
  >
    <main class="collection-index">
      <div class="collection-tabs" aria-label="收藏品分类">
        <button
          v-for="group in collectionGroups"
          :key="group.id"
          class="collection-section__head"
          :class="{ 'is-active': group.id === selectedCategory }"
          :aria-pressed="group.id === selectedCategory"
          type="button"
          @click="selectCategory(group.id)"
        >
          <div class="collection-section__head-left">
            <span class="collection-section__title">{{ group.title }}</span>
          </div>
          <strong class="collection-section__count">
            <span>{{ group.totalCount }}</span>
          </strong>
        </button>
      </div>
      <section :key="activeGroup.id" class="collection-section">
        <template v-for="group in [activeGroup]" :key="group.id">
          <div
            class="collection-grid"
            :class="{ 'is-empty': !group.totalCount }"
          >
            <div class="collection-grid__pegboard" aria-hidden="true" />
            <template
              v-for="(collection, collectionIndex) in group.collections"
              :key="collection.id"
            >
              <MerchCollectionCard
                :id="getCollectionElementId(collection.id)"
                :collection="collection"
                :count-label="
                  t('island.modules.photography.merch.collectionLabel')
                "
                :style="getCollectionEntryStyle(collectionIndex)"
                @select="openCollection"
              />
              <div
                v-if="
                  shouldRenderRowShelf(
                    collectionIndex,
                    group.collections.length
                  )
                "
                class="collection-grid__row-shelf"
                :style="getRowShelfStyle(collectionIndex)"
                aria-hidden="true"
              >
                <span class="collection-grid__row-shelf-surface" />
                <span class="collection-grid__row-shelf-base" />
              </div>
            </template>
            <div v-if="!group.totalCount" class="collection-shelf-empty">
              <span>EMPTY DISPLAY</span>
            </div>
            <div
              v-if="!group.totalCount"
              class="collection-grid__shelf"
              aria-hidden="true"
            >
              <span class="collection-grid__shelf-surface" />
              <span class="collection-grid__shelf-base" />
            </div>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import MerchCollectionCard, {
  type MerchCollectionCardData,
} from '@/components/MerchCollectionCard/index.vue'

type MerchCategoryId = 'pokemon' | 'tokusatsu' | 'other'

type MerchGroups = Record<MerchCategoryId, MerchCollectionCardData[]>

interface MerchCategoryMeta {
  id: MerchCategoryId
  title: {
    zhCn: string
    en: string
  }
}

const merchCategoryMeta: MerchCategoryMeta[] = [
  {
    id: 'pokemon',
    title: {
      zhCn: '宝可梦',
      en: 'POKÉMON',
    },
  },
  {
    id: 'tokusatsu',
    title: {
      zhCn: '特摄',
      en: 'TOKUSATSU',
    },
  },
  {
    id: 'other',
    title: {
      zhCn: '其他',
      en: 'OTHER',
    },
  },
]

const props = defineProps<{ expanded?: boolean; mobile?: boolean }>()
const columns = computed(() => (props.mobile ? 1 : props.expanded ? 5 : 4))
const { locale, t, tm } = useI18n()
const router = useRouter()
const savedCategory =
  typeof window === 'undefined' ? null : sessionStorage.getItem('merch-category')
const selectedCategory = ref<MerchCategoryId>(
  merchCategoryMeta.find((category) => category.id === savedCategory)?.id ||
    'pokemon'
)
const TARGET_SHELF_DISTANCE_ROW_INDEX = 2
const SHELF_DISTANCE_ROW_STEP = 2.82

const merch = computed<MerchGroups>(() => {
  return tm('island.modules.photography.merch.data') as MerchGroups
})

const collectionGroups = computed(() =>
  merchCategoryMeta.map((category) => {
    const groupCollections = merch.value[category.id] || []

    return {
      id: category.id,
      title: locale.value === 'en' ? category.title.en : category.title.zhCn,
      totalCount: groupCollections.length,
      collections: groupCollections,
    }
  })
)
const activeGroup = computed(
  () =>
    collectionGroups.value.find((group) => group.id === selectedCategory.value)!
)

const selectCategory = (category: MerchCategoryId) => {
  selectedCategory.value = category
  sessionStorage.setItem('merch-category', category)
}

const getCollectionElementId = (collectionId: string) =>
  `merch-collection-${collectionId}`

const shouldRenderRowShelf = (
  collectionIndex: number,
  collectionCount: number
) =>
  (collectionIndex + 1) % columns.value === 0 ||
  collectionIndex === collectionCount - 1

const getRowShelfStyle = (collectionIndex: number) => {
  const rowIndex = Math.floor(collectionIndex / columns.value)
  const offset = `${
    (rowIndex - TARGET_SHELF_DISTANCE_ROW_INDEX) * SHELF_DISTANCE_ROW_STEP
  }px`
  return { '--row-shelf-translate': offset }
}

const getCollectionEntryStyle = (collectionIndex: number) => ({
  '--card-entry-delay': `calc(var(--section-entry-delay) + ${
    180 + collectionIndex * 60
  }ms)`,
})

const openCollection = (collectionId: string) => {
  router.push(`/atrium/merch/${collectionId}`)
}
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'UnboundedSans', 'Courier New', monospace;
@cjk: 'alibaba-puhuiti', sans-serif;
.island-collections-content {
  color: var(--text-color);
  overflow: clip;
  &.is-embedded {
    padding: 0;
    .collection-index {
      padding: 0 0 24px;
    }
    .collection-grid {
      --card-shelf-gutter: clamp(12px, 2cqw, 28px);
      --grid-side-padding: clamp(24px, 4cqw, 64px);
      grid-template-columns: repeat(var(--collection-columns), minmax(0, 1fr));
    }
    .collection-section + .collection-section {
      margin-top: 32px;
    }
  }
}

.collection-index {
  padding: 54px 0 48px;
}

.collection-tabs {
  --section-entry-delay: 0ms;
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: -13px;
}

.collection-section {
  --section-entry-delay: 0ms;

  position: relative;
  padding: 0;
  isolation: isolate;

  & + & {
    margin-top: 66px;
  }

  &__head {
    position: relative;
    top: 16px;
    z-index: 5;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 32px;
    width: max-content;
    height: calc(23px + 0.6rem);
    margin: 0;
    padding: 10px 26px 11px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-bottom-color: rgba(226, 52, 86, 0.38);
    background: #191919;
    cursor: pointer;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.46);
    transition: gap 0.25s ease, filter 0.25s ease, border-color 0.25s ease;
    animation: merch-sign-entry 0.72s cubic-bezier(0.18, 0.78, 0.22, 1)
      backwards;
    animation-delay: calc(var(--section-entry-delay) + 360ms);

    &:not(.is-active) {
      border-bottom-color: rgba(255, 255, 255, 0.12);
      filter: brightness(0.55);

      .collection-section__count span:first-child {
        color: #aaa;
      }

      &:hover {
        filter: brightness(1);
      }
    }

    &.is-active {
      gap: 48px;
    }

    &:focus-visible {
      outline: 2px solid @red;
      outline-offset: 2px;
    }
  }

  &__head-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    color: #fff;
    font-family: @cjk;
    font-size: 0.75rem;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  &__count {
    position: relative;
    top: -1px;
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    color: rgba(255, 255, 255, 0.48);
    font-family: @mono;
    font-size: 0.85rem;
    font-weight: 400;
    line-height: 1;

    span:first-child {
      color: @red;
      transition: color 0.25s ease;
    }
  }
}

.collection-grid {
  --card-shelf-gutter: clamp(22px, 2.5vw, 42px);
  --grid-side-padding: clamp(42px, 6vw, 96px);

  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  column-gap: var(--card-shelf-gutter);
  row-gap: 0;
  min-height: 280px;
  padding: clamp(64px, 6vw, 88px) var(--grid-side-padding) 0;

  :deep(.collection-card-entry) {
    z-index: 4;
    animation: merch-card-entry 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)
      backwards;
    animation-delay: var(--card-entry-delay);
  }

  &__pegboard {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    background: radial-gradient(
          circle at center,
          #030305 0 2px,
          rgba(255, 255, 255, 0.035) 2.5px 3px,
          transparent 3.5px
        )
        0 0 / 24px 24px,
      linear-gradient(90deg, #24242b, #303038 50%, #24242b);
    box-shadow: inset 0 22px 38px rgba(0, 0, 0, 0.72);
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
    height: 90px;
    margin-right: calc(var(--grid-side-padding) * -1);
    margin-left: calc(var(--grid-side-padding) * -1);
    pointer-events: none;
    transform: translateY(var(--row-shelf-translate));

    &:not(:last-child) {
      margin-bottom: 24px;
    }
  }

  &__shelf,
  &__row-shelf {
    transform-origin: top center;
    animation: merch-shelf-entry 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)
      backwards;
    animation-delay: calc(var(--section-entry-delay) + 180ms);
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
    background: linear-gradient(to bottom, #34343b, #15151a 78%);
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
    background: #0d0d11;
    box-shadow: 0 12px 26px rgba(0, 0, 0, 0.66);
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
  .collection-grid :deep(.collection-card-entry),
  .island-collections-content.has-returned-from-detail {
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

@media (max-width: 1200px) and (min-width: 901px) {
  .collection-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .island-collections-content {
    padding-top: 88px;
  }

  .collection-index {
    padding-top: 38px;
  }

  .collection-grid {
    --card-shelf-gutter: 16px;
    --grid-side-padding: clamp(48px, 14vw, 64px);

    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--card-shelf-gutter);
    min-height: 220px;
    padding: 50px var(--grid-side-padding) 0;

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
      height: 72px;
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
    & + & {
      margin-top: 44px;
    }

    &__head {
      height: calc(19px + 0.6rem);
      padding: 8px 20px 9px;
    }
  }
}
</style>
