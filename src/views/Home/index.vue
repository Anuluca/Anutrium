<template>
  <div
    ref="homePageElement"
    class="home-page main-container"
    :class="{
      'is-craft-footer-visible': isCraftFooterVisible,
      'is-header-transition-staging': isHomeHeaderTransitionStaging,
    }"
    :style="homePageStyle"
  >
    <Swiper
      class="home-page-swiper"
      :class="
        homePageTransitionDirection && `is-page-${homePageTransitionDirection}`
      "
      direction="vertical"
      :slides-per-view="1"
      :speed="homePageTransitionDuration"
      :simulate-touch="false"
      :allow-touch-move="false"
      :resistance-ratio="0"
      :threshold="12"
      :long-swipes-ratio="HOME_PAGE_LONG_SWIPE_RATIO"
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
          'is-hero-initial-entering': isHeroInitialEntering,
          'is-hero-initial-hidden': isHeroInitialHidden,
          'is-hero-exit-preparing': isHeroExitPreparing,
          'is-hero-motion-prepared': isHeroMotionPrepared,
          'is-hero-return-effects-deferred': isHeroReturnEffectsDeferred,
        }"
      >
        <section
          ref="heroSection"
          class="hero-section"
          :aria-hidden="activeHomePageIndex !== 0"
          :inert="activeHomePageIndex !== 0"
        >
          <div class="home-page-content home-page-content--hero">
            <LogoRotating3D
              id="home-passion-static"
              class="passion-logo"
              low-power
              transparent
              resource-cache-key="home-passion-crystal"
              render-mode="edges"
              edge-color="#E23456"
              :edge-width="4"
              rotation-speed="slow"
              :interactive="false"
              aria-hidden="true"
            />

            <div ref="heroContentElement" class="hero-content">
              <div
                ref="recommendElement"
                class="recommend"
                @mouseenter="handleNewsWheelEnter"
                @mouseleave="handleNewsWheelLeave"
                @wheel="handleNewsWheel"
              >
                <template v-if="isHeroHeavyContentMounted">
                  <button class="nav-btn nav-btn--prev" @click="prevSlide">
                    <span class="nav-triangle" aria-hidden="true" />
                  </button>

                  <Swiper
                    class="cards-viewport"
                    :direction="carouselDirection"
                    :slides-per-view="1"
                    :speed="480"
                    :loop="newsItems.length > 1"
                    :resistance-ratio="0.72"
                    :threshold="3"
                    :touch-angle="carouselTouchAngle"
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
                      <button
                        class="news-card"
                        type="button"
                        data-magnetic
                        :disabled="!item.link"
                        @click="openNewsItem(item)"
                      >
                        <div class="card-img">
                          <picture>
                            <source
                              media="(max-width: 768px)"
                              :srcset="item.mobileImg"
                            />
                            <img
                              :src="item.img"
                              :alt="item.title"
                              :loading="index === 0 ? 'eager' : 'lazy'"
                              :fetchpriority="index === 0 ? 'high' : 'low'"
                              decoding="async"
                              width="768"
                              height="576"
                            />
                          </picture>
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
                      </button>
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
                </template>
              </div>

              <div class="main-slogan-shell">
                <div ref="mainSloganElement" class="main-slogan">
                  <div class="moto">
                    <p>DRIVEN</p>
                    <p>BY</p>
                    <p
                      class="passion-line"
                      :class="{ 'is-hovering': isPassionHovering }"
                    >
                      <SparklesText
                        v-if="isHeroHeavyContentMounted"
                        class="passion"
                        text="PASSION"
                        :active="isPassionHovering && !areHeroEffectsPaused"
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
                          :active="isPassionHovering && !areHeroEffectsPaused"
                          :duration="5"
                          :radiant-width="100"
                          base-color="#e23456"
                          radiant-color="#ffffff"
                        >
                          PASSION
                        </RadiantText>
                      </SparklesText>
                      <span v-else class="passion">PASSION</span>
                    </p>
                  </div>
                </div>
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
              <div class="home-about-introduction">
                <BlurReveal
                  :active="activeHomePageIndex === index + 1"
                  class="home-about-intro"
                  tag="p"
                >
                  {{ t('home.dynamic.intro.before')
                  }}{{ t('home.dynamic.intro.name')
                  }}{{ t('home.dynamic.intro.after') }}
                </BlurReveal>
                <p class="home-about-description">
                  <span>{{ aboutDescription.before }}</span>
                  <RandomTypedText
                    class="home-about-description__typed"
                    :active="activeHomePageIndex === index + 1"
                    :items="aboutDescriptionItems"
                  />
                  <span>{{ aboutDescription.after }}</span>
                </p>
                <div class="home-about-action-spacer" aria-hidden="true" />
                <ThemeActionButton
                  class="home-about-more"
                  color="#e23456"
                  label="MORE ABOUT ME"
                  to="/island"
                />
              </div>
            </div>
            <div v-else-if="page.id === 'archive'" class="home-archive-copy">
              <ArchiveProjectMarquee
                :entrance-active="activeHomePageIndex === index + 1"
                :paused="
                  activeHomePageIndex !== index + 1 ||
                  homePageMotionDuration > 0
                "
                :projects="archiveProjectData.projects"
                @select="openArchiveProjectDetail"
              />
              <div class="home-archive-heading">
                <BlurReveal
                  :active="activeHomePageIndex === index + 1"
                  class="home-archive-subtitle"
                  tag="p"
                >
                  {{ t('home.dynamic.archiveSubtitle') }}
                </BlurReveal>
                <ThemeActionButton
                  class="home-archive-more"
                  :color="page.color"
                  label="MORE ARCHIVES"
                  to="/archive"
                />
              </div>
            </div>
            <HomeFlanerieSection
              v-else-if="page.id === 'flanerie'"
              :active="
                activeHomePageIndex === index + 1 && !isHomePageTransitionActive
              "
              :color="page.color"
              :subtitle="t('home.dynamic.flanerieSubtitle')"
              :vlogs="flanerieVlogs"
              @select="openFlanerieDetail"
            />
            <div v-else-if="page.id === 'craft'" class="home-craft-copy">
              <div class="home-craft-heading">
                <BlurReveal
                  :active="activeHomePageIndex === index + 1"
                  class="home-craft-subtitle"
                  tag="p"
                >
                  想到既做到。
                </BlurReveal>
                <p class="home-craft-description">
                  借助Agent开发的一些常用工具
                </p>
              </div>
              <div class="home-craft-grid">
                <ToolCard
                  v-for="(tool, toolIndex) in homeCraftTools"
                  :key="tool.id"
                  class="home-craft-card"
                  :tool="tool"
                  :index="toolIndex"
                  :total="homeCraftTools.length"
                  :style="{ '--delay': `${0.12 + toolIndex * 0.06}s` }"
                  @select="openHomeCraftTool"
                />
              </div>
              <ThemeActionButton
                class="home-craft-more"
                :color="page.color"
                label="MORE CRAFTS"
                to="/craft"
              />
            </div>
            <div v-if="page.id === 'about'" class="home-about-gallery">
              <DomeGallery
                :active="
                  activeHomePageIndex === index + 1 &&
                  !isHomePageTransitionActive
                "
                :images="aboutGalleryItems"
                :entrance-delay="420"
                :entrance-duration="1100"
                :entrance-rotation-speed="42"
                :preview-viewport-centered="usesTouchCarousel"
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

    <WorkDetailModal
      v-if="selectedArchiveWork"
      :visible="selectedArchiveWork !== null"
      :work="selectedArchiveWork"
      theme-color="#71CB7D"
      @close="selectedArchiveWork = null"
    />

    <ScrollDownHint
      :enter-delay="0"
      fixed
      :hidden="isCraftFooterVisible"
      :initial-enter-delay="HERO_INITIAL_ENTRANCE_DURATION"
      :transition-direction="homePageTransitionDirection ?? 'forward'"
      :transitioning="homePageMotionDuration > 0"
      @activate="goToNextHomePage"
    />

    <Transition name="home-corner-lines" :duration="homeCornerEntranceDuration">
      <div
        v-if="activeHomePageIndex !== 0"
        class="home-corner-lines"
        aria-hidden="true"
      >
        <Transition
          name="home-corner-theme"
          :duration="homeCornerThemeTransitionDuration"
        >
          <div
            :key="activeHomePageIndex"
            class="home-corner-lines__set"
            :style="{ '--home-corner-color': activeHomeCornerColor }"
          >
            <span
              v-for="corner in homeCornerPositions"
              :key="corner"
              class="home-corner-lines__corner"
              :class="`home-corner-lines__corner--${corner}`"
            />
          </div>
        </Transition>
      </div>
    </Transition>

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
      <ol class="home-page-indicator__track">
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

    <div class="home-marquee-fixed-layer" :style="marqueeLayerStyle">
      <MarqueeShowcase
        class="marquee-showcase"
        :entrance-ready="isHeroInitialEntranceReady"
        :flat="isHeroContentInactive"
        :paused="!siteEntryActive || isHomePageTransitionActive"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  type ComputedRef,
  defineAsyncComponent,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import type { Swiper as SwiperInstance } from 'swiper/types'
import { Swiper, SwiperSlide } from 'swiper/vue'

import ArchiveProjectMarquee, {
  type ArchiveProjectMarqueeItem,
} from '@/components/ArchiveProjectMarquee/index.vue'
import BlurReveal from '@/components/BlurReveal/index.vue'
import DomeGallery from '@/components/DomeGallery/index.vue'
import LogoRotating3D from '@/components/Logo_rotating3D/index.vue'
import MarqueeShowcase from '@/components/MarqueeShowcase/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import RandomTypedText from '@/components/RandomTypedText/index.vue'
import ScrollDownHint from '@/components/ScrollDownHint/index.vue'
import ThemeActionButton from '@/components/ThemeActionButton/index.vue'
import ToolCard from '@/components/ToolCard/index.vue'
import { RadiantText } from '@/components/ui/radiant-text'
import { SparklesText } from '@/components/ui/sparkles-text'
import { useImagePreloader } from '@/composables/useImagePreloader'
import { homeFlanerieJourneyCardConfig } from '@/config/homeFlanerieJourneyCards'
import { HOME_RETURN_TO_PASSION_EVENT } from '@/config/homeNavigation'
import { visualState } from '@/stores'
import { trackProjectClick, trackToolClick } from '@/utils/analytics'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
  getHomeThumbnailUrl,
} from '@/utils/imageVariant'

import type { ArchiveWork } from '@/types/archive'
import type { JourneyItem } from '@/types/flanerie'

import 'swiper/css'

const WorkDetailModal = defineAsyncComponent(
  () => import('@/components/WorkDetailModal/index.vue')
)
const loadHomeFlanerieSection = () =>
  import('@/components/HomeFlanerieSection/index.vue')

interface NewsItem {
  id: number
  title: string
  subtitle: string
  category: string
  date: string
  img: string
  mobileImg?: string
  link?: string
  openInNewWindow?: boolean
}

interface AboutGalleryItem {
  src: string
  title: string
  link?: string
}

interface HomeCraftTool {
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

interface AboutDescriptionItem {
  text: string
  link?: string
}

const { t, tm } = useI18n()
const router = useRouter()
const visualStateStore = visualState()
const siteEntryActive = inject<ComputedRef<boolean>>(
  'site-entry-active',
  computed(() => true)
)
const headerBottom = inject<ComputedRef<number>>(
  'site-header-bottom',
  computed(() => 0)
)
const { preloadImages } = useImagePreloader()
const HomeFlanerieSection = defineAsyncComponent(loadHomeFlanerieSection)
const newsItems = computed<NewsItem[]>(() =>
  (tm('home.dynamic.recommend') as NewsItem[]).map((item) => ({
    ...item,
    mobileImg: getCardMobileThumbnailUrl(item.img),
    img: getCardThumbnailUrl(item.img),
  }))
)

function sampleRandomItems<T>(items: readonly T[], limit: number) {
  if (items.length <= limit) return [...items]

  const sample = items.slice(0, limit)
  for (let index = limit; index < items.length; index += 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    if (randomIndex < limit) sample[randomIndex] = items[index]
  }
  return sample
}

const aboutGalleryItems = computed<AboutGalleryItem[]>(() => {
  const items = tm('home.dynamic.aboutGallery') as AboutGalleryItem[]
  return sampleRandomItems(items, 20)
})
const aboutDescriptionItems = computed(
  () => tm('home.dynamic.descriptionItem') as AboutDescriptionItem[]
)
const flanerieVlogs = computed<JourneyItem[]>(
  () => tm('flanerie.dynamic.vlogs') as JourneyItem[]
)
const homeCraftToolIds = [
  'palette',
  'motion',
  'bounce-dynamics',
  'metronome',
] as const
const homeFlanerieJourneyIds = new Set<string>(
  homeFlanerieJourneyCardConfig.map(({ id }) => id)
)
const homeCraftTools = computed<HomeCraftTool[]>(() => {
  const tools = tm('craft.dynamic.tools') as HomeCraftTool[]
  const toolById = new Map(tools.map((tool) => [tool.id, tool]))

  return homeCraftToolIds.flatMap((id) => {
    const tool = toolById.get(id)
    return tool ? [tool] : []
  })
})
const aboutDescription = computed(() => {
  const [before, ...after] = t('home.dynamic.aboutDescription').split('—')
  return {
    before,
    after: after.join('—'),
  }
})
const archiveProjectData = computed(() => {
  const projects: ArchiveProjectMarqueeItem[] = []
  const workById = new Map<string, ArchiveWork>()
  const collections = [
    tm('archive.dynamic.WebArchives') as ArchiveWork[],
    tm('archive.dynamic.PersonalArchives') as ArchiveWork[],
  ]

  collections.forEach((works) => {
    works.forEach((work) => {
      const img = work.img ?? work.images?.[0]
      if (!img) return

      projects.push({
        id: work.id,
        title: work.title,
        img,
        company: work.company,
        time: work.time,
      })
      workById.set(work.id, work)
    })
  })

  return { projects, workById }
})
const getHomePageImagePreloadUrls = (pageId: string) => {
  let cardUrlResolver: typeof getCardThumbnailUrl | null = null
  const toCardUrl = (source: string) => {
    cardUrlResolver ??= window.matchMedia('(max-width: 768px)').matches
      ? getCardMobileThumbnailUrl
      : getCardThumbnailUrl
    return cardUrlResolver(source)
  }

  switch (pageId) {
    case 'about':
      return aboutGalleryItems.value.map((item) =>
        getHomeThumbnailUrl(item.src)
      )
    case 'archive':
      return archiveProjectData.value.projects.map((project) =>
        toCardUrl(project.img)
      )
    case 'flanerie':
      return flanerieVlogs.value
        .filter((journey) => homeFlanerieJourneyIds.has(journey.id))
        .map((journey) => toCardUrl(journey.img))
    case 'craft':
      return homeCraftTools.value.flatMap((tool) =>
        tool.img ? [tool.img] : []
      )
    default:
      return []
  }
}
const selectedArchiveWork = ref<ArchiveWork | null>(null)
const openArchiveProjectDetail = (project: ArchiveProjectMarqueeItem) => {
  const work = archiveProjectData.value.workById.get(project.id)
  if (!work) return

  selectedArchiveWork.value = work
  trackProjectClick({ id: work.id, title: work.title, source: 'home_archive' })
}
const openFlanerieDetail = (vlogId: string) => {
  router.push({ name: 'FLANERIE_DETAIL', params: { vlogId } })
}
const openHomeCraftTool = (tool: HomeCraftTool) => {
  trackToolClick({ id: tool.id, title: tool.title, source: 'home_craft' })
  router.push(tool.link)
}
const placeholderPages = [
  {
    id: 'about',
    title: 'ABOUT ME',
    color: '#e23456',
  },
  {
    id: 'archive',
    title: 'ARCHIVE',
    color: '#2f7548',
  },
  {
    id: 'flanerie',
    title: 'FLANERIE',
    color: '#8a2c1b',
  },
  {
    id: 'craft',
    title: 'CRAFT',
    color: '#244392',
  },
] as const
const homePageIndicatorItems = [
  { id: 'hero', title: 'PASSION' },
  ...placeholderPages,
] as const
const preloadHomePageImages = (pageIndex: number) => {
  const page = homePageIndicatorItems[pageIndex]
  if (page) preloadImages(getHomePageImagePreloadUrls(page.id))
}
const homeCornerPositions = [
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
] as const
const homeIndicatorSides = ['left', 'right'] as const
const homeCornerEntranceDuration = { enter: 900, leave: 420 } as const
const homeCornerThemeTransitionDuration = { enter: 480, leave: 0 } as const
const HOME_INDICATOR_ITEM_STEP = 1
const HOME_PAGE_TRANSITION_DURATION = 600
const MOBILE_HOME_PAGE_TRANSITION_DURATION = 360
const NEWS_AUTOPLAY_DELAY = 4000
const TOUCH_INPUT_MEDIA_QUERY = '(hover: none) and (pointer: coarse)'

const heroSection = ref<HTMLElement | null>(null)
const homePageElement = ref<HTMLElement | null>(null)
const heroContentElement = ref<HTMLElement | null>(null)
const recommendElement = ref<HTMLElement | null>(null)
const mainSloganElement = ref<HTMLElement | null>(null)
const marqueeViewportTop = ref('100dvh')
const craftFooterHeight = ref('220px')
const homePageMotionDuration = ref(0)
const homePageTransitionDuration = ref(HOME_PAGE_TRANSITION_DURATION)
const activeIndex = ref(0)
const activeHomePageIndex = ref(0)
const activeHomeCornerColor = computed(
  () =>
    placeholderPages[activeHomePageIndex.value - 1]?.color ??
    placeholderPages[0].color
)
const enteringHomePageIndex = ref<number | null>(null)
const leavingHomePageIndex = ref<number | null>(null)
const fadingHomePageIndex = ref<number | null>(null)
const pendingHomePageTransitionIndex = ref<number | null>(null)
const deferredHomePageContentIndex = ref<number | null>(null)
const homePageTransitionDirection = ref<'forward' | 'backward' | null>(null)
const isCraftFooterVisible = ref(false)
const isHeroContentInactive = ref(false)
const isHeroInitialEntering = ref(false)
const isHeroInitialHidden = ref(true)
const isHeroInitialEntranceReady = ref(false)
const isHeroExitPreparing = ref(false)
const isHeroMotionPrepared = ref(true)
const isHeroHeavyContentMounted = ref(true)
const isHeroReturnEffectsDeferred = ref(false)
const isHomePageTransitionActive = ref(false)
const isHomeHeaderTransitionStaging = ref(false)
const isMobileHomePageContentEntering = ref(false)
const renderedHomePageIds = ref<ReadonlySet<string>>(new Set(['hero']))
// Swiper 自行管理内部状态，避免把实例及其事件、幻灯片对象深层代理。
const homeSwiper = shallowRef<SwiperInstance | null>(null)
const newsSwiper = shallowRef<SwiperInstance | null>(null)
const usesTouchCarousel = ref(
  typeof window !== 'undefined' &&
    window.matchMedia(TOUCH_INPUT_MEDIA_QUERY).matches
)
const isPassionHovering = ref(false)
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
let isNewsHovered = false
let sloganRotateX = 0
let sloganRotateY = 0
let sloganTargetRotateX = 0
let sloganTargetRotateY = 0
let sloganRafId: number | null = null
let heroLayoutMeasureRafId: number | null = null
let pendingHeroViewportResize = false
let reducedMotionQuery: MediaQueryList | null = null
let heroMotionQuery: MediaQueryList | null = null
let touchInputQuery: MediaQueryList | null = null
let homeFlaneriePreloadIdleHandle: number | null = null
let homeFlaneriePreloadTimer: number | null = null
let hasHomeFlaneriePreloadStarted = false
let lastMotionSampleTime = 0
let isHeroMotionListenerActive = false
let isHeroMotionEnabled = false
let didDragSwiper = false
let dragResetTimer: ReturnType<typeof setTimeout> | null = null
let newsAutoplayTimer: number | null = null
let heroContentResizeObserver: ResizeObserver | null = null
let craftFooterResizeObserver: ResizeObserver | null = null
let craftFooterElement: HTMLElement | null = null
let craftFooterTransitionTimer: ReturnType<typeof setTimeout> | null = null
let craftFooterWheelArmTimer: ReturnType<typeof setTimeout> | null = null
let homePageFadeTimer: ReturnType<typeof setTimeout> | null = null
let homePageContentExitTimer: ReturnType<typeof setTimeout> | null = null
let homeHeaderTransitionTimer: ReturnType<typeof setTimeout> | null = null
let heroInitialEntranceObserver: MutationObserver | null = null
let heroInitialEntranceTimer: ReturnType<typeof setTimeout> | null = null
let heroExitPreparationFrameId: number | null = null
let heroDeferredContentTimer: ReturnType<typeof setTimeout> | null = null
let heroHeavyContentUnmountTimer: ReturnType<typeof setTimeout> | null = null
let heroMotionReleaseTimer: ReturnType<typeof setTimeout> | null = null
let heroReturnEffectsTimer: ReturnType<typeof setTimeout> | null = null
let isCraftFooterTransitionLocked = false
let isCraftFooterWheelArmed = false
let isHomePageTransitioning = false
let lockedHomeHeaderProgress: 0 | 1 | null = null
let queuedHomePageTransitionIndex: number | null = null
let homePointerStartX: number | null = null
let homePointerStartY: number | null = null
let homePointerAxis: 'horizontal' | 'vertical' | null = null
let didHandleHomePointer = false
let isTouchPagingListenerActive = false
let newsWheelInteractionBounds: { left: number; right: number } | null = null
let isHomeTouchGestureActive = false
const homeMotionStyleCache = new Map<string, string>()
let rootProgressTransitionDuration = ''
let heroMetrics = {
  centerX: 0,
  centerY: 0,
  halfWidth: 1,
  halfHeight: 1,
}
const HERO_MOTION_SAMPLE_INTERVAL = 80
const HERO_LEFT_ROTATION_STRENGTH = 24
const HERO_RIGHT_ROTATION_STRENGTH = 4
const CRAFT_PAGE_INDEX = homePageIndicatorItems.findIndex(
  (page) => page.id === 'craft'
)
const FLANERIE_PAGE_INDEX = homePageIndicatorItems.findIndex(
  (page) => page.id === 'flanerie'
)
const HOME_PAGE_CONTENT_MOTION_DURATION = 600
const MOBILE_HOME_PAGE_CONTENT_MOTION_DURATION = 260
const HERO_CONTENT_TRANSITION_DURATION = 1200
const HERO_INITIAL_CONTENT_TRANSITION_DURATION = 1200
const HERO_INITIAL_ENTRANCE_DURATION = 1000
const HERO_PAGE_TRANSITION_DELAY = 700
const MOBILE_HERO_PAGE_TRANSITION_DELAY = 180
const HOME_PAGE_CONTENT_EXIT_DURATION = 200
const MOBILE_HOME_PAGE_CONTENT_EXIT_DURATION = 140
const HOME_HEADER_PROGRESS_DURATION = 240
const HOME_INDICATOR_TRANSITION_RATIO = 0.72
const HOME_PAGE_LONG_SWIPE_RATIO = 0.1
const CRAFT_FOOTER_GESTURE_THRESHOLD = 42
const CRAFT_FOOTER_TRANSITION_DURATION = 720
const CRAFT_FOOTER_WHEEL_QUIET_DURATION = 160
const NEWS_WHEEL_GESTURE_THRESHOLD = 18
const HERO_TARGET_MOUNT_PROGRESS = 0.62
const HERO_EXIT_FADE_DELAY_PROGRESS = 0.35
const HERO_EXIT_FADE_DURATION_PROGRESS = 0.6
const HERO_HEAVY_CONTENT_UNMOUNT_PROGRESS =
  HERO_EXIT_FADE_DELAY_PROGRESS + HERO_EXIT_FADE_DURATION_PROGRESS

const scheduleHomeFlaneriePreload = () => {
  if (
    hasHomeFlaneriePreloadStarted ||
    homeFlaneriePreloadIdleHandle !== null ||
    homeFlaneriePreloadTimer !== null
  ) {
    return
  }

  const preload = () => {
    homeFlaneriePreloadIdleHandle = null
    homeFlaneriePreloadTimer = null
    hasHomeFlaneriePreloadStarted = true
    preloadHomePageImages(FLANERIE_PAGE_INDEX)
    void loadHomeFlanerieSection().catch(() => {
      hasHomeFlaneriePreloadStarted = false
    })
  }

  if (window.requestIdleCallback) {
    homeFlaneriePreloadIdleHandle = window.requestIdleCallback(preload, {
      timeout: 2500,
    })
    return
  }

  homeFlaneriePreloadTimer = window.setTimeout(preload, 1200)
}

const cancelHomeFlaneriePreload = () => {
  if (homeFlaneriePreloadIdleHandle !== null) {
    window.cancelIdleCallback?.(homeFlaneriePreloadIdleHandle)
    homeFlaneriePreloadIdleHandle = null
  }
  if (homeFlaneriePreloadTimer !== null) {
    window.clearTimeout(homeFlaneriePreloadTimer)
    homeFlaneriePreloadTimer = null
  }
}

const areHeroEffectsPaused = computed(
  () =>
    isHeroExitPreparing.value ||
    isHeroContentInactive.value ||
    isHeroReturnEffectsDeferred.value
)

const startHeroInitialEntrance = () => {
  if (isHeroInitialEntranceReady.value) return

  heroInitialEntranceObserver?.disconnect()
  heroInitialEntranceObserver = null
  isHeroInitialEntering.value = true
  isHeroInitialEntranceReady.value = true
  isHeroInitialHidden.value = false
  heroInitialEntranceTimer = setTimeout(() => {
    isHeroInitialEntering.value = false
    if (!isHeroExitPreparing.value) isHeroMotionPrepared.value = false
    heroInitialEntranceTimer = null
  }, HERO_INITIAL_CONTENT_TRANSITION_DURATION)
}

const waitForHeroLayoutEntrance = () => {
  const layoutElement = heroSection.value?.closest('.layout-page')
  if (!layoutElement) {
    startHeroInitialEntrance()
    return
  }

  if (layoutElement.classList.contains('layout-show')) {
    startHeroInitialEntrance()
    return
  }

  heroInitialEntranceObserver = new MutationObserver(() => {
    if (layoutElement.classList.contains('layout-show')) {
      startHeroInitialEntrance()
    }
  })
  heroInitialEntranceObserver.observe(layoutElement, {
    attributeFilter: ['class'],
    attributes: true,
  })
}

const homePageStyle = computed(() => ({
  '--home-craft-footer-height': craftFooterHeight.value,
  '--home-marquee-viewport-top': marqueeViewportTop.value,
  '--home-hero-content-duration': `${HERO_CONTENT_TRANSITION_DURATION}ms`,
  '--home-passion-crystal-enter-duration': `${
    usesTouchCarousel.value ? 180 : HERO_CONTENT_TRANSITION_DURATION
  }ms`,
  '--home-passion-crystal-exit-duration': `${
    (usesTouchCarousel.value ? 180 : HERO_CONTENT_TRANSITION_DURATION) / 2
  }ms`,
  '--home-passion-crystal-enter-fade-duration': `${
    usesTouchCarousel.value ? 99 : 300
  }ms`,
  '--home-passion-crystal-exit-fade-delay': `${
    usesTouchCarousel.value ? 35 : 175
  }ms`,
  '--home-passion-crystal-exit-fade-duration': `${
    usesTouchCarousel.value ? 40 : 125
  }ms`,
  '--home-hero-exit-motion-duration': `${
    usesTouchCarousel.value ? 180 : HERO_CONTENT_TRANSITION_DURATION
  }ms`,
  '--home-hero-exit-fade-delay': `${
    (usesTouchCarousel.value
      ? MOBILE_HERO_PAGE_TRANSITION_DELAY
      : HERO_PAGE_TRANSITION_DELAY) * HERO_EXIT_FADE_DELAY_PROGRESS
  }ms`,
  '--home-hero-exit-fade-duration': `${
    (usesTouchCarousel.value
      ? MOBILE_HERO_PAGE_TRANSITION_DELAY
      : HERO_PAGE_TRANSITION_DELAY) * HERO_EXIT_FADE_DURATION_PROGRESS
  }ms`,
  '--home-hero-initial-content-duration': `${HERO_INITIAL_CONTENT_TRANSITION_DURATION}ms`,
}))
const marqueeLayerStyle = computed(() => ({
  transform: `translate3d(0, ${marqueeViewportTop.value}, 0)`,
}))

const setHomeMotionStyle = (name: string, value: string) => {
  const root = homePageElement.value
  if (!root || homeMotionStyleCache.get(name) === value) return
  homeMotionStyleCache.set(name, value)
  root.style.setProperty(name, value)
}

const setRootProgressTransitionDuration = (duration: number) => {
  const value = `${duration}ms`
  if (rootProgressTransitionDuration === value) return
  rootProgressTransitionDuration = value
  document.documentElement.style.setProperty(
    '--page-scroll-progress-transition-duration',
    value
  )
}

const renderHomeMotionStyles = (
  swiper: SwiperInstance,
  pagePosition: number,
  duration: number
) => {
  const root = homePageElement.value
  if (!root) return

  const slideHeight = swiper.height || window.innerHeight
  const normalizedPosition = Math.min(1, Math.max(0, pagePosition))
  setHomeMotionStyle('--home-page-motion-duration', `${duration}ms`)
  setHomeMotionStyle(
    '--home-hero-counter-offset',
    `${normalizedPosition * slideHeight}px`
  )
  setHomeMotionStyle(
    '--home-indicator-offset',
    `${-(pagePosition + 0.5) * HOME_INDICATOR_ITEM_STEP}em`
  )
  setHomeMotionStyle(
    '--home-indicator-motion-duration',
    `${duration > 0 ? duration * HOME_INDICATOR_TRANSITION_RATIO : 0}ms`
  )
  setRootProgressTransitionDuration(duration)
}

const syncCraftFooterHeight = (height?: number) => {
  const footer =
    craftFooterElement ??
    document.querySelector<HTMLElement>('#page-footer-portal > .bottom-text')
  if (!footer) return
  craftFooterElement = footer

  const nextHeight = Math.ceil(height ?? footer.getBoundingClientRect().height)
  if (nextHeight > 0) craftFooterHeight.value = `${nextHeight}px`
}

const connectCraftFooterResizeObserver = () => {
  craftFooterResizeObserver?.disconnect()
  const footer = document.querySelector<HTMLElement>(
    '#page-footer-portal > .bottom-text'
  )
  if (!footer) return
  craftFooterElement = footer

  craftFooterResizeObserver = new ResizeObserver(([entry]) => {
    const borderBox = entry?.borderBoxSize?.[0]
    syncCraftFooterHeight(borderBox?.blockSize ?? entry?.contentRect.height)
  })
  craftFooterResizeObserver.observe(footer)
  syncCraftFooterHeight()
}

const disconnectCraftFooterResizeObserver = () => {
  craftFooterResizeObserver?.disconnect()
  craftFooterResizeObserver = null
  craftFooterElement = null
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

const clearHomeHeaderTransition = () => {
  if (homeHeaderTransitionTimer) {
    clearTimeout(homeHeaderTransitionTimer)
    homeHeaderTransitionTimer = null
  }
  isHomeHeaderTransitionStaging.value = false
}

const stageHomeHeaderTransition = (
  targetProgress: 0 | 1,
  transitionDelay: number,
  onComplete: () => void
) => {
  clearHomeHeaderTransition()
  lockedHomeHeaderProgress = targetProgress
  isHomePageTransitionActive.value = true
  isHomeHeaderTransitionStaging.value = true
  setRootProgressTransitionDuration(HOME_HEADER_PROGRESS_DURATION)
  visualStateStore.setHomeHeaderScrollProgress(targetProgress)

  homeHeaderTransitionTimer = setTimeout(
    () => {
      homeHeaderTransitionTimer = null
      isHomeHeaderTransitionStaging.value = false
      onComplete()
    },
    reducedMotionQuery?.matches ? 0 : transitionDelay
  )
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

const clearHeroDeferredContentTimer = () => {
  if (!heroDeferredContentTimer) return
  clearTimeout(heroDeferredContentTimer)
  heroDeferredContentTimer = null
}

const clearHeroMotionReleaseTimer = () => {
  if (!heroMotionReleaseTimer) return
  clearTimeout(heroMotionReleaseTimer)
  heroMotionReleaseTimer = null
}

const clearHeroHeavyContentUnmountTimer = () => {
  if (!heroHeavyContentUnmountTimer) return
  clearTimeout(heroHeavyContentUnmountTimer)
  heroHeavyContentUnmountTimer = null
}

const clearHeroReturnEffectsTimer = () => {
  if (!heroReturnEffectsTimer) return
  clearTimeout(heroReturnEffectsTimer)
  heroReturnEffectsTimer = null
}

const scheduleHeroReturnEffectsReveal = () => {
  clearHeroReturnEffectsTimer()
  const reveal = () => {
    heroReturnEffectsTimer = null
    isHeroReturnEffectsDeferred.value = false
    syncHeroMotionListener()
    startAuto()
  }
  const delay =
    (usesTouchCarousel.value
      ? MOBILE_HERO_PAGE_TRANSITION_DELAY
      : HERO_PAGE_TRANSITION_DELAY) * HERO_EXIT_FADE_DELAY_PROGRESS

  if (reducedMotionQuery?.matches || delay <= 0) {
    reveal()
    return
  }
  heroReturnEffectsTimer = setTimeout(reveal, delay)
}

const mountHeroHeavyContent = () => {
  clearHeroHeavyContentUnmountTimer()
  isHeroHeavyContentMounted.value = true
}

const unmountHeroHeavyContent = () => {
  clearHeroHeavyContentUnmountTimer()
  pauseAuto()
  newsSwiper.value = null
  isHeroHeavyContentMounted.value = false
}

const clearHeroExitPreparationFrame = () => {
  if (heroExitPreparationFrameId === null) return
  window.cancelAnimationFrame(heroExitPreparationFrameId)
  heroExitPreparationFrameId = null
}

const resetHeroExitPreparation = () => {
  clearHeroExitPreparationFrame()
  clearHeroDeferredContentTimer()
  clearHeroHeavyContentUnmountTimer()
  isHeroExitPreparing.value = false
}

const scheduleHeroHeavyContentUnmount = (exitDuration: number) => {
  clearHeroHeavyContentUnmountTimer()
  const unmount = () => {
    heroHeavyContentUnmountTimer = null
    if (
      activeHomePageIndex.value === 0 &&
      isHeroContentInactive.value &&
      isHeroExitPreparing.value
    ) {
      unmountHeroHeavyContent()
    }
  }

  if (reducedMotionQuery?.matches || exitDuration <= 0) {
    unmount()
    return
  }
  heroHeavyContentUnmountTimer = setTimeout(
    unmount,
    Math.round(exitDuration * HERO_HEAVY_CONTENT_UNMOUNT_PROGRESS)
  )
}

const scheduleHeroTargetMount = (
  swiper: SwiperInstance,
  targetIndex: number,
  exitDuration: number
) => {
  clearHeroDeferredContentTimer()
  const mount = () => {
    heroDeferredContentTimer = null
    if (
      homeSwiper.value === swiper &&
      activeHomePageIndex.value === 0 &&
      isHeroContentInactive.value
    ) {
      ensureHomePageRendered(targetIndex)
    }
  }

  if (reducedMotionQuery?.matches || exitDuration <= 0) {
    mount()
    return
  }
  heroDeferredContentTimer = setTimeout(
    mount,
    Math.round(exitDuration * HERO_TARGET_MOUNT_PROGRESS)
  )
}

const startPreparedHeroExit = (
  swiper: SwiperInstance,
  resolvedTargetIndex: number
) => {
  heroExitPreparationFrameId = null
  if (
    homeSwiper.value !== swiper ||
    activeHomePageIndex.value !== 0 ||
    !isHeroExitPreparing.value
  ) {
    resetHeroExitPreparation()
    lockedHomeHeaderProgress = null
    isHomePageTransitionActive.value = false
    return
  }

  isHeroContentInactive.value = true
  syncMarqueeViewportTop()

  const exitDuration = usesTouchCarousel.value
    ? MOBILE_HERO_PAGE_TRANSITION_DELAY
    : HERO_PAGE_TRANSITION_DELAY
  scheduleHeroTargetMount(swiper, resolvedTargetIndex, exitDuration)
  scheduleHeroHeavyContentUnmount(exitDuration)

  stageHomeHeaderTransition(1, exitDuration, () => {
    if (homeSwiper.value !== swiper || activeHomePageIndex.value !== 0) {
      resetHeroExitPreparation()
      lockedHomeHeaderProgress = null
      isHomePageTransitionActive.value = false
      return
    }

    clearHeroDeferredContentTimer()
    unmountHeroHeavyContent()
    ensureHomePageRendered(resolvedTargetIndex)
    void nextTick(() => {
      if (homeSwiper.value !== swiper || activeHomePageIndex.value !== 0) return
      swiper.allowSlideNext = true
      swiper.slideTo(resolvedTargetIndex)
    })
  })
}

const beginHeroPageTransition = (
  swiper: SwiperInstance,
  resolvedTargetIndex: number
) => {
  if (
    homeSwiper.value !== swiper ||
    activeHomePageIndex.value !== 0 ||
    isHeroContentInactive.value ||
    isHeroExitPreparing.value ||
    isMobileHomePageContentEntering.value
  ) {
    lockedHomeHeaderProgress = null
    isHomePageTransitionActive.value = false
    return
  }

  isHeroExitPreparing.value = true
  isHeroMotionPrepared.value = true
  isPassionHovering.value = false
  pauseAuto()
  swiper.allowSlideNext = false

  void nextTick(() => {
    if (reducedMotionQuery?.matches) {
      startPreparedHeroExit(swiper, resolvedTargetIndex)
      return
    }
    heroExitPreparationFrameId = window.requestAnimationFrame(() =>
      startPreparedHeroExit(swiper, resolvedTargetIndex)
    )
  })
}

const requestHeroPageTransition = (targetIndex = 1) => {
  const swiper = homeSwiper.value
  if (
    !swiper ||
    activeHomePageIndex.value !== 0 ||
    targetIndex <= 0 ||
    isHeroContentInactive.value ||
    isHeroExitPreparing.value ||
    isMobileHomePageContentEntering.value ||
    homeHeaderTransitionTimer !== null
  ) {
    return
  }

  const resolvedTargetIndex = Math.min(
    targetIndex,
    getHomeLastPageIndex(swiper)
  )
  preloadHomePageImages(resolvedTargetIndex)
  beginHeroPageTransition(swiper, resolvedTargetIndex)
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

  if (targetIndex === 0 && !usesTouchCarousel.value) {
    mountHeroHeavyContent()
  }

  if (usesTouchCarousel.value) {
    deferredHomePageContentIndex.value = targetIndex
    renderedHomePageIds.value = new Set()
  } else {
    const targetPage = homePageIndicatorItems[targetIndex]
    renderedHomePageIds.value = new Set(targetPage ? [targetPage.id] : ['hero'])
  }

  void nextTick(() => {
    if (homeSwiper.value === swiper) swiper.slideTo(targetIndex)
  })
}

const flushQueuedHomePageTransition = () => {
  const targetIndex = queuedHomePageTransitionIndex
  if (targetIndex === null) return
  queuedHomePageTransitionIndex = null
  requestHomePageTransition(targetIndex)
}

const prepareHomePageContentExit = (targetIndex: number) => {
  const swiper = homeSwiper.value
  const activeIndex = activeHomePageIndex.value
  if (
    !swiper ||
    activeIndex === 0 ||
    targetIndex < 0 ||
    targetIndex > getHomeLastPageIndex(swiper) ||
    targetIndex === activeIndex
  ) {
    return false
  }
  if (
    isHomePageTransitioning ||
    isMobileHomePageContentEntering.value ||
    pendingHomePageTransitionIndex.value !== null
  ) {
    queuedHomePageTransitionIndex = targetIndex
    return false
  }

  isHomePageTransitionActive.value = true
  pendingHomePageTransitionIndex.value = targetIndex
  fadingHomePageIndex.value = activeIndex
  homePageTransitionDirection.value =
    targetIndex > activeIndex ? 'forward' : 'backward'
  if (!usesTouchCarousel.value) ensureHomePageRendered(targetIndex)
  clearHomePageContentExitTimer()
  return true
}

const beginHomePageTransition = (targetIndex: number) => {
  if (!prepareHomePageContentExit(targetIndex)) return

  homePageContentExitTimer = setTimeout(
    completeHomePageContentExit,
    reducedMotionQuery?.matches
      ? 0
      : usesTouchCarousel.value
      ? MOBILE_HOME_PAGE_CONTENT_EXIT_DURATION
      : HOME_PAGE_CONTENT_EXIT_DURATION
  )
}

const requestHomePageTransition = (targetIndex: number) => {
  const swiper = homeSwiper.value
  const activeIndex = activeHomePageIndex.value
  if (
    !swiper ||
    activeIndex === 0 ||
    targetIndex < 0 ||
    targetIndex > getHomeLastPageIndex(swiper) ||
    targetIndex === activeIndex
  ) {
    return
  }
  if (homeHeaderTransitionTimer !== null) return
  if (
    isHomePageTransitioning ||
    isMobileHomePageContentEntering.value ||
    pendingHomePageTransitionIndex.value !== null
  ) {
    queuedHomePageTransitionIndex = targetIndex
    return
  }

  if (targetIndex === 0) {
    if (!prepareHomePageContentExit(targetIndex)) return
    clearHeroMotionReleaseTimer()
    clearHeroReturnEffectsTimer()
    isHeroReturnEffectsDeferred.value = true
    isHeroMotionPrepared.value = true
    stageHomeHeaderTransition(
      0,
      HOME_HEADER_PROGRESS_DURATION,
      completeHomePageContentExit
    )
    return
  }

  preloadHomePageImages(targetIndex)

  beginHomePageTransition(targetIndex)
}

const handleHomeWheel = (event: WheelEvent) => {
  if (activeHomePageIndex.value === 0) {
    if (isHeroContentInactive.value || isHeroExitPreparing.value) {
      consumeHomeGesture(event)
      return
    }
    if (isNewsWheelInteraction(event)) return

    consumeHomeGesture(event)
    if (event.deltaY <= NEWS_WHEEL_GESTURE_THRESHOLD) return
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
    pendingHomePageTransitionIndex.value !== null ||
    homeHeaderTransitionTimer !== null
  ) {
    consumeHomeGesture(event)
    return
  }

  consumeHomeGesture(event)
  if (event.deltaY > 18) {
    requestHomePageTransition(activePage + 1)
  } else if (event.deltaY < -18) {
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
  isNewsHovered = true
  newsWheelInteractionBounds = null
  pauseAuto()
}

const handleNewsWheelLeave = () => {
  isNewsHovered = false
  newsWheelInteractionBounds = null
  startAuto()
}

const setHomeTouchGestureActive = (active: boolean) => {
  if (isHomeTouchGestureActive === active) return
  isHomeTouchGestureActive = active

  if (active) {
    window.addEventListener('pointermove', handleHomePointerMove, {
      capture: true,
      passive: false,
    })
    window.addEventListener('pointerup', handleHomePointerEnd, true)
    window.addEventListener('pointercancel', handleHomePointerEnd, true)
    return
  }

  window.removeEventListener('pointermove', handleHomePointerMove, true)
  window.removeEventListener('pointerup', handleHomePointerEnd, true)
  window.removeEventListener('pointercancel', handleHomePointerEnd, true)
}

const handleHomePointerDown = (event: PointerEvent) => {
  if (event.pointerType !== 'touch') return

  homePointerStartX = event.clientX
  homePointerStartY = event.clientY
  homePointerAxis = null
  didHandleHomePointer = false
  setHomeTouchGestureActive(true)
}

const handleHomePointerMove = (event: PointerEvent) => {
  if (
    event.pointerType !== 'touch' ||
    homePointerStartX === null ||
    homePointerStartY === null
  ) {
    return
  }

  if (didHandleHomePointer) {
    consumeHomeGesture(event)
    return
  }

  const deltaX = homePointerStartX - event.clientX
  const deltaY = homePointerStartY - event.clientY
  if (homePointerAxis === null) {
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 10) return
    homePointerAxis =
      Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
  }
  if (homePointerAxis === 'horizontal') return
  if (Math.abs(deltaY) < CRAFT_FOOTER_GESTURE_THRESHOLD) return

  if (activeHomePageIndex.value === 0) {
    if (
      deltaY > 0 ||
      isHeroContentInactive.value ||
      isHeroExitPreparing.value
    ) {
      consumeHomeGesture(event)
    }
    if (
      deltaY > 0 &&
      !isHeroContentInactive.value &&
      !isHeroExitPreparing.value
    ) {
      requestHeroPageTransition()
    }
    didHandleHomePointer = true
    return
  }

  const activePage = activeHomePageIndex.value
  if (activePage !== CRAFT_PAGE_INDEX) {
    consumeHomeGesture(event)
    if (
      !isHomePageTransitioning &&
      pendingHomePageTransitionIndex.value === null
    ) {
      requestHomePageTransition(activePage + (deltaY > 0 ? 1 : -1))
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
  homePointerStartX = null
  homePointerStartY = null
  homePointerAxis = null
  didHandleHomePointer = false
  setHomeTouchGestureActive(false)
}

const syncMarqueeViewportTop = () => {
  if (isHeroContentInactive.value) {
    if (headerBottom.value > 0) {
      marqueeViewportTop.value = `${headerBottom.value}px`
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
  homePageTransitionDuration.value = reducedMotionQuery?.matches
    ? 0
    : usesTouchCarousel.value
    ? MOBILE_HOME_PAGE_TRANSITION_DURATION
    : HOME_PAGE_TRANSITION_DURATION
  if (homeSwiper.value) {
    homeSwiper.value.params.speed = homePageTransitionDuration.value
  }
  syncHeroMotionListener()
}

const carouselDirection = computed(() =>
  usesTouchCarousel.value ? 'horizontal' : 'vertical'
)
const carouselTouchAngle = computed(() => (usesTouchCarousel.value ? 30 : 45))
const shouldAutoPlayNews = () =>
  siteEntryActive.value &&
  isPageVisible &&
  !isNewsHovered &&
  !isHeroReturnEffectsDeferred.value &&
  activeHomePageIndex.value === 0 &&
  newsItems.value.length > 1
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
    -sloganRotateY * 0.72 * motionScale
  )
  setHeroTransformVariables(
    recommendElement.value,
    sloganRotateX * 0.72 * motionScale,
    sloganRotateY * 0.72 * motionScale
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

  applySloganTransform()
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
  if (isHeroMotionEnabled && isPageVisible) startSloganMotion()
}

const refreshHeroInteractionMetrics = () => {
  if (heroSection.value) {
    const rect = heroSection.value.getBoundingClientRect()
    heroMetrics = {
      centerX: rect.left + rect.width / 2,
      centerY: window.innerHeight / 2,
      halfWidth: Math.max(1, rect.width / 2),
      halfHeight: Math.max(1, window.innerHeight / 2),
    }
  }
}

const canUseHeroMotion = () =>
  window.innerWidth >= 768 &&
  !!heroMotionQuery?.matches &&
  !reducedMotionQuery?.matches

const syncNewsCarouselMode = () => {
  const direction = usesTouchCarousel.value ? 'horizontal' : 'vertical'
  const touchAngle = usesTouchCarousel.value ? 30 : 45
  if (newsSwiper.value && newsSwiper.value.params.direction !== direction) {
    newsSwiper.value.changeDirection(direction, false)
    newsSwiper.value.params.touchAngle = touchAngle
    newsSwiper.value.update()
  } else if (newsSwiper.value) {
    newsSwiper.value.params.touchAngle = touchAngle
  }
}

const setTouchPagingListenerActive = (active: boolean) => {
  if (isTouchPagingListenerActive === active) return
  isTouchPagingListenerActive = active

  if (active) {
    window.addEventListener('pointerdown', handleHomePointerDown, {
      capture: true,
      passive: true,
    })
    return
  }

  window.removeEventListener('pointerdown', handleHomePointerDown, true)
  setHomeTouchGestureActive(false)
  homePointerStartX = null
  homePointerStartY = null
  homePointerAxis = null
  didHandleHomePointer = false
}

const syncTouchInputMode = () => {
  usesTouchCarousel.value = touchInputQuery?.matches ?? false
  handleReducedMotionChange()
  syncNewsCarouselMode()
  setTouchPagingListenerActive(usesTouchCarousel.value)
}

const syncHeroMotionListener = () => {
  const shouldListen =
    siteEntryActive.value &&
    canUseHeroMotion() &&
    isPageVisible &&
    !isHeroContentInactive.value &&
    !isHeroExitPreparing.value
  isHeroMotionEnabled = shouldListen

  if (shouldListen && !isHeroMotionListenerActive) {
    refreshHeroInteractionMetrics()
    heroSection.value?.addEventListener('mousemove', handleHeroMouseMove, {
      passive: true,
    })
    isHeroMotionListenerActive = true
  } else if (!shouldListen && isHeroMotionListenerActive) {
    heroSection.value?.removeEventListener('mousemove', handleHeroMouseMove)
    isHeroMotionListenerActive = false
  }

  if (!shouldListen) {
    stopSloganMotion()
    sloganTargetRotateX = sloganRotateX = 0
    sloganTargetRotateY = sloganRotateY = 0
    isPassionHovering.value = false
    applySloganTransform()
  }
}

const handleHeroResize = () => {
  newsWheelInteractionBounds = null
  pendingHeroViewportResize = true
  scheduleHeroLayoutMeasure()
}

const scheduleHeroLayoutMeasure = () => {
  if (heroLayoutMeasureRafId !== null) return
  heroLayoutMeasureRafId = window.requestAnimationFrame(() => {
    heroLayoutMeasureRafId = null
    const viewportResized = pendingHeroViewportResize
    pendingHeroViewportResize = false
    if (viewportResized) {
      syncHeroMotionListener()
      syncCraftFooterHeight()
      if (homeSwiper.value) {
        renderHomeMotionStyles(
          homeSwiper.value,
          homeSwiper.value.activeIndex,
          homePageMotionDuration.value
        )
      }
    }
    syncMarqueeViewportTop()
    if (isHeroMotionEnabled) refreshHeroInteractionMetrics()
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
  const normalizedOffsetX = Math.max(-1, Math.min(1, offsetX))
  const horizontalRotationStrength =
    normalizedOffsetX < 0
      ? HERO_LEFT_ROTATION_STRENGTH
      : HERO_RIGHT_ROTATION_STRENGTH
  sloganTargetRotateY = normalizedOffsetX * horizontalRotationStrength
  sloganTargetRotateX = Math.max(-1, Math.min(1, offsetY)) * 8
  startSloganMotion()
}

const setNewsSwiper = (swiper: SwiperInstance) => {
  newsSwiper.value = swiper
  syncNewsCarouselMode()
  activeIndex.value = swiper.realIndex || 0
  startAuto()
}

const getHomeLastPageIndex = (swiper: SwiperInstance) =>
  Math.max(0, swiper.slides.length - 1)

const syncHomePageProgress = (swiper: SwiperInstance, pagePosition: number) => {
  const lastPageIndex = getHomeLastPageIndex(swiper)
  visualStateStore.setPageScrollProgressOverride(
    lastPageIndex > 0 ? (pagePosition / lastPageIndex) * 100 : 0
  )
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

const syncHomeZodiacLayout = (pageIndex: number) => {
  visualStateStore.setZodiacLayout(pageIndex === 0 ? 'hero' : 'content')
  visualStateStore.setHomeStarfieldVisible(pageIndex === 0)
}

const syncActiveHomePage = (swiper: SwiperInstance) => {
  const activePage = swiper.activeIndex
  const isContentMountDeferred =
    usesTouchCarousel.value && deferredHomePageContentIndex.value === activePage
  if (!isContentMountDeferred) ensureHomePageRendered(activePage)
  activeHomePageIndex.value = activePage
  isHeroContentInactive.value = activePage !== 0 || isContentMountDeferred
  swiper.allowSlideNext = activePage !== 0
  syncHomeZodiacLayout(activePage)
}

const setHomeSwiper = (swiper: SwiperInstance) => {
  homeSwiper.value = swiper
  swiper.params.speed = homePageTransitionDuration.value
  syncActiveHomePage(swiper)
  renderHomeMotionStyles(swiper, swiper.activeIndex, 0)
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
  renderHomeMotionStyles(swiper, pagePosition, homePageMotionDuration.value)
  syncHomePageProgress(swiper, pagePosition)
  if (lockedHomeHeaderProgress === null) {
    visualStateStore.setHomeHeaderScrollProgress(Math.min(1, pagePosition))
  }
}

const handleHomeSetTransition = (_swiper: SwiperInstance, duration: number) => {
  homePageMotionDuration.value = duration
  if (homeSwiper.value) {
    renderHomeMotionStyles(
      homeSwiper.value,
      homeSwiper.value.activeIndex,
      duration
    )
  }
}

const handleHomeSlideChange = (swiper: SwiperInstance) => {
  syncActiveHomePage(swiper)
  void nextTick(scheduleHeroLayoutMeasure)
  if (swiper.activeIndex !== CRAFT_PAGE_INDEX) {
    disconnectCraftFooterResizeObserver()
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
  isHomePageTransitionActive.value = true
  if (swiper.activeIndex === CRAFT_PAGE_INDEX) disarmCraftFooterWheel()
  if (homePageFadeTimer) clearTimeout(homePageFadeTimer)
  const isContentMountDeferred =
    usesTouchCarousel.value &&
    deferredHomePageContentIndex.value === swiper.activeIndex
  if (swiper.activeIndex === 0 && !isContentMountDeferred) {
    scheduleHeroReturnEffectsReveal()
  }
  if (isContentMountDeferred) {
    renderedHomePageIds.value = new Set()
  } else {
    retainActiveHomePage(swiper.activeIndex)
  }
  enteringHomePageIndex.value = isContentMountDeferred
    ? null
    : swiper.activeIndex
  leavingHomePageIndex.value = swiper.previousIndex
  homePageTransitionDirection.value =
    swiper.activeIndex > swiper.previousIndex ? 'forward' : 'backward'
  if (!isContentMountDeferred) {
    homePageFadeTimer = setTimeout(() => {
      enteringHomePageIndex.value = null
      leavingHomePageIndex.value = null
      homePageTransitionDirection.value = null
      homePageFadeTimer = null
    }, HOME_PAGE_CONTENT_MOTION_DURATION)
  }
}

const handleHomeTransitionEnd = (swiper: SwiperInstance) => {
  const activeSlide = swiper.slides[swiper.activeIndex] as
    | HTMLElement
    | undefined
  const swiperElement = swiper.el as HTMLElement | undefined
  if (
    !activeSlide ||
    !swiperElement ||
    Math.abs(
      activeSlide.getBoundingClientRect().top -
        swiperElement.getBoundingClientRect().top
    ) > 1
  ) {
    return
  }

  isHomePageTransitioning = false
  isHomePageTransitionActive.value = false
  if (swiper.activeIndex !== 0) {
    resetHeroExitPreparation()
    isHeroMotionPrepared.value = false
  } else {
    clearHeroMotionReleaseTimer()
    const remainingHeroEntryDuration = Math.max(
      0,
      (usesTouchCarousel.value ? 180 : HERO_CONTENT_TRANSITION_DURATION) -
        homePageTransitionDuration.value
    )
    heroMotionReleaseTimer = setTimeout(
      () => {
        isHeroMotionPrepared.value = false
        heroMotionReleaseTimer = null
      },
      reducedMotionQuery?.matches ? 0 : remainingHeroEntryDuration
    )
  }
  homePageMotionDuration.value = 0
  void nextTick(scheduleHeroLayoutMeasure)
  if (swiper.activeIndex === CRAFT_PAGE_INDEX) {
    scheduleCraftFooterWheelArm()
  }
  renderHomeMotionStyles(swiper, swiper.activeIndex, 0)
  const shouldRevealDeferredContent =
    usesTouchCarousel.value &&
    deferredHomePageContentIndex.value === swiper.activeIndex
  deferredHomePageContentIndex.value = null
  retainActiveHomePage(swiper.activeIndex)
  if (shouldRevealDeferredContent) {
    if (swiper.activeIndex === 0) mountHeroHeavyContent()
    isHeroContentInactive.value = swiper.activeIndex !== 0
    if (swiper.activeIndex === 0) scheduleHeroReturnEffectsReveal()
    isMobileHomePageContentEntering.value = true
    enteringHomePageIndex.value = swiper.activeIndex
    if (homePageFadeTimer) clearTimeout(homePageFadeTimer)
    homePageFadeTimer = setTimeout(
      () => {
        enteringHomePageIndex.value = null
        leavingHomePageIndex.value = null
        homePageTransitionDirection.value = null
        isMobileHomePageContentEntering.value = false
        homePageFadeTimer = null
        flushQueuedHomePageTransition()
      },
      reducedMotionQuery?.matches ? 0 : MOBILE_HOME_PAGE_CONTENT_MOTION_DURATION
    )
  } else {
    void nextTick(flushQueuedHomePageTransition)
  }
  syncHomePageProgress(swiper, swiper.activeIndex)
  const settledHeaderProgress = swiper.activeIndex === 0 ? 0 : 1
  visualStateStore.setHomeHeaderScrollProgress(settledHeaderProgress)
  lockedHomeHeaderProgress = null
}

const goToHomePage = (index: number) => {
  if (isCraftFooterVisible.value) setCraftFooterVisible(false)
  if (activeHomePageIndex.value === 0 && index > 0) {
    requestHeroPageTransition(index)
    return
  }
  requestHomePageTransition(index)
}

const returnToPassion = () => goToHomePage(0)

const goToNextHomePage = () => {
  const nextIndex = Math.min(
    activeHomePageIndex.value + 1,
    homePageIndicatorItems.length - 1
  )
  if (nextIndex === activeHomePageIndex.value) return
  goToHomePage(nextIndex)
}

const runNewsCarouselAction = (action: (swiper: SwiperInstance) => void) => {
  const swiper = newsSwiper.value
  if (!swiper || !newsItems.value.length) return
  pauseAuto()
  action(swiper)
  startAuto()
}
const prevSlide = () => runNewsCarouselAction((swiper) => swiper.slidePrev())
const nextSlide = () => runNewsCarouselAction((swiper) => swiper.slideNext())
const goTo = (index: number) =>
  runNewsCarouselAction((swiper) => swiper.slideToLoop(index))
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
  startAuto()
}

const startAuto = () => {
  if (!shouldAutoPlayNews() || !newsSwiper.value) {
    pauseAuto()
    return
  }
  if (newsAutoplayTimer !== null) return

  newsAutoplayTimer = window.setTimeout(() => {
    newsAutoplayTimer = null
    const swiper = newsSwiper.value
    if (!shouldAutoPlayNews() || !swiper) return
    if (!swiper.animating) swiper.slideNext()
    startAuto()
  }, NEWS_AUTOPLAY_DELAY)
}
const pauseAuto = () => {
  if (newsAutoplayTimer === null) return
  window.clearTimeout(newsAutoplayTimer)
  newsAutoplayTimer = null
}
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

watch(
  [isHeroContentInactive, isHeroExitPreparing, isHeroReturnEffectsDeferred],
  syncHeroMotionListener
)
watch(siteEntryActive, () => {
  syncHeroMotionListener()
  if (siteEntryActive.value) {
    startAuto()
    scheduleHomeFlaneriePreload()
  } else pauseAuto()
})
watch(headerBottom, () => {
  if (isHeroContentInactive.value) scheduleHeroLayoutMeasure()
})

onBeforeRouteLeave(() => {
  isHomePageTransitionActive.value = true
  clearHeroExitPreparationFrame()
  clearHeroDeferredContentTimer()
  clearHeroReturnEffectsTimer()
  pauseAuto()
  stopSloganMotion()
})

onMounted(async () => {
  isPageVisible = document.visibilityState !== 'hidden'
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  heroMotionQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
  touchInputQuery = window.matchMedia(TOUCH_INPUT_MEDIA_QUERY)
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  heroMotionQuery.addEventListener('change', syncHeroMotionListener)
  touchInputQuery.addEventListener('change', syncTouchInputMode)
  syncTouchInputMode()
  syncMarqueeViewportTop()
  heroContentResizeObserver = new ResizeObserver(scheduleHeroLayoutMeasure)
  if (heroContentElement.value) {
    heroContentResizeObserver.observe(heroContentElement.value)
  }
  if (siteEntryActive.value) {
    startAuto()
    scheduleHomeFlaneriePreload()
  }
  window.addEventListener('resize', handleHeroResize, { passive: true })
  window.addEventListener('blur', resetHeroSloganMotion)
  window.addEventListener(HOME_RETURN_TO_PASSION_EVENT, returnToPassion)
  window.addEventListener('wheel', handleHomeWheel, {
    capture: true,
    passive: false,
  })
  document.addEventListener('visibilitychange', handleVisibilityChange)
  await nextTick()
  waitForHeroLayoutEntrance()
  if (activeHomePageIndex.value === CRAFT_PAGE_INDEX) {
    window.requestAnimationFrame(connectCraftFooterResizeObserver)
  }
})

onUnmounted(() => {
  cancelHomeFlaneriePreload()
  queuedHomePageTransitionIndex = null
  heroInitialEntranceObserver?.disconnect()
  heroInitialEntranceObserver = null
  if (heroInitialEntranceTimer) {
    clearTimeout(heroInitialEntranceTimer)
    heroInitialEntranceTimer = null
  }
  resetHeroExitPreparation()
  clearHeroMotionReleaseTimer()
  clearHeroReturnEffectsTimer()
  visualStateStore.setHomeStarfieldVisible(true)
  visualStateStore.setHomeHeaderScrollProgress(0)
  visualStateStore.setPageScrollProgressOverride(null)
  if (dragResetTimer) clearTimeout(dragResetTimer)
  pauseAuto()
  if (craftFooterTransitionTimer) clearTimeout(craftFooterTransitionTimer)
  disarmCraftFooterWheel()
  clearHomeHeaderTransition()
  lockedHomeHeaderProgress = null
  if (homePageFadeTimer) clearTimeout(homePageFadeTimer)
  clearHomePageContentExitTimer()
  heroContentResizeObserver?.disconnect()
  heroContentResizeObserver = null
  disconnectCraftFooterResizeObserver()
  stopSloganMotion()
  heroSection.value?.removeEventListener('mousemove', handleHeroMouseMove)
  window.removeEventListener('resize', handleHeroResize)
  window.removeEventListener('blur', resetHeroSloganMotion)
  window.removeEventListener(HOME_RETURN_TO_PASSION_EVENT, returnToPassion)
  window.removeEventListener('wheel', handleHomeWheel, true)
  setTouchPagingListenerActive(false)
  if (heroLayoutMeasureRafId !== null) {
    window.cancelAnimationFrame(heroLayoutMeasureRafId)
  }
  document.documentElement.style.removeProperty(
    '--page-scroll-progress-transition-duration'
  )
  rootProgressTransitionDuration = ''
  homeMotionStyleCache.clear()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
  heroMotionQuery?.removeEventListener('change', syncHeroMotionListener)
  touchInputQuery?.removeEventListener('change', syncTouchInputMode)
  touchInputQuery = null
})
</script>

<style lang="less" scoped src="./index.less" />

<style lang="less" src="./global.less" />
