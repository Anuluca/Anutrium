<template>
  <div
    ref="homePageElement"
    class="home-page main-container"
    :class="{ 'scroll-reveal-ready': isHomeSectionsRevealReady }"
  >
    <Teleport v-if="homeNavigationReady" to="body">
      <nav
        class="sections-fixed-nav home-sections-nav"
        :aria-label="
          locale === 'en' ? 'Home section navigation' : '首页模块导航'
        "
      >
        <span class="sections-fixed-nav__line" aria-hidden="true" />
        <button
          v-for="item in homeNavigationItems"
          :key="item.anchorId"
          class="sections-fixed-nav__item"
          :class="{ 'is-active': activeHomeSectionId === item.anchorId }"
          type="button"
          :aria-label="`${item.number} ${item.title}`"
          :aria-current="
            activeHomeSectionId === item.anchorId ? 'location' : undefined
          "
          :title="item.title"
          @click="scrollToHomeSection(item, $event)"
        >
          <span class="sections-fixed-nav__marker" aria-hidden="true" />
          <span class="sections-fixed-nav__copy">
            <span class="sections-fixed-nav__num">{{ item.number }}</span>
            <span class="sections-fixed-nav__label">{{ item.title }}</span>
          </span>
        </button>
      </nav>
    </Teleport>

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
                    :loading="i === 0 ? 'eager' : 'lazy'"
                    :fetchpriority="i === 0 ? 'high' : 'low'"
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
                  {{ i + 1 }}
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
      id="home-section-about"
      ref="manifestoSection"
      class="manifesto-section home-indexed-section scroll-reveal-section"
    >
      <button
        class="back-first-screen screen-jump no-rem"
        type="button"
        aria-label="返回第一屏"
        @click="scrollToFirstScreen"
      >
        <div class="scroll-line scroll-line--up" />
        <span class="scroll-text scroll-text--below">返回第一屏</span>
      </button>

      <div class="home-section-shell">
        <header class="home-section-heading scroll-reveal-title">
          <h2 class="home-section-title">
            <span v-if="locale !== 'en'" class="home-section-title__en">
              ABOUT ME
            </span>
            <span
              class="home-section-title__main"
              :class="{ 'home-section-title__main--cn': locale !== 'en' }"
            >
              {{ $t('home.title01') }}
            </span>
          </h2>
        </header>

        <div
          ref="manifestoHoverTarget"
          class="home-section-content manifesto-content scroll-reveal-content"
          :class="{ 'cn-font': locale !== 'en' }"
          @pointerenter="activateManifestoHover"
          @pointerleave="deactivateManifestoHover"
          @pointermove="updateManifestoHoverPointer"
        >
          <div class="manifesto-hover-pattern" aria-hidden="true">
            <div class="manifesto-hover-pattern__edge-feather">
              <div class="manifesto-hover-pattern__spotlight">
                <div class="manifesto-hover-pattern__gradient" />
                <div
                  ref="manifestoCipherElement"
                  class="manifesto-hover-pattern__cipher"
                />
              </div>
            </div>
          </div>

          <div class="manifesto-copy">
            <p class="manifesto-intro">
              <template v-if="locale === 'en'">
                I'm <span>Anu</span>luca.
              </template>
              <template v-else>我是<span>路卡</span>。</template>
            </p>
            <p class="highlight">{{ $t('home.highlight') }}</p>
            <p class="desc">{{ $t('home.aboutDescription') }}</p>
            <RouterLink class="manifesto-link" to="/island">
              <span>{{ $t('home.aboutMore') }}</span>
              <Ship class="manifesto-link__logo" aria-hidden="true" />
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section
      id="home-section-works"
      class="works-section home-indexed-section scroll-reveal-section"
    >
      <div class="home-section-shell">
        <header class="home-section-heading scroll-reveal-title">
          <h2 class="home-section-title">
            <span v-if="locale !== 'en'" class="home-section-title__en">
              SELECTED ARCHIVES
            </span>
            <span
              class="home-section-title__main"
              :class="{ 'home-section-title__main--cn': locale !== 'en' }"
            >
              {{ $t('home.title02') }}
            </span>
          </h2>
        </header>

        <div
          class="home-section-content home-module-grid scroll-reveal-content"
        >
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
      </div>
    </section>

    <section
      id="home-section-flanerie"
      class="journey-section home-indexed-section scroll-reveal-section"
    >
      <div class="home-section-shell">
        <header class="home-section-heading scroll-reveal-title">
          <h2 class="home-section-title">
            <span v-if="locale !== 'en'" class="home-section-title__en">
              FLÂNERIE LOG
            </span>
            <span
              class="home-section-title__main"
              :class="{ 'home-section-title__main--cn': locale !== 'en' }"
            >
              {{ $t('home.title03') }}
            </span>
          </h2>
        </header>

        <div
          class="home-section-content home-module-grid scroll-reveal-content"
        >
          <div class="journey-grid">
            <VlogCard
              v-for="vlog in journeyVlogs"
              :key="vlog.id"
              :vlog="vlog"
              :interactive="true"
              defer-hover-image
              @select="openVlog(vlog.id)"
            />
          </div>
          <RouterLink class="and-more-entry" to="/flanerie">
            AND MORE...
          </RouterLink>
        </div>
      </div>
    </section>

    <section
      id="home-section-craft"
      class="craft-section home-indexed-section scroll-reveal-section"
    >
      <div class="home-section-shell">
        <header class="home-section-heading scroll-reveal-title">
          <h2 class="home-section-title">
            <span v-if="locale !== 'en'" class="home-section-title__en">
              UTILITY CRAFTS
            </span>
            <span
              class="home-section-title__main"
              :class="{ 'home-section-title__main--cn': locale !== 'en' }"
            >
              {{ $t('home.title04') }}
            </span>
          </h2>
        </header>

        <div
          class="home-section-content home-module-grid scroll-reveal-content"
        >
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
      </div>
    </section>

    <PageFooter />
    <WorkDetailModal
      v-if="selectedWork"
      :work="selectedWork"
      :visible="true"
      @close="selectedWork = null"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Ship } from '@element-plus/icons-vue'
import { Autoplay, Mousewheel } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper/types'
import { Swiper, SwiperSlide } from 'swiper/vue'

import LogoOnly3D from '@/components/LogoOnly3D/index.vue'
import MarqueeShowcase from '@/components/MarqueeShowcase/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import ToolCard from '@/components/ToolCard/index.vue'
import VlogCard from '@/components/VlogCard/index.vue'
import WorkCard from '@/components/WorkCard/index.vue'
import { useScrollReveal } from '@/composables/useScrollReveal'
import { visualState } from '@/stores'
import { trackProjectClick, trackToolClick } from '@/utils/analytics'
import {
  addPageScrollListener,
  getPageMaxScrollTop,
  getPageScrollTop,
  scrollPageTo,
} from '@/utils/pageScroll'

import 'swiper/css'

const WorkDetailModal = defineAsyncComponent(
  () => import('@/components/WorkDetailModal/index.vue')
)

const { locale, t, tm } = useI18n()
const router = useRouter()
const visualStateStore = visualState()

const HOME_SECTION_DEFINITIONS = [
  {
    anchorId: 'home-section-about',
    number: '01',
    titleKey: 'home.title01',
  },
  {
    anchorId: 'home-section-works',
    number: '02',
    titleKey: 'home.title02',
  },
  {
    anchorId: 'home-section-flanerie',
    number: '03',
    titleKey: 'home.title03',
  },
  {
    anchorId: 'home-section-craft',
    number: '04',
    titleKey: 'home.title04',
  },
] as const

interface HomeNavigationItem {
  anchorId: string
  number: string
  title: string
}

interface HomeNavigationMetric {
  anchorId: string
  target: HTMLElement
  top: number
}

interface HomeRevealParallaxGroup {
  section: HTMLElement
  shell: HTMLElement
  lastOffset: number
  lastScale: number
  lastOpacity: number
  nextOffset: number
  nextScale: number
  nextOpacity: number
}

const HOME_REVEAL_SELECTOR =
  '.home-page .home-indexed-section .scroll-reveal-title, .home-page .home-indexed-section .scroll-reveal-content'
const HOME_SECTION_PARALLAX_MAX_OFFSET = 120
const HOME_SECTION_PARALLAX_SCALE_RANGE = 0.22
const HOME_PARALLAX_RANGE_RATIO = 0.7
const HOME_PARALLAX_MIN_RANGE = 320
const HOME_PARALLAX_TOP_FADE_START = 0.45

const homePageElement = ref<HTMLElement | null>(null)
const manifestoSection = ref<HTMLElement | null>(null)
const homeNavigationReady = ref(false)
const activeHomeSectionId = ref<string>(HOME_SECTION_DEFINITIONS[0].anchorId)
const homeNavigationItems = computed<HomeNavigationItem[]>(() =>
  HOME_SECTION_DEFINITIONS.map((item) => ({
    ...item,
    title: t(item.titleKey),
  }))
)
const {
  isReady: isHomeSectionsRevealReady,
  refresh: refreshHomeSectionsReveal,
} = useScrollReveal({
  selector: HOME_REVEAL_SELECTOR,
  once: false,
  exitClass: 'is-reveal-exiting',
  rootMargin: () => {
    const edgeOffset = Math.round(window.innerHeight * 0.08)
    return `-${edgeOffset}px 0px -${edgeOffset}px 0px`
  },
  threshold: 0,
})

let homeNavigationMetrics: HomeNavigationMetric[] = []
let homeNavigationResizeObserver: ResizeObserver | null = null
let homeNavigationMeasureFrame = 0
let homeNavigationHeaderOffset = 72
let homeNavigationMaxScrollTop = 0
let homeRevealParallaxGroups: HomeRevealParallaxGroup[] = []

const getHomeNavigationHeaderOffset = () => {
  const header = document.querySelector<HTMLElement>('.el-menu-layout-all')

  return Math.max(72, (header?.getBoundingClientRect().bottom ?? 0) + 14)
}

const syncActiveHomeSection = () => {
  if (!homeNavigationMetrics.length) return

  const scrollTop = getPageScrollTop()
  if (
    homeNavigationMaxScrollTop > 0 &&
    homeNavigationMaxScrollTop - scrollTop <= 4
  ) {
    activeHomeSectionId.value =
      homeNavigationMetrics[homeNavigationMetrics.length - 1].anchorId
    return
  }

  const activationTop =
    scrollTop + homeNavigationHeaderOffset + window.innerHeight * 0.16
  let activeIndex = 0

  for (let index = 1; index < homeNavigationMetrics.length; index += 1) {
    if (homeNavigationMetrics[index].top > activationTop) break
    activeIndex = index
  }

  activeHomeSectionId.value = homeNavigationMetrics[activeIndex].anchorId
}

const measureHomeNavigation = () => {
  homeNavigationMeasureFrame = 0
  const scrollTop = getPageScrollTop()

  homeNavigationHeaderOffset = getHomeNavigationHeaderOffset()
  homeNavigationMaxScrollTop = getPageMaxScrollTop()
  homeNavigationMetrics = HOME_SECTION_DEFINITIONS.flatMap((item) => {
    const target = document.getElementById(item.anchorId)
    if (!target) return []

    return [
      {
        anchorId: item.anchorId,
        target,
        top: scrollTop + target.getBoundingClientRect().top,
      },
    ]
  })
  syncActiveHomeSection()
}

const scheduleHomeNavigationMeasurement = () => {
  if (homeNavigationMeasureFrame) return
  homeNavigationMeasureFrame = window.requestAnimationFrame(
    measureHomeNavigation
  )
}

const scrollToHomeSection = (item: HomeNavigationItem, event: MouseEvent) => {
  const metric = homeNavigationMetrics.find(
    (navigationItem) => navigationItem.anchorId === item.anchorId
  )
  const target = metric?.target ?? document.getElementById(item.anchorId)
  if (!target) return

  activeHomeSectionId.value = item.anchorId
  const measuredTop =
    metric?.top ?? getPageScrollTop() + target.getBoundingClientRect().top
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  scrollPageTo({
    top: Math.max(0, measuredTop - homeNavigationHeaderOffset),
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
  ;(event.currentTarget as HTMLButtonElement | null)?.blur()
}

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
let sectionObserver: IntersectionObserver | null = null
let removeHomeScrollListener: (() => void) | null = null
let isPageVisible = true
let isHeroVisible = true

const heroSection = ref<HTMLElement | null>(null)
const manifestoHoverTarget = ref<HTMLElement | null>(null)
const passionLine = ref<HTMLElement | null>(null)
const recommendElement = ref<HTMLElement | null>(null)
const mainSloganElement = ref<HTMLElement | null>(null)
const swiperModules = [Autoplay, Mousewheel]
const isPassionHovering = ref(false)

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
let isFirstScreenInputActive = false
let isHeroMotionEnabled = false
let isFirstScreenAutoScrolling = false
let isHeroReturningToFirstScreen = false
let firstScreenScrollTimer: number | null = null
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
const FIRST_SCREEN_SCROLL_DURATION = 700
const FIRST_SCREEN_SCROLL_TIMEOUT = FIRST_SCREEN_SCROLL_DURATION + 160
const SECOND_SCREEN_RETURN_ZONE = 120
const HERO_EXIT_TRANSITION_RATIO = 0.82
const HERO_RETURN_TRANSITION_RATIO = 0.72
const HERO_EXIT_SCALE_GAIN = 1.5
const isMobileCarousel = ref(false)

const getManifestoSectionTop = () => {
  if (!manifestoSection.value) return heroMetrics.nextSectionTop

  return getPageScrollTop() + manifestoSection.value.getBoundingClientRect().top
}

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
      nextSectionTop: getManifestoSectionTop(),
      scrollY: getPageScrollTop(),
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

const syncZodiacLayout = () => {
  const secondScreenTop = heroMetrics.nextSectionTop || getManifestoSectionTop()
  const transitionPoint = Math.max(
    120,
    secondScreenTop - window.innerHeight * 0.55
  )

  const nextLayout = getPageScrollTop() >= transitionPoint ? 'content' : 'hero'
  if (visualStateStore.zodiacLayout !== nextLayout) {
    visualStateStore.setZodiacLayout(nextLayout)
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
  if (!manifestoSection.value) return false

  return (
    getPageScrollTop() < heroMetrics.nextSectionTop - 80 &&
    getPageScrollTop() < window.innerHeight * 0.9
  )
}

const isInSecondScreenReturnZone = () => {
  if (!manifestoSection.value) return false

  const scrollTop = getPageScrollTop()

  return (
    scrollTop > 0 &&
    scrollTop <= heroMetrics.nextSectionTop + SECOND_SCREEN_RETURN_ZONE
  )
}

const completeFirstScreenScroll = () => {
  if (firstScreenScrollTimer !== null) {
    window.clearTimeout(firstScreenScrollTimer)
    firstScreenScrollTimer = null
  }
  isFirstScreenAutoScrolling = false
  isHeroReturningToFirstScreen = false
  refreshHeroInteractionMetrics()
}

const scheduleFirstScreenScrollSettlement = () => {
  if (firstScreenScrollTimer !== null) {
    window.clearTimeout(firstScreenScrollTimer)
  }
  firstScreenScrollTimer = window.setTimeout(
    completeFirstScreenScroll,
    FIRST_SCREEN_SCROLL_TIMEOUT
  )
}

const scrollToNextScreenFromHero = () => {
  if (!manifestoSection.value || isFirstScreenAutoScrolling) return

  const targetTop = getManifestoSectionTop()
  const maxScroll = getPageMaxScrollTop()
  const settledTop = Math.min(maxScroll, targetTop)

  isFirstScreenAutoScrolling = true
  isHeroReturningToFirstScreen = false
  scheduleFirstScreenScrollSettlement()
  scrollPageTo({
    top: settledTop,
    behavior: reducedMotionQuery?.matches ? 'auto' : 'smooth',
    duration: FIRST_SCREEN_SCROLL_DURATION,
    fixedDuration: true,
    onComplete: completeFirstScreenScroll,
  })
}

const scrollToFirstScreen = () => {
  if (isFirstScreenAutoScrolling) return

  isFirstScreenAutoScrolling = true
  isHeroReturningToFirstScreen = true
  scheduleFirstScreenScrollSettlement()
  scrollPageTo({
    top: 0,
    behavior: reducedMotionQuery?.matches ? 'auto' : 'smooth',
    duration: FIRST_SCREEN_SCROLL_DURATION,
    fixedDuration: true,
    onComplete: completeFirstScreenScroll,
  })
}

const isEventFromRecommend = (event: Event) => {
  const target = event.target
  return target instanceof Element && !!target.closest('.recommend')
}

const handleFirstScreenWheel = (event: WheelEvent) => {
  if (isEventFromRecommend(event)) return

  if (isFirstScreenAutoScrolling) {
    event.preventDefault()
    return
  }

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
  if (isFirstScreenAutoScrolling) {
    event.preventDefault()
    return
  }

  const currentY = event.touches[0]?.clientY ?? firstScreenTouchStartY
  const swipeUpDistance = firstScreenTouchStartY - currentY
  const swipeDownDistance = currentY - firstScreenTouchStartY

  if (swipeUpDistance > 24 && isInFirstScreenScrollZone()) {
    event.preventDefault()
    scrollToNextScreenFromHero()
    return
  }

  if (swipeDownDistance > 24 && isInSecondScreenReturnZone()) {
    event.preventDefault()
    scrollToFirstScreen()
  }
}

const setFirstScreenInputActive = (shouldListen: boolean) => {
  if (shouldListen === isFirstScreenInputActive) return
  isFirstScreenInputActive = shouldListen

  if (shouldListen) {
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
    return
  }

  window.removeEventListener('wheel', handleFirstScreenWheel, true)
  window.removeEventListener('touchstart', handleFirstScreenTouchStart, true)
  window.removeEventListener('touchmove', handleFirstScreenTouchMove, true)
}

const syncFirstScreenInputRuntime = () => {
  const secondScreenTop = heroMetrics.nextSectionTop || getManifestoSectionTop()
  const interactionEnd = secondScreenTop + SECOND_SCREEN_RETURN_ZONE

  setFirstScreenInputActive(getPageScrollTop() <= interactionEnd)
}

const setHeroExitVariables = (
  element: HTMLElement | null,
  offsetX: number,
  offsetY: number,
  scale: number,
  opacity: number
) => {
  if (!element) return
  element.style.setProperty('--hero-exit-x', `${offsetX.toFixed(3)}vw`)
  element.style.setProperty('--hero-exit-y', `${offsetY.toFixed(3)}vh`)
  element.style.setProperty('--hero-exit-scale', scale.toFixed(4))
  element.style.setProperty('--hero-exit-opacity', opacity.toFixed(4))
}

const syncHeroExitMotion = () => {
  const secondScreenTop = heroMetrics.nextSectionTop || getManifestoSectionTop()
  const transitionRatio = isHeroReturningToFirstScreen
    ? HERO_RETURN_TRANSITION_RATIO
    : HERO_EXIT_TRANSITION_RATIO
  const transitionDistance = Math.max(1, secondScreenTop * transitionRatio)
  const progress = reducedMotionQuery?.matches
    ? 0
    : Math.min(1, Math.max(0, getPageScrollTop() / transitionDistance))
  const scale = 1 + progress * HERO_EXIT_SCALE_GAIN
  const opacity = Math.max(0, 1 - progress * 1.35)
  const offsetY = progress * -28

  setHeroExitVariables(
    mainSloganElement.value,
    progress * -38,
    offsetY,
    scale,
    opacity
  )
  setHeroExitVariables(
    recommendElement.value,
    progress * 38,
    offsetY,
    scale,
    opacity
  )
}

const collectHomeRevealParallaxGroups = () => {
  homeRevealParallaxGroups = Array.from(
    document.querySelectorAll<HTMLElement>('.home-page .home-indexed-section')
  ).flatMap((section) => {
    const shell = section.querySelector<HTMLElement>('.home-section-shell')
    if (!shell) return []

    return [
      {
        section,
        shell,
        lastOffset: 0,
        lastScale: 1,
        lastOpacity: -1,
        nextOffset: 0,
        nextScale: 1,
        nextOpacity: 1,
      },
    ]
  })
}

const syncHomeRevealParallax = () => {
  if (!homeRevealParallaxGroups.length) return

  const shouldReduceMotion = reducedMotionQuery?.matches
  const viewportCenter = window.innerHeight / 2
  const parallaxRange = Math.max(
    HOME_PARALLAX_MIN_RANGE,
    window.innerHeight * HOME_PARALLAX_RANGE_RATIO
  )

  homeRevealParallaxGroups.forEach((group) => {
    if (shouldReduceMotion) {
      group.nextOffset = 0
      group.nextScale = 1
      group.nextOpacity = 1
      return
    }

    const sectionBounds = group.section.getBoundingClientRect()
    const shellLayoutCenter =
      sectionBounds.top + group.shell.offsetTop + group.shell.offsetHeight / 2
    const progress = Math.max(
      -1,
      Math.min(1, (viewportCenter - shellLayoutCenter) / parallaxRange)
    )

    group.nextOffset = progress * HOME_SECTION_PARALLAX_MAX_OFFSET
    group.nextScale = 1 + progress * HOME_SECTION_PARALLAX_SCALE_RANGE
    const topFadeProgress = Math.max(
      0,
      Math.min(
        1,
        (progress - HOME_PARALLAX_TOP_FADE_START) /
          (1 - HOME_PARALLAX_TOP_FADE_START)
      )
    )
    group.nextOpacity = 1 - topFadeProgress
  })

  homeRevealParallaxGroups.forEach((group) => {
    if (Math.abs(group.nextOffset - group.lastOffset) >= 0.05) {
      group.lastOffset = group.nextOffset
      group.shell.style.setProperty(
        '--home-reveal-parallax-y',
        `${group.nextOffset.toFixed(2)}px`
      )
    }

    if (Math.abs(group.nextScale - group.lastScale) >= 0.0005) {
      group.lastScale = group.nextScale
      group.shell.style.setProperty(
        '--home-reveal-parallax-scale',
        group.nextScale.toFixed(4)
      )
    }

    if (Math.abs(group.nextOpacity - group.lastOpacity) >= 0.002) {
      group.lastOpacity = group.nextOpacity
      group.shell.style.setProperty(
        '--home-reveal-parallax-opacity',
        group.nextOpacity.toFixed(4)
      )
    }
  })
}

const syncHomeScrollRuntime = () => {
  syncHeroExitMotion()
  syncHomeRevealParallax()
  syncZodiacLayout()
  syncFirstScreenInputRuntime()
  syncActiveHomeSection()
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
  const shouldListen = canUseHeroMotion() && isPageVisible && isHeroVisible
  isHeroMotionEnabled = shouldListen

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

const handleReducedMotionChange = () => {
  syncHeroMotionListener()
  syncHomeRevealParallax()
}

const handleHeroResize = () => {
  if (heroResizeRafId !== null) return

  heroResizeRafId = window.requestAnimationFrame(() => {
    heroResizeRafId = null
    syncHeroMotionListener()
    refreshHomeSectionsReveal()
    syncHomeScrollRuntime()
    scheduleHomeNavigationMeasurement()
  })
}

const handleHeroMouseMove = (event: MouseEvent) => {
  const now = performance.now()
  if (now - lastMotionSampleTime < HERO_MOTION_SAMPLE_INTERVAL) return
  lastMotionSampleTime = now

  if (
    !isPageVisible ||
    !isHeroVisible ||
    !isHeroMotionEnabled ||
    !heroSection.value
  ) {
    isPassionHovering.value = false
    return
  }

  if (Math.abs(getPageScrollTop() - heroMetrics.scrollY) > 48) {
    refreshHeroInteractionMetrics()
  }

  syncPassionHoverState(event)

  const offsetX = (event.clientX - heroMetrics.centerX) / heroMetrics.halfWidth
  const offsetY = (event.clientY - heroMetrics.centerY) / heroMetrics.halfHeight
  const clampedX = Math.max(-1, Math.min(1, offsetX))
  const clampedY = Math.max(-1, Math.min(1, offsetY))

  sloganTargetRotateY = clampedX * 10
  sloganTargetRotateX = clampedY * -8
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

const MANIFESTO_CIPHER_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const MANIFESTO_CIPHER_REFRESH_MS = 90
const manifestoCipherElement = ref<HTMLElement | null>(null)
let manifestoPointerFrame: number | null = null
let manifestoCipherTimer: number | null = null
let manifestoPointerPosition = { x: 0, y: 0 }

const refreshManifestoCipher = () => {
  if (!manifestoCipherElement.value) return

  const cipherLength = Math.min(
    28_000,
    Math.max(
      3_000,
      Math.ceil(
        (manifestoCipherElement.value.clientWidth *
          manifestoCipherElement.value.clientHeight) /
          20
      )
    )
  )
  let result = ''
  for (let index = 0; index < cipherLength; index += 1) {
    result += MANIFESTO_CIPHER_CHARACTERS.charAt(
      Math.floor(Math.random() * MANIFESTO_CIPHER_CHARACTERS.length)
    )
  }

  manifestoCipherElement.value.textContent = result
}

const startManifestoCipher = () => {
  if (manifestoCipherTimer !== null) return

  refreshManifestoCipher()
  manifestoCipherTimer = window.setInterval(
    refreshManifestoCipher,
    MANIFESTO_CIPHER_REFRESH_MS
  )
}

const stopManifestoCipher = () => {
  if (manifestoCipherTimer === null) return

  window.clearInterval(manifestoCipherTimer)
  manifestoCipherTimer = null
}

const flushManifestoHoverPointer = () => {
  manifestoPointerFrame = null
  manifestoHoverTarget.value?.style.setProperty(
    '--manifesto-pointer-x',
    `${manifestoPointerPosition.x}px`
  )
  manifestoHoverTarget.value?.style.setProperty(
    '--manifesto-pointer-y',
    `${manifestoPointerPosition.y}px`
  )
}

const updateManifestoHoverPointer = (event: PointerEvent) => {
  if (event.pointerType === 'touch') return

  startManifestoCipher()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  manifestoPointerPosition = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }

  if (manifestoPointerFrame === null) {
    manifestoPointerFrame = window.requestAnimationFrame(
      flushManifestoHoverPointer
    )
  }
}

const activateManifestoHover = (event: PointerEvent) => {
  updateManifestoHoverPointer(event)
}

const deactivateManifestoHover = () => {
  stopManifestoCipher()
}

const handleVisibilityChange = () => {
  isPageVisible = document.visibilityState !== 'hidden'
  syncHeroMotionListener()

  if (!isPageVisible) {
    pauseAuto()
    stopManifestoCipher()
    resetHeroSloganMotion()
    return
  }

  startAuto()
}

const observeAnimatedSections = () => {
  if (!('IntersectionObserver' in window)) {
    isHeroVisible = true
    handleVisibilityChange()
    return
  }

  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroSection.value) {
          isHeroVisible = entry.isIntersecting
          syncHeroMotionListener()
          if (isHeroVisible) startAuto()
          else {
            pauseAuto()
            resetHeroSloganMotion()
          }
        }
      })
    },
    { rootMargin: '0px', threshold: 0.15 }
  )

  if (heroSection.value) sectionObserver.observe(heroSection.value)
}

onMounted(() => {
  isPageVisible = document.visibilityState !== 'hidden'
  homeNavigationReady.value = true
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  heroMotionQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  heroMotionQuery.addEventListener('change', syncHeroMotionListener)
  collectHomeRevealParallaxGroups()
  observeAnimatedSections()
  syncHeroMotionListener()
  syncHomeScrollRuntime()
  scheduleHomeNavigationMeasurement()
  if (homePageElement.value && typeof ResizeObserver !== 'undefined') {
    homeNavigationResizeObserver = new ResizeObserver(
      scheduleHomeNavigationMeasurement
    )
    homeNavigationResizeObserver.observe(homePageElement.value)
  }
  removeHomeScrollListener = addPageScrollListener(syncHomeScrollRuntime)
  window.addEventListener('resize', handleHeroResize, { passive: true })
  window.addEventListener('blur', resetHeroSloganMotion)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})
onUnmounted(() => {
  homeNavigationReady.value = false
  homeRevealParallaxGroups = []
  visualStateStore.setZodiacLayout('hero')
  if (dragResetTimer) clearTimeout(dragResetTimer)
  stopSloganMotion()
  sectionObserver?.disconnect()
  removeHomeScrollListener?.()
  removeHomeScrollListener = null
  homeNavigationResizeObserver?.disconnect()
  homeNavigationResizeObserver = null
  if (homeNavigationMeasureFrame) {
    window.cancelAnimationFrame(homeNavigationMeasureFrame)
  }
  setFirstScreenInputActive(false)
  if (heroResizeRafId !== null) window.cancelAnimationFrame(heroResizeRafId)
  if (manifestoPointerFrame !== null) {
    window.cancelAnimationFrame(manifestoPointerFrame)
  }
  stopManifestoCipher()
  if (firstScreenScrollTimer !== null) {
    window.clearTimeout(firstScreenScrollTimer)
  }
  window.removeEventListener('mousemove', handleHeroMouseMove)
  window.removeEventListener('resize', handleHeroResize)
  window.removeEventListener('blur', resetHeroSloganMotion)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
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

const selectByIds = <T extends { id: string }>(
  ids: readonly string[],
  ...collections: T[][]
) => {
  const itemsById = new Map<string, T>()
  for (const collection of collections) {
    for (const item of collection) {
      if (!itemsById.has(item.id)) itemsById.set(item.id, item)
    }
  }

  return ids.flatMap((id) => {
    const item = itemsById.get(id)
    return item ? [item] : []
  })
}

const selectedWorkIds = ['W001', 'W003', 'W005', 'W002', 'W006', 'P003']

const works = computed<WorkItem[]>(() => {
  const webArchives = tm('archive.dynamic.WebArchives') as WorkItem[]
  const personalArchives = tm('archive.dynamic.PersonalArchives') as WorkItem[]

  return selectByIds(selectedWorkIds, webArchives, personalArchives)
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

const journeyVlogIds = ['singapore', 'live_jolinPleasure', 'zero']

const journeyVlogs = computed<JourneyVlog[]>(() => {
  const vlogs = tm('flanerie.dynamic.vlogs') as JourneyVlog[]
  return selectByIds(journeyVlogIds, vlogs)
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
  return selectByIds(homeToolIds, tools)
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
