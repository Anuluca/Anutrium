<template>
  <div class="island-collections-content is-embedded">
    <main class="collection-index">
      <section
        v-for="(group, groupIndex) in collectionGroups"
        :key="group.id"
        class="collection-section"
        :style="getSectionEntryStyle(groupIndex)"
      >
        <header class="collection-section__head">
          <div class="collection-section__head-left">
            <span class="collection-section__number">
              {{ String(groupIndex + 1).padStart(2, '0') }}
            </span>
            <span class="collection-section__title">{{ group.title }}</span>
          </div>
          <strong class="collection-section__count">
            <span>{{ group.totalCount }}</span>
            <span>ITEMS</span>
          </strong>
        </header>

        <div class="collection-grid" :class="{ 'is-empty': !group.totalCount }">
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
              :index="getCollectionIndex(collection.id)"
              :style="getCollectionEntryStyle(collectionIndex)"
              @select="openCollection"
            />
            <div
              v-if="
                shouldRenderRowShelf(collectionIndex, group.collections.length)
              "
              class="collection-grid__row-shelf is-desktop is-tablet is-mobile"
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
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const { locale, t, tm } = useI18n()
const router = useRouter()
const TARGET_SHELF_DISTANCE_ROW_INDEX = 2
const SHELF_DISTANCE_ROW_STEP = 2.82

const merch = computed<MerchGroups>(() => {
  return tm('island.modules.photography.merch.data') as MerchGroups
})

const collections = computed<MerchCollectionCardData[]>(() =>
  Object.values(merch.value).flat()
)

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

const getCollectionIndex = (collectionId: string) =>
  String(
    collections.value.findIndex(
      (collection) => collection.id === collectionId
    ) + 1
  ).padStart(2, '0')

const getCollectionElementId = (collectionId: string) =>
  `merch-collection-${collectionId}`

const shouldRenderRowShelf = (
  collectionIndex: number,
  collectionCount: number
) => (collectionIndex + 1) % 2 === 0 || collectionIndex === collectionCount - 1

const getRowShelfStyle = (collectionIndex: number) => {
  const rowIndex = Math.floor(collectionIndex / 2)
  const offset = `${
    (rowIndex - TARGET_SHELF_DISTANCE_ROW_INDEX) * SHELF_DISTANCE_ROW_STEP
  }px`
  return {
    '--row-shelf-translate-desktop': offset,
    '--row-shelf-translate-tablet': offset,
    '--row-shelf-translate-mobile': offset,
  }
}

const getSectionEntryStyle = (groupIndex: number) => ({
  '--section-entry-delay': `${groupIndex * 240}ms`,
})

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
  overflow: hidden;
  &.is-embedded {
    padding: 0;
    .collection-index {
      padding: 0 0 24px;
    }
    .collection-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .collection-section + .collection-section {
      margin-top: 32px;
    }
  }
}

@container (max-width: 360px) {
  .island-collections-content.is-embedded {
    .collection-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .collection-grid__row-shelf {
      display: none;
    }
  }
}

.collection-index {
  padding: 54px 0 48px;
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
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: clamp(24px, 4vw, 58px);
    width: max-content;
    min-width: clamp(230px, 27vw, 360px);
    margin: 0 auto -13px;
    padding: 10px 30px 11px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-bottom-color: rgba(226, 52, 86, 0.38);
    border-radius: 2px;
    background: #18181e;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.46);
    animation: merch-sign-entry 0.72s cubic-bezier(0.18, 0.78, 0.22, 1)
      backwards;
    animation-delay: calc(var(--section-entry-delay) + 360ms);
  }

  &__head-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__number {
    color: rgba(226, 52, 86, 0.72);
    font-family: 'Anton', @mono;
    font-size: 0.72rem;
    font-weight: 900;
    line-height: 1;
  }

  &__title {
    color: #fff;
    font-family: @cjk;
    font-size: 0.76rem;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  &__count {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding-left: 16px;
    border-left: 1px solid rgba(226, 52, 86, 0.36);
    color: rgba(255, 255, 255, 0.48);
    font-family: @mono;
    font-size: 0.5rem;
    font-weight: 700;

    span:first-child {
      color: @red;
      font-family: 'Anton', @mono;
      font-size: 0.76rem;
      line-height: 1;
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
    inset: 0 2.8%;
    z-index: 0;
    overflow: hidden;
    background: radial-gradient(
          circle at center,
          #030305 0 2px,
          rgba(255, 255, 255, 0.035) 2.5px 3px,
          transparent 3.5px
        )
        0 0 / 24px 24px,
      linear-gradient(90deg, #111116, #1a1a20 50%, #111116);
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
          90deg,
          rgba(226, 52, 86, 0.08),
          transparent 14% 86%,
          rgba(226, 52, 86, 0.08)
        ),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.04), transparent 24%);
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
    display: none;
    grid-column: 1 / -1;
    --row-shelf-translate: var(--row-shelf-translate-desktop, 0px);
    height: 90px;
    margin-right: calc(var(--grid-side-padding) * -1);
    margin-left: calc(var(--grid-side-padding) * -1);
    pointer-events: none;
    transform: translateY(var(--row-shelf-translate));

    &.is-desktop {
      display: block;
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
    clip-path: polygon(2.8% 0, 97.2% 0, 100% 100%, 0 100%);
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
    right: 0;
    left: 0;
    height: 34px;
    z-index: 2;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    background: linear-gradient(to bottom, #222228, #0d0d11 55%, #050507);
    box-shadow: 0 12px 26px rgba(0, 0, 0, 0.66);

    &::after {
      position: absolute;
      top: 0;
      right: 5%;
      left: 5%;
      height: 1px;
      content: '';
      background: linear-gradient(
        90deg,
        transparent,
        rgba(226, 52, 86, 0.68) 10%,
        rgba(255, 255, 255, 0.2) 50%,
        rgba(226, 52, 86, 0.68) 90%,
        transparent
      );
      box-shadow: 0 0 11px rgba(226, 52, 86, 0.26);
    }
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

    &__row-shelf {
      --row-shelf-translate: var(--row-shelf-translate-tablet, 0px);

      &.is-desktop {
        display: none;
      }

      &.is-tablet {
        display: block;
      }
    }
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
      --row-shelf-translate: var(--row-shelf-translate-mobile, 0px);
      height: 72px;

      &.is-desktop,
      &.is-tablet {
        display: none;
      }

      &.is-mobile {
        display: block;
      }
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
      gap: 18px;
      min-width: min(250px, calc(100% - 48px));
      margin-bottom: -10px;
      padding: 8px 25px 9px;
    }
  }
}
</style>
