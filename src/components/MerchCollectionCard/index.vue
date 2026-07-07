<template>
  <button
    ref="cardElement"
    class="collection-card"
    :class="{ 'is-opening': isOpening }"
    :aria-busy="isOpening"
    type="button"
    @click="handleSelect"
  >
    <span class="collection-card__media">
      <img
        class="collection-card__cover collection-card__cover--primary"
        :style="coverStyle"
        :src="primaryCover"
        :alt="collection.title"
        loading="lazy"
        decoding="async"
      />
      <span class="collection-card__shade" />
      <span class="collection-card__scan" />
    </span>
    <span class="collection-card__count">
      {{ collection.photos.length }}
      <small>{{ countLabel }}</small>
    </span>
    <span class="collection-card__index">#{{ index }}</span>
    <span class="collection-card__copy">
      <strong>{{ collection.title }}</strong>
      <small>
        <template
          v-for="(subtitlePart, partIndex) in subtitleDisplayParts"
          :key="partIndex"
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
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

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
  index: string
}>()

const emit = defineEmits<{
  (event: 'select', collectionId: string): void
}>()

const isOpening = ref(false)
const cardElement = ref<HTMLButtonElement>()
const EXPAND_OVERSCAN = 1.08

const primaryCover = computed(
  () => props.collection.photos[0]?.url || props.collection.cover
)

const subtitleDisplayParts = computed(() =>
  props.collection.subtitle
    .split(/([｜|])/)
    .filter((part) => part.trim())
    .map((part) => ({
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
  const sourceCard = cardElement.value

  if (sourceCard) {
    const bounds = sourceCard.getBoundingClientRect()
    const transitionCard = sourceCard.cloneNode(true) as HTMLButtonElement
    const isMobileViewport = window.matchMedia('(max-width: 900px)').matches
    const scale = isMobileViewport
      ? (window.innerHeight * EXPAND_OVERSCAN) / bounds.height
      : (window.innerWidth * EXPAND_OVERSCAN) / bounds.width
    const translateX = window.innerWidth / 2 - (bounds.left + bounds.width / 2)
    const translateY = window.innerHeight / 2 - (bounds.top + bounds.height / 2)

    transitionCard.classList.remove('is-opening')
    transitionCard.classList.add('collection-card--expanding')
    transitionCard.removeAttribute('aria-busy')
    transitionCard.setAttribute('aria-hidden', 'true')
    transitionCard.tabIndex = -1
    Object.assign(transitionCard.style, {
      top: `${bounds.top}px`,
      left: `${bounds.left}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
    })
    transitionCard.querySelectorAll('img').forEach((image) => {
      image.setAttribute('loading', 'eager')
    })
    transitionCard.style.setProperty('--expand-x', `${translateX}px`)
    transitionCard.style.setProperty('--expand-y', `${translateY}px`)
    transitionCard.style.setProperty('--expand-scale', `${scale}`)
    document.body.appendChild(transitionCard)
    transitionCard.getBoundingClientRect()
    transitionCard.classList.add('is-expanded')

    setTimeout(() => transitionCard.remove(), 780)
  }

  emit('select', props.collection.id)
}
</script>

<style lang="less" scoped>
.collection-card {
  position: relative;
  display: block;
  min-width: 0;
  aspect-ratio: 3 / 4;
  padding: 0;
  overflow: visible;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  background: linear-gradient(145deg, #29272d, #101014 56%, #1d1015);
  text-align: left;
  cursor: pointer;
  box-shadow: 8px 15px 22px rgba(0, 0, 0, 0.5);
  transform: translateZ(12px);
  transform-origin: center bottom;
  transform-style: preserve-3d;
  opacity: 1;
  overflow: hidden;
  transition: box-shadow 0.52s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.52s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.52s cubic-bezier(0.22, 1, 0.36, 1);

  &::after {
    position: absolute;
    content: '';
    pointer-events: none;
  }

  &::after {
    top: -25px;
    right: -1px;
    left: -1px;
    height: 24px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: linear-gradient(to bottom, #4a434b, #272229 48%, #121216);
    clip-path: polygon(18px 0, calc(100% - 18px) 0, 100% 100%, 0 100%);
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.2);
    transition: top 0.52s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.52s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.42s ease,
      clip-path 0.52s cubic-bezier(0.22, 1, 0.36, 1);
  }

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
      box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.96),
        inset 0 -34px 28px -10px rgba(0, 0, 0, 0.98);
      transition: box-shadow 0.32s ease;
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
    filter: brightness(0.88);
    transform: scale(1);
    transition: filter 0.32s ease, opacity 0.14s ease,
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
    right: 8px;
    bottom: 57px;
    z-index: 6;
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 5px 8px 6px;
    border-radius: 1px;
    color: #fff;
    background: #e23456;
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 0.6rem;
    font-weight: 900;
    box-shadow: 4px 6px 12px rgba(0, 0, 0, 0.44);
    transform: rotate(-4deg);
    transform-origin: right bottom;

    small {
      font-family: inherit;
      font-size: 0.34rem;
    }
  }

  &__index {
    position: absolute;
    right: -1px;
    bottom: -1px;
    z-index: 6;
    color: rgba(255, 255, 255, 0.089);
    font-family: 'Anton', sans-serif;
    font-size: 1.5rem;
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
      font-size: 0.9rem;
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
      font-size: 0.46rem;
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
  .collection-card {
    &:hover {
      z-index: 4;
      box-shadow: 8px 15px 22px rgba(0, 0, 0, 0.5);
      transform: translateY(-10px) translateZ(12px) scale(1.025);

      .collection-card__cover {
        filter: brightness(1);
        transform: scale(1.045);
      }

      .collection-card__media::after {
        box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.72),
          inset 0 -32px 26px -10px rgba(0, 0, 0, 0.88);
      }
    }
  }
}

.collection-card.is-opening {
  z-index: 5;
  opacity: 0;
  pointer-events: none;
  transform: translateZ(12px);
}

.collection-card--expanding {
  position: fixed;
  z-index: 9999;
  margin: 0;
  pointer-events: none;
  transform: none;
  transform-origin: center;
  transition: transform 0.72s cubic-bezier(0.2, 0.82, 0.2, 1),
    box-shadow 0.72s cubic-bezier(0.2, 0.82, 0.2, 1), opacity 0.58s ease 0.08s;

  &.is-expanded {
    opacity: 0;
    box-shadow: none;

    .collection-card__cover {
      opacity: 0;
    }
  }

  &.is-expanded,
  &.is-expanded:hover {
    transform: translate(var(--expand-x), var(--expand-y))
      scale(var(--expand-scale));
  }

  &.is-expanded {
    &::after {
      top: 0;
      height: 0;
      opacity: 0;
      clip-path: polygon(50% 0, 50% 0, 100% 100%, 0 100%);
    }
  }
}

.collection-card.is-opening {
  &::after {
    top: -1px;
    height: 0;
    opacity: 0;
    clip-path: polygon(50% 0, 50% 0, 100% 100%, 0 100%);
  }
}

@media (max-width: 900px) {
  .collection-card {
    transform: none;

    &::after {
      top: -21px;
      right: -1px;
      left: -1px;
      height: 20px;
      clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 100%, 0 100%);
    }

    &__count {
      right: 7px;
      bottom: 53px;
      padding: 3px 5px 4px;
      font-size: 0.44rem;

      small {
        font-size: 0.3rem;
      }
    }

    &__index {
      right: 9px;
      bottom: 8px;
      font-size: 0.92rem;
    }

    &__copy {
      min-height: 62px;
      padding: 10px 48px 10px 10px;

      strong {
        font-size: 0.6rem;
      }

      small {
        margin-top: 3px;
        font-size: 0.38rem;
      }
    }

    &__media {
      bottom: 66px;
    }
  }
}
</style>
