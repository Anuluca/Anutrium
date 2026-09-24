<script lang="ts" setup>
import {
  computed,
  type CSSProperties,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'

import ParticlesBg from '@/components/ParticlesBg/index.vue'
import { addPageResizeListener } from '@/utils/pageScroll'

type ZodiacSignId =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces'

type ZodiacLayout = 'hero' | 'content'

interface Props {
  theme?: 'light' | 'dark'
  isTextMenu?: boolean
  deepBlack?: boolean
  activeSign?: ZodiacSignId
  layout?: ZodiacLayout
  particlesVisible?: boolean
  topInset?: number
  entryActive?: boolean
}

interface ZodiacSign {
  id: ZodiacSignId
  glyph: string
  positionStyle: CSSProperties
  faceStyle: { transform: string }
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'dark',
  isTextMenu: false,
  deepBlack: false,
  activeSign: 'leo',
  layout: 'hero',
  particlesVisible: true,
  topInset: 0,
  entryActive: true,
})
const STATIC_CHART_SRC = '/images/zodiac-chart-static.svg?v=20260924-1'

const polarPercent = (radius: number, angle: number): CSSProperties => {
  const radians = (angle * Math.PI) / 180
  return {
    left: `${50 + Math.cos(radians) * radius}%`,
    top: `${50 + Math.sin(radians) * radius}%`,
  }
}

const zodiacSource = [
  ['aries', '♈︎'],
  ['taurus', '♉︎'],
  ['gemini', '♊︎'],
  ['cancer', '♋︎'],
  ['leo', '♌︎'],
  ['virgo', '♍︎'],
  ['libra', '♎︎'],
  ['scorpio', '♏︎'],
  ['sagittarius', '♐︎'],
  ['capricorn', '♑︎'],
  ['aquarius', '♒︎'],
  ['pisces', '♓︎'],
] as const

const zodiacSigns: ZodiacSign[] = zodiacSource.map(([id, glyph], index) => {
  const centerAngle = -105 - index * 30
  return {
    id,
    glyph,
    positionStyle: polarPercent(40, centerAngle),
    faceStyle: { transform: `rotate(${centerAngle + 90}deg)` },
  }
})

const sectorStyles = Array.from({ length: 12 }, (_, index) => ({
  transform: `translateX(-50%) rotate(${index * 30}deg)`,
}))
const zodiacRotationById = new Map<ZodiacSignId, number>(
  zodiacSigns.map((sign, index) => [sign.id, 15 + index * 30])
)
const getCanonicalRotation = (signId: ZodiacSignId) =>
  zodiacRotationById.get(signId) ?? 15

const routeRotation = ref(getCanonicalRotation(props.activeSign))
const heroScale = ref(1)
const isMobileViewport = ref(false)
const isChartTransitioning = ref(false)
const isRouteTransitioning = ref(false)
const isParticleFieldMounted = ref(props.particlesVisible)
const isParticleFieldVisible = ref(props.particlesVisible)
const backdropOverlayElement = ref<HTMLElement | null>(null)
const backdropBaseColor = ref('')
const backdropOverlayColor = ref('')
const activeChartTransitions = new Set<string>()
let resizeRafId: number | null = null
let particleRevealRafId: number | null = null
let particleRevealSecondRafId: number | null = null
let particleRemovalTimer: number | null = null
let backdropUpdateRafId: number | null = null
let backdropAnimation: Animation | null = null
let backdropStyleObserver: MutationObserver | null = null
let backdropTransitionRevision = 0
let backdropTargetColor = ''
const isReducedMotion = ref(false)
let reducedMotionQuery: MediaQueryList | null = null
let removePageResizeListener: (() => void) | null = null
const PARTICLE_VISIBILITY_DURATION = 520
const BACKDROP_COLOR_TRANSITION_DURATION = 3000

const handleReducedMotionChange = (event: MediaQueryListEvent) => {
  isReducedMotion.value = event.matches
  if (event.matches && backdropTargetColor) {
    setBackdropColorImmediately(backdropTargetColor)
  }
}

watch(
  () => props.activeSign,
  (signId, previousSignId) => {
    if (signId === previousSignId) return

    isRouteTransitioning.value = !isReducedMotion.value

    const target = getCanonicalRotation(signId)
    const delta = ((((target - routeRotation.value) % 360) + 540) % 360) - 180
    routeRotation.value += delta
  }
)

const stageStyle = computed(() => ({
  '--hero-scale': heroScale.value,
  '--route-rotation': `${routeRotation.value}deg`,
}))
const containerStyle = computed(() => ({
  '--background-top-inset': `${Math.max(0, props.topInset)}px`,
}))
const PARTICLE_COLOR = '#ffffff'
const particleQuantity = computed(() => (isMobileViewport.value ? 25 : 100))

const getBackdropTargetColor = () => {
  if (props.deepBlack) return '#030303'

  const rootStyle = window.getComputedStyle(document.documentElement)
  const backgroundVariable =
    props.theme === 'light'
      ? '--page-theme-background-light'
      : '--page-theme-background-dark'
  const explicitBackground = rootStyle
    .getPropertyValue(backgroundVariable)
    .trim()

  if (explicitBackground) return explicitBackground

  const themeColor =
    rootStyle.getPropertyValue('--page-theme-color').trim() || '#e23456'
  return `color-mix(in srgb, color-mix(in srgb, ${themeColor} 45%, #000) 50%, #0a0411)`
}

const cancelBackdropAnimation = () => {
  backdropTransitionRevision += 1
  backdropAnimation?.cancel()
  backdropAnimation = null
}

const setBackdropColorImmediately = (color: string) => {
  cancelBackdropAnimation()
  backdropTargetColor = color
  backdropBaseColor.value = color
  backdropOverlayColor.value = color
}

const getCurrentBackdropColor = () => {
  if (!backdropAnimation || !backdropOverlayElement.value) {
    return backdropBaseColor.value
  }

  const opacity = Number.parseFloat(
    window.getComputedStyle(backdropOverlayElement.value).opacity
  )
  if (!Number.isFinite(opacity) || opacity <= 0) return backdropBaseColor.value
  if (opacity >= 1) return backdropOverlayColor.value

  return `color-mix(in srgb, ${backdropOverlayColor.value} ${(
    opacity * 100
  ).toFixed(3)}%, ${backdropBaseColor.value})`
}

const updateBackdropColor = async (immediate = false) => {
  const targetColor = getBackdropTargetColor()
  if (targetColor === backdropTargetColor) return

  if (!backdropBaseColor.value || immediate || isReducedMotion.value) {
    setBackdropColorImmediately(targetColor)
    return
  }

  const currentColor = getCurrentBackdropColor()
  cancelBackdropAnimation()
  backdropTargetColor = targetColor
  backdropBaseColor.value = currentColor
  backdropOverlayColor.value = targetColor
  await nextTick()

  const overlay = backdropOverlayElement.value
  if (!overlay || targetColor !== backdropTargetColor) return

  const revision = backdropTransitionRevision
  backdropAnimation = overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: BACKDROP_COLOR_TRANSITION_DURATION,
    easing: 'ease',
    fill: 'forwards',
  })
  backdropAnimation.onfinish = async () => {
    if (revision !== backdropTransitionRevision) return
    backdropBaseColor.value = targetColor
    await nextTick()
    if (revision !== backdropTransitionRevision) return
    backdropAnimation?.cancel()
    backdropAnimation = null
  }
}

const scheduleBackdropColorUpdate = () => {
  if (backdropUpdateRafId !== null) return
  backdropUpdateRafId = window.requestAnimationFrame(() => {
    backdropUpdateRafId = null
    void updateBackdropColor()
  })
}

const clearParticleRevealFrames = () => {
  if (particleRevealRafId !== null) {
    window.cancelAnimationFrame(particleRevealRafId)
    particleRevealRafId = null
  }
  if (particleRevealSecondRafId !== null) {
    window.cancelAnimationFrame(particleRevealSecondRafId)
    particleRevealSecondRafId = null
  }
}

const clearParticleRemovalTimer = () => {
  if (particleRemovalTimer === null) return
  window.clearTimeout(particleRemovalTimer)
  particleRemovalTimer = null
}

const removeHiddenParticleField = () => {
  if (props.particlesVisible) return
  isParticleFieldMounted.value = false
  clearParticleRemovalTimer()
}

const handleParticleVisibilityTransitionEnd = (event: TransitionEvent) => {
  if (event.propertyName !== 'opacity' || isParticleFieldVisible.value) return
  removeHiddenParticleField()
}

watch(
  () => props.particlesVisible,
  async (visible) => {
    clearParticleRevealFrames()
    clearParticleRemovalTimer()

    if (!visible) {
      isParticleFieldVisible.value = false
      particleRemovalTimer = window.setTimeout(
        removeHiddenParticleField,
        PARTICLE_VISIBILITY_DURATION + 80
      )
      return
    }

    isParticleFieldVisible.value = false
    isParticleFieldMounted.value = true
    await nextTick()
    if (!props.particlesVisible) return

    particleRevealRafId = window.requestAnimationFrame(() => {
      particleRevealRafId = null
      particleRevealSecondRafId = window.requestAnimationFrame(() => {
        particleRevealSecondRafId = null
        if (props.particlesVisible) isParticleFieldVisible.value = true
      })
    })
  }
)

watch([() => props.theme, () => props.deepBlack], scheduleBackdropColorUpdate, {
  flush: 'post',
})

const updateHeroScale = () => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const isMobile = viewportWidth <= 768
  isMobileViewport.value = isMobile
  const heightRatio = isMobile ? 0.67 : 0.72
  const horizontalGap = isMobile ? 44 : 72
  const heroSize = Math.min(
    viewportHeight * heightRatio,
    viewportWidth - horizontalGap
  )

  heroScale.value = Math.max(0.1, heroSize / viewportWidth)
}

const scheduleHeroScaleUpdate = () => {
  if (resizeRafId !== null) return
  resizeRafId = window.requestAnimationFrame(() => {
    resizeRafId = null
    updateHeroScale()
  })
}

const getChartTransitionKey = (event: TransitionEvent) => {
  if (event.propertyName !== 'transform') return null
  const target = event.target
  if (!(target instanceof HTMLElement)) return null
  if (target.classList.contains('zodiac-stage')) return 'stage'
  if (target.classList.contains('zodiac-html-wheel')) return 'wheel'
  return null
}

const handleChartTransitionStart = (event: TransitionEvent) => {
  const key = getChartTransitionKey(event)
  if (!key) return
  activeChartTransitions.add(key)
  isChartTransitioning.value = true
  if (key === 'wheel' && !isReducedMotion.value) {
    isRouteTransitioning.value = true
  }
}

const handleChartTransitionEnd = (event: TransitionEvent) => {
  const key = getChartTransitionKey(event)
  if (!key) return
  activeChartTransitions.delete(key)
  isChartTransitioning.value = activeChartTransitions.size > 0
  if (key === 'wheel') isRouteTransitioning.value = false
}

const containerClass = computed(() => [
  'star-container',
  props.theme,
  {
    'menu-hidden': props.isTextMenu,
    'is-deep-black': props.deepBlack,
    'is-content-layout': props.layout === 'content',
    'is-chart-transitioning': isChartTransitioning.value,
    'is-route-transitioning': isRouteTransitioning.value,
    'is-entry-ready': props.entryActive,
    'has-background-top-inset': props.topInset > 0,
  },
])

onMounted(() => {
  updateHeroScale()
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  isReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  removePageResizeListener = addPageResizeListener(scheduleHeroScaleUpdate)
  backdropStyleObserver = new MutationObserver(scheduleBackdropColorUpdate)
  backdropStyleObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style'],
  })
  void updateBackdropColor(true)
})

onUnmounted(() => {
  activeChartTransitions.clear()
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
  removePageResizeListener?.()
  removePageResizeListener = null
  if (resizeRafId !== null) window.cancelAnimationFrame(resizeRafId)
  clearParticleRevealFrames()
  clearParticleRemovalTimer()
  backdropStyleObserver?.disconnect()
  backdropStyleObserver = null
  if (backdropUpdateRafId !== null) {
    window.cancelAnimationFrame(backdropUpdateRafId)
  }
  cancelBackdropAnimation()
})
</script>

<template>
  <div :class="containerClass" :style="containerStyle" aria-hidden="true">
    <div
      class="backdrop-color-base"
      :style="{ backgroundColor: backdropBaseColor }"
    />
    <div
      ref="backdropOverlayElement"
      class="backdrop-color-transition"
      :style="{ backgroundColor: backdropOverlayColor }"
    />

    <div
      v-if="isParticleFieldMounted"
      class="particle-viewport"
      :class="{ 'is-visible': isParticleFieldVisible }"
      @transitionend="handleParticleVisibilityTransitionEnd"
    >
      <ParticlesBg
        class="particle-field"
        :active="props.entryActive && isParticleFieldVisible"
        :quantity="particleQuantity"
        :color="PARTICLE_COLOR"
        :refresh="props.entryActive"
      />
    </div>

    <div
      class="zodiac-stage"
      :style="stageStyle"
      @transitionrun="handleChartTransitionStart"
      @transitionend="handleChartTransitionEnd"
      @transitioncancel="handleChartTransitionEnd"
    >
      <img
        class="zodiac-static-art"
        :src="STATIC_CHART_SRC"
        alt=""
        draggable="false"
        decoding="async"
        fetchpriority="high"
        width="1000"
        height="1000"
        loading="eager"
      />

      <div class="zodiac-html-wheel">
        <span
          v-for="(style, index) in sectorStyles"
          :key="`sector-${index}`"
          class="zodiac-sector-line"
          :style="style"
        />

        <div
          v-for="sign in zodiacSigns"
          :key="sign.id"
          class="zodiac-sign-position"
          :style="sign.positionStyle"
        >
          <div
            class="zodiac-sign-face"
            :class="{ 'is-active': sign.id === props.activeSign }"
            :style="sign.faceStyle"
          >
            <span class="zodiac-glyph">{{ sign.glyph }}</span>
          </div>
        </div>
      </div>

      <span class="zodiac-diamond-frame" />
    </div>
  </div>
</template>

<style lang="less" scoped>
@import './index.less';
</style>
