<template>
  <div
    ref="cardElement"
    class="collection-card-entry"
    :class="{ 'is-opening': expanded && !returning }"
  >
    <Teleport
      :to="expandedTarget || 'body'"
      :disabled="!expanded || !expandedTarget || returning"
    >
      <div
        class="collection-card-shell"
        :class="{
          'is-expanded': expanded,
          'is-closing': closing,
          'is-returning': returning,
        }"
      >
        <component
          :is="expanded ? 'div' : 'button'"
          class="collection-card"
          :aria-expanded="expanded"
          aria-haspopup="dialog"
          type="button"
          @click="handleSelect"
        >
          <span class="collection-card__media">
            <picture class="collection-card__screen-cover" :style="coverStyle">
              <img
                class="collection-card__cover collection-card__cover--primary"
                :style="coverStyle"
                :src="primaryCover"
                :alt="collection.title"
                loading="lazy"
                decoding="async"
                width="768"
                height="576"
              />
            </picture>
            <span class="collection-card__shade" />
            <span class="collection-card__scan" />
            <div
              v-if="expanded"
              class="collection-card__gallery"
              data-lenis-nested-scroll
            >
              <slot name="gallery" />
            </div>
          </span>
          <span class="collection-card__copy">
            <strong>{{ collection.title }}</strong>
            <small>
              <template
                v-for="subtitlePart in subtitleDisplayParts"
                :key="subtitlePart.id"
              >
                <span
                  v-if="subtitlePart.isSeparator"
                  class="collection-card__copy-separator"
                >
                  ｜
                </span>
                <span v-else>{{ subtitlePart.text }}</span>
              </template>
            </small>
            <span class="collection-card__count">
              <span>{{
                String(collection.photos.length).padStart(2, '0')
              }}</span>
              <small class="collection-card__unit">{{ countLabel }}</small>
            </span>
          </span>
        </component>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { getCardThumbnailUrl } from '@/utils/imageVariant'

export interface MerchCollectionCardData {
  id: string
  title: string
  subtitle: string
  cover: string
  coverOffsetX?: string | number
  coverOffsetY?: string | number
  photos: Array<{
    url: string
    title?: string
  }>
}

const props = defineProps<{
  collection: MerchCollectionCardData
  countLabel: string
  expanded?: boolean
  expandedTarget?: HTMLElement | null
  closing?: boolean
  returning?: boolean
}>()

const emit = defineEmits<{
  (event: 'select', collectionId: string, element: HTMLElement): void
}>()

const cardElement = ref<HTMLElement>()
const primaryCover = computed(() =>
  getCardThumbnailUrl(props.collection.photos[0]?.url || props.collection.cover)
)

const subtitleDisplayParts = computed(() =>
  props.collection.subtitle
    .split(/([｜|])/)
    .filter((part) => part.trim())
    .map((part, index) => ({
      id: `${part}-${index}`,
      isSeparator: part === '｜' || part === '|',
      text: part.trim(),
    }))
)

const formatCoverOffset = (value: string | number | undefined) => {
  if (value === undefined) return '0%'
  if (typeof value === 'number') return `${value}%`

  return value
}

const coverStyle = computed(() => ({
  '--cover-position-x': `calc(50% - ${formatCoverOffset(
    props.collection.coverOffsetX
  )})`,
  '--cover-position-y': `calc(42% - ${formatCoverOffset(
    props.collection.coverOffsetY
  )})`,
}))

const handleSelect = () => {
  if (!props.expanded && cardElement.value)
    emit('select', props.collection.id, cardElement.value)
}
</script>

<style lang="less" scoped>
.collection-card-entry {
  position: relative;
  display: block;
  min-width: 0;
  aspect-ratio: 3 / 4;
}

.collection-card-shell {
  --box-top-offset: -25px;
  --box-top-height: 24px;

  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: visible;
  box-shadow: 8px 15px 22px rgba(0, 0, 0, 0.5);
  transform-origin: center bottom;
  opacity: 1;
  transition: opacity 0.52s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.52s cubic-bezier(0.22, 1, 0.36, 1);

  &::after {
    position: absolute;
    content: '';
    pointer-events: none;
  }

  &::after {
    top: var(--box-top-offset);
    right: -1px;
    left: -1px;
    height: var(--box-top-height);
    border: 1px solid #37373c;
    background: linear-gradient(to bottom, #34343a, #222228 52%, #101014);
    clip-path: polygon(18px 0, calc(100% - 18px) 0, 100% 100%, 0 100%);
    box-shadow: inset 0 1px #4a4a50;
    transition: top 0.52s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.52s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.42s ease,
      clip-path 0.52s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

.collection-card {
  --copy-text-height: calc(0.72rem * 1.2 + 0.4rem * 1.3 + 5px);
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid #444448;
  color: #fff;
  background: linear-gradient(145deg, #29272d, #101014 56%, #1d1015);
  text-align: left;
  cursor: pointer;

  border: 1px solid rgb(77, 77, 77);

  &__media {
    position: absolute;
    top: 7px;
    right: 7px;
    bottom: 74px;
    left: 7px;
    z-index: 1;
    overflow: hidden;
    background: #08080a;

    &::after {
      position: absolute;
      inset: 0;
      z-index: 5;
      content: '';
      pointer-events: none;
      background: radial-gradient(
        ellipse at center,
        transparent 45%,
        rgba(0, 0, 0, 0.65) 100%
      );
      box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.96);
      opacity: 1;
      transition: opacity 0.3s ease;
    }
  }

  &__cover {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: var(--cover-position-x, 50%) var(--cover-position-y, 0%);
    transform: scale(1);
    transform-origin: center center;
    transition: opacity 0.14s ease,
      transform 0.48s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &__shade {
    position: absolute;
    inset: 0;
    z-index: 3;
    opacity: 1;
    transition: opacity 0.3s ease;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.02) 58%,
      rgba(0, 0, 0, 0.42) 84%,
      rgba(0, 0, 0, 0.78) 100%
    );
  }

  &__scan {
    position: absolute;
    inset: 0;
    z-index: 4;
    opacity: 0.08;
    transition: opacity 0.3s ease;
    background: repeating-linear-gradient(
      0deg,
      transparent 0 4px,
      rgba(255, 255, 255, 0.12) 4px 5px
    );
  }

  &__count {
    position: absolute;
    right: 0;
    top: calc(50% - 2px);
    transform: translateY(-50%);
    z-index: 6;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: flex-end;
    height: var(--copy-text-height);
    box-sizing: border-box;
    gap: 1px;
    padding: 0 8px;
    color: #e23456;
    font-family: 'UnboundedSans', 'Courier New', monospace;
    font-size: calc((var(--copy-text-height) - 1px) * 0.66);
    font-weight: 900;
    line-height: 1;

    small.collection-card__unit {
      display: block;
      margin: 0;
      color: rgba(255, 255, 255, 0.46);
      font-family: inherit;
      font-size: calc((var(--copy-text-height) - 1px) * 0.33);
      line-height: 1;
    }
  }

  &__index {
    position: absolute;
    right: -3px;
    bottom: -5px;
    z-index: 4;
    color: rgba(255, 255, 255, 0.2);
    font-family: 'Anton', sans-serif;
    font-size: 3rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    line-height: 1;
  }

  &__copy {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 5;
    display: flex;
    min-height: 68px;
    padding: 12px 58px 13px 14px;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    border-top: 1px solid rgba(226, 52, 86, 0.46);
    background: linear-gradient(110deg, #211c22, #0d0d11 64%, #251018);

    strong {
      display: block;
      overflow: hidden;
      font-family: 'alibaba-puhuiti', sans-serif;
      color: #fff;
      font-size: 0.72rem;
      line-height: 1.2;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      display: block;
      margin-top: 5px;
      overflow: hidden;
      color: rgba(255, 255, 255, 0.46);
      font-family: 'alibaba-puhuiti', sans-serif;
      font-size: 0.4rem;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &-separator {
      margin-right: -2px;
    }
  }

  &:focus-visible {
    border-color: rgba(226, 52, 86, 0.86);
    outline: 2px solid rgba(226, 52, 86, 0.46);
    outline-offset: 4px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .collection-card-shell:not(.is-expanded):hover {
    z-index: 4;
    transform: translateY(-10px);

    .collection-card__media::after {
      opacity: 0.45;
    }
  }
}

.collection-card-entry.is-opening {
  z-index: 5;
  visibility: hidden;
  pointer-events: none;
}

.collection-card-shell.is-expanded {
  .collection-card {
    cursor: default;
  }
  .collection-card__screen-cover {
    position: absolute;
    inset: 0;
    display: block;
    z-index: 2;
    pointer-events: none;
    animation: anutriumCrtOff 180ms cubic-bezier(0.2, 1, 0.22, 1) both;
  }
  .collection-card__gallery {
    position: absolute;
    inset: 0;
    z-index: 6;
    overflow: auto;
    overscroll-behavior: contain;
    background: #08080a;
    padding: clamp(24px, 4vw, 64px);
    box-sizing: border-box;
    animation: anutriumCrtOn 220ms cubic-bezier(0.19, 1, 0.22, 1) 80ms backwards;
  }
  .collection-card__media::after,
  .collection-card__shade,
  .collection-card__scan {
    opacity: 0;
  }
  &.is-closing {
    .collection-card__media::after,
    .collection-card__shade {
      opacity: 1;
      transition: opacity 360ms ease 280ms;
    }
    .collection-card__scan {
      opacity: 0.08;
      transition: opacity 360ms ease 280ms;
    }
    .collection-card__gallery {
      animation: anutriumCrtOff 420ms cubic-bezier(0.2, 1, 0.22, 1) both;
    }
    .collection-card__screen-cover {
      animation: anutriumCrtOn 420ms cubic-bezier(0.19, 1, 0.22, 1) both;
    }
  }
  // 跨层移动 DOM 前固定关屏/开屏的终态，避免重新挂入页面时重播 CSS 动画。
  &.is-returning {
    .collection-card__screen-cover {
      animation: none;
      opacity: 1;
      transform: none;
      filter: none;
    }
    .collection-card__gallery {
      animation: none;
      opacity: 0;
      pointer-events: none;
    }
    .collection-card__media::after,
    .collection-card__shade,
    .collection-card__scan {
      transition: none;
    }
  }
}
@media (prefers-reduced-motion: reduce) {
  .collection-card-shell.is-expanded {
    .collection-card__screen-cover {
      display: none;
    }
    .collection-card__gallery {
      animation: none;
    }
  }
}

@media (max-width: 900px) {
  .collection-card-shell {
    --box-top-offset: -21px;
    --box-top-height: 20px;

    transform: none;

    &::after {
      right: -1px;
      left: -1px;
      clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 100%, 0 100%);
    }
  }

  .collection-card {
    --copy-text-height: calc(0.54rem * 1.2 + 0.34rem * 1.3 + 3px);
    &__count {
      padding: 0 5px;
    }

    &__index {
      font-size: 1.84rem;
    }

    &__copy {
      min-height: 62px;
      padding: 10px 48px 10px 10px;

      strong {
        font-size: 0.54rem;
      }

      small {
        margin-top: 3px;
        font-size: 0.34rem;
      }
    }

    &__media {
      bottom: 66px;
    }
  }
}
</style>
