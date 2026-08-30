<script lang="ts" setup>
import {
  computed,
  type CSSProperties,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'

import ParticlesBg from '@/components/ParticlesBg/index.vue'

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
  entryActive?: boolean
}

interface ZodiacSign {
  id: ZodiacSignId
  glyph: string
  name: string
  code: string
  positionStyle: CSSProperties
  faceStyle: { transform: string }
  degreePositionStyle: CSSProperties
  degreeFaceStyle: { transform: string }
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'dark',
  isTextMenu: false,
  deepBlack: false,
  activeSign: 'leo',
  layout: 'hero',
  entryActive: true,
})
const STATIC_CHART_SRC = '/images/zodiac-chart-static.svg?v=20260830'

const polarPercent = (radius: number, angle: number): CSSProperties => {
  const radians = (angle * Math.PI) / 180
  return {
    left: `${50 + Math.cos(radians) * radius}%`,
    top: `${50 + Math.sin(radians) * radius}%`,
  }
}

const zodiacSource = [
  ['aries', '♈︎', 'ARIES', 'ARI'],
  ['taurus', '♉︎', 'TAURUS', 'TAU'],
  ['gemini', '♊︎', 'GEMINI', 'GEM'],
  ['cancer', '♋︎', 'CANCER', 'CNC'],
  ['leo', '♌︎', 'LEO', 'LEO'],
  ['virgo', '♍︎', 'VIRGO', 'VIR'],
  ['libra', '♎︎', 'LIBRA', 'LIB'],
  ['scorpio', '♏︎', 'SCORPIO', 'SCO'],
  ['sagittarius', '♐︎', 'SAGITTARIUS', 'SGR'],
  ['capricorn', '♑︎', 'CAPRICORN', 'CAP'],
  ['aquarius', '♒︎', 'AQUARIUS', 'AQR'],
  ['pisces', '♓︎', 'PISCES', 'PSC'],
] as const

const zodiacSigns: ZodiacSign[] = zodiacSource.map(
  ([id, glyph, name, code], index) => {
    const centerAngle = -105 - index * 30
    const degreeAngle = -90 - index * 30
    return {
      id,
      glyph,
      name,
      code,
      positionStyle: polarPercent(40, centerAngle),
      faceStyle: { transform: `rotate(${centerAngle + 90}deg)` },
      degreePositionStyle: polarPercent(34.9, degreeAngle),
      degreeFaceStyle: { transform: `rotate(${degreeAngle + 90}deg)` },
    }
  }
)

const sectorStyles = Array.from({ length: 12 }, (_, index) => ({
  transform: `translateX(-50%) rotate(${index * 30}deg)`,
}))

const getCanonicalRotation = (signId: ZodiacSignId) => {
  const signIndex = zodiacSigns.findIndex((sign) => sign.id === signId)
  return 15 + Math.max(0, signIndex) * 30
}

const routeRotation = ref(getCanonicalRotation(props.activeSign))
const heroScale = ref(1)
const isChartTransitioning = ref(false)
const isRouteTransitioning = ref(false)
const isEntryComplete = ref(false)
const isHighlightSettled = ref(false)
const activeChartTransitions = new Set<string>()
let resizeRafId: number | null = null
const isReducedMotion = ref(false)
let reducedMotionQuery: MediaQueryList | null = null

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
const PARTICLE_COLOR = '#e2c28a'

const updateHeroScale = () => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const isMobile = viewportWidth <= 768
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
  },
])

onMounted(() => {
  updateHeroScale()
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  isReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  window.addEventListener('resize', scheduleHeroScaleUpdate, { passive: true })
})

onUnmounted(() => {
  activeChartTransitions.clear()
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
  window.removeEventListener('resize', scheduleHeroScaleUpdate)
  if (resizeRafId !== null) window.cancelAnimationFrame(resizeRafId)
})
</script>

<template>
  <div :class="containerClass" aria-hidden="true">
    <div class="particle-viewport">
      <ParticlesBg
        class="particle-field"
        :quantity="100"
        :ease="100"
        :staticity="10"
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
      />

      <div class="zodiac-html-wheel">
        <span
          v-for="(style, index) in sectorStyles"
          :key="`sector-${index}`"
          class="zodiac-sector-line"
          :style="style"
        />

        <div
          v-for="(sign, index) in zodiacSigns"
          :key="`degree-${sign.id}`"
          class="zodiac-degree-position"
          :style="sign.degreePositionStyle"
        >
          <span class="zodiac-degree" :style="sign.degreeFaceStyle">
            {{ String(index * 30).padStart(3, '0') }}°
          </span>
        </div>

        <div
          v-for="(sign, index) in zodiacSigns"
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
            <span class="zodiac-name">{{ sign.name }}</span>
            <span class="zodiac-code">
              {{ sign.code }} · {{ String(index + 1).padStart(2, '0') }}
            </span>
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
