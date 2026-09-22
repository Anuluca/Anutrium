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
const STATIC_CHART_SRC = '/images/zodiac-chart-static.svg?v=20260921-2'

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
const isEntryComplete = ref(false)
const isHighlightSettled = ref(false)
const isParticleFieldMounted = ref(props.particlesVisible)
const isParticleFieldVisible = ref(props.particlesVisible)
const activeChartTransitions = new Set<string>()
let resizeRafId: number | null = null
let particleRevealRafId: number | null = null
let particleRevealSecondRafId: number | null = null
let particleRemovalTimer: number | null = null
const isReducedMotion = ref(false)
let reducedMotionQuery: MediaQueryList | null = null
let removePageResizeListener: (() => void) | null = null
const PARTICLE_VISIBILITY_DURATION = 520

const handleReducedMotionChange = (event: MediaQueryListEvent) => {
  isReducedMotion.value = event.matches
}

watch(
  () => props.activeSign,
  (signId, previousSignId) => {
    if (signId === previousSignId) return

    isHighlightSettled.value = false
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
const PARTICLE_COLOR = '#e2c28a'
const particleQuantity = computed(() => (isMobileViewport.value ? 25 : 100))

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

const handleTriangleAnimationEnd = () => {
  isEntryComplete.value = true
  isHighlightSettled.value = true
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
    'is-entry-complete': isEntryComplete.value,
    'is-highlight-settled': isHighlightSettled.value,
    'has-background-top-inset': props.topInset > 0,
  },
])

onMounted(() => {
  updateHeroScale()
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  isReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  removePageResizeListener = addPageResizeListener(scheduleHeroScaleUpdate)
})

onUnmounted(() => {
  activeChartTransitions.clear()
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
  removePageResizeListener?.()
  removePageResizeListener = null
  if (resizeRafId !== null) window.cancelAnimationFrame(resizeRafId)
  clearParticleRevealFrames()
  clearParticleRemovalTimer()
})
</script>

<template>
  <div :class="containerClass" :style="containerStyle" aria-hidden="true">
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

    <div class="zodiac-triangle-stage">
      <span class="zodiac-triangle-geometry">
        <span
          class="zodiac-active-triangle"
          @animationend="handleTriangleAnimationEnd"
        />
      </span>
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
