<template>
  <div class="home-page main-container">
    <section ref="heroSection" class="hero-section">
      <div class="hero-content">
        <div
          class="recommend"
          :style="recommendStyle"
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
            <SwiperSlide v-for="(item, i) in newsItems" :key="item.id">
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
                    :loading="i === activeIndex ? 'eager' : 'lazy'"
                    :fetchpriority="i === activeIndex ? 'high' : 'low'"
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
                  <div v-if="item.link" class="card-read">PEEP INSIDE >>></div>
                </div>

                <div class="card-watermark">
                  {{ String(i + 1).padStart(2, '0') }}
                </div>
              </div>
            </SwiperSlide>
          </Swiper>

          <button class="nav-btn nav-btn--next" @click="nextSlide">
            <span class="nav-triangle" aria-hidden="true" />
          </button>

          <div class="carousel-progress">
            <div
              v-for="(_, i) in newsItems"
              :key="i"
              class="progress-bar"
              :class="{ active: i === activeIndex }"
              @click="goTo(i)"
            />
          </div>

          <div class="carousel-counter">
            <span class="counter-cur">{{
              String(activeIndex + 1).padStart(2, '0')
            }}</span>
            <span class="counter-sep">/</span>
            <span class="counter-total">{{
              String(newsItems.length).padStart(2, '0')
            }}</span>
          </div>
        </div>

        <div class="main-slogan" :style="mainSloganStyle">
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

      <button
        class="scroll-indicator screen-jump"
        type="button"
        :aria-label="$t('scroll')"
        @click="scrollToNextScreenFromHero"
      >
        <span class="scroll-text">{{ $t('scroll') }}</span>
        <div class="scroll-line" />
      </button>
    </section>

    <section
      ref="manifestoSection"
      class="manifesto-section home-indexed-section"
    >
      <button
        v-if="!isMobileCarousel"
        class="back-first-screen screen-jump no-rem"
        type="button"
        aria-label="返回第一屏"
        @click="scrollToFirstScreen"
      >
        <div class="scroll-line scroll-line--up" />
        <span class="scroll-text scroll-text--below">返回第一屏</span>
      </button>

      <Sections
        section-number="01"
        rail-label="ABOUT"
        :title="$t('home.title01')"
        title-en="ABOUT ME"
      >
        <div v-if="locale === 'en'" class="manifesto-content">
          <div class="background-squares">
            <div
              v-for="(img, index) in backgroundImages"
              :key="img.id"
              class="square-image"
              :class="{ rotating: rotatingImageIndex === index }"
              :style="{
                left: `${img.left}%`,
                top: `${img.top}%`,
                width: `${img.size}px`,
                height: `${img.size}px`,
                transform: `rotate(${img.rotation}deg)`,
              }"
            >
              <img
                :src="'https://assets.anuluca.com/Logo/' + (index + 1) + '.jpg'"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <p>I'm <span style="color: #e23456">Anu</span>luca.</p>
          <p class="highlight">{{ $t('home.highlight') }}</p>
          <p class="desc">
            This is the place where I can share my work, thoughts, and fragments
            of my life.<br />
            I want to build digital experiences that live on the edge of
            creativity and performance.
          </p>
        </div>
        <div v-else class="manifesto-content cn-font">
          <div class="background-squares">
            <div
              v-for="(img, index) in backgroundImages"
              :key="img.id"
              class="square-image"
              :class="{ rotating: rotatingImageIndex === index }"
              :style="{
                left: `${img.left}%`,
                top: `${img.top}%`,
                width: `${img.size}px`,
                height: `${img.size}px`,
              }"
            >
              <img
                :src="'https://assets.anuluca.com/Logo/' + (index + 1) + '.jpg'"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <p>我是 <span style="color: #e23456">路卡</span>。</p>
          <p class="highlight">{{ $t('home.highlight') }}</p>
          <p class="desc">
            这里是我用来堆放作品、想法和生活碎片的小地方。<br />
            我想慢慢把它打造成一个毛糙但有温度、有创意，也有自己脾气的数字空间。
          </p>
        </div>
      </Sections>
    </section>

    <section class="works-section home-indexed-section">
      <Sections
        section-number="02"
        rail-label="WORKS"
        :title="$t('home.title02')"
        title-en="SELECTED ARCHIVES"
      >
        <template #actions>
          <RouterLink class="archive-entry" to="/archive">
            <span class="archive-entry__text">
              {{ locale === 'en' ? 'VIEW ALL' : '全部项目' }}
            </span>
            <span class="archive-entry__arrow">→</span>
          </RouterLink>
        </template>

        <div class="home-module-grid">
          <div class="works-grid">
            <WorkCard
              v-for="(work, index) in works"
              :key="work.id"
              :work="work"
              :index="index"
              @select="openWorkDetail(work)"
            />
          </div>
          <RouterLink class="and-more-entry" to="/archive">
            AND MORE...
          </RouterLink>
        </div>
      </Sections>
    </section>

    <section class="journey-section home-indexed-section">
      <Sections
        section-number="03"
        rail-label="FLÂNERIE"
        :title="$t('home.title03')"
        title-en="FLÂNERIE LOG"
      >
        <template #actions>
          <RouterLink class="archive-entry" to="/flanerie">
            <span class="archive-entry__text">
              {{ $t('home.journeyViewAll') }}
            </span>
            <span class="archive-entry__arrow">→</span>
          </RouterLink>
        </template>

        <div class="home-module-grid">
          <div class="journey-grid">
            <VlogCard
              v-for="vlog in journeyVlogs"
              :key="vlog.id"
              :vlog="vlog"
              :interactive="true"
              @select="openVlog(vlog.id)"
            />
          </div>
          <RouterLink class="and-more-entry" to="/flanerie">
            AND MORE...
          </RouterLink>
        </div>
      </Sections>
    </section>

    <section class="craft-section home-indexed-section">
      <Sections
        section-number="04"
        rail-label="CRAFT"
        :title="$t('home.title04')"
        title-en="UTILITY CRAFTS"
      >
        <template #actions>
          <RouterLink class="archive-entry" to="/craft">
            <span class="archive-entry__text">
              {{ $t('home.craftViewAll') }}
            </span>
            <span class="archive-entry__arrow">→</span>
          </RouterLink>
        </template>

        <div class="home-module-grid">
          <div class="home-craft-grid">
            <ToolCard
              v-for="(tool, index) in homeTools"
              :key="tool.id"
              :tool="tool"
              :index="index"
              :total="homeTools.length"
              @select="openTool(tool)"
            />
          </div>
          <RouterLink class="and-more-entry" to="/craft">
            AND MORE...
          </RouterLink>
        </div>
      </Sections>
    </section>

    <PageFooter />
    <WorkDetailModal
      :work="selectedWork"
      :visible="!!selectedWork"
      @close="selectedWork = null"
    />
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
import PageFooter from '@/components/PageFooter/index.vue'
import Sections from '@/components/Sections/index.vue'
import ToolCard from '@/components/ToolCard/index.vue'
import VlogCard from '@/components/VlogCard/index.vue'
import WorkCard from '@/components/WorkCard/index.vue'
import WorkDetailModal from '@/components/WorkDetailModal/index.vue'
import { trackProjectClick, trackToolClick } from '@/utils/analytics'

import 'swiper/css'

const { locale, tm } = useI18n()
const router = useRouter()

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

const newsItems = computed<NewsItem[]>(() => {
  return tm('home.dynamic.recommend') as NewsItem[]
})

const activeIndex = ref(0)
const newsSwiper = ref<SwiperInstance | null>(null)
const isCarouselAutoplay = ref(false)
let rotationTimer: ReturnType<typeof setInterval> | null = null
let rotationResetTimer: ReturnType<typeof setTimeout> | null = null
let sectionObserver: IntersectionObserver | null = null
let isPageVisible = true
let isHeroVisible = true
let isManifestoVisible = false

const heroSection = ref<HTMLElement | null>(null)
const manifestoSection = ref<HTMLElement | null>(null)
const passionLine = ref<HTMLElement | null>(null)
const swiperModules = [Autoplay, Mousewheel]
const sloganRotateX = ref(0)
const sloganRotateY = ref(0)
const sloganMoveX = ref(0)
const sloganMoveY = ref(0)
const isPassionHovering = ref(false)

const sloganTargetRotateX = ref(0)
const sloganTargetRotateY = ref(0)
const sloganTargetMoveX = ref(0)
const sloganTargetMoveY = ref(0)

let sloganRafId: number | null = null
let reducedMotionQuery: MediaQueryList | null = null
let heroMotionQuery: MediaQueryList | null = null
let lastMotionSampleTime = 0
let isHeroMotionListenerActive = false
let isFirstScreenAutoScrolling = false
let firstScreenTouchStartY = 0
let heroMetrics = {
  centerX: 0,
  centerY: 0,
  halfWidth: 1,
  halfHeight: 1,
  nextSectionTop: 0,
  scrollY: 0,
}
let passionHoverBounds = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
}

const HERO_MOTION_SAMPLE_INTERVAL = 80
const PASSION_HOVER_PADDING = 32
const FIRST_SCREEN_SCROLL_LOCK_MS = 900
const SECOND_SCREEN_SCROLL_BUFFER = 120
const SECOND_SCREEN_RETURN_ZONE = 120
const isHeroMotionEnabled = ref(false)
const isMobileCarousel = ref(false)

const carouselDirection = computed(() =>
  isMobileCarousel.value ? 'horizontal' : 'vertical'
)

const swiperAutoplayOptions = computed(() => {
  return {
    delay: 4000,
    disableOnInteraction: false,
    pauseOnMouseEnter: true,
  }
})

const carouselMousewheelOptions = computed(() =>
  isMobileCarousel.value
    ? false
    : {
        forceToAxis: true,
        releaseOnEdges: true,
        thresholdDelta: 18,
      }
)

const mainSloganRotation = computed(
  () => `rotateX(${sloganRotateX.value}deg) rotateY(${-sloganRotateY.value}deg)`
)

const recommendRotation = computed(
  () =>
    `rotateX(${sloganRotateX.value * 0.72}deg) rotateY(${
      sloganRotateY.value * 0.72
    }deg)`
)

const mainSloganStyle = computed(() =>
  isHeroMotionEnabled.value
    ? {
        transform: `perspective(1000px) translate3d(0px, 0px, 0) ${recommendRotation.value}`,
      }
    : {}
)

const recommendStyle = computed(() =>
  isHeroMotionEnabled.value
    ? {
        transform: `perspective(1000px) translate3d(0px, 0px, 0) ${mainSloganRotation.value}`,
      }
    : {}
)

const stopSloganMotion = () => {
  if (!sloganRafId) return
  cancelAnimationFrame(sloganRafId)
  sloganRafId = null
}

const updateSloganMotion = () => {
  sloganRotateX.value +=
    (sloganTargetRotateX.value - sloganRotateX.value) * 0.12
  sloganRotateY.value +=
    (sloganTargetRotateY.value - sloganRotateY.value) * 0.12
  sloganMoveX.value += (sloganTargetMoveX.value - sloganMoveX.value) * 0.12
  sloganMoveY.value += (sloganTargetMoveY.value - sloganMoveY.value) * 0.12

  const isSettled =
    Math.abs(sloganTargetRotateX.value - sloganRotateX.value) < 0.01 &&
    Math.abs(sloganTargetRotateY.value - sloganRotateY.value) < 0.01 &&
    Math.abs(sloganTargetMoveX.value - sloganMoveX.value) < 0.01 &&
    Math.abs(sloganTargetMoveY.value - sloganMoveY.value) < 0.01

  if (isSettled) {
    sloganRotateX.value = sloganTargetRotateX.value
    sloganRotateY.value = sloganTargetRotateY.value
    sloganMoveX.value = sloganTargetMoveX.value
    sloganMoveY.value = sloganTargetMoveY.value
    sloganRafId = null
    return
  }

  sloganRafId = requestAnimationFrame(updateSloganMotion)
}

const startSloganMotion = () => {
  if (!sloganRafId) {
    sloganRafId = requestAnimationFrame(updateSloganMotion)
  }
}

const resetHeroSloganMotion = () => {
  sloganTargetRotateX.value = 0
  sloganTargetRotateY.value = 0
  sloganTargetMoveX.value = 0
  sloganTargetMoveY.value = 0
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
      nextSectionTop:
        manifestoSection.value?.offsetTop ?? heroMetrics.nextSectionTop,
      scrollY: window.scrollY,
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

const isInFirstScreenScrollZone = () => {
  if (isMobileCarousel.value || !manifestoSection.value) return false

  return (
    window.scrollY < heroMetrics.nextSectionTop - 80 &&
    window.scrollY < window.innerHeight * 0.9
  )
}

const isInSecondScreenReturnZone = () => {
  if (isMobileCarousel.value || !manifestoSection.value) return false

  return (
    window.scrollY > 0 &&
    window.scrollY <=
      heroMetrics.nextSectionTop +
        SECOND_SCREEN_SCROLL_BUFFER +
        SECOND_SCREEN_RETURN_ZONE
  )
}

const scrollToNextScreenFromHero = () => {
  if (!manifestoSection.value || isFirstScreenAutoScrolling) return

  const targetTop =
    heroMetrics.nextSectionTop || manifestoSection.value.offsetTop
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  )

  isFirstScreenAutoScrolling = true
  window.scrollTo({
    top: Math.min(
      maxScroll,
      targetTop + (isMobileCarousel.value ? 0 : SECOND_SCREEN_SCROLL_BUFFER)
    ),
    behavior: reducedMotionQuery?.matches ? 'auto' : 'smooth',
  })

  window.setTimeout(() => {
    isFirstScreenAutoScrolling = false
    refreshHeroInteractionMetrics()
  }, FIRST_SCREEN_SCROLL_LOCK_MS)
}

const scrollToFirstScreen = () => {
  if (isFirstScreenAutoScrolling) return

  isFirstScreenAutoScrolling = true
  window.scrollTo({
    top: heroSection.value?.offsetTop || 0,
    behavior: reducedMotionQuery?.matches ? 'auto' : 'smooth',
  })

  window.setTimeout(() => {
    isFirstScreenAutoScrolling = false
    refreshHeroInteractionMetrics()
  }, FIRST_SCREEN_SCROLL_LOCK_MS)
}

const isEventFromRecommend = (event: Event) => {
  const target = event.target
  return target instanceof Element && !!target.closest('.recommend')
}

const handleFirstScreenWheel = (event: WheelEvent) => {
  if (isEventFromRecommend(event)) return

  if (event.deltaY > 0 && isInFirstScreenScrollZone()) {
    event.preventDefault()
    scrollToNextScreenFromHero()
    return
  }

  if (event.deltaY < 0 && isInSecondScreenReturnZone()) {
    event.preventDefault()
    scrollToFirstScreen()
  }
}

const handleFirstScreenTouchStart = (event: TouchEvent) => {
  firstScreenTouchStartY = event.touches[0]?.clientY ?? 0
}

const handleFirstScreenTouchMove = (event: TouchEvent) => {
  const currentY = event.touches[0]?.clientY ?? firstScreenTouchStartY
  const swipeUpDistance = firstScreenTouchStartY - currentY

  if (swipeUpDistance <= 24 || !isInFirstScreenScrollZone()) return

  event.preventDefault()
  scrollToNextScreenFromHero()
}

const canUseHeroMotion = () => {
  return (
    window.innerWidth >= 768 &&
    !!heroMotionQuery?.matches &&
    !reducedMotionQuery?.matches
  )
}

const syncHeroMotionListener = () => {
  isMobileCarousel.value = window.innerWidth < 768
  refreshHeroInteractionMetrics()
  const shouldListen = canUseHeroMotion()
  isHeroMotionEnabled.value = shouldListen

  if (shouldListen && !isHeroMotionListenerActive) {
    window.addEventListener('mousemove', handleHeroMouseMove, {
      passive: true,
    })
    isHeroMotionListenerActive = true
  }

  if (!shouldListen && isHeroMotionListenerActive) {
    window.removeEventListener('mousemove', handleHeroMouseMove)
    isHeroMotionListenerActive = false
  }

  if (!shouldListen) {
    resetHeroSloganMotion()
  }
}

const handleHeroResize = () => {
  syncHeroMotionListener()
}

const handleHeroMouseMove = (event: MouseEvent) => {
  const now = performance.now()
  if (now - lastMotionSampleTime < HERO_MOTION_SAMPLE_INTERVAL) return
  lastMotionSampleTime = now

  if (
    !isPageVisible ||
    !isHeroVisible ||
    !isHeroMotionEnabled.value ||
    !heroSection.value
  ) {
    isPassionHovering.value = false
    return
  }

  if (Math.abs(window.scrollY - heroMetrics.scrollY) > 48) {
    refreshHeroInteractionMetrics()
  }

  syncPassionHoverState(event)

  const offsetX = (event.clientX - heroMetrics.centerX) / heroMetrics.halfWidth
  const offsetY = (event.clientY - heroMetrics.centerY) / heroMetrics.halfHeight
  const clampedX = Math.max(-1, Math.min(1, offsetX))
  const clampedY = Math.max(-1, Math.min(1, offsetY))

  sloganTargetRotateY.value = clampedX * 10
  sloganTargetRotateX.value = clampedY * -8
  sloganTargetMoveX.value = clampedX * 18
  sloganTargetMoveY.value = clampedY * 14
  startSloganMotion()
}

const setNewsSwiper = (swiper: SwiperInstance) => {
  newsSwiper.value = swiper
  activeIndex.value = swiper.realIndex || 0
  if (isCarouselAutoplay.value) {
    swiper.autoplay.start()
  } else {
    swiper.autoplay.stop()
  }
}

const prevSlide = () => {
  if (!newsItems.value.length) return
  newsSwiper.value?.slidePrev()
}
const nextSlide = () => {
  if (!newsItems.value.length) return
  newsSwiper.value?.slideNext()
}
const goTo = (i: number) => {
  newsSwiper.value?.slideToLoop(i)
}

const handleSwiperSlideChange = (swiper: SwiperInstance) => {
  activeIndex.value = swiper.realIndex
}

let didDragSwiper = false
let dragResetTimer: ReturnType<typeof setTimeout> | null = null

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
    isPageVisible && isHeroVisible && newsItems.value.length > 1
  if (isCarouselAutoplay.value) {
    newsSwiper.value?.autoplay.start()
  } else {
    newsSwiper.value?.autoplay.stop()
  }
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
    return
  }

  if (/^https?:\/\//.test(item.link)) {
    window.location.href = item.link
    return
  }

  router.push(item.link)
}

interface BackgroundImage {
  id: string
  left: number
  top: number
  size: number
  rotation: number
}
const backgroundImages = ref<BackgroundImage[]>([])
const rotatingImageIndex = ref(-1)

const generateBackgroundImages = () => {
  backgroundImages.value = Array.from({ length: 6 }, (_, i) => ({
    id: `sq-${i}`,
    left: Math.random() * 90,
    top: Math.random() * 90,
    size: 80 + Math.random() * 120,
    rotation: Math.random() * 360,
  }))
}
const startRandomRotation = () => {
  if (
    !isPageVisible ||
    !isManifestoVisible ||
    !backgroundImages.value.length ||
    rotationTimer
  ) {
    return
  }

  rotationTimer = setInterval(() => {
    rotatingImageIndex.value = Math.floor(
      Math.random() * backgroundImages.value.length
    )
    if (rotationResetTimer) clearTimeout(rotationResetTimer)
    rotationResetTimer = setTimeout(() => {
      rotatingImageIndex.value = -1
      rotationResetTimer = null
    }, 2000)
  }, 3000)
}

const stopRandomRotation = () => {
  if (!rotationTimer) return
  clearInterval(rotationTimer)
  rotationTimer = null
  if (rotationResetTimer) {
    clearTimeout(rotationResetTimer)
    rotationResetTimer = null
  }
  rotatingImageIndex.value = -1
}

const handleVisibilityChange = () => {
  isPageVisible = document.visibilityState !== 'hidden'

  if (!isPageVisible) {
    pauseAuto()
    stopRandomRotation()
    resetHeroSloganMotion()
    return
  }

  startAuto()
  startRandomRotation()
}

const observeAnimatedSections = () => {
  if (!('IntersectionObserver' in window)) {
    isHeroVisible = true
    isManifestoVisible = true
    handleVisibilityChange()
    return
  }

  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroSection.value) {
          isHeroVisible = entry.isIntersecting
          if (isHeroVisible) startAuto()
          else {
            pauseAuto()
            resetHeroSloganMotion()
          }
        }

        if (entry.target === manifestoSection.value) {
          isManifestoVisible = entry.isIntersecting
          if (isManifestoVisible) startRandomRotation()
          else stopRandomRotation()
        }
      })
    },
    { rootMargin: '180px 0px', threshold: 0.01 }
  )

  if (heroSection.value) sectionObserver.observe(heroSection.value)
  if (manifestoSection.value) sectionObserver.observe(manifestoSection.value)
}

onMounted(() => {
  isPageVisible = document.visibilityState !== 'hidden'
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  heroMotionQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
  reducedMotionQuery.addEventListener('change', syncHeroMotionListener)
  heroMotionQuery.addEventListener('change', syncHeroMotionListener)
  generateBackgroundImages()
  observeAnimatedSections()
  syncHeroMotionListener()
  refreshHeroInteractionMetrics()
  window.addEventListener('wheel', handleFirstScreenWheel, {
    passive: false,
    capture: true,
  })
  window.addEventListener('touchstart', handleFirstScreenTouchStart, {
    passive: true,
    capture: true,
  })
  window.addEventListener('touchmove', handleFirstScreenTouchMove, {
    passive: false,
    capture: true,
  })
  window.addEventListener('resize', handleHeroResize, { passive: true })
  window.addEventListener('blur', resetHeroSloganMotion)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})
onUnmounted(() => {
  if (dragResetTimer) clearTimeout(dragResetTimer)
  stopSloganMotion()
  sectionObserver?.disconnect()
  window.removeEventListener('mousemove', handleHeroMouseMove)
  window.removeEventListener('wheel', handleFirstScreenWheel, {
    capture: true,
  })
  window.removeEventListener('touchstart', handleFirstScreenTouchStart, {
    capture: true,
  })
  window.removeEventListener('touchmove', handleFirstScreenTouchMove, {
    capture: true,
  })
  window.removeEventListener('resize', handleHeroResize)
  window.removeEventListener('blur', resetHeroSloganMotion)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  reducedMotionQuery?.removeEventListener('change', syncHeroMotionListener)
  heroMotionQuery?.removeEventListener('change', syncHeroMotionListener)
})

interface WorkItem {
  id: string
  title: string
  tags: string[]
  img: string
  company: string
  logo: string
  time: string
  description?: string
  details?: string[]
  images?: string[]
  imageDescriptions?: string[]
  links?: Array<{ label: string; url: string; icon?: string }>
  participation?: number
  confidential?: boolean
}

const selectedWorkIds = ['W001', 'W003', 'W005', 'W002', 'W006', 'P003']

const works = computed<WorkItem[]>(() => {
  const webArchives = tm('archive.dynamic.WebArchives') as WorkItem[]
  const personalArchives = tm('archive.dynamic.PersonalArchives') as WorkItem[]
  const archives = [...webArchives, ...personalArchives]

  return selectedWorkIds
    .map((id) => archives.find((work) => work.id === id))
    .filter((work): work is WorkItem => Boolean(work))
})

const selectedWork = ref<WorkItem | null>(null)

const openWorkDetail = (work: WorkItem) => {
  selectedWork.value = work
  trackProjectClick({
    id: work.id,
    title: work.title,
    source: 'home',
  })
}

interface JourneyVlog {
  id: string
  title: string
  date: string
  img: string
  img2?: string
}

const journeyVlogIds = ['jiujiang', 'nanjing', 'singapore']

const journeyVlogs = computed<JourneyVlog[]>(() => {
  const vlogs = tm('flanerie.dynamic.vlogs') as JourneyVlog[]
  return journeyVlogIds
    .map((id) => vlogs.find((vlog) => vlog.id === id))
    .filter((vlog): vlog is JourneyVlog => Boolean(vlog))
})

const openVlog = (vlogId: string) => {
  router.push(`/flanerie/${vlogId}`)
}

interface HomeTool {
  id: string
  title: string
  sub: string
  tags: string[]
  category: 'work' | 'general'
  icon: string
  img?: string
  statusLabel: string
  link: string
}

const homeToolIds = ['bounce-dynamics', 'metronome', 'palette', 'image-base64']

const homeTools = computed<HomeTool[]>(() => {
  const tools = tm('craft.dynamic.tools') as HomeTool[]
  return homeToolIds
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool): tool is HomeTool => Boolean(tool))
})

const openTool = (tool: HomeTool) => {
  trackToolClick({
    id: tool.id,
    title: tool.title,
    source: 'home',
  })
  router.push(tool.link)
}
</script>

<style lang="less" scoped src="./index.less" />

<style lang="less" src="./global.less" />
