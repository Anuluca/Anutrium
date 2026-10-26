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
import { gsap } from 'gsap'

import ParticlesBg from '@/components/ParticlesBg/index.vue'
import type { ZodiacSignId } from '@/config/zodiacThemes'
import { addPageResizeListener } from '@/utils/pageScroll'

import { zodiacGlyphPaths, zodiacGlyphViewBoxes } from './zodiacGlyphs'

type ZodiacLayout = 'hero' | 'content' | 'red'

interface Props {
  theme?: 'light' | 'dark'
  isTextMenu?: boolean
  deepBlack?: boolean
  blackBackdrop?: boolean
  activeSign?: ZodiacSignId
  layout?: ZodiacLayout
  tinted?: boolean
  particlesVisible?: boolean
  celestialVisible?: boolean
  motionActive?: boolean
  particleFps?: number
  topInset?: number
  entryActive?: boolean
  simpleEntrance?: boolean
  layoutTransitionDuration?: number
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
  blackBackdrop: false,
  activeSign: 'leo',
  layout: 'hero',
  tinted: false,
  particlesVisible: true,
  celestialVisible: true,
  motionActive: true,
  particleFps: 60,
  topInset: 0,
  entryActive: true,
  simpleEntrance: false,
  layoutTransitionDuration: undefined,
})
const STATIC_CHART_SRC = '/images/zodiac-chart-static.svg?v=20260927-1'
// 缓动采样与实例状态无关，避免 topInset 等布局变化时重复分配数组和字符串。
const chartTransitionEasing = `linear(${Array.from(
  { length: 33 },
  (_, index) => {
    const progress = index / 32
    return progress < 0.5 ? 8 * progress ** 4 : 1 - (-2 * progress + 2) ** 4 / 2
  }
).join(',')})`

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
    // 内外圆半径为 33.2% / 44.8%，图标中心落在二者的中线。
    positionStyle: polarPercent(39, centerAngle),
    faceStyle: { transform: `rotate(${centerAngle + 90}deg)` },
  }
})

const sectorStyles = Array.from({ length: 12 }, (_, index) => ({
  ...polarPercent(39, -90 + index * 30),
  transform: `translate(-50%, -50%) rotate(${index * 30}deg) scaleY(2)`,
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
let backdropStyleSignature = ''
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
  '--chart-transition-duration':
    props.layoutTransitionDuration === undefined
      ? undefined
      : `${props.layoutTransitionDuration}s`,
  // 采样 GSAP power3.inOut 的四次缓动，使星盘与三维相机保持相同进度。
  '--chart-transition-easing':
    props.layoutTransitionDuration === undefined
      ? undefined
      : chartTransitionEasing,
}))
const themeParticleColor = ref('#e23456')
const chartTinted = computed(() => props.tinted || props.layout === 'red')
const particleColor = computed(() =>
  chartTinted.value ? themeParticleColor.value : '#ffffff'
)
const particleQuantity = computed(() =>
  Math.round((isMobileViewport.value ? 25 : 100) * 0.65)
)

const backdropBlackMix = { amount: props.blackBackdrop ? 1 : 0 }
let backdropTintTransition: gsap.core.Tween | undefined

const getThemedBackdropColor = (
  rootStyle: CSSStyleDeclaration,
  themeColor: string
) => {
  // 首页透明画布下方也使用浅色底，避免模型周围仍残留深色背景。
  if (props.theme === 'light' && props.tinted)
    return `color-mix(in srgb, ${themeColor} 3%, #faf9f6)`
  if (props.deepBlack) return '#030303'

  const backgroundVariable =
    props.theme === 'light'
      ? '--page-theme-background-light'
      : '--page-theme-background-dark'
  const explicitBackground = rootStyle
    .getPropertyValue(backgroundVariable)
    .trim()

  if (explicitBackground) return explicitBackground

  return `color-mix(in srgb, color-mix(in srgb, ${themeColor} 45%, #000) 50%, #0a0411)`
}

const getBackdropTargetColor = (
  rootStyle: CSSStyleDeclaration,
  themeColor: string
) => {
  const color = getThemedBackdropColor(rootStyle, themeColor)
  if (!props.tinted || props.deepBlack || backdropBlackMix.amount === 0)
    return color
  // 仅插值底层色，保留原有渐变遮罩、星盘和文字的主题色。
  return `color-mix(in srgb, #030202 ${
    backdropBlackMix.amount * 100
  }%, ${color})`
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
  const rootStyle = window.getComputedStyle(document.documentElement)
  themeParticleColor.value =
    rootStyle.getPropertyValue('--page-theme-color').trim() || '#e23456'
  const targetColor = getBackdropTargetColor(
    rootStyle,
    themeParticleColor.value
  )
  if (targetColor === backdropTargetColor) return

  // 首页根主题色已逐帧缓动，直接跟随，避免每帧重启背景交叉淡入。
  if (
    props.tinted ||
    !backdropBaseColor.value ||
    immediate ||
    isReducedMotion.value
  ) {
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

watch(
  () => props.blackBackdrop,
  (black) => {
    backdropTintTransition?.kill()
    const amount = black ? 1 : 0
    if (isReducedMotion.value) {
      backdropBlackMix.amount = amount
      scheduleBackdropColorUpdate()
      return
    }
    backdropTintTransition = gsap.to(backdropBlackMix, {
      amount,
      duration: props.layoutTransitionDuration ?? 1.1,
      ease: 'power2.inOut',
      onUpdate: scheduleBackdropColorUpdate,
    })
  }
)

const readBackdropStyleSignature = () => {
  const style = document.documentElement.style
  return [
    style.getPropertyValue('--page-theme-color'),
    style.getPropertyValue('--page-theme-background-dark'),
    style.getPropertyValue('--page-theme-background-light'),
  ].join('|')
}

const handleBackdropStyleChange = () => {
  // 滚动和布局也会更新根节点 style；只有主题变量变化才读取计算样式。
  const signature = readBackdropStyleSignature()
  if (signature === backdropStyleSignature) return
  backdropStyleSignature = signature
  scheduleBackdropColorUpdate()
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

watch(
  [() => props.theme, () => props.deepBlack, () => props.tinted],
  scheduleBackdropColorUpdate,
  { flush: 'post' }
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

// 入场版本只在首次开屏时确定，聚焦退出不能切换 animation-name 重播星盘。
const entranceSimple = ref(props.simpleEntrance)
let entranceStarted = props.entryActive
watch(
  () => props.entryActive,
  (active) => {
    if (!active || entranceStarted) return
    entranceSimple.value = props.simpleEntrance
    entranceStarted = true
  }
)
const containerClass = computed(() => [
  'star-container',
  props.theme,
  {
    'menu-hidden': props.isTextMenu,
    'is-deep-black': props.deepBlack,
    'is-content-layout': props.layout === 'content',
    'is-red-layout': props.layout === 'red',
    'is-theme-tinted': chartTinted.value,
    'is-chart-transitioning': isChartTransitioning.value,
    'is-route-transitioning': isRouteTransitioning.value,
    'is-entry-ready': props.entryActive,
    'is-simple-entrance': entranceSimple.value,
    'has-background-top-inset': props.topInset > 0,
  },
])

onMounted(() => {
  updateHeroScale()
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  isReducedMotion.value = reducedMotionQuery.matches
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  removePageResizeListener = addPageResizeListener(scheduleHeroScaleUpdate)
  backdropStyleSignature = readBackdropStyleSignature()
  backdropStyleObserver = new MutationObserver(handleBackdropStyleChange)
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
  backdropTintTransition?.kill()
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

    <div v-show="props.celestialVisible" class="celestial-viewport">
      <div
        v-if="isParticleFieldMounted"
        class="particle-viewport"
        :class="{ 'is-visible': isParticleFieldVisible }"
        @transitionend="handleParticleVisibilityTransitionEnd"
      >
        <ParticlesBg
          class="particle-field"
          :active="
            props.entryActive && isParticleFieldVisible && props.motionActive
          "
          :quantity="particleQuantity"
          :max-fps="props.particleFps"
          :color="particleColor"
          :opaque="props.layout === 'red'"
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
        <div class="zodiac-gradient-layer">
          <div class="zodiac-artwork">
            <span
              v-if="chartTinted"
              class="zodiac-static-art zodiac-static-art--tinted"
              :style="{ '--static-chart-mask': `url('${STATIC_CHART_SRC}')` }"
            />
            <img
              v-else
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
                class="zodiac-sector-marker"
                :style="style"
                >][</span
              >

              <div
                v-for="sign in zodiacSigns"
                :key="sign.id"
                class="zodiac-sign-position"
                :style="sign.positionStyle"
              >
                <div class="zodiac-sign-face" :style="sign.faceStyle">
                  <span class="zodiac-glyph">
                    <span class="zodiac-glyph-text">{{ sign.glyph }}</span>
                    <svg
                      :viewBox="zodiacGlyphViewBoxes[sign.id]"
                      aria-hidden="true"
                    >
                      <path
                        v-for="(path, index) in zodiacGlyphPaths[sign.id]"
                        :key="index"
                        :d="path"
                        fill="currentColor"
                        fill-rule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            <span class="zodiac-diamond-frame" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import './index.less';
</style>
