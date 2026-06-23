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
                    <span class="card-cat">{{ item.category }}</span>
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

      <HomeSectionBlock
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
            在这里，我呈现我的作品、观察与生活碎片。<br />
            我想要打造一个有灵魂与创意的数字空间。
          </p>
        </div>
      </HomeSectionBlock>
    </section>

    <section class="works-section home-indexed-section">
      <HomeSectionBlock
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
      </HomeSectionBlock>
    </section>

    <section class="journey-section home-indexed-section">
      <HomeSectionBlock
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
      </HomeSectionBlock>
    </section>

    <section class="craft-section home-indexed-section">
      <HomeSectionBlock
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
      </HomeSectionBlock>
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

import HomeSectionBlock from '@/components/HomeSectionBlock/index.vue'
import LogoOnly3D from '@/components/LogoOnly3D/index.vue'
import MarqueeShowcase from '@/components/MarqueeShowcase/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
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

<style lang="less" scoped>
.home-page {
  width: 100%;
}

.hero-section {
  position: relative;
  min-height: calc(100vh - 220px);
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  padding-bottom: 80px;
}

.hero-content {
  width: 100%;
  display: flex;
  align-items: end;
  justify-content: center;
  gap: 0;
  margin-top: -60px;
  perspective: 1200px;
}

.recommend {
  width: 22rem;
  height: 12.75rem;
  flex-shrink: 0;
  position: relative;
  order: 2;
  overflow: visible;
  z-index: 1;
  transform-origin: 50% 50%;
  transform-style: preserve-3d;
  will-change: transform;
  opacity: 0;
  filter: blur(14px) saturate(0.72);
  animation: homeCarouselIn 0.9s cubic-bezier(0.23, 1, 0.32, 1) 0.42s forwards;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    transform: translate3d(12px, 35px, -1px);
    background: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.32) 0%,
      rgba(69, 69, 69, 0.787) 48%,
      rgba(0, 0, 0, 0.1) 100%
    );
    opacity: 0.9;
    transform-origin: center center;
    animation: cardsProjectionIn 1.24s cubic-bezier(0.23, 1, 0.32, 1) 0.42s both;
    mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 18%,
      #000 78%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 18%,
      #000 78%,
      transparent 100%
    );
    will-change: transform;
  }
}

.cards-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  touch-action: pan-y;
  transform-origin: center center;
  will-change: transform;
  animation: cardsViewportIn 1.24s cubic-bezier(0.23, 1, 0.32, 1) 0.42s both;
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 10%,
    #000 90%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 10%,
    #000 90%,
    transparent 100%
  );

  :deep(.swiper-wrapper),
  :deep(.swiper-slide) {
    height: 100%;
  }

  :deep(.swiper-wrapper) {
    transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  :deep(.swiper-slide) {
    position: relative;
    overflow: hidden;
  }
}

.news-card {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &:hover {
    .card-img img {
      transform: scale(1.04);
    }
    .card-read {
      opacity: 1;
      transform: skew(-10deg);
      right: 20px;
      bottom: 2.2rem;
    }
  }
}

.card-img {
  position: relative;
  width: 100%;
  flex: 1;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: brightness(0.8) saturate(0.8);
    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .card-img-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent 30%,
      rgba(10, 5, 10, 0.85) 100%
    );
  }
}

.card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 14px 16px 20px;
  z-index: 2;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: start;
  margin-bottom: 7px;
}

.card-cat {
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 0.55rem;
  letter-spacing: 3px;
  color: #fff;
  background: #e23456;
  padding: 3px 8px;
  padding-top: 0px;
  padding-right: 6px;
  line-height: 1.6;
}

.card-date {
  position: absolute;
  right: 0;
  bottom: 0;
  font-family: 'anton', monospace;
  font-size: 1rem;
  line-height: 1;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.185);
  white-space: nowrap;
}

.card-title {
  font-family: 'cn-custom', sans-serif;
  font-size: 1.15rem;
  font-weight: 100;
  line-height: 1.2;
  color: #fff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-text-stroke: 1px #000000;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-subtitle {
  position: relative;
  margin-bottom: 8px;
  > .subtitle {
    display: -webkit-box;
    padding-right: 5.75rem;
    font-size: 0.6rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.45);
    font-family: 'source-han-sans-simplified-c';
    line-height: 1.5;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

.card-read {
  position: absolute;
  bottom: 1rem;
  right: 150px;
  transform: skew(-30deg);
  font-family: 'anton', monospace;
  font-size: 2rem;
  opacity: 0;
  z-index: -1;
  text-shadow: 6px 6px 0 #00000070;
  transition: all 0.4s;
  letter-spacing: 1px;
  color: #e23456;
  display: flex;
  align-items: center;
  gap: 4px;

  span {
    display: inline-block;
    transition: transform 0.25s ease;
  }
}

.card-watermark {
  position: absolute;
  top: 8px;
  right: 10px;
  font-family: 'anton', sans-serif;
  font-size: 3.5rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.06);
  z-index: 1;
  pointer-events: none;
  letter-spacing: -2px;
}

.nav-btn {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: 34px;
  height: 34px;
  background: transparent;
  border: 0;
  box-shadow: none;
  color: var(--text-color);
  display: flex;
  align-items: center;
  border-radius: 0;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;

  &--prev {
    top: -17px;

    .nav-triangle {
      border-right: 10px solid transparent;
      border-bottom: 16px solid
        color-mix(in srgb, var(--text-color) 58%, transparent);
      border-left: 10px solid transparent;
    }
  }
  &--next {
    bottom: -17px;

    .nav-triangle {
      border-top: 16px solid
        color-mix(in srgb, var(--text-color) 58%, transparent);
      border-right: 10px solid transparent;
      border-left: 10px solid transparent;
    }
  }

  &:hover {
    .nav-triangle {
      filter: drop-shadow(0 0 10px rgba(226, 52, 86, 0.8));
      transform: scale(1.34);
    }

    &.nav-btn--prev .nav-triangle {
      border-bottom-color: #e23456;
    }

    &.nav-btn--next .nav-triangle {
      border-top-color: #e23456;
    }
  }

  &:active {
    transform: translateX(-50%) scale(0.92);
  }
}

.nav-triangle {
  display: block;
  width: 0;
  height: 0;
  transform-origin: center;
  transition: border-color 0.2s ease, filter 0.2s ease, transform 0.2s ease;
}

.carousel-progress {
  position: absolute;
  top: 0;
  bottom: 0;
  left: auto;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  z-index: 5;
  width: 4px;
  height: auto;
  transform-origin: center center;
  will-change: transform;
  animation: cardsViewportIn 1.24s cubic-bezier(0.23, 1, 0.32, 1) 0.42s both;
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 10%,
    #000 90%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 10%,
    #000 90%,
    transparent 100%
  );
}

.progress-bar {
  flex: 1;
  width: 100%;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: background 0.3s ease;

  &.active {
    background: #e23456;
  }

  &:hover:not(.active) {
    background: rgba(255, 255, 255, 0.3);
  }
}

.carousel-counter {
  position: absolute;
  top: -40px;
  right: 0;
  display: flex;
  align-items: baseline;
  gap: 2px;
  z-index: 5;

  .counter-cur {
    font-family: 'anton', monospace;
    font-size: 1.2rem;
    color: #e23456;
    letter-spacing: 1px;
  }
  .counter-sep {
    font-family: 'anton', monospace;
    font-size: 0.9rem;
    color: var(--opacity-color);
  }
  .counter-total {
    font-family: 'anton', monospace;
    font-size: 0.7rem;
    color: var(--opacity-color);
    letter-spacing: 1px;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.4s ease,
    transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.main-slogan {
  position: relative;
  overflow: visible;
  order: 1;
  padding-right: 1rem;
  padding-top: 100px;
  margin-right: clamp(-2.25rem, -2.5vw, -1.25rem);
  margin-bottom: clamp(2rem, 5vh, 4rem);
  z-index: 3;
  transform-origin: 50% 58%;
  transform-style: preserve-3d;
  will-change: transform;

  .logoWith3d {
    zoom: 1.6;
    opacity: 0;
    position: absolute;
    right: -100px;
    top: -30px;
    z-index: -1;
    animation: logoFadeInScale 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)
      forwards;
    animation-delay: 0.5s;
  }

  .moto {
    &.moto-cn {
      padding-right: 130px;
      * {
        font-family: 'cn-custom';
      }
      > p {
        line-height: 1.6rem;
      }
      > div {
        font-family: 'cn-custom';
        font-size: 1.2rem;
        height: 0.1rem;
        margin-top: 35px;
      }
    }

    * {
      font-family: 'anton', 'source-han-sans-simplified-c';
      font-size: 5.6rem;
      text-shadow: 0 14px 34px rgba(0, 0, 0, 0.48),
        0 4px 12px rgba(0, 0, 0, 0.36);
      opacity: 0;
      transform: translateY(30px);
      animation: motoFadeIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      line-height: 1.15;
    }
    > p {
      line-height: 5.12rem;
    }

    > div {
      font-size: 0.88rem;
      animation: motoFadeIn2 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      animation-delay: 1s;
      font-family: 'cn-custom';
      /* border-top: 1px solid var(--text-color); */
      margin-top: 0.3rem;
      margin-left: 4px;
    }

    p:nth-child(1) {
      animation-delay: 0.2s;
    }
    p:nth-child(2) {
      animation-delay: 0.4s;
    }
    p:nth-child(3) {
      animation-delay: 0.6s;
    }
    p:nth-child(4) {
      animation-delay: 0.6s;
    }

    .passion-line {
      position: relative;
      font-size: 7.3rem;
      line-height: 5.12rem;
      margin-top: -0.5rem;
      margin-left: -2px;
      display: block;

      &::before {
        content: '';
        position: absolute;
        inset: -0.12em -0.08em -0.16em -0.02em;
        background: rgba(0, 0, 0, 0.001);
      }

      .passion {
        position: relative;
        z-index: 1;
        isolation: isolate;
        font-size: 7.3rem;
        line-height: 1;
        color: #e23456;
        display: inline-block;
        opacity: 0;
        transform: translateY(30px);
        animation: motoFadeIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        animation-delay: 0.6s;
        transition: color 0.25s ease, text-shadow 0.25s ease;
      }

      &:hover .passion,
      &.is-hovering .passion {
        color: #000;
        text-shadow: 0 0 82px rgba(226, 52, 87, 0.918);
      }
    }
  }
}

.marquee-showcase {
  margin-top: 40px;
}

.screen-jump {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.25s ease, filter 0.25s ease, color 0.25s ease;

  &:hover,
  &:focus-visible {
    opacity: 0.9;
    color: #e23456;
    filter: drop-shadow(0 0 12px rgba(226, 52, 86, 0.42));
  }

  &:focus-visible {
    outline: 1px solid rgba(226, 52, 86, 0.8);
    outline-offset: 8px;
  }

  .scroll-text {
    font-family: 'anton', 'source-han-sans-simplified-c';
    font-size: 12px;
    letter-spacing: 2px;
    margin-bottom: 10px;
    transition: color 0.25s ease;

    &--below {
      margin-top: 10px;
      margin-bottom: 0;
    }
  }

  .scroll-line {
    width: 1px;
    height: 40px;
    background: rgba(255, 255, 255, 0.2);
    position: relative;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #e23456;
      animation: scrollDrop 1.5s cubic-bezier(0.77, 0, 0.175, 1) infinite;
    }

    &--up::after {
      animation-direction: reverse;
    }
  }
}

.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  animation: scrollIndicatorIn 0.7s cubic-bezier(0.23, 1, 0.32, 1) 1.5s forwards;
}

.home-indexed-section {
  position: relative;
}

.archive-entry {
  position: relative;
  min-width: 178px;
  height: 34px;
  display: inline-grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(226, 52, 86, 0.42);
  color: rgba(255, 255, 255, 0.72);
  background: linear-gradient(90deg, rgba(226, 52, 86, 0.16), transparent 65%);
  text-decoration: none;
  overflow: hidden;
  transition: border-color 0.25s ease, color 0.25s ease, transform 0.25s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      transparent 0%,
      transparent 42%,
      rgba(255, 255, 255, 0.18) 50%,
      transparent 58%,
      transparent 100%
    );
    transform: translateX(-100%);
    transition: transform 0.35s ease;
  }

  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 46%;
    height: 2px;
    background: #e23456;
  }

  &:hover {
    color: #fff;
    border-color: #e23456;
    transform: translateX(4px);

    &::before {
      transform: translateX(100%);
    }

    .archive-entry__arrow {
      transform: translateX(3px);
    }
  }

  &__code,
  &__text,
  &__arrow {
    position: relative;
    z-index: 1;
    font-family: 'cn-custom', monospace;
    white-space: nowrap;
  }

  &__code {
    min-width: 0;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.28);
    font-size: 0.45rem;
    letter-spacing: 1px;
    text-overflow: ellipsis;
  }

  &__text {
    color: #e23456;
    font-size: 0.56rem;
    letter-spacing: 1px;
  }

  &__arrow {
    color: #e23456;
    font-size: 0.8rem;
    transition: transform 0.25s ease;
  }
}

.manifesto-section {
  position: relative;
  padding: 60px 0;
  content-visibility: auto;
  contain-intrinsic-size: 760px;

  .back-first-screen.no-rem {
    margin: 144px auto 64px;
  }

  .manifesto-content {
    position: relative;
    font-family: 'anton';
    font-size: 2.2rem;
    line-height: 1.1;
    text-transform: uppercase;

    .background-squares {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;

      .square-image {
        position: absolute;
        opacity: 0.2;
        transition: all 0.3s ease;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        &.rotating {
          animation: rotate3D 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      }
    }

    p {
      position: relative;
      z-index: 1;
      font-family: 'anton';
      * {
        font-family: 'anton';
      }
    }

    .highlight {
      color: transparent;
      -webkit-text-stroke: 2px var(--text-color);
    }

    .desc {
      font-size: 1rem;
      text-transform: none;
      margin-top: 20px;
      color: var(--text-color);
      opacity: 0.5;
      line-height: 1.6;
    }
  }
}

.works-section {
  padding: 30px 0;
  content-visibility: auto;
  contain-intrinsic-size: 980px;
}

.journey-section {
  padding: 30px 0;
  content-visibility: auto;
  contain-intrinsic-size: 560px;
}

.craft-section {
  padding: 30px 0;
  content-visibility: auto;
  contain-intrinsic-size: 520px;
}

.home-module-grid {
  position: relative;
}

.and-more-entry {
  position: absolute;
  right: 0;
  bottom: -20px;
  color: #e23456;
  font-family: 'cn-custom', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.2;
  transition: opacity 0.25s ease, transform 0.25s ease;

  &:hover,
  &:focus-visible {
    opacity: 1;
    transform: translateX(-3px);
  }

  &:focus-visible {
    outline: 1px solid rgba(226, 52, 86, 0.55);
    outline-offset: 5px;
  }
}

.home-craft-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.home-craft-card {
  position: relative;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px;
  overflow: hidden;
  border: 1px solid rgba(59, 105, 244, 0.25);
  color: var(--text-color);
  background: linear-gradient(135deg, rgba(59, 105, 244, 0.12), transparent 42%),
    rgba(13, 9, 18, 0.72);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.3s ease, transform 0.3s ease, background 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      transparent 0%,
      transparent 42%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 58%,
      transparent 100%
    );
    transform: translateX(-100%);
    transition: transform 0.45s ease;
  }

  &:hover {
    border-color: #3b69f4;
    background: linear-gradient(
        135deg,
        rgba(59, 105, 244, 0.2),
        transparent 52%
      ),
      rgba(13, 9, 18, 0.82);
    transform: translateY(-4px);

    &::before {
      transform: translateX(100%);
    }

    .home-craft-card__icon {
      color: #fff;
      transform: scale(1.08) rotate(-4deg);
      text-shadow: 6px 6px 0 rgba(59, 105, 244, 0.38);
    }

    .home-craft-card__cta {
      transform: translateX(4px);
    }
  }

  &__head,
  &__content,
  &__footer {
    position: relative;
    z-index: 1;
  }

  &__head,
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__index,
  &__status,
  &__cta,
  &__tags span {
    font-family: 'cn-custom', monospace;
  }

  &__index {
    color: rgba(255, 255, 255, 0.22);
    font-size: 0.54rem;
    letter-spacing: 2px;
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: rgba(255, 255, 255, 0.42);
    font-size: 0.5rem;

    i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #5ad480;
      box-shadow: 0 0 8px rgba(90, 212, 128, 0.72);
    }
  }

  &__content {
    display: flex;
    align-items: center;
    gap: 24px;
    margin: 28px 0;
  }

  &__icon {
    min-width: 76px;
    color: #3b69f4;
    font-family: 'cn-custom', monospace;
    font-size: 3.4rem;
    line-height: 1;
    text-align: center;
    text-shadow: 4px 4px 0 rgba(59, 105, 244, 0.2);
    transition: color 0.3s ease, text-shadow 0.3s ease, transform 0.3s ease;
  }

  &__copy {
    min-width: 0;

    h3 {
      margin-bottom: 9px;
      overflow: hidden;
      font-family: 'source-han-sans-simplified-c', sans-serif;
      font-size: 1.05rem;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    p {
      display: -webkit-box;
      overflow: hidden;
      color: var(--opacity-color);
      font-size: 0.62rem;
      line-height: 1.7;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    span {
      padding: 4px 7px;
      border: 1px solid rgba(59, 105, 244, 0.25);
      color: rgba(255, 255, 255, 0.42);
      font-size: 0.46rem;
    }
  }

  &__cta {
    color: #3b69f4;
    font-size: 0.58rem;
    transition: transform 0.25s ease;
  }

  &__corner {
    position: absolute;
    width: 12px;
    height: 12px;
    border-color: rgba(59, 105, 244, 0.55);
    border-style: solid;
    pointer-events: none;

    &--tl {
      top: 8px;
      left: 8px;
      border-width: 1px 0 0 1px;
    }

    &--br {
      right: 8px;
      bottom: 8px;
      border-width: 0 1px 1px 0;
    }
  }
}

.journey-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 580px));
  justify-content: space-between;
  gap: 10px;
}

.journey-card {
  position: relative;
  min-width: 0;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: var(--text-color);
  background: rgba(13, 9, 18, 0.72);
  text-align: left;
  transition: border-color 0.3s ease, transform 0.3s ease;

  &:disabled {
    cursor: default;
  }

  &.has-detail {
    cursor: pointer;

    &:hover {
      border-color: #e23456;
      transform: translateY(-4px);

      img {
        transform: scale(1.04);
        filter: brightness(0.9) saturate(1);
      }
    }
  }

  &__visual {
    height: 190px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: radial-gradient(
      circle at center,
      rgba(226, 52, 86, 0.14),
      rgba(0, 0, 0, 0.42) 66%
    );

    img {
      width: auto;
      height: auto;
      max-width: 88%;
      max-height: 90%;
      object-fit: contain;
      filter: brightness(0.72) saturate(0.72);
      transition: filter 0.35s ease, transform 0.35s ease;
    }
  }

  &__info {
    padding: 16px 16px 22px;

    h3 {
      margin: 6px 0 8px;
      overflow: hidden;
      font-family: 'source-han-sans-simplified-c', sans-serif;
      font-size: 0.88rem;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    p {
      display: -webkit-box;
      overflow: hidden;
      color: var(--opacity-color);
      font-size: 0.58rem;
      line-height: 1.6;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
  }

  &__date,
  &__id {
    font-family: 'cn-custom', monospace;
    font-size: 0.5rem;
    letter-spacing: 1px;
  }

  &__date {
    color: #e23456;
  }

  &__id {
    position: absolute;
    top: 10px;
    right: 12px;
    color: rgba(255, 255, 255, 0.22);
    text-transform: uppercase;
  }
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  width: 100%;
}

@media (max-width: 1199px) and (min-width: 769px) {
  .works-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@keyframes motoFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes homeCarouselIn {
  from {
    opacity: 0;
    filter: blur(14px) saturate(0.72);
  }
  to {
    opacity: 1;
    filter: blur(0) saturate(1);
  }
}
@keyframes cardsViewportIn {
  from {
    transform: scale(0.33);
  }
  to {
    transform: scale(1);
  }
}
@keyframes cardsProjectionIn {
  from {
    transform: translate3d(12px, 35px, -1px) scale(0.33);
  }
  to {
    transform: translate3d(12px, 35px, -1px) scale(1);
  }
}
@keyframes motoFadeIn2 {
  to {
    opacity: 0.2;
    transform: translateY(0);
  }
}
@keyframes scrollIndicatorIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(16px);
  }
  to {
    opacity: 0.6;
    transform: translateX(-50%) translateY(0);
  }
}
@keyframes logoFadeInScale {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 0.5;
    transform: scale(1);
  }
}
@keyframes scrollDrop {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
}
@keyframes rotate3D {
  0% {
    transform: rotateY(0deg) rotateX(0deg);
  }
  50% {
    transform: rotateY(180deg) rotateX(180deg);
  }
  100% {
    transform: rotateY(360deg) rotateX(360deg);
  }
}
</style>

<style lang="less">
@media screen and (max-aspect-ratio: @ratio-threshold) {
  .home-page {
    .hero-section {
      .hero-content {
        display: flex !important;
        flex-direction: column-reverse !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 1.5rem !important;

        .main-slogan {
          order: 2;
          zoom: 1;
          padding-right: 0;
          margin-right: 0;
          margin-left: 0;
          margin-bottom: 0;
        }

        .recommend {
          order: 1;
          zoom: 1 !important;
          width: min(100%, 23.5rem);
          max-width: calc(100vw - 48px);
          height: clamp(12.25rem, 54vw, 14.25rem);
          margin-top: 0;
          margin-right: auto;
          margin-left: auto;
          overflow: visible;
          touch-action: pan-y;
          transform: translateX(-2px);

          &::before {
            display: none;
          }
        }
      }
    }

    .cards-viewport,
    .cards-viewport .swiper-wrapper,
    .cards-viewport .swiper-slide,
    .news-card {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .cards-viewport {
      touch-action: pan-y;
      mask-image: linear-gradient(
        to right,
        transparent 0%,
        #000 10%,
        #000 90%,
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0%,
        #000 10%,
        #000 90%,
        transparent 100%
      );
    }

    .news-card {
      left: 12px;
      right: 12px;
    }

    .card-content {
      left: 0;
      right: 0;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      padding: 12px 32px 12px;
    }

    .card-top {
      min-width: 0;
      gap: 10px;
    }

    .card-cat {
      flex-shrink: 0;
      white-space: nowrap;
      letter-spacing: 2px;
    }

    .card-date {
      right: 0;
      bottom: 0;
      text-align: right;
      white-space: nowrap;
    }

    .card-title {
      text-overflow: ellipsis;
      overflow-wrap: anywhere;
    }

    .card-title {
      font-size: clamp(0.9rem, 4.3vw, 1.08rem);
      -webkit-line-clamp: 1;
    }

    .card-subtitle {
      width: 100%;
      max-width: 100%;
      font-size: clamp(0.58rem, 3.3vw, 0.68rem);

      > .subtitle {
        font-size: inherit;
      }
    }

    .carousel-progress {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      flex-direction: row;
      width: auto;
      height: 3px;
      mask-image: linear-gradient(
        to right,
        transparent 0%,
        #000 10%,
        #000 90%,
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0%,
        #000 10%,
        #000 90%,
        transparent 100%
      );
    }

    .progress-bar {
      width: auto;
      height: 100%;
    }

    .nav-btn {
      width: 32px;
      height: 32px;

      &--prev {
        top: 50%;
        left: 8px;
        transform: translateY(-50%);

        .nav-triangle {
          border-top: 10px solid transparent;
          border-right: 16px solid
            color-mix(in srgb, var(--text-color) 58%, transparent);
          border-bottom: 10px solid transparent;
          border-left: 0;
        }
      }

      &--next {
        top: 50%;
        right: 8px;
        bottom: auto;
        left: auto;
        transform: translateY(-50%);

        .nav-triangle {
          border-top: 10px solid transparent;
          border-right: 0;
          border-bottom: 10px solid transparent;
          border-left: 16px solid
            color-mix(in srgb, var(--text-color) 58%, transparent);
        }
      }

      &:hover {
        .nav-triangle {
          filter: none;
          transform: none;
        }

        &.nav-btn--prev .nav-triangle {
          border-bottom-color: transparent;
          border-right-color: color-mix(
            in srgb,
            var(--text-color) 58%,
            transparent
          );
        }

        &.nav-btn--next .nav-triangle {
          border-top-color: transparent;
          border-left-color: color-mix(
            in srgb,
            var(--text-color) 58%,
            transparent
          );
        }
      }

      &:active {
        transform: translateY(-50%) scale(0.92);
      }
    }

    .carousel-counter {
      top: 8px;
      right: 10px;
    }

    .card-watermark {
      display: none;
    }

    .archive-entry {
      min-width: 112px;
      height: 30px;
      grid-template-columns: auto auto;
      padding: 0 10px;

      &__code {
        display: none;
      }

      &__text {
        font-size: 0.5rem;
      }
    }

    .square-image {
      zoom: 0.3;
    }
    .works-grid {
      grid-template-columns: 1fr !important;
      gap: 15px;
    }

    .journey-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      justify-content: stretch;
      gap: 10px;
    }

    .home-craft-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .home-craft-card {
      min-height: 210px;
      padding: 18px;

      &__content {
        gap: 16px;
        margin: 20px 0;
      }

      &__icon {
        min-width: 54px;
        font-size: 2.6rem;
      }

      &__copy h3 {
        font-size: 0.86rem;
      }
    }

    .journey-card {
      min-height: 230px;

      &__visual {
        height: 128px;
      }

      &__info {
        padding: 12px;

        h3 {
          font-size: 0.72rem;
        }
      }
    }
  }
}
</style>
