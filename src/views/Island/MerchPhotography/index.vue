<template>
  <div class="merch-page main-container">
    <DetailPageHeader
      back-label="ISLAND"
      back-path="/test"
      :counter="{
        value: String(collections.length).padStart(2, '0'),
        label: 'COLLECTIONS',
      }"
      :subtitle="t('island.merchPhotographyTagline')"
      :title="t('island.merchPhotographyTitle')"
    />

    <main class="collection-index">
      <section
        v-for="(group, groupIndex) in collectionGroups"
        :key="group.id"
        class="collection-section"
      >
        <header class="collection-section__head">
          <div class="collection-section__head-left">
            <span class="collection-section__number">
              {{ String(groupIndex + 1).padStart(2, '0') }}
            </span>
            <span class="collection-section__title">{{ group.title }}</span>
          </div>
          <strong class="collection-section__count">
            <span>{{ group.collections.length }}</span>
            <span>ITEMS</span>
          </strong>
        </header>

        <div
          class="collection-grid"
          :class="{ 'is-empty': !group.collections.length }"
        >
          <div class="collection-grid__pegboard" aria-hidden="true" />
          <template
            v-for="(collection, collectionIndex) in group.collections"
            :key="collection.id"
          >
            <MerchCollectionCard
              :collection="collection"
              :count-label="t('island.merchCollectionLabel')"
              :index="getCollectionIndex(collection.id)"
              @select="openCollection"
            />
            <div
              v-if="
                shouldRenderRowShelf(collectionIndex, group.collections.length)
              "
              class="collection-grid__row-shelf"
              :class="
                getRowShelfClasses(collectionIndex, group.collections.length)
              "
              aria-hidden="true"
            >
              <span class="collection-grid__row-shelf-surface" />
              <span class="collection-grid__row-shelf-base" />
            </div>
          </template>
          <div v-if="!group.collections.length" class="collection-shelf-empty">
            <span>EMPTY DISPLAY</span>
          </div>
          <div
            v-if="!group.collections.length"
            class="collection-grid__shelf"
            aria-hidden="true"
          >
            <span class="collection-grid__shelf-surface" />
            <span class="collection-grid__shelf-base" />
          </div>
        </div>
      </section>
    </main>

    <PageFooter cn-title="周边摄影" en-title="MERCH PHOTOGRAPHY" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import MerchCollectionCard, {
  type MerchCollectionCardData,
} from '@/components/MerchCollectionCard/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

interface MerchCollection extends MerchCollectionCardData {
  category?: 'pokemon' | 'tokusatsu' | 'other'
}

const { locale, t, tm } = useI18n()
const router = useRouter()
const collections = computed<MerchCollection[]>(() => {
  return tm('island.dynamic.merchPhotographyCollections') as MerchCollection[]
})

const collectionGroups = computed(() => [
  {
    id: 'pokemon',
    title: locale.value === 'en' ? 'POKÉMON' : '宝可梦',
    collections: collections.value.filter(
      (collection) => collection.category === 'pokemon'
    ),
  },
  {
    id: 'tokusatsu',
    title: locale.value === 'en' ? 'TOKUSATSU' : '特摄',
    collections: collections.value.filter(
      (collection) => collection.category === 'tokusatsu'
    ),
  },
  {
    id: 'other',
    title: locale.value === 'en' ? 'OTHER' : '其他',
    collections: collections.value.filter(
      (collection) => !collection.category || collection.category === 'other'
    ),
  },
])

const getCollectionIndex = (collectionId: string) =>
  String(
    collections.value.findIndex(
      (collection) => collection.id === collectionId
    ) + 1
  ).padStart(2, '0')

const isRowEnd = (
  collectionIndex: number,
  collectionCount: number,
  columnCount: number
) =>
  (collectionIndex + 1) % columnCount === 0 ||
  collectionIndex === collectionCount - 1

const getRowShelfClasses = (
  collectionIndex: number,
  collectionCount: number
) => ({
  'is-desktop': isRowEnd(collectionIndex, collectionCount, 5),
  'is-tablet': isRowEnd(collectionIndex, collectionCount, 3),
  'is-mobile': isRowEnd(collectionIndex, collectionCount, 2),
})

const shouldRenderRowShelf = (
  collectionIndex: number,
  collectionCount: number
) =>
  [5, 3, 2].some((columnCount) =>
    isRowEnd(collectionIndex, collectionCount, columnCount)
  )

const openCollection = (collectionId: string) => {
  router.push(`/island/merch-photography/${collectionId}`)
}
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'cn-custom', 'Courier New', monospace;
@cjk: 'alibaba-puhuiti', sans-serif;

.merch-page {
  color: var(--text-color);
  overflow: hidden;
}

.collection-index {
  padding: 54px 0 48px;
}

.collection-section {
  position: relative;
  padding: 0;
  perspective: 1200px;
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
  transform-style: preserve-3d;

  :deep(.collection-card) {
    z-index: 2;
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
    box-shadow: inset 0 22px 38px rgba(0, 0, 0, 0.72),
      inset 24px 0 42px rgba(0, 0, 0, 0.5),
      inset -24px 0 42px rgba(0, 0, 0, 0.5);

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
    height: 90px;
    margin-right: calc(0px - var(--grid-side-padding));
    margin-left: calc(0px - var(--grid-side-padding));
    pointer-events: none;

    &.is-desktop {
      display: block;
    }
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
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.2),
      0 -7px 16px rgba(0, 0, 0, 0.35);
    clip-path: polygon(2.8% 0, 97.2% 0, 100% 100%, 0 100%);
  }

  &__shelf-surface {
    bottom: 34px;
  }

  &__row-shelf-surface {
    top: -6px;
  }

  &__shelf-base,
  &__row-shelf-base {
    right: 0;
    left: 0;
    height: 34px;
    z-index: 2;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    background: linear-gradient(to bottom, #222228, #0d0d11 55%, #050507);
    box-shadow: 0 12px 26px rgba(0, 0, 0, 0.66),
      inset 0 1px rgba(255, 255, 255, 0.08);

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
  .merch-page {
    padding-top: 88px;
  }

  .collection-index {
    padding-top: 38px;
  }

  .collection-grid {
    --card-shelf-gutter: 16px;
    --grid-side-padding: 40px;

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
