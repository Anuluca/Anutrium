<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'
import {
  addPageResizeListener,
  getPageScrollElement,
  getPageScrollTop,
} from '@/utils/pageScroll'

const catEarsImage = getCardThumbnailUrl(
  'https://assets.anuluca.com/other/cat_ear.png'
)
const catEarsMobileImage = getCardMobileThumbnailUrl(
  'https://assets.anuluca.com/other/cat_ear.png'
)
const catImage = getCardThumbnailUrl(
  'https://assets.anuluca.com/other/cat_full.png'
)
const catMobileImage = getCardMobileThumbnailUrl(
  'https://assets.anuluca.com/other/cat_full.png'
)

type InteractionState = 'idle' | 'hovering' | 'activating'

const props = withDefaults(
  defineProps<{
    entryActive?: boolean
  }>(),
  {
    entryActive: true,
  }
)
const ACTIVATION_DURATION = 650
const ACTIVATION_FALLBACK_BUFFER = 360
const PET_PAGE_URL = 'https://flora-vs-luca.anuluca.com'

const state = ref<InteractionState>('idle')
const isMobilePageEnd = ref(false)
const teaserElement = ref<HTMLElement | null>(null)
const animationStyle = computed(
  () =>
    ({
      '--pet-activation-duration': `${ACTIVATION_DURATION}ms`,
    } as Record<string, string>)
)

let activationFallbackTimer: number | null = null
let pageEndSentinel: HTMLElement | null = null
let pageEndObserver: IntersectionObserver | null = null
let isPageEndIntersecting = false
let removePageResizeListener: (() => void) | null = null
let hasNavigated = false

const clearActivationFallback = () => {
  if (activationFallbackTimer !== null) {
    window.clearTimeout(activationFallbackTimer)
    activationFallbackTimer = null
  }
}

const handleMouseEnter = () => {
  if (
    !props.entryActive ||
    isMobilePageEnd.value ||
    state.value === 'activating'
  ) {
    return
  }
  state.value = 'hovering'
}

const handleMouseLeave = () => {
  if (state.value === 'activating') return
  state.value = 'idle'
}

const navigateToPet = () => {
  if (hasNavigated) return
  hasNavigated = true
  clearActivationFallback()
  window.location.assign(PET_PAGE_URL)
}

const completeActivation = () => {
  navigateToPet()
}

const handleActivate = () => {
  if (
    !props.entryActive ||
    isMobilePageEnd.value ||
    state.value === 'activating' ||
    hasNavigated
  ) {
    return
  }

  state.value = 'activating'

  activationFallbackTimer = window.setTimeout(() => {
    completeActivation()
  }, ACTIVATION_DURATION + ACTIVATION_FALLBACK_BUFFER)
}

const handleCatAnimationEnd = (event: AnimationEvent) => {
  if (
    state.value === 'activating' &&
    event.animationName.includes('pet-cat-enter')
  ) {
    completeActivation()
  }
}

const updatePageEndState = () => {
  isMobilePageEnd.value =
    window.innerWidth <= window.innerHeight &&
    getPageScrollTop() > 0 &&
    isPageEndIntersecting
}

const handleViewportResize = () => {
  updatePageEndState()
}

const observePageEnd = () => {
  const routerContainer =
    document.querySelector<HTMLElement>('.router-container')
  if (!routerContainer) return

  pageEndSentinel = document.createElement('span')
  pageEndSentinel.className = 'pet-page-end-sentinel'
  pageEndSentinel.setAttribute('aria-hidden', 'true')
  Object.assign(pageEndSentinel.style, {
    position: 'absolute',
    right: '0',
    bottom: '0',
    width: '1px',
    height: '1px',
    pointerEvents: 'none',
  })
  routerContainer.appendChild(pageEndSentinel)
  pageEndObserver = new IntersectionObserver(
    ([entry]) => {
      isPageEndIntersecting = entry?.isIntersecting ?? false
      updatePageEndState()
    },
    {
      root: getPageScrollElement(),
      rootMargin: '0px 0px 80px 0px',
      threshold: 0,
    }
  )
  pageEndObserver.observe(pageEndSentinel)
}

watch(
  () => props.entryActive,
  (entryActive) => {
    if (!entryActive) state.value = 'idle'
  }
)

watch(isMobilePageEnd, (isPageEnd) => {
  if (!isPageEnd) return

  clearActivationFallback()
  state.value = 'idle'
})

onMounted(() => {
  removePageResizeListener = addPageResizeListener(handleViewportResize)
  observePageEnd()
  updatePageEndState()
})

onUnmounted(() => {
  clearActivationFallback()
  removePageResizeListener?.()
  removePageResizeListener = null
  pageEndObserver?.disconnect()
  pageEndSentinel?.remove()
})
</script>

<template>
  <button
    ref="teaserElement"
    type="button"
    class="pet-teaser"
    :class="[
      `pet-teaser--${state}`,
      {
        'pet-teaser--ready': props.entryActive,
        'pet-teaser--page-end': isMobilePageEnd,
      },
    ]"
    :style="animationStyle"
    aria-label="前往 Flora vs Luca"
    :aria-disabled="
      !props.entryActive || isMobilePageEnd || state === 'activating'
    "
    :tabindex="props.entryActive && !isMobilePageEnd ? 0 : -1"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleActivate"
  >
    <span class="pet-teaser__cat-stage" aria-hidden="true">
      <picture>
        <source media="(max-width: 768px)" :srcset="catMobileImage" />
        <img
          class="pet-teaser__cat"
          :src="catImage"
          alt=""
          draggable="false"
          width="231"
          height="264"
          loading="lazy"
          decoding="async"
          @animationend="handleCatAnimationEnd"
        />
      </picture>

      <span class="pet-teaser__ears-window">
        <picture>
          <source media="(max-width: 768px)" :srcset="catEarsMobileImage" />
          <img
            class="pet-teaser__ears"
            :src="catEarsImage"
            alt=""
            draggable="false"
            width="138"
            height="138"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </span>
    </span>

    <span class="pet-teaser__interaction-zone" aria-hidden="true" />
  </button>
</template>

<style scoped lang="less">
.pet-teaser {
  --pet-entry-opacity: 0.5;
  --pet-footer-offset: 36px;

  position: fixed;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + var(--pet-footer-offset, 0px));
  z-index: 135;
  width: var(--pet-teaser-size);
  aspect-ratio: 1.6 / 1;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--text-color);
  background: transparent;
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  isolation: isolate;
  transition: opacity 0.45s ease, transform 0.2s ease, bottom 0.5s ease,
    visibility 0s;
  -webkit-tap-highlight-color: transparent;

  &--ready {
    opacity: var(--pet-entry-opacity);

    .pet-teaser__interaction-zone {
      pointer-events: auto;
    }
  }

  &--hovering {
    opacity: 0.8;
  }

  &--activating {
    opacity: 0.8;
    transition: none;

    .pet-teaser__interaction-zone {
      pointer-events: none;
    }
  }

  &--page-end {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(8px);
    transition: opacity 0.2s ease, transform 0.2s ease,
      visibility 0s linear 0.2s;

    .pet-teaser__interaction-zone {
      pointer-events: none;
    }
  }

  &:focus-visible {
    outline: 1px solid @primary-color;
    outline-offset: 0.22em;
  }
}

.pet-teaser__cat,
.pet-teaser__ears {
  display: block;
  max-width: none;
  height: auto;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.pet-teaser__cat-stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;

  > picture {
    display: contents;
  }
}

.pet-teaser__cat {
  position: absolute;
  bottom: 0;
  right: 15%;
  z-index: 1;
  width: 50%;
  opacity: 0;
  visibility: hidden;
  filter: drop-shadow(0 0.45em 0.55em var(--shadow-color));
  transform: translate(95%, 90%) scale(0.7) rotate(40deg);
  transform-origin: 58% 82%;
}

.pet-teaser__ears-window {
  position: absolute;
  bottom: 0;
  right: 28%;
  z-index: 2;
  width: 30%;
  aspect-ratio: 1;
  overflow: hidden;
  opacity: 0.82;
  clip-path: inset(64% 0 0);
  filter: drop-shadow(0 0.28em 0.35em var(--shadow-color-soft));
  transform: translateY(0);
  transform-origin: center bottom;
  transition: clip-path 0.52s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.36s ease,
    transform 0.48s cubic-bezier(0.16, 1, 0.3, 1), filter 0.32s ease;

  picture {
    display: contents;
  }
}

.pet-teaser__ears {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: translateY(64%);
  transition: transform 0.52s cubic-bezier(0.16, 1, 0.3, 1);
}

.pet-teaser__interaction-zone {
  position: absolute;
  top: auto;
  right: 28%;
  bottom: 0;
  left: auto;
  z-index: 4;
  width: 30%;
  aspect-ratio: 1;
  pointer-events: none;
}

.pet-teaser--hovering {
  .pet-teaser__ears-window {
    opacity: 0.96;
    clip-path: inset(28% 0 0);
    filter: drop-shadow(0 0.36em 0.48em var(--shadow-color));
  }

  .pet-teaser__ears {
    transform: translateY(28%);
  }
}

.pet-teaser--activating {
  .pet-teaser__ears-window {
    animation: pet-ears-exit var(--pet-activation-duration) ease forwards;
  }

  .pet-teaser__cat {
    visibility: visible;
    animation: pet-cat-enter var(--pet-activation-duration)
      cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
}

@keyframes pet-ears-exit {
  to {
    opacity: 0;
    transform: translateY(0) scale(0.96);
  }
}

@keyframes pet-cat-enter {
  0% {
    opacity: 0;
    transform: translate(95%, 90%) scale(0.7) rotate(40deg);
  }

  100% {
    opacity: 1;
    transform: translate(2%, 0) scale(1) rotate(0);
  }
}

@media screen and (max-aspect-ratio: @ratio-threshold) {
  .pet-teaser {
    --pet-footer-offset: 44px;
  }

  .pet-teaser__interaction-zone {
    right: 28%;
    width: 34%;
  }

  .pet-teaser__cat {
    right: 15%;
    width: 60%;
  }

  .pet-teaser__ears-window {
    right: 28%;
    width: 34%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pet-teaser__ears {
    transition: none;
  }

  .pet-teaser--activating {
    .pet-teaser__ears-window {
      animation: pet-ears-exit 0.16s ease forwards;
    }

    .pet-teaser__cat {
      animation: pet-cat-enter-reduced 0.16s ease forwards;
    }
  }
}

@keyframes pet-cat-enter-reduced {
  from {
    opacity: 0;
    transform: translate(12%, 15%) scale(0.96) rotate(5deg);
  }

  to {
    opacity: 1;
    transform: translate(2%, 0) scale(1) rotate(0);
  }
}
</style>
