<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const catEarsImage = 'https://assets.anuluca.com/other/cat_ear.png'
const catImage = 'https://assets.anuluca.com/other/cat_full.png'

type InteractionState = 'idle' | 'hovering' | 'activating'

const props = withDefaults(
  defineProps<{
    entryActive?: boolean
  }>(),
  {
    entryActive: true,
  }
)

const IDLE_MOTION_MIN_DELAY = 4_000
const IDLE_MOTION_DELAY_RANGE = 5_000
const ACTIVATION_DURATION = 650
const ACTIVATION_FALLBACK_BUFFER = 360

const router = useRouter()
const state = ref<InteractionState>('idle')
const isIdleMotion = ref(false)
const footerOffset = ref('0px')
const animationStyle = computed(
  () =>
    ({
      '--pet-activation-duration': `${ACTIVATION_DURATION}ms`,
      '--pet-footer-offset': footerOffset.value,
    } as Record<string, string>)
)

let idleMotionTimer: number | null = null
let activationFallbackTimer: number | null = null
let footerMeasureRaf: number | null = null
let footerElement: HTMLElement | null = null
let footerResizeObserver: ResizeObserver | null = null
let footerMutationObserver: MutationObserver | null = null
let reducedMotionQuery: MediaQueryList | null = null
let hasNavigated = false
let isTrackingFooterTransition = false

const clearIdleMotionTimer = () => {
  if (idleMotionTimer === null) return
  window.clearTimeout(idleMotionTimer)
  idleMotionTimer = null
}

const clearActivationFallback = () => {
  if (activationFallbackTimer !== null) {
    window.clearTimeout(activationFallbackTimer)
    activationFallbackTimer = null
  }
}

const scheduleIdleMotion = () => {
  clearIdleMotionTimer()
  if (
    !props.entryActive ||
    state.value !== 'idle' ||
    reducedMotionQuery?.matches ||
    document.visibilityState === 'hidden'
  ) {
    return
  }

  const delay = IDLE_MOTION_MIN_DELAY + Math.random() * IDLE_MOTION_DELAY_RANGE
  idleMotionTimer = window.setTimeout(() => {
    idleMotionTimer = null
    if (state.value !== 'idle') return
    isIdleMotion.value = true
  }, delay)
}

const handleMouseEnter = () => {
  if (!props.entryActive || state.value === 'activating') return
  clearIdleMotionTimer()
  isIdleMotion.value = false
  state.value = 'hovering'
}

const handleMouseLeave = () => {
  if (state.value === 'activating') return
  state.value = 'idle'
  scheduleIdleMotion()
}

const navigateToPet = async () => {
  if (hasNavigated) return
  hasNavigated = true
  clearActivationFallback()

  try {
    const failure = await router.push('/pet')
    if (!failure) return
  } catch {
    // Restore the entry when route loading fails so the user can retry.
  }

  hasNavigated = false
  state.value = 'idle'
  scheduleIdleMotion()
}

const handleActivate = () => {
  if (!props.entryActive || state.value === 'activating' || hasNavigated) return

  state.value = 'activating'
  isIdleMotion.value = false
  clearIdleMotionTimer()

  activationFallbackTimer = window.setTimeout(() => {
    void navigateToPet()
  }, ACTIVATION_DURATION + ACTIVATION_FALLBACK_BUFFER)
}

const handleCatAnimationEnd = (event: AnimationEvent) => {
  if (
    state.value === 'activating' &&
    event.animationName.includes('pet-cat-enter')
  ) {
    void navigateToPet()
  }
}

const handleWandAnimationEnd = (event: AnimationEvent) => {
  if (isIdleMotion.value && event.animationName.includes('pet-wand-idle')) {
    isIdleMotion.value = false
    scheduleIdleMotion()
  }
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    clearIdleMotionTimer()
    isIdleMotion.value = false
    return
  }
  scheduleIdleMotion()
}

const handleReducedMotionChange = () => {
  isIdleMotion.value = false
  scheduleIdleMotion()
}

const updateFooterOffset = () => {
  footerMeasureRaf = null
  if (
    !footerElement ||
    window.getComputedStyle(footerElement).display === 'none'
  ) {
    footerOffset.value = '0px'
  } else {
    const footerTop = footerElement.getBoundingClientRect().top
    footerOffset.value = `${Math.max(0, window.innerHeight - footerTop)}px`
  }

  if (isTrackingFooterTransition) scheduleFooterOffsetUpdate()
}

const scheduleFooterOffsetUpdate = () => {
  if (footerMeasureRaf !== null) return
  footerMeasureRaf = window.requestAnimationFrame(updateFooterOffset)
}

const isFooterBottomTransition = (event: TransitionEvent) =>
  event.target === footerElement && event.propertyName === 'bottom'

const handleFooterTransitionRun = (event: TransitionEvent) => {
  if (!isFooterBottomTransition(event)) return
  isTrackingFooterTransition = true
  scheduleFooterOffsetUpdate()
}

const handleFooterTransitionEnd = (event: TransitionEvent) => {
  if (!isFooterBottomTransition(event)) return
  isTrackingFooterTransition = false
  scheduleFooterOffsetUpdate()
}

const observeFooter = () => {
  footerElement = document.querySelector<HTMLElement>('.footer-com')
  if (!footerElement) return

  footerResizeObserver = new ResizeObserver(scheduleFooterOffsetUpdate)
  footerResizeObserver.observe(footerElement)
  footerMutationObserver = new MutationObserver(scheduleFooterOffsetUpdate)
  footerMutationObserver.observe(footerElement, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  })
  footerElement.addEventListener('transitionrun', handleFooterTransitionRun)
  footerElement.addEventListener('transitionend', handleFooterTransitionEnd)
  footerElement.addEventListener('transitioncancel', handleFooterTransitionEnd)
  scheduleFooterOffsetUpdate()
}

watch(
  () => props.entryActive,
  (entryActive) => {
    if (entryActive) {
      scheduleIdleMotion()
    } else {
      clearIdleMotionTimer()
      isIdleMotion.value = false
      state.value = 'idle'
    }
  }
)

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('resize', scheduleFooterOffsetUpdate, {
    passive: true,
  })
  observeFooter()
  scheduleIdleMotion()
})

onUnmounted(() => {
  clearIdleMotionTimer()
  clearActivationFallback()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('resize', scheduleFooterOffsetUpdate)
  footerElement?.removeEventListener('transitionrun', handleFooterTransitionRun)
  footerElement?.removeEventListener('transitionend', handleFooterTransitionEnd)
  footerElement?.removeEventListener(
    'transitioncancel',
    handleFooterTransitionEnd
  )
  footerResizeObserver?.disconnect()
  footerMutationObserver?.disconnect()
  if (footerMeasureRaf !== null) {
    window.cancelAnimationFrame(footerMeasureRaf)
  }
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
})
</script>

<template>
  <button
    type="button"
    class="pet-teaser"
    :class="[
      `pet-teaser--${state}`,
      {
        'pet-teaser--idle-motion': isIdleMotion,
        'pet-teaser--engaged': state !== 'idle',
        'pet-teaser--ready': props.entryActive,
      },
    ]"
    :style="animationStyle"
    aria-label="前往花花的宠物页面"
    :aria-disabled="!props.entryActive || state === 'activating'"
    :tabindex="props.entryActive ? 0 : -1"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleActivate"
  >
    <span class="pet-teaser__cat-stage" aria-hidden="true">
      <img
        class="pet-teaser__cat"
        :src="catImage"
        alt=""
        draggable="false"
        @animationend="handleCatAnimationEnd"
      />

      <span class="pet-teaser__ears-window">
        <img
          class="pet-teaser__ears"
          :src="catEarsImage"
          alt=""
          draggable="false"
        />
      </span>
    </span>

    <span
      class="pet-teaser__wand"
      aria-hidden="true"
      @animationend.self="handleWandAnimationEnd"
    >
      <svg
        class="wand-canvas"
        viewBox="0 0 240 100"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path class="wand-rod" d="M240 5 C213 6 178 26 150 48" />
        <svg
          class="wand-feather"
          x="88"
          y="45"
          width="62"
          height="55"
          viewBox="0 0 16 16"
          preserveAspectRatio="none"
        >
          <path
            fill-rule="nonzero"
            d="M16 .873C13.5 1.08 11.23 1.82 9.18 2.96l1.72.34-3.42.92 1.73.48-3.5 1.42 1.77.34-3.3 1.82 1.68.12-2.9 2.17 1.53-.08C2.76 12.1 1.3 13.9.18 15.86c2.35-.38 4.6-1.2 6.62-2.42l-.25-1.55 1.35.82 1.24-2.93.56 1.46 1.22-3.36.66 1.35 1.05-3.42.72 1.14c1.2-1.9 2.07-3.97 2.65-6.077Z"
          />
        </svg>
      </svg>
    </span>
    <span class="pet-teaser__interaction-zone" aria-hidden="true" />
  </button>
</template>

<style scoped lang="less">
.pet-teaser {
  --pet-entry-opacity: 0.5;
  --pet-wand-color: @primary-color;

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
  transition: opacity 0.45s ease;
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
  top: 3%;
  right: 0;
  bottom: 0;
  left: 35%;
  z-index: 4;
  pointer-events: none;
}

.pet-teaser__wand {
  position: absolute;
  top: 3%;
  right: 0;
  z-index: 3;
  width: 66.6667%;
  height: 36%;
  color: var(--pet-wand-color);
  filter: drop-shadow(0 0 0.38em rgba(226, 52, 86, 0.34));
  transform: rotate(0);
  transform-origin: 100% 12%;
  transition: filter 0.28s ease, transform 0.35s ease;

  > .wand-canvas {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  path {
    vector-effect: non-scaling-stroke;
  }

  .wand-rod {
    d: path('M240 5 C213 6 178 26 150 48');
    fill: none;
    stroke-linecap: round;
    stroke: currentColor;
    stroke-width: 2.2;
  }

  .wand-feather {
    overflow: visible;

    path {
      fill: currentColor;
      fill-rule: nonzero;
      stroke: none;
      transform-box: fill-box;
      transform-origin: 100% 0;
    }
  }
}

.pet-teaser--engaged {
  .pet-teaser__wand {
    animation: pet-wand-hover var(--pet-activation-duration) ease-in-out
      forwards;

    .wand-rod {
      animation: pet-rod-flex-hover var(--pet-activation-duration) ease-in-out
        forwards;
    }

    .wand-feather path {
      animation: pet-feather-hover calc(var(--pet-activation-duration) - 0.08s)
        ease-in-out 0.08s forwards;
    }
  }
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

  .pet-teaser__wand {
    filter: drop-shadow(0 0 0.48em rgba(226, 52, 86, 0.54));
  }
}

.pet-teaser--idle-motion {
  .pet-teaser__wand {
    animation: pet-wand-idle 0.82s ease-in-out;

    .wand-rod {
      animation: pet-rod-flex-idle 0.82s ease-in-out;
    }

    .wand-feather path {
      animation: pet-feather-idle 0.66s ease-in-out 0.08s;
    }
  }
}

.pet-teaser--activating {
  .pet-teaser__wand {
    filter: drop-shadow(0 0 0.56em rgba(226, 52, 86, 0.66));
  }

  .pet-teaser__ears-window {
    animation: pet-ears-exit var(--pet-activation-duration) ease forwards;
  }

  .pet-teaser__cat {
    visibility: visible;
    animation: pet-cat-enter var(--pet-activation-duration)
      cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
}

@keyframes pet-wand-idle {
  0%,
  100% {
    transform: rotate(0);
  }

  32% {
    transform: rotate(-1.1deg);
  }

  66% {
    transform: rotate(0.7deg);
  }
}

@keyframes pet-rod-flex-idle {
  0%,
  100% {
    d: path('M240 5 C213 6 178 26 150 48');
  }

  40% {
    d: path('M240 5 C213 6 178 29 150 48');
  }

  72% {
    d: path('M240 5 C213 6 178 24 150 48');
  }
}

@keyframes pet-feather-idle {
  0%,
  100% {
    transform: rotate(0);
  }

  45% {
    transform: rotate(3deg);
  }

  72% {
    transform: rotate(-1.8deg);
  }
}

@keyframes pet-wand-hover {
  0% {
    transform: rotate(0);
  }

  20% {
    transform: rotate(1.8deg);
  }

  42% {
    transform: rotate(-1.4deg);
  }

  64% {
    transform: rotate(0.9deg);
  }

  82% {
    transform: rotate(-0.5deg);
  }

  100% {
    transform: rotate(-0.2deg);
  }
}

@keyframes pet-rod-flex-hover {
  0%,
  100% {
    d: path('M240 5 C213 6 178 26 150 48');
  }

  24% {
    d: path('M240 5 C213 6 178 33 150 48');
  }

  48% {
    d: path('M240 5 C213 6 178 22 150 48');
  }

  72% {
    d: path('M240 5 C213 6 178 28 150 48');
  }
}

@keyframes pet-feather-hover {
  0%,
  100% {
    transform: rotate(0);
  }

  28% {
    transform: rotate(-5deg);
  }

  58% {
    transform: rotate(3.5deg);
  }

  82% {
    transform: rotate(-1.5deg);
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
  .pet-teaser__interaction-zone {
    left: 25%;
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

  .pet-teaser--idle-motion .pet-teaser__wand,
  .pet-teaser--idle-motion .wand-rod,
  .pet-teaser--idle-motion .wand-feather path,
  .pet-teaser--engaged .pet-teaser__wand,
  .pet-teaser--engaged .wand-rod,
  .pet-teaser--engaged .wand-feather path {
    animation: none;
  }

  .pet-teaser--hovering {
    .pet-teaser__wand {
      filter: drop-shadow(0 0 0.42em rgba(226, 52, 86, 0.44));
      transform: rotate(-1deg);
    }
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
