<template>
  <div class="home-page main-container">
    <section ref="heroSection" class="hero-section">
      <div class="hero-content">
        <div
          ref="recommendElement"
          class="recommend"
          @mouseenter="pauseAuto"
          @mouseleave="resumeAuto"
        >
          <button class="nav-btn nav-btn--prev" @click="prevSlide">
            <span class="nav-triangle" aria-hidden="true" />
          </button>

          <Swiper
            class="cards-viewport"
            :modules="swiperModules"
            :direction="carouselDirection"
            :slides-per-view="1"
            :speed="480"
            :loop="newsItems.length > 1"
            :autoplay="swiperAutoplayOptions"
            :mousewheel="carouselMousewheelOptions"
            :resistance-ratio="0.72"
            :threshold="3"
            :touch-start-prevent-default="false"
            @swiper="setNewsSwiper"
            @slide-change="handleSwiperSlideChange"
            @slider-move="handleSwiperSliderMove"
            @touch-start="handleSwiperTouchStart"
            @touch-end="handleSwiperTouchEnd"
          >
            <SwiperSlide v-for="(item, index) in newsItems" :key="item.id">
              <div
                class="news-card"
                data-magnetic
                :role="item.link ? 'link' : undefined"
                :tabindex="item.link ? 0 : -1"
                @click="openNewsItem(item)"
                @keydown.enter.prevent="openNewsItem(item)"
                @keydown.space.prevent="openNewsItem(item)"
              >
                <div class="card-img">
                  <img
                    :src="item.img"
                    :alt="item.title"
                    :loading="index === 0 ? 'eager' : 'lazy'"
                    :fetchpriority="index === 0 ? 'high' : 'low'"
                    decoding="async"
                  />
                  <div class="card-img-overlay" />
                </div>

                <div class="card-content">
                  <div class="card-top">
                    <span
                      class="card-cat"
                      :class="`card-cat--${item.category.toLowerCase()}`"
                    >
                      {{ item.category }}
                    </span>
                  </div>
                  <h3 class="card-title">{{ item.title }}</h3>
                  <p class="card-subtitle">
                    <span class="subtitle">{{ item.subtitle }}</span>
                    <span class="card-date">{{ item.date }}</span>
                  </p>
                </div>
              </div>
            </SwiperSlide>
          </Swiper>

          <button class="nav-btn nav-btn--next" @click="nextSlide">
            <span class="nav-triangle" aria-hidden="true" />
          </button>

          <div class="carousel-progress">
            <div
              v-for="(_, index) in newsItems"
              :key="index"
              class="progress-bar"
              :class="{ active: index === activeIndex }"
              @click="goTo(index)"
            />
          </div>

          <div class="carousel-counter">
            <span class="counter-cur">{{ activeIndex + 1 }}</span>
            <span class="counter-sep">/</span>
            <span class="counter-total">{{ newsItems.length }}</span>
          </div>
        </div>

        <div ref="mainSloganElement" class="main-slogan">
          <div class="moto" :class="{ 'hide-cursor': isPassionHovering }">
            <p>DRIVEN</p>
            <p>BY</p>
            <p
              ref="passionLine"
              class="passion-line no-cursor"
              :class="{ 'is-hovering': isPassionHovering }"
            >
              <span class="passion" data-text="PASSION"> PASSION </span>
            </p>
            <div>WELCOME TO Anuluca'S SECRET BASE.</div>
          </div>
          <LogoOnly3D class="logoWith3d" />
        </div>
      </div>

      <MarqueeShowcase class="marquee-showcase" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Autoplay, Mousewheel } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper/types'
import { Swiper, SwiperSlide } from 'swiper/vue'

import LogoOnly3D from '@/components/LogoOnly3D/index.vue'
import MarqueeShowcase from '@/components/MarqueeShowcase/index.vue'

import 'swiper/css'

interface NewsItem {
  id: number
  title: string
  subtitle: string
  category: string
  date: string
  img: string
  link?: string
  openInNewWindow?: boolean
}

const { tm } = useI18n()
const router = useRouter()
const newsItems = computed<NewsItem[]>(
  () => tm('home.dynamic.recommend') as NewsItem[]
)

const heroSection = ref<HTMLElement | null>(null)
const passionLine = ref<HTMLElement | null>(null)
const recommendElement = ref<HTMLElement | null>(null)
const mainSloganElement = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const newsSwiper = ref<SwiperInstance | null>(null)
const isCarouselAutoplay = ref(false)
const isMobileCarousel = ref(false)
const isPassionHovering = ref(false)
const swiperModules = [Autoplay, Mousewheel]

let isPageVisible = true
let sloganRotateX = 0
let sloganRotateY = 0
let sloganTargetRotateX = 0
let sloganTargetRotateY = 0
let sloganRafId: number | null = null
let heroResizeRafId: number | null = null
let reducedMotionQuery: MediaQueryList | null = null
let heroMotionQuery: MediaQueryList | null = null
let lastMotionSampleTime = 0
let isHeroMotionListenerActive = false
let isHeroMotionEnabled = false
let didDragSwiper = false
let dragResetTimer: ReturnType<typeof setTimeout> | null = null
let heroMetrics = {
  centerX: 0,
  centerY: 0,
  halfWidth: 1,
  halfHeight: 1,
}
let passionHoverBounds = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
}

const HERO_MOTION_SAMPLE_INTERVAL = 80
const PASSION_HOVER_PADDING = 32

const carouselDirection = computed(() =>
  isMobileCarousel.value ? 'horizontal' : 'vertical'
)
const swiperAutoplayOptions = computed(() => ({
  delay: 4000,
  disableOnInteraction: false,
  pauseOnMouseEnter: true,
}))
const carouselMousewheelOptions = computed(() =>
  isMobileCarousel.value
    ? false
    : {
        forceToAxis: true,
        releaseOnEdges: true,
        thresholdDelta: 18,
      }
)

const setHeroTransformVariables = (
  element: HTMLElement | null,
  rotateX: number,
  rotateY: number
) => {
  if (!element) return
  element.style.setProperty('--hero-rotate-x', `${rotateX}deg`)
  element.style.setProperty('--hero-rotate-y', `${rotateY}deg`)
}

const applySloganTransform = () => {
  const motionScale = isHeroMotionEnabled ? 1 : 0
  setHeroTransformVariables(
    mainSloganElement.value,
    sloganRotateX * 0.72 * motionScale,
    sloganRotateY * 0.72 * motionScale
  )
  setHeroTransformVariables(
    recommendElement.value,
    sloganRotateX * motionScale,
    -sloganRotateY * motionScale
  )
}

const stopSloganMotion = () => {
  if (sloganRafId === null) return
  cancelAnimationFrame(sloganRafId)
  sloganRafId = null
}

const updateSloganMotion = () => {
  sloganRotateX += (sloganTargetRotateX - sloganRotateX) * 0.12
  sloganRotateY += (sloganTargetRotateY - sloganRotateY) * 0.12
  applySloganTransform()

  const isSettled =
    Math.abs(sloganTargetRotateX - sloganRotateX) < 0.01 &&
    Math.abs(sloganTargetRotateY - sloganRotateY) < 0.01

  if (isSettled) {
    sloganRotateX = sloganTargetRotateX
    sloganRotateY = sloganTargetRotateY
    applySloganTransform()
    sloganRafId = null
    return
  }

  sloganRafId = requestAnimationFrame(updateSloganMotion)
}

const startSloganMotion = () => {
  if (sloganRafId === null) {
    sloganRafId = requestAnimationFrame(updateSloganMotion)
  }
}

const resetHeroSloganMotion = () => {
  sloganTargetRotateX = 0
  sloganTargetRotateY = 0
  isPassionHovering.value = false
  startSloganMotion()
}

const refreshHeroInteractionMetrics = () => {
  if (heroSection.value) {
    const rect = heroSection.value.getBoundingClientRect()
    heroMetrics = {
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      halfWidth: Math.max(1, rect.width / 2),
      halfHeight: Math.max(1, rect.height / 2),
    }
  }

  if (!passionLine.value) return
  const rect = passionLine.value.getBoundingClientRect()
  passionHoverBounds = {
    left: rect.left - PASSION_HOVER_PADDING,
    right: rect.right + PASSION_HOVER_PADDING,
    top: rect.top - PASSION_HOVER_PADDING,
    bottom: rect.bottom + PASSION_HOVER_PADDING,
  }
}

const syncPassionHoverState = (event: MouseEvent) => {
  isPassionHovering.value =
    event.clientX >= passionHoverBounds.left &&
    event.clientX <= passionHoverBounds.right &&
    event.clientY >= passionHoverBounds.top &&
    event.clientY <= passionHoverBounds.bottom
}

const canUseHeroMotion = () =>
  window.innerWidth >= 768 &&
  !!heroMotionQuery?.matches &&
  !reducedMotionQuery?.matches

const syncHeroMotionListener = () => {
  isMobileCarousel.value = window.innerWidth < 768
  refreshHeroInteractionMetrics()
  const shouldListen = canUseHeroMotion() && isPageVisible
  isHeroMotionEnabled = shouldListen

  if (shouldListen && !isHeroMotionListenerActive) {
    window.addEventListener('mousemove', handleHeroMouseMove, { passive: true })
    isHeroMotionListenerActive = true
  } else if (!shouldListen && isHeroMotionListenerActive) {
    window.removeEventListener('mousemove', handleHeroMouseMove)
    isHeroMotionListenerActive = false
  }

  if (!shouldListen) resetHeroSloganMotion()
}

const handleHeroResize = () => {
  if (heroResizeRafId !== null) return
  heroResizeRafId = window.requestAnimationFrame(() => {
    heroResizeRafId = null
    syncHeroMotionListener()
  })
}

const handleHeroMouseMove = (event: MouseEvent) => {
  const now = performance.now()
  if (now - lastMotionSampleTime < HERO_MOTION_SAMPLE_INTERVAL) return
  lastMotionSampleTime = now

  if (!isPageVisible || !isHeroMotionEnabled || !heroSection.value) {
    isPassionHovering.value = false
    return
  }

  syncPassionHoverState(event)
  const offsetX = (event.clientX - heroMetrics.centerX) / heroMetrics.halfWidth
  const offsetY = (event.clientY - heroMetrics.centerY) / heroMetrics.halfHeight
  sloganTargetRotateY = Math.max(-1, Math.min(1, offsetX)) * 10
  sloganTargetRotateX = Math.max(-1, Math.min(1, offsetY)) * -8
  startSloganMotion()
}

const setNewsSwiper = (swiper: SwiperInstance) => {
  newsSwiper.value = swiper
  activeIndex.value = swiper.realIndex || 0
  if (isCarouselAutoplay.value) swiper.autoplay.start()
  else swiper.autoplay.stop()
}

const prevSlide = () => {
  if (newsItems.value.length) newsSwiper.value?.slidePrev()
}
const nextSlide = () => {
  if (newsItems.value.length) newsSwiper.value?.slideNext()
}
const goTo = (index: number) => newsSwiper.value?.slideToLoop(index)
const handleSwiperSlideChange = (swiper: SwiperInstance) => {
  activeIndex.value = swiper.realIndex
}
const handleSwiperTouchStart = () => {
  pauseAuto()
  didDragSwiper = false
}
const handleSwiperSliderMove = () => {
  didDragSwiper = true
}
const handleSwiperTouchEnd = () => {
  if (didDragSwiper) {
    if (dragResetTimer) clearTimeout(dragResetTimer)
    dragResetTimer = setTimeout(() => {
      didDragSwiper = false
      dragResetTimer = null
    }, 350)
  }
  resumeAuto()
}

const startAuto = () => {
  isCarouselAutoplay.value = isPageVisible && newsItems.value.length > 1
  if (isCarouselAutoplay.value) newsSwiper.value?.autoplay.start()
  else newsSwiper.value?.autoplay.stop()
}
const pauseAuto = () => {
  isCarouselAutoplay.value = false
  newsSwiper.value?.autoplay.stop()
}
const resumeAuto = () => startAuto()

const openNewsItem = (item: NewsItem) => {
  if (didDragSwiper) {
    didDragSwiper = false
    return
  }
  if (!item.link) return
  if (item.openInNewWindow) {
    window.open(item.link, '_blank', 'noopener,noreferrer')
  } else if (/^https?:\/\//.test(item.link)) {
    window.location.href = item.link
  } else {
    void router.push(item.link)
  }
}

const handleVisibilityChange = () => {
  isPageVisible = document.visibilityState !== 'hidden'
  syncHeroMotionListener()
  if (isPageVisible) startAuto()
  else {
    pauseAuto()
    resetHeroSloganMotion()
  }
}

onMounted(() => {
  isPageVisible = document.visibilityState !== 'hidden'
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  heroMotionQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
  reducedMotionQuery.addEventListener('change', syncHeroMotionListener)
  heroMotionQuery.addEventListener('change', syncHeroMotionListener)
  syncHeroMotionListener()
  startAuto()
  window.addEventListener('resize', handleHeroResize, { passive: true })
  window.addEventListener('blur', resetHeroSloganMotion)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  if (dragResetTimer) clearTimeout(dragResetTimer)
  stopSloganMotion()
  if (heroResizeRafId !== null) window.cancelAnimationFrame(heroResizeRafId)
  window.removeEventListener('mousemove', handleHeroMouseMove)
  window.removeEventListener('resize', handleHeroResize)
  window.removeEventListener('blur', resetHeroSloganMotion)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  reducedMotionQuery?.removeEventListener('change', syncHeroMotionListener)
  heroMotionQuery?.removeEventListener('change', syncHeroMotionListener)
})
</script>

<style lang="less" scoped src="./index.less" />

<style lang="less" src="./global.less" />
