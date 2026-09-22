<template>
  <div
    ref="layoutPage"
    :class="{
      'layout-page': true,
      'layout-show': layoutShow,
      'entry-logo-ready': headerLogoReady,
      'no-menu': noMenuShellActive,
    }"
  >
    <el-header
      ref="headerElement"
      class="el-menu-layout-all"
      :class="{
        scrolled: isScrolled,
        'scroll-layout-active': isHeaderScrollLayoutActive,
        'content-aligned': headerPresentation.contentAligned,
      }"
    >
      <span class="header-hover-overlay" aria-hidden="true" />
      <button
        class="logo-box"
        type="button"
        :aria-label="locale === 'en' ? 'Return home' : '返回首页'"
        @click="returnHome"
      >
        <Logo id="0" class="logo" :active="false" data-entry-logo-target />
        <div :class="['right', locale]">
          <p>
            <span>{{ $t('name[0]') }}</span>
            <span :class="['name-center', { active: logoActive }]">{{
              $t('name[1]')
            }}</span>
            <span>{{ $t('name[2]') }}</span>
          </p>
          <span v-if="locale === 'zhCn'" class="site-subtitle">
            <span class="site-subtitle-text site-subtitle-text--short">
              <span>A</span>
              <span>N</span>
              <span>U</span>
              <span>T</span>
              <span>R</span>
              <span>I</span>
              <span>U</span>
              <span>M</span>
            </span>
            <span class="site-subtitle-text site-subtitle-text--long">
              <span>A</span>
              <span>N</span>
              <span>U</span>
              <span>L</span>
              <span>U</span>
              <span>C</span>
              <span>A</span>
              <span>'</span>
              <span>S</span>
              <span class="site-subtitle-space" aria-hidden="true" />
              <span>A</span>
              <span>T</span>
              <span>R</span>
              <span>I</span>
              <span>U</span>
              <span>M</span>
            </span>
          </span>
        </div>
        <Transition name="module-name" :css="!isHomeRoute">
          <span
            v-if="headerPresentation.moduleName"
            :class="[
              'current-module-name',
              { 'current-module-name--zh': locale === 'zhCn' },
              headerPresentation.moduleTheme &&
                `current-module-name--${headerPresentation.moduleTheme}`,
            ]"
          >
            {{ headerPresentation.moduleName }}
          </span>
        </Transition>
      </button>

      <nav
        v-if="!isMobile"
        class="desktop-menu"
        :aria-label="locale === 'en' ? 'Primary navigation' : '主导航'"
      >
        <ul class="menu-box">
          <li
            v-for="item in filterRoutes"
            :key="item.path"
            :class="[
              'desktop-menu-item',
              item.name,
              {
                'is-active': currentRouter === item.path,
                'is-inner-active':
                  isInnerMenuRoute && currentRouter === item.path,
              },
            ]"
          >
            <RouterLink
              :to="item.path"
              :aria-current="currentRouter === item.path ? 'page' : undefined"
            >
              <div class="title-box">
                <TextRoll class="main-title" :text="item.meta.titleEn" />
                <div class="second-title">
                  <div class="line" />
                  <span>{{ item.meta.titleCn }}</span>
                </div>
              </div>
            </RouterLink>
          </li>
        </ul>
      </nav>
    </el-header>

    <button
      v-if="isMobile"
      :class="{
        'mobile-menu-icon': true,
        scrolled: isScrolled,
        'scroll-layout-active': isHeaderScrollLayoutActive,
      }"
      type="button"
      :aria-label="locale === 'en' ? 'Toggle navigation' : '切换导航菜单'"
      :aria-expanded="isMobileMenuOpen"
      @click="toggleMobileMenu"
    >
      <div class="hamburger" :class="{ active: isMobileMenuOpen }">
        <span />
        <span />
        <span />
      </div>
    </button>

    <div
      v-if="isMobileMenuMounted"
      :class="{
        'mobile-menu-backdrop': true,
        active: isMobileMenuOpen,
      }"
      aria-hidden="true"
      @click="closeMobileMenu"
    />

    <div
      v-if="isMobile"
      :class="{
        'mobile-menu-panel': true,
        active: isMobileMenuOpen,
        closing: isMobileMenuClosing,
      }"
      @click="closeMobileMenu"
    >
      <div v-if="isMobileMenuMounted" class="mobile-menu-wrapper">
        <div class="mobile-menu-content" @click.stop>
          <div class="mobile-menu-items">
            <RouterLink
              v-for="(item, index) in filterRoutes"
              :key="index"
              :to="item.path"
              @click="closeMobileMenu"
            >
              <div
                class="mobile-menu-item"
                :class="{
                  active: currentRouter === item.path,
                  [item.name]: true,
                }"
              >
                <div class="big-title">{{ item.meta.titleEn }}</div>
                <div class="little-title">{{ item.meta.titleCn }}</div>
              </div>
            </RouterLink>
          </div>
        </div>
        <div class="mobile-footer">
          <div class="switches">
            <button
              class="mobile-menu-language"
              type="button"
              :aria-label="
                locale === 'zhCn' ? 'Switch to English' : '切换为中文'
              "
              @click="toggleLanguage"
            >
              <span v-if="locale === 'zhCn'" class="first cnArt">汉</span>
              <span v-if="locale === 'zhCn'" class="second">En</span>
              <span v-if="locale === 'en'" class="first">En</span>
              <span v-if="locale === 'en'" class="second cnArt">汉</span>
            </button>
            <button
              class="mobile-menu-theme"
              type="button"
              :aria-label="
                theme === 'light' ? 'Switch to dark theme' : '切换为浅色主题'
              "
              @click="toggleTheme"
            >
              <span v-if="theme === 'light'" class="first sun">
                <el-icon><Sunny /></el-icon>
              </span>
              <span v-if="theme === 'light'" class="second">
                <el-icon><Moon /></el-icon>
              </span>
              <span v-if="theme === 'dark'" class="first">
                <el-icon><Moon /></el-icon>
              </span>
              <span v-if="theme === 'dark'" class="second">
                <el-icon><Sunny /></el-icon>
              </span>
            </button>
          </div>
          <div class="mobile-menu-social-links" @click.stop>
            <FooterSocialLinks />
          </div>
          <div class="about-me">© 2018-2026 ANULUCA</div>
          <div class="mobile-footer-left" />
        </div>
      </div>
    </div>

    <div ref="routerContainer" class="router-container">
      <router-view v-slot="{ Component }">
        <transition
          name="route"
          mode="out-in"
          @before-leave="lockIslandRouteGeometry"
          @after-leave="completeRouteLeave"
          @after-enter="completeRouteTransition"
          @enter-cancelled="completeRouteTransition"
          @leave-cancelled="completeRouteLeave"
        >
          <component :is="Component" />
        </transition>
      </router-view>
      <div id="page-footer-portal" class="page-footer-portal" />
    </div>
    <BackToTop
      ref="backToTopElement"
      :suppressed="isMobile && isMobileMenuOpen"
    />
    <PageScrollProgress
      v-if="shouldShowPageScrollProgress"
      ref="pageScrollProgressElement"
      :top="headerBottom"
    />
    <button
      class="fullscreen"
      type="button"
      :aria-label="locale === 'en' ? 'Toggle fullscreen' : '切换全屏'"
      @click="toggleFullscreen"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Moon, Sunny } from '@element-plus/icons-vue'

import BackToTop from '@/components/BackToTop/index.vue'
import Logo from '@/components/Logo/index.vue'
import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import TextRoll from '@/components/TextRoll/index.vue'
import { finishRouteCursorLoading, routes, syncSeoMeta } from '@/router'
import { visualState } from '@/stores'
import { persistLocale, type SiteLocale } from '@/utils/locale'
import {
  addPageResizeListener,
  addPageScrollEndListener,
  addPageScrollListener,
  getPageMaxScrollTop,
  getPageScrollTop,
  scrollPageTo,
} from '@/utils/pageScroll'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'
import { ensureLightThemeStyles } from '@/utils/themeStyles'

const FooterSocialLinks = defineAsyncComponent(
  () => import('@/components/FooterSocialLinks/index.vue')
)

const { locale } = useI18n()
const props = defineProps({
  entryActive: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits<{
  routeTransitionComplete: []
}>()
const headerBottom = ref(0)
provide(
  'site-entry-active',
  computed(() => props.entryActive)
)
provide(
  'site-header-bottom',
  computed(() => headerBottom.value)
)

const logoActive = ref(true)
const headerLogoReady = ref(false)

const route = useRoute()
const router = useRouter()
const visualStateStore = visualState()

const normalizeMenuPath = (path: string) =>
  path === '/' ? path : path.replace(/\/+$/, '')

const currentRouter = computed(() => {
  const activePath =
    typeof route.meta.activeMenu === 'string'
      ? route.meta.activeMenu
      : route.path

  return normalizeMenuPath(activePath)
})

type ModuleHeaderTheme =
  | 'about'
  | 'archive'
  | 'craft'
  | 'flanerie'
  | 'flora'
  | 'island'

const moduleThemeByPath: Readonly<Record<string, ModuleHeaderTheme>> = {
  '/archive': 'archive',
  '/flanerie': 'flanerie',
  '/island': 'island',
  '/craft': 'craft',
  '/about': 'about',
  '/pet': 'flora',
}
const moduleRouteByPath = new Map(
  routes.map((item) => [normalizeMenuPath(item.path), item])
)
const hiddenModuleTitleRoutes = new Set(['HOME', '404', 'TEST'])
const expandedHeaderRoutes = new Set([...hiddenModuleTitleRoutes, 'PET'])
const headerPresentation = computed(() => {
  const routeName = String(route.name || '')
  const modulePath = currentRouter.value
  const moduleMeta = moduleRouteByPath.get(modulePath)?.meta || route.meta

  return {
    contentAligned: !expandedHeaderRoutes.has(routeName),
    moduleName: hiddenModuleTitleRoutes.has(routeName)
      ? ''
      : String(locale.value === 'en' ? moduleMeta.titleEn : moduleMeta.titleCn),
    moduleTheme: moduleThemeByPath[modulePath] || '',
  }
})
const isHomeRoute = computed(() => route.name === 'HOME')
const isInnerMenuRoute = computed(
  () =>
    typeof route.meta.activeMenu === 'string' &&
    normalizeMenuPath(route.path) !== currentRouter.value
)
const layoutPage = ref<HTMLElement | null>(null)
const routerContainer = ref<HTMLElement | null>(null)
const isScrolled = ref(false)
const layoutShow = ref(false)
const theme = computed(() => visualStateStore.theme)
const filterRoutes = routes.filter((item) => {
  return item?.meta?.ifShow
})

const noMenuShellActive = ref(!!route.meta?.noMenu)
let pendingNoMenuShell = noMenuShellActive.value

const isMobile = computed(() => visualStateStore.deviceType !== 'desktop')
const isMobileMenuOpen = ref(false)
const isMobileMenuMounted = ref(false)
const isMobileMenuClosing = ref(false)
let isMobileScrollLocked = false
let lockedMobileScrollY = 0
let removePageScrollListener: (() => void) | null = null
let removePageScrollEndListener: (() => void) | null = null
let removePageResizeListener: (() => void) | null = null
let pageResizeObserver: ResizeObserver | null = null
let headerResizeObserver: ResizeObserver | null = null
let pageMetricsFrameId: number | null = null
let backgroundTopInsetTimer: number | null = null
let headerScrolledTimer: number | null = null
let headerScrollLayoutActivatedAt: number | null = null
let mobileMenuOpenFrameId: number | null = null
let mobileMenuUnmountTimer: number | null = null

let documentScrollTop = 0
let scrollProgress = 0
let cachedPageMaxScrollTop = 0
let documentHeaderScrollProgress = 0
let renderedHeaderScrollProgress = ''
let isHeaderFullyScrolled = false
const isPageScrollable = ref(false)
const headerElement = ref<{ $el?: HTMLElement } | HTMLElement | null>(null)
const pageScrollProgressElement = ref<{
  setProgress: (progress: number) => void
} | null>(null)
const backToTopElement = ref<{
  setScrollState: (scrollTop: number, progress: number) => void
} | null>(null)
const shouldShowPageScrollProgress = computed(
  () =>
    visualStateStore.pageScrollProgressOverride !== null ||
    isPageScrollable.value
)
const isHeaderScrollLayoutActive = ref(false)
let logoTimer: number | null = null
let layoutTimer: number | null = null
let islandGeometryUnlockTimer: number | null = null
let removeRouteGeometryGuard: (() => void) | null = null
let lockedIslandRouteGeometry: {
  element: HTMLElement
  position: string
  top: string
  left: string
  width: string
  height: string
  margin: string
} | null = null
let lockedRouterContainerGeometry: {
  position: string
  top: string
  left: string
  width: string
  height: string
  margin: string
} | null = null
let hasPlayedEntryAnimation = false
const ISLAND_ROUTE_NAME = 'TEST'
const ISLAND_GEOMETRY_UNLOCK_DELAY = 260
const ENTRY_LOGO_REVEAL_DELAY = 600
const ENTRY_LOGO_REVEAL_DURATION = 300
const HEADER_SCROLL_DISTANCE = 100
const HEADER_SCROLL_PROGRESS_EPSILON = 0.001
const HEADER_BACKGROUND_CUTOUT_DELAY = 260
const MOBILE_MENU_EXIT_DURATION = 650
const islandShellClasses = ['island-pc-shell', 'island-mobile-shell'] as const
const islandLeavingClasses = [
  'island-pc-shell-leaving',
  'island-mobile-shell-leaving',
] as const
const floraShellClasses = ['flora-shell'] as const
const floraLeavingClasses = ['flora-shell-leaving'] as const
const routeShellClasses = [
  ...islandShellClasses,
  ...islandLeavingClasses,
  ...floraShellClasses,
  ...floraLeavingClasses,
] as const
const islandLeavingClassByRouteShell = {
  'island-pc': 'island-pc-shell-leaving',
  'island-mobile': 'island-mobile-shell-leaving',
  flora: 'flora-shell-leaving',
} as const

const clearEntryAnimationTimers = () => {
  if (logoTimer !== null) {
    window.clearTimeout(logoTimer)
    logoTimer = null
  }
  if (layoutTimer !== null) {
    window.clearTimeout(layoutTimer)
    layoutTimer = null
  }
}

const startEntryAnimation = () => {
  if (hasPlayedEntryAnimation) return
  hasPlayedEntryAnimation = true

  clearEntryAnimationTimers()
  logoActive.value = true
  headerLogoReady.value = false
  layoutShow.value = false

  logoTimer = window.setTimeout(() => {
    headerLogoReady.value = true

    logoTimer = window.setTimeout(() => {
      logoActive.value = false
      logoTimer = null
    }, ENTRY_LOGO_REVEAL_DURATION)
  }, ENTRY_LOGO_REVEAL_DELAY)

  layoutTimer = window.setTimeout(() => {
    layoutShow.value = true
    layoutTimer = null
  }, 100)
}

const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else if (document.exitFullscreen) {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.error(`Error attempting to toggle fullscreen: ${error}`)
  }
}

const clearMobileMenuTimers = () => {
  if (mobileMenuOpenFrameId !== null) {
    window.cancelAnimationFrame(mobileMenuOpenFrameId)
    mobileMenuOpenFrameId = null
  }
  if (mobileMenuUnmountTimer !== null) {
    window.clearTimeout(mobileMenuUnmountTimer)
    mobileMenuUnmountTimer = null
  }
}

const openMobileMenu = async () => {
  clearMobileMenuTimers()
  isMobileMenuClosing.value = false
  isMobileMenuMounted.value = true
  await nextTick()
  mobileMenuOpenFrameId = window.requestAnimationFrame(() => {
    mobileMenuOpenFrameId = null
    isMobileMenuOpen.value = true
  })
}

const toggleMobileMenu = () => {
  if (isMobileMenuOpen.value || mobileMenuOpenFrameId !== null) {
    closeMobileMenu()
    return
  }

  void openMobileMenu()
}

const closeMobileMenu = () => {
  clearMobileMenuTimers()
  isMobileMenuClosing.value = isMobileMenuOpen.value
  isMobileMenuOpen.value = false
  if (!isMobileMenuMounted.value) return

  mobileMenuUnmountTimer = window.setTimeout(() => {
    mobileMenuUnmountTimer = null
    isMobileMenuMounted.value = false
    isMobileMenuClosing.value = false
  }, MOBILE_MENU_EXIT_DURATION)
}

const preventBackgroundTouchMove = (event: TouchEvent) => {
  event.preventDefault()
}

const lockMobilePageScroll = () => {
  if (isMobileScrollLocked) return

  isMobileScrollLocked = true
  lockedMobileScrollY = getPageScrollTop()
  setSmoothScrollLocked('mobile-menu', true)
  document.documentElement.classList.add('mobile-menu-scroll-locked')
  document.body.classList.add('mobile-menu-scroll-locked')
  document.addEventListener('touchmove', preventBackgroundTouchMove, {
    passive: false,
  })
}

const unlockMobilePageScroll = () => {
  if (!isMobileScrollLocked) return

  isMobileScrollLocked = false
  const scrollY = lockedMobileScrollY
  setSmoothScrollLocked('mobile-menu', false)
  document.documentElement.classList.remove('mobile-menu-scroll-locked')
  document.body.classList.remove('mobile-menu-scroll-locked')
  document.removeEventListener('touchmove', preventBackgroundTouchMove)
  scrollPageTo({ top: scrollY })
}

const clearHeaderScrolledTimer = () => {
  if (headerScrolledTimer === null) return
  window.clearTimeout(headerScrolledTimer)
  headerScrolledTimer = null
}

const scheduleHeaderScrolledState = () => {
  const transitionDuration = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      '--page-scroll-progress-transition-duration'
    )
  )
  if (transitionDuration <= 0) {
    isScrolled.value = true
    return
  }

  headerScrolledTimer = window.setTimeout(() => {
    headerScrolledTimer = null
    if (isHeaderFullyScrolled) isScrolled.value = true
  }, transitionDuration)
}

const renderHeaderScrollProgress = (nextProgress: number) => {
  const progress = Math.min(1, Math.max(0, nextProgress))
  const layoutActive = progress > HEADER_SCROLL_PROGRESS_EPSILON
  const fullyScrolled = progress >= 1 - HEADER_SCROLL_PROGRESS_EPSILON

  const progressValue = progress.toFixed(4)
  if (renderedHeaderScrollProgress !== progressValue) {
    renderedHeaderScrollProgress = progressValue
    layoutPage.value?.style.setProperty(
      '--header-scroll-progress',
      progressValue
    )
  }
  if (isHeaderScrollLayoutActive.value !== layoutActive) {
    headerScrollLayoutActivatedAt = layoutActive ? performance.now() : null
    isHeaderScrollLayoutActive.value = layoutActive
  }

  if (isHeaderFullyScrolled === fullyScrolled) return
  isHeaderFullyScrolled = fullyScrolled
  clearHeaderScrolledTimer()
  if (!fullyScrolled) {
    if (isScrolled.value) isScrolled.value = false
    return
  }

  scheduleHeaderScrolledState()
}

const getHeaderElement = () => {
  const target = headerElement.value
  if (target instanceof HTMLElement) return target
  return target?.$el instanceof HTMLElement ? target.$el : null
}

const syncHeaderBottom = () => {
  const header = getHeaderElement()
  if (!header) return

  const baseBottom = header.offsetTop + header.offsetHeight
  const rootFontSize =
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const scrollOffsetRem = isMobile.value ? -0.26667 : -0.6
  const nextBottom = Math.max(
    0,
    baseBottom +
      (isHeaderScrollLayoutActive.value ? scrollOffsetRem * rootFontSize : 0)
  )
  if (Math.abs(headerBottom.value - nextBottom) > 0.5) {
    headerBottom.value = nextBottom
  }
}

const clearBackgroundTopInsetTimer = () => {
  if (backgroundTopInsetTimer === null) return
  window.clearTimeout(backgroundTopInsetTimer)
  backgroundTopInsetTimer = null
}

const updateBackgroundTopInset = () => {
  backgroundTopInsetTimer = null
  if (!isScrolled.value) {
    visualStateStore.setBackgroundTopInset(0)
    return
  }

  const visibleBottom = Math.min(window.innerHeight, headerBottom.value)
  visualStateStore.setBackgroundTopInset(visibleBottom)
}

const scheduleBackgroundTopInset = () => {
  clearBackgroundTopInsetTimer()
  if (!isScrolled.value) {
    visualStateStore.setBackgroundTopInset(0)
    return
  }

  const activeDuration = headerScrollLayoutActivatedAt
    ? performance.now() - headerScrollLayoutActivatedAt
    : HEADER_BACKGROUND_CUTOUT_DELAY
  const remainingDuration = Math.max(
    0,
    HEADER_BACKGROUND_CUTOUT_DELAY - activeDuration
  )
  // 等菜单位移完成后再改变背景裁切，避免两个合成区域同时变化。
  backgroundTopInsetTimer = window.setTimeout(
    updateBackgroundTopInset,
    remainingDuration
  )
}

const syncScrollState = () => {
  const scrollTop = getPageScrollTop()
  documentScrollTop = scrollTop
  scrollProgress = cachedPageMaxScrollTop
    ? Math.min(100, (scrollTop / cachedPageMaxScrollTop) * 100)
    : 0
  pageScrollProgressElement.value?.setProgress(
    visualStateStore.pageScrollProgressOverride ?? scrollProgress
  )
  backToTopElement.value?.setScrollState(documentScrollTop, scrollProgress)

  documentHeaderScrollProgress = Math.min(1, scrollTop / HEADER_SCROLL_DISTANCE)
  const homeProgress = visualStateStore.homeHeaderScrollProgress
  renderHeaderScrollProgress(
    Math.max(documentHeaderScrollProgress, homeProgress)
  )
}

const handleScroll = () => syncScrollState()

const refreshPageMetrics = () => {
  syncHeaderBottom()
  cachedPageMaxScrollTop = getPageMaxScrollTop()
  isPageScrollable.value = cachedPageMaxScrollTop > 1
  syncScrollState()
  if (isScrolled.value && visualStateStore.backgroundTopInset > 0) {
    updateBackgroundTopInset()
  }
}

const schedulePageMetricsRefresh = () => {
  if (pageMetricsFrameId !== null) return
  pageMetricsFrameId = window.requestAnimationFrame(() => {
    pageMetricsFrameId = null
    refreshPageMetrics()
  })
}

const returnHome = () => {
  router.push('/')
}

const toggleLanguage = () => {
  const nextLocale: SiteLocale = locale.value === 'zhCn' ? 'en' : 'zhCn'
  locale.value = nextLocale
  persistLocale(nextLocale)
  syncSeoMeta(route)
}

const toggleTheme = async () => {
  const nextTheme = visualStateStore.theme === 'light' ? 'dark' : 'light'
  if (nextTheme === 'light') await ensureLightThemeStyles()
  visualStateStore.setTheme(nextTheme)
}

const clearIslandGeometryUnlockTimer = () => {
  if (islandGeometryUnlockTimer === null) return

  window.clearTimeout(islandGeometryUnlockTimer)
  islandGeometryUnlockTimer = null
}

const hasIslandShellClass = () =>
  routeShellClasses.some((className) =>
    document.body.classList.contains(className)
  )

const markIslandRouteLeaving = (leavingElement: Element) => {
  const routeShell = leavingElement.getAttribute('data-route-shell')
  const leavingClass =
    islandLeavingClassByRouteShell[
      routeShell as keyof typeof islandLeavingClassByRouteShell
    ]

  if (!leavingClass) return false

  document.body.classList.add(leavingClass)
  return true
}

const restoreIslandRouteGeometry = () => {
  if (lockedIslandRouteGeometry) {
    const { element, position, top, left, width, height, margin } =
      lockedIslandRouteGeometry
    Object.assign(element.style, {
      position,
      top,
      left,
      width,
      height,
      margin,
    })
    lockedIslandRouteGeometry = null
  }

  if (lockedRouterContainerGeometry && routerContainer.value) {
    Object.assign(routerContainer.value.style, lockedRouterContainerGeometry)
    lockedRouterContainerGeometry = null
  }
}

const lockIslandRouteGeometry = (leavingElement: Element) => {
  if (lockedIslandRouteGeometry?.element === leavingElement) return

  clearIslandGeometryUnlockTimer()
  restoreIslandRouteGeometry()
  const isIslandRoute = markIslandRouteLeaving(leavingElement)
  const shouldLockGeometry =
    isIslandRoute || leavingElement.classList.contains('game-page-layout')
  if (!shouldLockGeometry) return

  if (leavingElement instanceof HTMLElement) {
    const container = routerContainer.value
    if (container) {
      const containerBounds = container.getBoundingClientRect()
      lockedRouterContainerGeometry = {
        position: container.style.position,
        top: container.style.top,
        left: container.style.left,
        width: container.style.width,
        height: container.style.height,
        margin: container.style.margin,
      }
      Object.assign(container.style, {
        position: 'fixed',
        top: `${containerBounds.top}px`,
        left: `${containerBounds.left}px`,
        width: `${containerBounds.width}px`,
        height: `${containerBounds.height}px`,
        margin: '0',
      })
    }

    const bounds = leavingElement.getBoundingClientRect()
    lockedIslandRouteGeometry = {
      element: leavingElement,
      position: leavingElement.style.position,
      top: leavingElement.style.top,
      left: leavingElement.style.left,
      width: leavingElement.style.width,
      height: leavingElement.style.height,
      margin: leavingElement.style.margin,
    }
    Object.assign(leavingElement.style, {
      position: 'fixed',
      top: `${bounds.top}px`,
      left: `${bounds.left}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      margin: '0',
    })
  }

  scheduleIslandGeometryUnlock()
}

const unlockIslandRouteGeometry = () => {
  clearIslandGeometryUnlockTimer()
  restoreIslandRouteGeometry()
  noMenuShellActive.value = pendingNoMenuShell
  document.body.classList.remove(
    ...islandLeavingClasses,
    ...floraLeavingClasses
  )

  if (route.name !== ISLAND_ROUTE_NAME) {
    document.body.classList.remove(...islandShellClasses)
  }
  if (route.name !== 'PET') {
    document.body.classList.remove(...floraShellClasses)
  }

  void nextTick(schedulePageMetricsRefresh)
}

const completeRouteLeave = () => {
  unlockIslandRouteGeometry()
  visualStateStore.markRouteLeaveComplete()
}

const completeRouteTransition = () => {
  unlockIslandRouteGeometry()
  finishRouteCursorLoading()
  emit('routeTransitionComplete')
}

const scheduleIslandGeometryUnlock = () => {
  if (
    route.name === ISLAND_ROUTE_NAME ||
    !hasIslandShellClass() ||
    islandGeometryUnlockTimer !== null
  ) {
    return
  }

  islandGeometryUnlockTimer = window.setTimeout(
    unlockIslandRouteGeometry,
    ISLAND_GEOMETRY_UNLOCK_DELAY
  )
}

onMounted(() => {
  if (props.entryActive) startEntryAnimation()
  refreshPageMetrics()
  removePageScrollListener = addPageScrollListener(handleScroll)
  removePageScrollEndListener = addPageScrollEndListener(refreshPageMetrics)
  removePageResizeListener = addPageResizeListener(schedulePageMetricsRefresh)
  if (routerContainer.value) {
    pageResizeObserver = new ResizeObserver(schedulePageMetricsRefresh)
    pageResizeObserver.observe(routerContainer.value)
  }
  const header = getHeaderElement()
  if (header) {
    headerResizeObserver = new ResizeObserver(syncHeaderBottom)
    headerResizeObserver.observe(header)
    syncHeaderBottom()
  }
  removeRouteGeometryGuard = router.beforeEach((to, from) => {
    if (to.fullPath === from.fullPath) return true

    const leavingElement = routerContainer.value?.firstElementChild
    if (leavingElement) lockIslandRouteGeometry(leavingElement)
    return true
  })
})

onUnmounted(() => {
  clearIslandGeometryUnlockTimer()
  restoreIslandRouteGeometry()
  document.body.classList.remove(
    ...islandShellClasses,
    ...islandLeavingClasses,
    ...floraShellClasses,
    ...floraLeavingClasses
  )
  unlockMobilePageScroll()
  clearMobileMenuTimers()
  clearBackgroundTopInsetTimer()
  clearHeaderScrolledTimer()
  visualStateStore.setBackgroundTopInset(0)
  removePageScrollListener?.()
  removePageScrollListener = null
  removePageScrollEndListener?.()
  removePageScrollEndListener = null
  removePageResizeListener?.()
  removePageResizeListener = null
  removeRouteGeometryGuard?.()
  removeRouteGeometryGuard = null
  pageResizeObserver?.disconnect()
  pageResizeObserver = null
  headerResizeObserver?.disconnect()
  headerResizeObserver = null
  if (pageMetricsFrameId !== null) {
    window.cancelAnimationFrame(pageMetricsFrameId)
    pageMetricsFrameId = null
  }
  clearEntryAnimationTimers()
})

watch(
  () => props.entryActive,
  (entryActive) => {
    if (entryActive) startEntryAnimation()
  }
)

watch(
  [
    () => visualStateStore.homeHeaderScrollProgress,
    () => visualStateStore.pageScrollProgressOverride,
  ],
  ([headerProgress, pageProgress]) => {
    // 首页在同一帧更新两个进度值，合并响应可避免两次同步 watcher 调用。
    renderHeaderScrollProgress(
      Math.max(documentHeaderScrollProgress, headerProgress)
    )
    pageScrollProgressElement.value?.setProgress(pageProgress ?? scrollProgress)
  }
)

watch(pageScrollProgressElement, (component) => {
  component?.setProgress(
    visualStateStore.pageScrollProgressOverride ?? scrollProgress
  )
})

watch(backToTopElement, (component) => {
  component?.setScrollState(documentScrollTop, scrollProgress)
})

watch(isHeaderScrollLayoutActive, () => {
  syncHeaderBottom()
})

watch(isScrolled, scheduleBackgroundTopInset, { flush: 'sync' })

watch([isMobile, isMobileMenuOpen], ([mobile, menuOpen]) => {
  if (mobile && menuOpen) {
    lockMobilePageScroll()
    return
  }

  unlockMobilePageScroll()
  if (!mobile) closeMobileMenu()
})

watch(
  () => route.fullPath,
  () => {
    pendingNoMenuShell = !!route.meta?.noMenu
    closeMobileMenu()
    void nextTick(() => {
      scheduleIslandGeometryUnlock()
      schedulePageMetricsRefresh()
    })
  },
  { flush: 'sync' }
)
</script>

<style lang="less" scoped>
@import './index.less';

.route-enter-active {
  transform-origin: top center;
  transition: opacity 0.12s ease, transform 0.6s ease;
  transition-delay: 0.12s;
  will-change: opacity, transform;
}

.route-leave-active {
  transition: opacity 0.12s ease-in;
  pointer-events: none;
}

.route-enter-from {
  opacity: 0;
  transform: scale(0.86);
}

.route-leave-to {
  opacity: 0;
}
</style>
