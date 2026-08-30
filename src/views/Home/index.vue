<template>
  <div
    class="home-page main-container"
    :class="{ 'is-craft-footer-visible': isCraftFooterVisible }"
    :style="homePageStyle"
  >
    <Swiper
      class="home-page-swiper"
      :class="
        homePageTransitionDirection && `is-page-${homePageTransitionDirection}`
      "
      :modules="homeSwiperModules"
      direction="vertical"
      :slides-per-view="1"
      :speed="HOME_PAGE_TRANSITION_DURATION"
      :mousewheel="homeMousewheelOptions"
      :simulate-touch="false"
      :resistance-ratio="0"
      :threshold="12"
      @swiper="setHomeSwiper"
      @set-translate="handleHomeSetTranslate"
      @set-transition="handleHomeSetTransition"
      @slide-change="handleHomeSlideChange"
      @slide-change-transition-start="handleHomeTransitionStart"
      @slide-change-transition-end="handleHomeTransitionEnd"
    >
      <SwiperSlide
        class="home-page-slide home-page-slide--hero"
        :class="{
          'is-page-entering': enteringHomePageIndex === 0,
          'is-page-leaving': leavingHomePageIndex === 0,
          'is-hero-inactive': isHeroContentInactive,
        }"
      >
        <section
          ref="heroSection"
          class="hero-section"
          :aria-hidden="activeHomePageIndex !== 0"
          :inert="activeHomePageIndex !== 0"
        >
          <div class="home-page-content home-page-content--hero">
            <div ref="heroContentElement" class="hero-content">
              <div
                ref="recommendElement"
                class="recommend"
                @mouseenter="handleNewsWheelEnter"
                @mouseleave="handleNewsWheelLeave"
                @wheel="handleNewsWheel"
              >
                <button class="nav-btn nav-btn--prev" @click="prevSlide">
                  <span class="nav-triangle" aria-hidden="true" />
                </button>

                <Swiper
                  class="cards-viewport"
                  :modules="newsSwiperModules"
                  :direction="carouselDirection"
                  :slides-per-view="1"
                  :speed="480"
                  :loop="newsItems.length > 1"
                  :autoplay="swiperAutoplayOptions"
                  :resistance-ratio="0.72"
                  :threshold="3"
                  :touch-start-prevent-default="false"
                  @swiper="setNewsSwiper"
                  @slide-change="handleSwiperSlideChange"
                  @slider-move="handleSwiperSliderMove"
                  @touch-start="handleSwiperTouchStart"
                  @touch-end="handleSwiperTouchEnd"
                >
                  <SwiperSlide
                    v-for="(item, index) in newsItems"
                    :key="item.id"
                  >
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
                <div class="moto">
                  <p>DRIVEN</p>
                  <p>BY</p>
                  <p
                    class="passion-line"
                    :class="{ 'is-hovering': isPassionHovering }"
                  >
                    <SparklesText
                      class="passion"
                      text="PASSION"
                      :active="isPassionHovering"
                      :rotate="false"
                      :colors="PASSION_SPARKLE_COLORS"
                      :sparkle-area="PASSION_SPARKLE_AREA"
                      :sparkle-size="42"
                      :sparkles-count="10"
                      @mouseenter="isPassionHovering = true"
                      @mouseleave="isPassionHovering = false"
                    >
                      <RadiantText
                        class="passion-radiant"
                        :active="isPassionHovering"
                        :duration="5"
                        :radiant-width="100"
                        base-color="#e23456"
                        radiant-color="#ffffff"
                      >
                        PASSION
                      </RadiantText>
                    </SparklesText>
                  </p>
                </div>
                <LogoOnly3D class="logoWith3d" />
              </div>
            </div>
          </div>
        </section>
      </SwiperSlide>

      <SwiperSlide
        v-for="(page, index) in placeholderPages"
        :key="page.id"
        class="home-page-slide home-placeholder-slide"
        :class="[
          `home-placeholder-slide--${page.id}`,
          {
            'is-page-entering': enteringHomePageIndex === index + 1,
            'is-page-leaving': leavingHomePageIndex === index + 1,
            'is-page-content-fading': fadingHomePageIndex === index + 1,
          },
        ]"
        :aria-hidden="activeHomePageIndex !== index + 1"
      >
        <section :id="`home-section-${page.id}`" class="home-placeholder-panel">
          <div
            v-if="renderedHomePageIds.has(page.id)"
            class="home-page-content home-page-content--secondary"
            :class="`home-page-content--${page.id}`"
          >
            <div v-if="page.id === 'about'" class="home-about-copy">
              <h2 class="home-section-title home-about-title">ABOUT ME</h2>
              <div class="home-about-introduction">
                <p class="home-about-intro">
                  <span>{{ t('home.dynamic.intro.before') }}</span>
                  <RouterLink
                    class="home-about-intro__name"
                    to="/island"
                    @click.stop
                  >
                    <TextHighlight :duration="300" text-end-color="#000000">
                      {{ t('home.dynamic.intro.name') }}
                    </TextHighlight>
                  </RouterLink>
                  <span>{{ t('home.dynamic.intro.after') }}</span>
                </p>
                <p class="home-about-description">
                  <span>{{ aboutDescription.before }}</span>
                  <RandomTypedText
                    class="home-about-description__typed"
                    :active="activeHomePageIndex === index + 1"
                    :items="aboutDescriptionItems"
                  />
                  <span>{{ aboutDescription.after }}</span>
                </p>
                <p class="home-about-highlight">
                  {{ t('home.dynamic.highlight') }}
                </p>
              </div>
            </div>
            <div v-else class="home-placeholder-copy">
              <h2 class="home-section-title">{{ page.title }}</h2>
              <p class="home-placeholder-status">开发中</p>
            </div>
            <div v-if="page.id === 'about'" class="home-about-gallery">
              <DomeGallery
                :images="aboutGalleryItems"
                :entrance-delay="420"
                :entrance-duration="1100"
                :entrance-rotation-speed="42"
              />
            </div>
            <PageFooter
              v-if="page.id === 'craft'"
              :interactive="isCraftFooterVisible"
            />
          </div>
        </section>
      </SwiperSlide>
    </Swiper>

    <ScrollDownHint
      :enter-delay="0"
      fixed
      :hidden="isCraftFooterVisible"
      :initial-enter-delay="HERO_INITIAL_ENTRANCE_DURATION"
      :transition-direction="homePageTransitionDirection ?? 'forward'"
      :transitioning="homePageMotionDuration > 0"
      @activate="goToNextHomePage"
    />

    <nav
      v-for="side in homeIndicatorSides"
      :key="side"
      class="home-page-indicator"
      :class="[
        `home-page-indicator--${side}`,
        { 'is-visible': activeHomePageIndex !== 0 },
      ]"
      :aria-label="`${side === 'left' ? '左侧' : '右侧'}首页分页`"
      :aria-hidden="activeHomePageIndex === 0"
      :inert="activeHomePageIndex === 0"
    >
      <ol class="home-page-indicator__track" :style="homeIndicatorTrackStyle">
        <li
          v-for="(page, index) in homePageIndicatorItems"
          :key="`${side}-${page.id}`"
          class="home-page-indicator__item"
          :class="[
            `home-page-indicator__item--${page.id}`,
            { 'is-active': activeHomePageIndex === index },
          ]"
        >
          <button
            class="home-page-indicator__button"
            type="button"
            :aria-current="activeHomePageIndex === index ? 'page' : undefined"
            @click="goToHomePage(index)"
          >
            <span class="home-page-indicator__marker" />
            <span class="home-page-indicator__title">{{ page.title }}</span>
          </button>
        </li>
      </ol>
    </nav>

    <div class="home-marquee-fixed-layer" :style="{ top: marqueeViewportTop }">
      <MarqueeShowcase class="marquee-showcase" :flat="isHeroContentInactive" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Autoplay, Mousewheel } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper/types'
import { Swiper, SwiperSlide } from 'swiper/vue'

import DomeGallery from '@/components/DomeGallery/index.vue'
import LogoOnly3D from '@/components/LogoOnly3D/index.vue'
import MarqueeShowcase from '@/components/MarqueeShowcase/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import RandomTypedText from '@/components/RandomTypedText/index.vue'
import ScrollDownHint from '@/components/ScrollDownHint/index.vue'
import TextHighlight from '@/components/TextHighlight/index.vue'
import { RadiantText } from '@/components/ui/radiant-text'
import { SparklesText } from '@/components/ui/sparkles-text'
import { visualState } from '@/stores'

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

interface AboutGalleryItem {
  src: string
  title: string
  link?: string
}

interface AboutDescriptionItem {
  text: string
  link?: string
}

const { t, tm } = useI18n()
const router = useRouter()
const visualStateStore = visualState()
const newsItems = computed<NewsItem[]>(
  () => tm('home.dynamic.recommend') as NewsItem[]
)
const aboutGalleryItems = computed<AboutGalleryItem[]>(() => {
  const items = [...(tm('home.dynamic.aboutGallery') as AboutGalleryItem[])]

  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[randomIndex]] = [items[randomIndex], items[index]]
  }

  return items.slice(0, 20)
})
const aboutDescriptionItems = computed(
  () => tm('home.dynamic.descriptionItem') as AboutDescriptionItem[]
)
const aboutDescription = computed(() => {
  const [before, ...after] = t('home.dynamic.aboutDescription').split('—')
  return {
    before,
    after: after.join('—'),
  }
})
const placeholderPages = [
  { id: 'about', title: 'ABOUT ME' },
  { id: 'archive', title: 'ARCHIVE' },
  { id: 'flanerie', title: 'FLANERIE' },
  { id: 'craft', title: 'CRAFT' },
] as const
const homePageIndicatorItems = [
  { id: 'hero', title: 'PASSION' },
  ...placeholderPages,
] as const
const homeIndicatorSides = ['left', 'right'] as const
const HOME_INDICATOR_ITEM_STEP = 1

const heroSection = ref<HTMLElement | null>(null)
const heroContentElement = ref<HTMLElement | null>(null)
const recommendElement = ref<HTMLElement | null>(null)
const mainSloganElement = ref<HTMLElement | null>(null)
const marqueeViewportTop = ref('100dvh')
const craftFooterHeight = ref('220px')
const heroContentCounterOffset = ref('0px')
const homePageMotionDuration = ref(0)
const activeIndex = ref(0)
const activeHomePageIndex = ref(0)
const enteringHomePageIndex = ref<number | null>(null)
const leavingHomePageIndex = ref<number | null>(null)
const fadingHomePageIndex = ref<number | null>(null)
const pendingHomePageTransitionIndex = ref<number | null>(null)
const homePageTransitionDirection = ref<'forward' | 'backward' | null>(null)
const homeIndicatorPagePosition = ref(0)
const homeIndicatorTransitionDuration = ref(0)
const isCraftFooterVisible = ref(false)
const isHeroContentInactive = ref(false)
const renderedHomePageIds = ref<ReadonlySet<string>>(new Set(['hero']))
const homeSwiper = ref<SwiperInstance | null>(null)
const newsSwiper = ref<SwiperInstance | null>(null)
const isCarouselAutoplay = ref(false)
const isMobileCarousel = ref(false)
const isPassionHovering = ref(false)
const homeSwiperModules = [Mousewheel]
const newsSwiperModules = [Autoplay]
const homeMousewheelOptions = {
  eventsTarget: '.home-page',
  forceToAxis: true,
  releaseOnEdges: false,
  sensitivity: 1,
  thresholdDelta: 18,
  thresholdTime: 520,
}
const PASSION_SPARKLE_COLORS = {
  first: '#e2c28a',
  second: '#e2c28a',
}
const PASSION_SPARKLE_AREA = {
  left: -8,
  right: 104,
  top: -8,
  bottom: 105,
}

let isPageVisible = true
let sloganRotateX = 0
let sloganRotateY = 0
let sloganTargetRotateX = 0
let sloganTargetRotateY = 0
let sloganRafId: number | null = null
let heroResizeRafId: number | null = null
let homeProgressRafId: number | null = null
let reducedMotionQuery: MediaQueryList | null = null
let heroMotionQuery: MediaQueryList | null = null
let lastMotionSampleTime = 0
let isHeroMotionListenerActive = false
let isHeroMotionEnabled = false
let didDragSwiper = false
let dragResetTimer: ReturnType<typeof setTimeout> | null = null
let heroContentResizeObserver: ResizeObserver | null = null
let craftFooterResizeObserver: ResizeObserver | null = null
let craftFooterTransitionTimer: ReturnType<typeof setTimeout> | null = null
let craftFooterWheelArmTimer: ReturnType<typeof setTimeout> | null = null
let heroPageTransitionTimer: ReturnType<typeof setTimeout> | null = null
let homePageFadeTimer: ReturnType<typeof setTimeout> | null = null
let homePageContentExitTimer: ReturnType<typeof setTimeout> | null = null
let isCraftFooterTransitionLocked = false
let isCraftFooterWheelArmed = false
let isHomePageTransitioning = false
let homePointerStartY: number | null = null
let didHandleHomePointer = false
let newsWheelInteractionBounds: { left: number; right: number } | null = null
let menuElement: HTMLElement | null = null
let heroMetrics = {
  centerX: 0,
  centerY: 0,
  halfWidth: 1,
  halfHeight: 1,
}
const HERO_MOTION_SAMPLE_INTERVAL = 80
const CRAFT_PAGE_INDEX = homePageIndicatorItems.findIndex(
  (page) => page.id === 'craft'
)
const HOME_PAGE_TRANSITION_DURATION = 600
const HOME_PAGE_CONTENT_MOTION_DURATION = 600
const HERO_CONTENT_TRANSITION_DURATION = 1200
const HERO_INITIAL_ENTRANCE_DURATION = 1750
const HERO_PAGE_TRANSITION_DELAY = 340
const HOME_PAGE_CONTENT_EXIT_DURATION = 200
const HOME_INDICATOR_TRANSITION_RATIO = 0.72
const CRAFT_FOOTER_GESTURE_THRESHOLD = 42
const CRAFT_FOOTER_TRANSITION_DURATION = 720
const CRAFT_FOOTER_WHEEL_QUIET_DURATION = 160
const NEWS_WHEEL_GESTURE_THRESHOLD = 18

const homePageStyle = computed(() => ({
  '--home-craft-footer-height': craftFooterHeight.value,
  '--home-hero-counter-offset': heroContentCounterOffset.value,
  '--home-hero-content-duration': `${HERO_CONTENT_TRANSITION_DURATION}ms`,
  '--home-page-motion-duration': `${homePageMotionDuration.value}ms`,
}))
const homeIndicatorTrackStyle = computed(() => ({
  '--home-indicator-motion-duration': `${homeIndicatorTransitionDuration.value}ms`,
  transform: `translate3d(0, ${
    -(homeIndicatorPagePosition.value + 0.5) * HOME_INDICATOR_ITEM_STEP
  }em, 0)`,
  transitionDuration: `${homeIndicatorTransitionDuration.value}ms`,
}))

const syncCraftFooterHeight = () => {
  const footer = document.querySelector<HTMLElement>(
    '#page-footer-portal > .bottom-text'
  )
  if (!footer) return

  const height = Math.ceil(footer.getBoundingClientRect().height)
  if (height > 0) craftFooterHeight.value = `${height}px`
}

const connectCraftFooterResizeObserver = () => {
  craftFooterResizeObserver?.disconnect()
  const footer = document.querySelector<HTMLElement>(
    '#page-footer-portal > .bottom-text'
  )
  if (!footer) return

  craftFooterResizeObserver = new ResizeObserver(syncCraftFooterHeight)
  craftFooterResizeObserver.observe(footer)
  syncCraftFooterHeight()
}

const lockCraftFooterTransition = () => {
  isCraftFooterTransitionLocked = true
  if (craftFooterTransitionTimer) clearTimeout(craftFooterTransitionTimer)
  craftFooterTransitionTimer = setTimeout(() => {
    isCraftFooterTransitionLocked = false
    craftFooterTransitionTimer = null
  }, CRAFT_FOOTER_TRANSITION_DURATION)
}

const setCraftFooterVisible = (visible: boolean) => {
  if (isCraftFooterVisible.value === visible) return
  isCraftFooterVisible.value = visible
  lockCraftFooterTransition()
}

const disarmCraftFooterWheel = () => {
  isCraftFooterWheelArmed = false
  if (!craftFooterWheelArmTimer) return
  clearTimeout(craftFooterWheelArmTimer)
  craftFooterWheelArmTimer = null
}

const scheduleCraftFooterWheelArm = () => {
  disarmCraftFooterWheel()
  craftFooterWheelArmTimer = setTimeout(() => {
    craftFooterWheelArmTimer = null
    isCraftFooterWheelArmed =
      activeHomePageIndex.value === CRAFT_PAGE_INDEX && !isHomePageTransitioning
  }, CRAFT_FOOTER_WHEEL_QUIET_DURATION)
}

const consumeHomeGesture = (event: Event) => {
  event.preventDefault()
  event.stopPropagation()
}

const isNewsWheelInteraction = (event: WheelEvent) => {
  const target = recommendElement.value
  if (!target || activeHomePageIndex.value !== 0) return false

  if (!newsWheelInteractionBounds) {
    const bounds = target.getBoundingClientRect()
    newsWheelInteractionBounds = {
      left: bounds.left + bounds.width / 3,
      right: bounds.right - bounds.width / 3,
    }
  }

  return (
    event.clientX >= newsWheelInteractionBounds.left &&
    event.clientX <= newsWheelInteractionBounds.right
  )
}

const requestHeroPageTransition = (targetIndex = 1) => {
  const swiper = homeSwiper.value
  if (
    !swiper ||
    activeHomePageIndex.value !== 0 ||
    targetIndex <= 0 ||
    isHeroContentInactive.value
  ) {
    return
  }

  const resolvedTargetIndex = Math.min(
    targetIndex,
    getHomeLastPageIndex(swiper)
  )
  isHeroContentInactive.value = true
  ensureHomePageRendered(resolvedTargetIndex)
  pauseAuto()
  syncMarqueeViewportTop()
  swiper.allowSlideNext = false
  heroPageTransitionTimer = setTimeout(
    () => {
      heroPageTransitionTimer = null
      swiper.allowSlideNext = true
      swiper.slideTo(resolvedTargetIndex)
    },
    reducedMotionQuery?.matches ? 0 : HERO_PAGE_TRANSITION_DELAY
  )
}

const clearHomePageContentExitTimer = () => {
  if (!homePageContentExitTimer) return
  clearTimeout(homePageContentExitTimer)
  homePageContentExitTimer = null
}

const completeHomePageContentExit = () => {
  const targetIndex = pendingHomePageTransitionIndex.value
  const swiper = homeSwiper.value
  if (targetIndex === null || !swiper) return

  pendingHomePageTransitionIndex.value = null
  fadingHomePageIndex.value = null
  homePageContentExitTimer = null

  const targetPage = homePageIndicatorItems[targetIndex]
  renderedHomePageIds.value = new Set(targetPage ? [targetPage.id] : ['hero'])

  void nextTick(() => {
    if (homeSwiper.value === swiper) swiper.slideTo(targetIndex)
  })
}

const requestHomePageTransition = (targetIndex: number) => {
  const swiper = homeSwiper.value
  const activeIndex = activeHomePageIndex.value
  if (
    !swiper ||
    activeIndex === 0 ||
    targetIndex < 0 ||
    targetIndex > getHomeLastPageIndex(swiper) ||
    targetIndex === activeIndex ||
    isHomePageTransitioning ||
    pendingHomePageTransitionIndex.value !== null
  ) {
    return
  }

  pendingHomePageTransitionIndex.value = targetIndex
  fadingHomePageIndex.value = activeIndex
  homePageTransitionDirection.value =
    targetIndex > activeIndex ? 'forward' : 'backward'
  ensureHomePageRendered(targetIndex)
  clearHomePageContentExitTimer()
  homePageContentExitTimer = setTimeout(
    completeHomePageContentExit,
    reducedMotionQuery?.matches ? 0 : HOME_PAGE_CONTENT_EXIT_DURATION
  )
}

const handleHomeWheel = (event: WheelEvent) => {
  if (activeHomePageIndex.value === 0) {
    if (event.deltaY <= NEWS_WHEEL_GESTURE_THRESHOLD) return
    if (isHeroContentInactive.value) {
      consumeHomeGesture(event)
      return
    }
    if (isNewsWheelInteraction(event)) return

    consumeHomeGesture(event)
    requestHeroPageTransition()
    return
  }

  const activePage = activeHomePageIndex.value

  if (activePage === CRAFT_PAGE_INDEX) {
    if (isHomePageTransitioning || !isCraftFooterWheelArmed) {
      consumeHomeGesture(event)
      scheduleCraftFooterWheelArm()
      return
    }

    if (isCraftFooterTransitionLocked) {
      consumeHomeGesture(event)
      return
    }

    if (event.deltaY > 18) {
      consumeHomeGesture(event)
      setCraftFooterVisible(true)
      return
    }

    if (event.deltaY < -18 && isCraftFooterVisible.value) {
      consumeHomeGesture(event)
      setCraftFooterVisible(false)
      return
    }
  }

  if (
    isHomePageTransitioning ||
    pendingHomePageTransitionIndex.value !== null
  ) {
    consumeHomeGesture(event)
    return
  }

  if (event.deltaY > 18) {
    consumeHomeGesture(event)
    requestHomePageTransition(activePage + 1)
  } else if (event.deltaY < -18) {
    consumeHomeGesture(event)
    requestHomePageTransition(activePage - 1)
  }
  return
}

const handleNewsWheel = (event: WheelEvent) => {
  if (!isNewsWheelInteraction(event)) return

  consumeHomeGesture(event)
  const delta =
    Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX
  if (
    Math.abs(delta) < NEWS_WHEEL_GESTURE_THRESHOLD ||
    newsSwiper.value?.animating
  ) {
    return
  }

  if (delta > 0) nextSlide()
  else prevSlide()
}

const handleNewsWheelEnter = () => {
  newsWheelInteractionBounds = null
  pauseAuto()
}

const handleNewsWheelLeave = () => {
  newsWheelInteractionBounds = null
  resumeAuto()
}

const handleHomePointerDown = (event: PointerEvent) => {
  const activePage = activeHomePageIndex.value
  if (
    event.pointerType !== 'touch' ||
    (activePage !== 0 && activePage !== CRAFT_PAGE_INDEX)
  ) {
    return
  }

  homePointerStartY = event.clientY
  didHandleHomePointer = false
}

const handleHomePointerMove = (event: PointerEvent) => {
  if (event.pointerType !== 'touch' || homePointerStartY === null) return

  if (didHandleHomePointer) {
    consumeHomeGesture(event)
    return
  }

  const deltaY = homePointerStartY - event.clientY
  if (Math.abs(deltaY) < CRAFT_FOOTER_GESTURE_THRESHOLD) return

  if (activeHomePageIndex.value === 0) {
    if (deltaY > 0 || isHeroContentInactive.value) {
      consumeHomeGesture(event)
    }
    if (deltaY > 0 && !isHeroContentInactive.value) {
      requestHeroPageTransition()
    }
    didHandleHomePointer = true
    return
  }

  if (
    isHomePageTransitioning ||
    isCraftFooterTransitionLocked ||
    deltaY > 0 ||
    isCraftFooterVisible.value
  ) {
    consumeHomeGesture(event)
  }

  if (isHomePageTransitioning || isCraftFooterTransitionLocked) {
    didHandleHomePointer = true
  } else if (deltaY > 0) {
    setCraftFooterVisible(true)
    didHandleHomePointer = true
  } else if (isCraftFooterVisible.value) {
    setCraftFooterVisible(false)
    didHandleHomePointer = true
  }
}

const handleHomePointerEnd = (event: PointerEvent) => {
  if (event.pointerType === 'touch' && didHandleHomePointer) {
    consumeHomeGesture(event)
  }
  homePointerStartY = null
  didHandleHomePointer = false
}

const syncMarqueeViewportTop = () => {
  if (isHeroContentInactive.value) {
    if (menuElement) {
      marqueeViewportTop.value = `${
        menuElement.getBoundingClientRect().bottom
      }px`
    }
    return
  }

  const heroContentHeight = heroContentElement.value?.offsetHeight
  if (!heroContentHeight) return

  marqueeViewportTop.value = `${
    window.innerHeight / 2 + heroContentHeight / 2
  }px`
}

const handleReducedMotionChange = () => {
  syncHeroMotionListener()
}

const carouselDirection = computed(() =>
  isMobileCarousel.value ? 'horizontal' : 'vertical'
)
const swiperAutoplayOptions = computed(() => ({
  delay: 4000,
  disableOnInteraction: false,
  pauseOnMouseEnter: true,
}))
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
  newsWheelInteractionBounds = null
  heroResizeRafId = window.requestAnimationFrame(() => {
    heroResizeRafId = null
    syncHeroMotionListener()
    syncMarqueeViewportTop()
    syncCraftFooterHeight()
    if (homeSwiper.value) {
      syncHeroContentCounterOffset(
        homeSwiper.value,
        homeIndicatorPagePosition.value
      )
    }
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

const getHomeLastPageIndex = (swiper: SwiperInstance) =>
  Math.max(0, swiper.slides.length - 1)

const syncHeroContentCounterOffset = (
  swiper: SwiperInstance,
  pagePosition: number
) => {
  const slideHeight = swiper.height || window.innerHeight
  const nextOffset = `${Math.min(1, Math.max(0, pagePosition)) * slideHeight}px`
  if (heroContentCounterOffset.value !== nextOffset) {
    heroContentCounterOffset.value = nextOffset
  }
}

const syncHomePageProgress = (swiper: SwiperInstance, pagePosition: number) => {
  const lastPageIndex = getHomeLastPageIndex(swiper)
  visualStateStore.setPageScrollProgressOverride(
    lastPageIndex > 0 ? (pagePosition / lastPageIndex) * 100 : 0
  )
}

const syncAnimatedHomeProgress = () => {
  const swiper = homeSwiper.value
  if (!swiper) {
    homeProgressRafId = null
    return
  }

  const transform = getComputedStyle(swiper.wrapperEl).transform
  const translateY =
    transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42
  const slideHeight = swiper.height || window.innerHeight
  const lastPageIndex = getHomeLastPageIndex(swiper)
  const pagePosition = Math.min(
    lastPageIndex,
    Math.max(0, -translateY / slideHeight)
  )

  syncHomePageProgress(swiper, pagePosition)
  visualStateStore.setHomeHeaderScrollProgress(Math.min(1, pagePosition))

  if (isHomePageTransitioning) {
    homeProgressRafId = window.requestAnimationFrame(syncAnimatedHomeProgress)
  } else {
    homeProgressRafId = null
  }
}

const startAnimatedHomeProgressSync = () => {
  if (homeProgressRafId !== null) return
  homeProgressRafId = window.requestAnimationFrame(syncAnimatedHomeProgress)
}

const stopAnimatedHomeProgressSync = () => {
  if (homeProgressRafId === null) return
  window.cancelAnimationFrame(homeProgressRafId)
  homeProgressRafId = null
}

const ensureHomePageRendered = (pageIndex: number) => {
  const page = homePageIndicatorItems[pageIndex]
  if (!page || renderedHomePageIds.value.has(page.id)) return

  renderedHomePageIds.value = new Set(renderedHomePageIds.value).add(page.id)
}

const retainActiveHomePage = (pageIndex: number) => {
  const page = homePageIndicatorItems[pageIndex]
  renderedHomePageIds.value = new Set(page ? [page.id] : ['hero'])
}

const syncActiveHomePage = (swiper: SwiperInstance) => {
  const activePage = swiper.activeIndex
  ensureHomePageRendered(activePage)
  activeHomePageIndex.value = activePage
  isHeroContentInactive.value = activePage !== 0
  swiper.allowSlideNext = activePage !== 0
}

const setHomeSwiper = (swiper: SwiperInstance) => {
  homeSwiper.value = swiper
  syncActiveHomePage(swiper)
  homeIndicatorPagePosition.value = swiper.activeIndex
  syncHeroContentCounterOffset(swiper, swiper.activeIndex)
  syncHomePageProgress(swiper, swiper.activeIndex)
  visualStateStore.setHomeHeaderScrollProgress(swiper.activeIndex === 0 ? 0 : 1)
}

const handleHomeSetTranslate = (swiper: SwiperInstance, translate: number) => {
  const slideHeight = swiper.height || window.innerHeight
  if (slideHeight <= 0) return

  const lastPageIndex = getHomeLastPageIndex(swiper)
  const pagePosition = Math.min(
    lastPageIndex,
    Math.max(0, -translate / slideHeight)
  )
  homeIndicatorPagePosition.value = pagePosition
  syncHeroContentCounterOffset(swiper, pagePosition)
  if (homePageMotionDuration.value === 0) {
    syncHomePageProgress(swiper, pagePosition)
    visualStateStore.setHomeHeaderScrollProgress(Math.min(1, pagePosition))
  }
}

const handleHomeSetTransition = (_swiper: SwiperInstance, duration: number) => {
  homePageMotionDuration.value = duration
  homeIndicatorTransitionDuration.value =
    duration > 0 ? duration * HOME_INDICATOR_TRANSITION_RATIO : 0
}

const handleHomeSlideChange = (swiper: SwiperInstance) => {
  syncActiveHomePage(swiper)
  void nextTick(() => window.requestAnimationFrame(syncMarqueeViewportTop))
  if (swiper.activeIndex !== CRAFT_PAGE_INDEX) {
    isCraftFooterVisible.value = false
    disarmCraftFooterWheel()
  } else {
    void nextTick(() =>
      window.requestAnimationFrame(connectCraftFooterResizeObserver)
    )
  }
  if (swiper.activeIndex === 0) startAuto()
  else pauseAuto()
}

const handleHomeTransitionStart = (swiper: SwiperInstance) => {
  isHomePageTransitioning = true
  startAnimatedHomeProgressSync()
  if (swiper.activeIndex === CRAFT_PAGE_INDEX) disarmCraftFooterWheel()
  if (homePageFadeTimer) clearTimeout(homePageFadeTimer)
  enteringHomePageIndex.value = swiper.activeIndex
  leavingHomePageIndex.value = swiper.previousIndex
  homePageTransitionDirection.value =
    swiper.activeIndex > swiper.previousIndex ? 'forward' : 'backward'
  homePageFadeTimer = setTimeout(() => {
    enteringHomePageIndex.value = null
    leavingHomePageIndex.value = null
    homePageTransitionDirection.value = null
    homePageFadeTimer = null
  }, HOME_PAGE_CONTENT_MOTION_DURATION)
}

const handleHomeTransitionEnd = (swiper: SwiperInstance) => {
  isHomePageTransitioning = false
  stopAnimatedHomeProgressSync()
  homePageMotionDuration.value = 0
  void nextTick(() => window.requestAnimationFrame(syncMarqueeViewportTop))
  if (swiper.activeIndex === CRAFT_PAGE_INDEX) {
    scheduleCraftFooterWheelArm()
  }
  homeIndicatorTransitionDuration.value = 0
  homeIndicatorPagePosition.value = swiper.activeIndex
  retainActiveHomePage(swiper.activeIndex)
  syncHeroContentCounterOffset(swiper, swiper.activeIndex)
  syncHomePageProgress(swiper, swiper.activeIndex)
  visualStateStore.setHomeHeaderScrollProgress(swiper.activeIndex === 0 ? 0 : 1)
}

const goToHomePage = (index: number) => {
  if (isCraftFooterVisible.value) setCraftFooterVisible(false)
  if (activeHomePageIndex.value === 0 && index > 0) {
    requestHeroPageTransition(index)
    return
  }
  requestHomePageTransition(index)
}

const goToNextHomePage = () => {
  const nextIndex = Math.min(
    activeHomePageIndex.value + 1,
    homePageIndicatorItems.length - 1
  )
  if (nextIndex === activeHomePageIndex.value) return
  goToHomePage(nextIndex)
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
  isCarouselAutoplay.value =
    isPageVisible &&
    activeHomePageIndex.value === 0 &&
    newsItems.value.length > 1
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

onMounted(async () => {
  isPageVisible = document.visibilityState !== 'hidden'
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  heroMotionQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
  menuElement = document.querySelector<HTMLElement>('.el-menu-layout-all')
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  heroMotionQuery.addEventListener('change', syncHeroMotionListener)
  syncHeroMotionListener()
  syncMarqueeViewportTop()
  heroContentResizeObserver = new ResizeObserver(syncMarqueeViewportTop)
  if (heroContentElement.value) {
    heroContentResizeObserver.observe(heroContentElement.value)
  }
  startAuto()
  window.addEventListener('resize', handleHeroResize, { passive: true })
  window.addEventListener('blur', resetHeroSloganMotion)
  window.addEventListener('wheel', handleHomeWheel, {
    capture: true,
    passive: false,
  })
  window.addEventListener('pointerdown', handleHomePointerDown, true)
  window.addEventListener('pointermove', handleHomePointerMove, {
    capture: true,
    passive: false,
  })
  window.addEventListener('pointerup', handleHomePointerEnd, true)
  window.addEventListener('pointercancel', handleHomePointerEnd, true)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  await nextTick()
  window.requestAnimationFrame(connectCraftFooterResizeObserver)
})

onUnmounted(() => {
  stopAnimatedHomeProgressSync()
  visualStateStore.setHomeHeaderScrollProgress(0)
  visualStateStore.setPageScrollProgressOverride(null)
  if (dragResetTimer) clearTimeout(dragResetTimer)
  if (craftFooterTransitionTimer) clearTimeout(craftFooterTransitionTimer)
  disarmCraftFooterWheel()
  if (heroPageTransitionTimer) clearTimeout(heroPageTransitionTimer)
  if (homePageFadeTimer) clearTimeout(homePageFadeTimer)
  clearHomePageContentExitTimer()
  heroContentResizeObserver?.disconnect()
  heroContentResizeObserver = null
  craftFooterResizeObserver?.disconnect()
  craftFooterResizeObserver = null
  menuElement = null
  stopSloganMotion()
  if (heroResizeRafId !== null) window.cancelAnimationFrame(heroResizeRafId)
  window.removeEventListener('mousemove', handleHeroMouseMove)
  window.removeEventListener('resize', handleHeroResize)
  window.removeEventListener('blur', resetHeroSloganMotion)
  window.removeEventListener('wheel', handleHomeWheel, true)
  window.removeEventListener('pointerdown', handleHomePointerDown, true)
  window.removeEventListener('pointermove', handleHomePointerMove, true)
  window.removeEventListener('pointerup', handleHomePointerEnd, true)
  window.removeEventListener('pointercancel', handleHomePointerEnd, true)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
  heroMotionQuery?.removeEventListener('change', syncHeroMotionListener)
})
</script>

<style lang="less" scoped src="./index.less" />

<style lang="less" src="./global.less" />
