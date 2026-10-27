<template>
  <span
    ref="cardElement"
    class="collection-card-entry"
    :class="{ 'is-opening': isOpening }"
  >
    <span class="collection-card-shell">
      <button
        class="collection-card"
        :aria-busy="isOpening"
        type="button"
        @click="handleSelect"
      >
        <span class="collection-card__media">
          <picture>
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
            <span>{{ String(collection.photos.length).padStart(2, '0') }}</span>
            <small class="collection-card__unit">{{ countLabel }}</small>
          </span>
        </span>
      </button>
    </span>
  </span>
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
}>()

const emit = defineEmits<{
  (event: 'select', collectionId: string): void
}>()

const isOpening = ref(false)
const cardElement = ref<HTMLElement>()
const EXPAND_OVERSCAN = 1.08
const EXPAND_ANIMATION_DURATION = 1440

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
  if (isOpening.value) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('select', props.collection.id)
    return
  }

  isOpening.value = true
  const sourceImage = cardElement.value?.querySelector('img')

  if (sourceImage) {
    // 只复制已加载的封面；在插入前读取几何，避免复制整卡及插入后强制布局。
    const bounds = sourceImage.getBoundingClientRect()
    const objectPosition = window.getComputedStyle(sourceImage).objectPosition
    const transitionImage = sourceImage.cloneNode(false) as HTMLImageElement
    const isMobileViewport = window.matchMedia('(max-width: 900px)').matches
    const scale = isMobileViewport
      ? (window.innerHeight * EXPAND_OVERSCAN) / bounds.height
      : (window.innerWidth * EXPAND_OVERSCAN) / bounds.width
    const translateX = window.innerWidth / 2 - (bounds.left + bounds.width / 2)
    const translateY = window.innerHeight / 2 - (bounds.top + bounds.height / 2)

    transitionImage.className =
      'collection-card-transition collection-card--expanding'
    transitionImage.alt = ''
    transitionImage.setAttribute('aria-hidden', 'true')
    transitionImage.loading = 'eager'
    Object.assign(transitionImage.style, {
      top: `${bounds.top}px`,
      left: `${bounds.left}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      objectPosition,
    })
    document.body.appendChild(transitionImage)
    const animation = transitionImage.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        {
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          opacity: 0,
        },
      ],
      {
        duration: EXPAND_ANIMATION_DURATION,
        easing: 'cubic-bezier(0.2, 0.82, 0.2, 1)',
      }
    )
    const removeTransitionImage = () => transitionImage.remove()
    animation.finished.then(removeTransitionImage, removeTransitionImage)
  }

  emit('select', props.collection.id)
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
  .collection-card-shell:hover {
    z-index: 4;
    transform: translateY(-10px);

    .collection-card__media::after {
      opacity: 0.45;
    }
  }
}

.collection-card-entry.is-opening {
  z-index: 5;
  opacity: 0;
  pointer-events: none;
}

.collection-card-transition {
  position: fixed;
  z-index: 9999;
  display: block;
  max-width: none;
  margin: 0;
  pointer-events: none;
  object-fit: cover;
  transform-origin: center;
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
