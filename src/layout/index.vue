<template>
  <div
    ref="layoutPage"
    :class="{
      'layout-page': true,
      'layout-show': layoutShow,
      'entry-logo-ready': headerLogoReady,
      'no-menu': ifNoMenu,
    }"
  >
    <el-header
      class="el-menu-layout-all"
      :class="{
        scrolled: isScrolled,
        'scroll-layout-active': isHeaderScrollLayoutActive,
        'content-aligned': headerPresentation.contentAligned,
      }"
    >
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
        <Transition name="module-name">
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

      <el-menu
        v-if="!isMobile"
        :default-active="currentRouter"
        mode="horizontal"
        :ellipsis="false"
      >
        <div class="menu-box">
          <RouterLink
            v-for="(item, index) in filterRoutes"
            :key="index"
            :to="item.path"
          >
            <el-menu-item
              :index="item.path"
              :class="[
                item.name,
                {
                  'is-inner-active':
                    isInnerMenuRoute && currentRouter === item.path,
                },
              ]"
            >
              <div class="title-box">
                <TextRoll class="main-title" :text="item.meta.titleEn" />
                <div class="second-title">
                  <div class="line" />
                  <span>{{ item.meta.titleCn }}</span>
                </div>
              </div>
            </el-menu-item>
          </RouterLink>
        </div>
      </el-menu>
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
      :class="{
        'mobile-menu-panel': true,
        active: isMobile && isMobileMenuOpen,
      }"
      @click="closeMobileMenu"
    >
      <div class="mobile-menu-wrapper">
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
            <FooterSocialLinks v-if="isMobileMenuOpen" />
          </div>
          <div class="about-me">© 2018-2026 ANULUCA</div>
          <div class="mobile-footer-left" />
        </div>
      </div>
    </div>

    <div
      ref="routerContainer"
      :class="{ 'router-container': true, blur: isMobile && isMobileMenuOpen }"
    >
      <router-view v-slot="{ Component }">
        <transition
          name="route"
          @before-leave="lockIslandRouteGeometry"
          @after-leave="unlockIslandRouteGeometry"
          @after-enter="completeRouteTransition"
          @enter-cancelled="completeRouteTransition"
          @leave-cancelled="unlockIslandRouteGeometry"
        >
          <component :is="Component" />
        </transition>
      </router-view>
      <div id="page-footer-portal" class="page-footer-portal" />
    </div>
    <BackToTop :suppressed="isMobile && isMobileMenuOpen" />
    <PageScrollProgress
      v-if="shouldShowPageScrollProgress"
      :progress="resolvedPageScrollProgress"
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
import FooterSocialLinks from '@/components/FooterSocialLinks/index.vue'
import Logo from '@/components/Logo/index.vue'
import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import TextRoll from '@/components/TextRoll/index.vue'
import { finishRouteCursorLoading, routes, syncSeoMeta } from '@/router'
import { visualState } from '@/stores'
import { persistLocale, type SiteLocale } from '@/utils/locale'
import {
  addPageScrollListener,
  getPageMaxScrollTop,
  getPageScrollTop,
  scrollPageTo,
} from '@/utils/pageScroll'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'

const { locale } = useI18n()
const props = defineProps({
  entryActive: {
    type: Boolean,
    default: false,
  },
})
provide(
  'site-entry-active',
  computed(() => props.entryActive)
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

const ifNoMenu = computed(() => !!route.meta?.noMenu)

const isMobile = computed(() => visualStateStore.deviceType !== 'desktop')
const isMobileMenuOpen = ref(false)
let isMobileScrollLocked = false
let lockedMobileScrollY = 0
let removePageScrollListener: (() => void) | null = null
let pageResizeObserver: ResizeObserver | null = null

const isFullscreen = ref(false)
const scrollProgress = ref(0)
const isPageScrollable = ref(false)
const resolvedPageScrollProgress = computed(
  () => visualStateStore.pageScrollProgressOverride ?? scrollProgress.value
)
const shouldShowPageScrollProgress = computed(
  () =>
    visualStateStore.pageScrollProgressOverride !== null ||
    isPageScrollable.value
)
const isHeaderScrollLayoutActive = ref(false)
let headerScrollAnimations: Animation[] = []
let headerScrollGeometry: HeaderScrollGeometry[] = []
let logoTimer: number | null = null
let layoutTimer: number | null = null
let islandGeometryUnlockTimer: number | null = null
let lockedIslandRouteGeometry: {
  element: HTMLElement
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
const HEADER_SCROLL_TIMELINE_DURATION = 1000
const HEADER_SCROLL_PROGRESS_EPSILON = 0.001
const islandShellClasses = ['island-pc-shell', 'island-mobile-shell'] as const
const islandLeavingClasses = [
  'island-pc-shell-leaving',
  'island-mobile-shell-leaving',
] as const
const floraShellClasses = ['flora-shell'] as const
const floraLeavingClasses = ['flora-shell-leaving'] as const
const islandLeavingClassByRouteShell = {
  'island-pc': 'island-pc-shell-leaving',
  'island-mobile': 'island-mobile-shell-leaving',
  flora: 'flora-shell-leaving',
} as const

interface HeaderScrollGeometry {
  element: HTMLElement
  offsetX: number
  offsetY: number
  scaleX: number
  scaleY: number
}

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

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement
      .requestFullscreen()
      .then(() => {
        isFullscreen.value = true
      })
      .catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err}`)
      })
  } else {
    if (document.exitFullscreen) {
      document
        .exitFullscreen()
        .then(() => {
          isFullscreen.value = false
        })
        .catch((err) => {
          console.error(`Error attempting to exit fullscreen: ${err}`)
        })
    }
  }
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
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

const getHeaderAnimationTargets = () => {
  const header = document.querySelector<HTMLElement>('.el-menu-layout-all')
  const mobileMenuIcon =
    document.querySelector<HTMLElement>('.mobile-menu-icon')
  if (!header) return mobileMenuIcon ? [mobileMenuIcon] : []

  const logo = header.querySelector<HTMLElement>('.logo-box > .logo')
  const logoText = header.querySelector<HTMLElement>('.logo-box > .right')
  const moduleName = header.querySelector<HTMLElement>(
    '.logo-box > .current-module-name'
  )
  const menu = Array.from(header.children).find(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element.classList.contains('el-menu')
  )
  const mobileHamburger =
    mobileMenuIcon?.querySelector<HTMLElement>('.hamburger') || null

  return [
    logo,
    logoText,
    moduleName,
    menu,
    mobileMenuIcon,
    mobileHamburger,
  ].filter((element): element is HTMLElement => element instanceof HTMLElement)
}

const getHeaderScrollLayoutElements = () =>
  [
    document.querySelector<HTMLElement>('.el-menu-layout-all'),
    document.querySelector<HTMLElement>('.mobile-menu-icon'),
  ].filter((element): element is HTMLElement => element instanceof HTMLElement)

const toggleHeaderScrollClasses = (
  layoutActive: boolean,
  fullyScrolled: boolean
) => {
  for (const element of getHeaderScrollLayoutElements()) {
    element.classList.toggle('scroll-layout-active', layoutActive)
    element.classList.toggle('scrolled', fullyScrolled)
  }
}

const cancelHeaderScrollAnimations = () => {
  headerScrollAnimations.forEach((animation) => animation.cancel())
  headerScrollAnimations = []
}

const measureHeaderScrollGeometry = () => {
  cancelHeaderScrollAnimations()
  const targets = getHeaderAnimationTargets()
  const layoutActive = isHeaderScrollLayoutActive.value
  const fullyScrolled = isScrolled.value

  toggleHeaderScrollClasses(false, false)
  const initialBounds = new Map(
    targets.map((element) => [element, element.getBoundingClientRect()])
  )
  toggleHeaderScrollClasses(true, fullyScrolled)

  headerScrollGeometry = targets.flatMap((element) => {
    const initial = initialBounds.get(element)
    if (!initial) return []

    const current = element.getBoundingClientRect()
    if (initial.width <= 0.5 || initial.height <= 0.5) return []

    return [
      {
        element,
        offsetX: initial.left - current.left,
        offsetY: initial.top - current.top,
        scaleX: current.width > 0.5 ? initial.width / current.width : 1,
        scaleY: current.height > 0.5 ? initial.height / current.height : 1,
      },
    ]
  })

  toggleHeaderScrollClasses(layoutActive, fullyScrolled)
}

const createHeaderScrollAnimations = () => {
  cancelHeaderScrollAnimations()
  headerScrollAnimations = headerScrollGeometry.flatMap(
    ({ element, offsetX, offsetY, scaleX, scaleY }) => {
      if (
        Math.abs(offsetX) < 0.5 &&
        Math.abs(offsetY) < 0.5 &&
        Math.abs(scaleX - 1) < 0.01 &&
        Math.abs(scaleY - 1) < 0.01
      ) {
        return []
      }

      const animation = element.animate(
        [
          {
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`,
            transformOrigin: 'top left',
          },
          {
            transform: 'translate(0, 0) scale(1)',
            transformOrigin: 'top left',
          },
        ],
        {
          duration: HEADER_SCROLL_TIMELINE_DURATION,
          easing: 'linear',
          fill: 'both',
        }
      )
      animation.pause()
      return [animation]
    }
  )
}

const renderHeaderScrollProgress = (nextProgress: number) => {
  const progress = Math.min(1, Math.max(0, nextProgress))
  const layoutActive = progress > HEADER_SCROLL_PROGRESS_EPSILON
  const fullyScrolled = progress >= 1 - HEADER_SCROLL_PROGRESS_EPSILON

  layoutPage.value?.style.setProperty(
    '--header-scroll-progress',
    progress.toFixed(4)
  )
  isHeaderScrollLayoutActive.value = layoutActive
  isScrolled.value = fullyScrolled
  toggleHeaderScrollClasses(layoutActive, fullyScrolled)

  if (!layoutActive || fullyScrolled) {
    cancelHeaderScrollAnimations()
    return
  }

  if (!headerScrollGeometry.length) measureHeaderScrollGeometry()
  if (!headerScrollAnimations.length) createHeaderScrollAnimations()
  for (const animation of headerScrollAnimations) {
    animation.currentTime = progress * HEADER_SCROLL_TIMELINE_DURATION
  }
}

const refreshHeaderScrollGeometry = () => {
  measureHeaderScrollGeometry()
  handleScroll()
}

const syncScrollState = () => {
  const scrollTop = getPageScrollTop()
  const maxScroll = getPageMaxScrollTop()
  scrollProgress.value = maxScroll
    ? Math.min(100, (scrollTop / maxScroll) * 100)
    : 0
  isPageScrollable.value = maxScroll > 1

  const pageProgress = Math.min(1, scrollTop / HEADER_SCROLL_DISTANCE)
  const homeProgress = visualStateStore.homeHeaderScrollProgress
  renderHeaderScrollProgress(Math.max(pageProgress, homeProgress))
}

const handleScroll = () => syncScrollState()

const returnHome = () => {
  router.push('/')
}

const toggleLanguage = () => {
  const nextLocale: SiteLocale = locale.value === 'zhCn' ? 'en' : 'zhCn'
  locale.value = nextLocale
  persistLocale(nextLocale)
  syncSeoMeta(route)
}

const toggleTheme = () => {
  visualStateStore.toggleTheme()
}

const clearIslandGeometryUnlockTimer = () => {
  if (islandGeometryUnlockTimer === null) return

  window.clearTimeout(islandGeometryUnlockTimer)
  islandGeometryUnlockTimer = null
}

const hasIslandShellClass = () =>
  [
    ...islandShellClasses,
    ...islandLeavingClasses,
    ...floraShellClasses,
    ...floraLeavingClasses,
  ].some((className) => document.body.classList.contains(className))

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

const refreshScrollState = () => {
  handleScroll()
}

const restoreIslandRouteGeometry = () => {
  if (!lockedIslandRouteGeometry) return

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

const lockIslandRouteGeometry = (leavingElement: Element) => {
  clearIslandGeometryUnlockTimer()
  restoreIslandRouteGeometry()
  const isIslandRoute = markIslandRouteLeaving(leavingElement)
  if (!isIslandRoute) return

  if (leavingElement instanceof HTMLElement) {
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

  nextTick(refreshScrollState)
}

const completeRouteTransition = () => {
  unlockIslandRouteGeometry()
  finishRouteCursorLoading()
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
  measureHeaderScrollGeometry()
  handleScroll()
  removePageScrollListener = addPageScrollListener(handleScroll)
  if (routerContainer.value) {
    pageResizeObserver = new ResizeObserver(handleScroll)
    pageResizeObserver.observe(routerContainer.value)
  }
  window.addEventListener('resize', refreshHeaderScrollGeometry, {
    passive: true,
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
  removePageScrollListener?.()
  removePageScrollListener = null
  pageResizeObserver?.disconnect()
  pageResizeObserver = null
  window.removeEventListener('resize', refreshHeaderScrollGeometry)
  cancelHeaderScrollAnimations()
  clearEntryAnimationTimers()
})

watch(
  () => props.entryActive,
  (entryActive) => {
    if (entryActive) startEntryAnimation()
  }
)

watch(
  () => visualStateStore.homeHeaderScrollProgress,
  () => syncScrollState(),
  { flush: 'sync' }
)

watch([isMobile, isMobileMenuOpen], ([mobile, menuOpen]) => {
  if (mobile && menuOpen) {
    lockMobilePageScroll()
    return
  }

  unlockMobilePageScroll()
})

watch([isMobile, locale], async () => {
  await nextTick()
  refreshHeaderScrollGeometry()
})

watch(
  () => route.fullPath,
  async () => {
    closeMobileMenu()
    await nextTick()
    refreshHeaderScrollGeometry()
    scheduleIslandGeometryUnlock()
    refreshScrollState()
  }
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
