<template>
  <div
    ref="layoutPage"
    :class="{
      'layout-page': true,
      'layout-show': layoutShow,
      'entry-logo-ready': headerLogoReady,
      'temple-header-default': templeHeaderDefault,
      'temple-header-balanced':
        isTempleRoute &&
        !isMobile &&
        !templeHeaderDefault &&
        !isInitialAboutOpen,
      'initial-about-open': isInitialAboutOpen,
      'no-menu': noMenuShellActive,
    }"
  >
    <header
      ref="headerElement"
      class="el-menu-layout-all"
      :class="{
        scrolled: isScrolled,
        'scroll-layout-active': isHeaderScrollLayoutActive,
        'content-aligned': headerPresentation.contentAligned,
      }"
      @click="dismissTempleFocusFromHeader"
    >
      <span class="header-hover-overlay" aria-hidden="true" />
      <div
        class="logo-box"
        @click="returnHome"
        @pointerover="rotateBrandIcon"
        @pointerout="rotateBrandIcon"
      >
        <button
          class="header-home-link"
          type="button"
          :aria-label="locale === 'en' ? 'Return home' : '返回首页'"
        >
          <Logo
            id="0"
            class="logo"
            :active="false"
            :style="{ '--brand-icon-rotation': `${brandIconRotation}deg` }"
            data-entry-logo-target
          />
        </button>
        <Transition name="header-fade">
          <span
            v-if="
              showHeaderTitle ||
              (isTempleRoute && !isMobile && !templeHeaderDefault)
            "
            class="header-brand-details"
            :class="{
              'header-brand-details--hidden':
                isTempleRoute && !isMobile && !showHeaderTitle,
            }"
          >
            <button class="site-brand header-home-link" type="button">
              Anutrium
            </button>
            <Transition name="module-name" mode="out-in" :duration="560">
              <component
                :is="moduleReturnPath ? RouterLink : 'span'"
                v-if="displayedHeader.moduleName"
                :key="displayedHeader.moduleName"
                :to="moduleReturnPath || undefined"
                :class="[
                  'current-module-name',
                  { 'current-module-name--link': moduleReturnPath },
                  displayedHeader.moduleTheme &&
                    `current-module-name--${displayedHeader.moduleTheme}`,
                ]"
                @click="moduleReturnPath && $event.stopPropagation()"
              >
                <TextRoll
                  v-if="moduleReturnPath"
                  :text="displayedHeader.moduleName"
                />
                <template v-else>
                  <span
                    v-for="(character, index) in moduleNameCharacters"
                    :key="`${character}:${index}`"
                    class="module-name-character"
                    :style="{
                      '--module-character-delay': `${index * 24}ms`,
                    }"
                    >{{ character === ' ' ? '\u00a0' : character }}</span
                  >
                </template>
              </component>
            </Transition>
          </span>
        </Transition>
      </div>

      <Transition name="header-fade">
        <nav
          v-if="!isMobile && showNavigation"
          class="desktop-menu"
          :aria-label="locale === 'en' ? 'Primary navigation' : '主导航'"
        >
          <ul
            v-for="(items, groupIndex) in desktopMenuGroups"
            :key="groupIndex"
            class="menu-box"
            :class="{ 'menu-box--right': groupIndex === 1 }"
          >
            <li
              v-for="item in items"
              :key="item.id"
              :aria-hidden="
                isTempleRoute && item.id === 'about' ? true : undefined
              "
              :class="[
                'desktop-menu-item',
                {
                  'menu-about-placeholder':
                    isTempleRoute && item.id === 'about',
                },
                item.id.toUpperCase(),
                {
                  'is-active': activeNavigation === item.id,
                  'is-inner-active':
                    isInnerMenuRoute && activeNavigation === item.id,
                },
              ]"
            >
              <button
                v-if="!isTempleRoute || item.id !== 'about'"
                type="button"
                class="temple-nav-action"
                :class="{
                  'is-wireframe-preview': isTempleMutedMenuItem(item.id),
                }"
                :data-temple-nav="item.id"
                :aria-label="
                  item.id === 'about'
                    ? locale === 'en'
                      ? 'About'
                      : '关于'
                    : item.title
                "
                :style="{
                  '--module-theme-color':
                    'themeColor' in item ? item.themeColor : '#e23456',
                }"
                :disabled="
                  !item.enabled || (isTempleRoute && !navigation.ready)
                "
                :aria-pressed="activeNavigation === item.id"
                @click="activateNavigation(item.id)"
              >
                <InfoFilled
                  v-if="item.id === 'about'"
                  class="about-info-icon"
                  aria-hidden="true"
                />
                <div v-else class="title-box">
                  <TextRoll class="main-title" :text="item.title" />
                </div>
              </button>
            </li>
          </ul>
        </nav>
      </Transition>

      <Transition name="home-corner-fade">
        <button
          v-if="!isMobile && showHomeAboutAction"
          class="temple-nav-action home-about-action no-rem"
          :class="{
            'is-about-open': navigation.aboutOpen,
            'is-initial-scene':
              !navigation.activeSelection && !navigation.aboutOpen,
          }"
          type="button"
          data-temple-nav="about"
          :aria-label="locale === 'en' ? 'About' : '关于'"
          :aria-pressed="navigation.aboutOpen"
          :disabled="!navigation.ready"
          @click="activateNavigation('about')"
        >
          <InfoFilled class="about-info-icon" aria-hidden="true" />
        </button>
      </Transition>
    </header>

    <Transition name="header-fade">
      <button
        v-if="isMobile && showNavigation"
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
        <MenuToggleIcon :active="isMobileMenuOpen" />
      </button>
    </Transition>

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
      v-if="isMobile && (showNavigation || isMobileMenuMounted)"
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
            <button
              type="button"
              class="temple-nav-action"
              data-temple-nav="home"
              :aria-pressed="
                isTempleRoute &&
                !navigation.activeSelection &&
                !navigation.aboutOpen
              "
              @click="returnToInitialHome"
            >
              <div
                class="mobile-menu-item HOME"
                :class="{
                  active:
                    isTempleRoute &&
                    !navigation.activeSelection &&
                    !navigation.aboutOpen,
                }"
              >
                <div class="big-title">HOME</div>
                <div class="little-title">首页</div>
              </div>
            </button>
            <button
              v-for="item in mobileMenuItems"
              :key="item.id"
              type="button"
              class="temple-nav-action"
              :class="{
                'is-wireframe-preview': isTempleMutedMenuItem(item.id),
              }"
              :data-temple-nav="item.id"
              :aria-label="item.id === 'about' ? 'ABOUT / 关于' : undefined"
              :style="{
                '--module-theme-color':
                  'themeColor' in item ? item.themeColor : '#e23456',
              }"
              :disabled="!item.enabled || (isTempleRoute && !navigation.ready)"
              :aria-pressed="activeNavigation === item.id"
              @click="activateNavigation(item.id)"
            >
              <div
                class="mobile-menu-item"
                :class="{
                  active: activeNavigation === item.id,
                  [item.id.toUpperCase()]: true,
                }"
              >
                <InfoFilled
                  v-if="item.id === 'about'"
                  class="about-info-icon"
                  aria-hidden="true"
                />
                <template v-else>
                  <div class="big-title">{{ item.title }}</div>
                  <div class="little-title">{{ item.label }}</div>
                </template>
              </div>
            </button>
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
                <HeaderThemeIcon kind="sun" />
              </span>
              <span v-if="theme === 'light'" class="second">
                <HeaderThemeIcon kind="moon" />
              </span>
              <span v-if="theme === 'dark'" class="first">
                <HeaderThemeIcon kind="moon" />
              </span>
              <span v-if="theme === 'dark'" class="second">
                <HeaderThemeIcon kind="sun" />
              </span>
            </button>
          </div>
          <div class="mobile-menu-social-links" @click.stop>
            <FooterSocialLinks v-if="!isTempleRoute" />
          </div>
          <div class="about-me">© 2018-2026 ANULUCA</div>
          <div class="mobile-footer-left" />
        </div>
      </div>
    </div>

    <div
      ref="routerContainer"
      class="router-container"
      :class="`page-layout--${activePageLayout}`"
    >
      <router-view v-slot="{ Component }">
        <transition
          name="route"
          mode="out-in"
          :css="false"
          @before-enter="beginRouteEnter"
          @before-leave="lockIslandRouteGeometry"
          @leave="finishCoveredRoute"
          @enter="finishCoveredRoute"
          @after-leave="completeRouteLeave"
          @after-enter="completeRouteTransition"
          @enter-cancelled="completeRouteTransition"
          @leave-cancelled="completeRouteLeave"
        >
          <component :is="Component" v-if="props.contentActive" />
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
      :color="
        route.path === '/about' || navigation.aboutOpen ? '#E23456' : undefined
      "
    />
    <AboutOverlay v-if="!isTempleRoute" viewport />
    <button
      v-if="!isMobile"
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
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { InfoFilled } from '@element-plus/icons-vue'

import BackToTop from '@/components/BackToTop/index.vue'
import HeaderThemeIcon from '@/components/HeaderThemeIcon.vue'
import Logo from '@/components/Logo/index.vue'
import MenuToggleIcon from '@/components/MenuToggleIcon/index.vue'
import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import TextRoll from '@/components/TextRoll/index.vue'
import { useFrameTask } from '@/composables/useFrameTask'
import { HOME_RETURN_TO_PASSION_EVENT } from '@/config/homeNavigation'
import { isTempleMutedMenuItem } from '@/config/templeModelDisplay'
import {
  templeDesktopMenuGroups,
  templeMobileMenuItems as mobileMenuItems,
  templeModulePaths,
  templeNavigation,
  templeNavigationById,
  type TempleNavigationId,
  templeParentModule,
} from '@/config/templeNavigation'
import {
  finishRouteCursorLoading,
  type PageLayout,
  routes,
  syncPageTheme,
  syncSeoMeta,
} from '@/router'
import { visualState } from '@/stores'
import { useFloraPets } from '@/stores/floraPets'
import { useTempleNavigation } from '@/stores/templeNavigation'
import { consumeJourneyReturnState } from '@/utils/journeyReturnState'
import { persistLocale, type SiteLocale } from '@/utils/locale'
import {
  addPageResizeListener,
  addPageScrollEndListener,
  addPageScrollListener,
  getPageMaxScrollTop,
  getPageScrollTop,
} from '@/utils/pageScroll'
import { ensureLightThemeStyles } from '@/utils/themeStyles'

import { useMobileMenu } from './useMobileMenu'
import { useRouteShellGeometry } from './useRouteShellGeometry'
import { useTempleHeaderMotion } from './useTempleHeaderMotion'

const FooterSocialLinks = defineAsyncComponent(
  () => import('@/components/FooterSocialLinks/index.vue')
)
const AboutOverlay = defineAsyncComponent(
  () => import('@/views/About/AboutOverlay.vue')
)

const { locale } = useI18n()
const props = defineProps({
  entryActive: {
    type: Boolean,
    default: false,
  },
  sceneEntryActive: {
    type: Boolean,
    default: false,
  },
  contentActive: {
    type: Boolean,
    default: true,
  },
})
const emit = defineEmits<{
  routeTransitionComplete: []
}>()
const layoutPage = ref<HTMLElement | null>(null)
const brandIconRotation = ref(0)
const rotateBrandIcon = (event: PointerEvent) => {
  const isBrandTarget = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest('.header-home-link'))
  if (
    event.pointerType === 'touch' ||
    !isBrandTarget(event.target) ||
    isBrandTarget(event.relatedTarget) ||
    !window.matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
    ).matches
  )
    return
  brandIconRotation.value -= 360
}
const headerBottom = ref(0)
const routeEntryActive = ref(false)
provide('route-entry-active', routeEntryActive)
provide(
  'site-entry-active',
  computed(() => props.entryActive)
)
provide(
  'site-scene-entry-active',
  computed(() => props.sceneEntryActive)
)
provide(
  'site-header-bottom',
  computed(() => headerBottom.value)
)

const headerLogoReady = ref(false)
const navigationEntryReady = ref(false)

const route = useRoute()
const router = useRouter()
const visualStateStore = visualState()
const isHomeRoute = computed(() => route.name === 'TEST2')
const isTempleRoute = computed(() => route.name === 'HOME')
const navigation = useTempleNavigation()
const floraPets = useFloraPets()
const isInitialAboutOpen = computed(
  () =>
    isTempleRoute.value && navigation.aboutOpen && !navigation.activeSelection
)
const dismissTempleFocusFromHeader = (event: MouseEvent) => {
  if (!isTempleRoute.value) return
  if (
    event.target instanceof Element &&
    event.target.closest(
      'a, button, input, select, textarea, [role="button"], [contenteditable="true"]'
    )
  )
    return
  if (navigation.aboutOpen) {
    navigation.request('about')
    return
  }
  if (!navigation.activeSelection) return
  if (!navigation.closeInlineDetail()) navigation.request(null)
}
const wantsNavigation = computed(
  () =>
    !isTempleRoute.value || !!navigation.activeSelection || navigation.aboutOpen
)
const showNavigation = computed(
  () =>
    wantsNavigation.value &&
    navigationRevealed.value &&
    navigationEntryReady.value &&
    !isInitialAboutOpen.value
)
// 标题随聚焦立即淡入，路由入口继续等待 Logo 移动完成。
const showHeaderTitle = computed(() =>
  isTempleRoute.value
    ? wantsNavigation.value && navigationEntryReady.value
    : showNavigation.value
)
watch(
  [
    isTempleRoute,
    () => navigation.activeModule,
    () => navigation.companionFocused,
    () => floraPets.activePet.themeColor,
  ],
  () => {
    if (isTempleRoute.value)
      syncPageTheme(
        route,
        navigation.companionFocused
          ? 'SPRIGATITO'
          : navigation.activeModule?.toUpperCase() || 'HOME',
        navigation.companionFocused ? floraPets.activePet.themeColor : undefined
      )
  },
  { immediate: true }
)

const resolvePageLayout = (pageLayout: unknown): PageLayout =>
  pageLayout === 'main' ? 'main' : 'sub'
const normalizeMenuPath = (path: string) =>
  path === '/' ? path : path.replace(/\/+$/, '')

const currentRouter = computed(() => {
  const activePath =
    typeof route.meta.activeMenu === 'string'
      ? route.meta.activeMenu
      : route.name === 'HOME'
      ? '/'
      : route.path

  return normalizeMenuPath(activePath)
})

type ModuleHeaderTheme = 'about' | 'archive' | 'craft' | 'flanerie' | 'island'

const moduleThemeByPath: Readonly<Record<string, ModuleHeaderTheme>> = {
  '/archive': 'archive',
  '/flanerie': 'flanerie',
  '/island': 'island',
  '/craft': 'craft',
  '/about': 'about',
}
const moduleRouteByPath = new Map(
  routes.map((item) => [normalizeMenuPath(item.path), item])
)
const hiddenModuleTitleRoutes = new Set(['HOME', 'TEST2', '404', 'TEST'])
const headerPresentation = computed(() => {
  const routeName = String(route.name || '')
  const modulePath = currentRouter.value
  const moduleMeta = moduleRouteByPath.get(modulePath)?.meta || route.meta

  if (isTempleRoute.value)
    return {
      contentAligned: false,
      moduleName: navigation.aboutOpen
        ? 'ABOUT'
        : navigation.activeSelection
        ? templeNavigationById.get(navigation.activeSelection)?.title || ''
        : '',
      moduleTheme: '',
    }
  return {
    contentAligned: resolvePageLayout(route.meta.pageLayout) === 'sub',
    moduleName: hiddenModuleTitleRoutes.has(routeName)
      ? ''
      : String(moduleMeta.titleEn),
    moduleTheme: moduleThemeByPath[modulePath] || '',
  }
})
const { templeHeaderDefault, navigationRevealed, displayedHeader } =
  useTempleHeaderMotion({
    root: layoutPage,
    isTempleRoute,
    wantsNavigation,
    presentation: headerPresentation,
  })
const moduleNameCharacters = computed(() =>
  Array.from(displayedHeader.value.moduleName)
)
const isInnerMenuRoute = computed(
  () =>
    typeof route.meta.activeMenu === 'string' &&
    normalizeMenuPath(route.path) !== currentRouter.value
)
const moduleReturnPath = computed(() => {
  if (isTempleRoute.value) return null
  const parent = templeParentModule(route.path)
  return parent
    ? templeModulePaths[parent]
    : isInnerMenuRoute.value
    ? currentRouter.value
    : null
})
const routerContainer = ref<HTMLElement | null>(null)
const isScrolled = ref(false)
const layoutShow = ref(false)
const theme = computed(() => visualStateStore.theme)
const routeMenuGroups = [templeNavigation]
const desktopMenuGroups = computed(() =>
  isTempleRoute.value ? templeDesktopMenuGroups : routeMenuGroups
)
const activeNavigation = computed(() =>
  route.path === '/about' || navigation.aboutOpen
    ? 'about'
    : navigation.activeSelection
)
const showHomeAboutAction = computed(
  () => isTempleRoute.value && navigation.entranceFinished
)
const activateNavigation = async (id: TempleNavigationId) => {
  closeMobileMenu()
  if (id === 'about') {
    navigation.request(id)
    return
  }
  if (!isTempleRoute.value) {
    await router.push('/')
    // 详情离场会写入旅程返回标记；菜单已指定目标，不再恢复旅程位置。
    consumeJourneyReturnState()
  }
  navigation.request(id)
}
const returnToInitialHome = async () => {
  closeMobileMenu()
  // HOME 是显式复位；在路由切换前提交请求，避免子页返回逻辑自动恢复模块聚焦。
  consumeJourneyReturnState()
  navigation.returnModule = null
  navigation.returnExpanded = false
  navigation.request(null)
  await router.push('/')
  navigation.entryModule = null
}

const activePageLayout = ref<PageLayout>(
  resolvePageLayout(route.meta.pageLayout)
)
let pendingPageLayout = activePageLayout.value
const noMenuShellActive = ref(!!route.meta?.noMenu)
let pendingNoMenuShell = noMenuShellActive.value

const isMobile = computed(() => visualStateStore.deviceType !== 'desktop')
const {
  isMobileMenuOpen,
  isMobileMenuMounted,
  isMobileMenuClosing,
  toggleMobileMenu,
  closeMobileMenu,
} = useMobileMenu(isMobile)
let removePageScrollListener: (() => void) | null = null
let removePageScrollEndListener: (() => void) | null = null
let removePageResizeListener: (() => void) | null = null
let pageResizeObserver: ResizeObserver | null = null
let headerResizeObserver: ResizeObserver | null = null
let backgroundTopInsetTimer: number | null = null
let headerScrolledTimer: number | null = null
let headerScrollLayoutActivatedAt: number | null = null

let documentScrollTop = 0
let scrollProgress = 0
let cachedPageMaxScrollTop = 0
let documentHeaderScrollProgress = 0
let renderedHeaderScrollProgress = ''
let isHeaderFullyScrolled = false
const isPageScrollable = ref(false)
const headerElement = ref<HTMLElement | null>(null)
const pageScrollProgressElement = ref<{
  setProgress: (progress: number) => void
} | null>(null)
const backToTopElement = ref<{
  setScrollState: (scrollTop: number, progress: number) => void
} | null>(null)
const shouldShowPageScrollProgress = computed(
  () =>
    !isTempleRoute.value &&
    (visualStateStore.pageScrollProgressOverride !== null ||
      isPageScrollable.value)
)
const isHeaderScrollLayoutActive = ref(false)
const isEntryContentRefreshing = ref(false)
let logoTimer: number | null = null
let navigationEntryTimer: number | null = null
let hasPlayedEntryAnimation = false
const ENTRY_LOGO_REVEAL_DELAY = 900
const ENTRY_NAVIGATION_REVEAL_DELAY = 300
const HEADER_SCROLL_DISTANCE = 100
const HEADER_SCROLL_PROGRESS_EPSILON = 0.001
const HEADER_BACKGROUND_CUTOUT_DELAY = 260
const clearEntryAnimationTimers = () => {
  if (navigationEntryTimer !== null) {
    window.clearTimeout(navigationEntryTimer)
    navigationEntryTimer = null
  }
  if (logoTimer !== null) {
    window.clearTimeout(logoTimer)
    logoTimer = null
  }
}

const startEntryAnimation = () => {
  if (hasPlayedEntryAnimation) return
  hasPlayedEntryAnimation = true

  clearEntryAnimationTimers()
  headerLogoReady.value = false
  layoutShow.value = props.contentActive

  logoTimer = window.setTimeout(() => {
    logoTimer = null
    headerLogoReady.value = true
  }, ENTRY_LOGO_REVEAL_DELAY)
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

const syncHeaderBottom = () => {
  const header = headerElement.value
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

const refreshPageMetrics = () => {
  syncHeaderBottom()
  cachedPageMaxScrollTop = getPageMaxScrollTop()
  isPageScrollable.value = cachedPageMaxScrollTop > 1
  syncScrollState()
  if (isScrolled.value && visualStateStore.backgroundTopInset > 0) {
    updateBackgroundTopInset()
  }
}

const { schedule: schedulePageMetricsRefresh } =
  useFrameTask(refreshPageMetrics)

const returnHome = () => {
  if (isTempleRoute.value) {
    navigation.request(null)
    return
  }
  if (isHomeRoute.value) {
    window.dispatchEvent(new CustomEvent(HOME_RETURN_TO_PASSION_EVENT))
    return
  }

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

const {
  lockIslandRouteGeometry,
  unlockIslandRouteGeometry,
  scheduleIslandGeometryUnlock,
} = useRouteShellGeometry(routerContainer, () => {
  activePageLayout.value = pendingPageLayout
  noMenuShellActive.value = pendingNoMenuShell
  void nextTick(schedulePageMetricsRefresh)
})

const completeRouteLeave = () => {
  unlockIslandRouteGeometry()
  visualStateStore.markRouteLeaveComplete()
}

const beginRouteEnter = () => {
  routeEntryActive.value = true
}

const finishCoveredRoute = (_element: Element, done: () => void) => {
  // 路由遮罩已完全覆盖；保留一帧离场几何后换页，首次加载的内容重挂载直接完成。
  if (isEntryContentRefreshing.value) done()
  else window.requestAnimationFrame(() => done())
}

const completeRouteTransition = () => {
  routeEntryActive.value = false
  unlockIslandRouteGeometry()
  finishRouteCursorLoading()
  emit('routeTransitionComplete')
}

onMounted(() => {
  if (props.entryActive) startEntryAnimation()
  refreshPageMetrics()
  removePageScrollListener = addPageScrollListener(syncScrollState)
  removePageScrollEndListener = addPageScrollEndListener(refreshPageMetrics)
  removePageResizeListener = addPageResizeListener(schedulePageMetricsRefresh)
  if (routerContainer.value) {
    pageResizeObserver = new ResizeObserver(schedulePageMetricsRefresh)
    pageResizeObserver.observe(routerContainer.value)
  }
  const header = headerElement.value
  if (header) {
    headerResizeObserver = new ResizeObserver(syncHeaderBottom)
    headerResizeObserver.observe(header)
    syncHeaderBottom()
  }
})

onUnmounted(() => {
  clearBackgroundTopInsetTimer()
  clearHeaderScrolledTimer()
  visualStateStore.setBackgroundTopInset(0)
  removePageScrollListener?.()
  removePageScrollListener = null
  removePageScrollEndListener?.()
  removePageScrollEndListener = null
  removePageResizeListener?.()
  removePageResizeListener = null
  pageResizeObserver?.disconnect()
  pageResizeObserver = null
  headerResizeObserver?.disconnect()
  headerResizeObserver = null
  clearEntryAnimationTimers()
})

watch(
  () => props.entryActive,
  (entryActive) => {
    if (entryActive) startEntryAnimation()
  }
)

watch(
  () => props.contentActive,
  (contentActive) => {
    isEntryContentRefreshing.value = true
    if (contentActive) layoutShow.value = true
    void nextTick(() => {
      isEntryContentRefreshing.value = false
    })
  },
  { flush: 'sync' }
)

watch(layoutShow, (visible) => {
  if (!visible || navigationEntryReady.value || navigationEntryTimer !== null)
    return
  // 从布局实际显示时开始延迟，避免被页面内容的重挂载等待抵消。
  navigationEntryTimer = window.setTimeout(() => {
    navigationEntryTimer = null
    navigationEntryReady.value = true
  }, ENTRY_NAVIGATION_REVEAL_DELAY)
})

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

watch(showNavigation, (visible) => {
  if (!visible) closeMobileMenu()
})

watch(isHeaderScrollLayoutActive, () => {
  syncHeaderBottom()
})

watch(isScrolled, scheduleBackgroundTopInset, { flush: 'sync' })

watch(
  () => route.fullPath,
  () => {
    pendingPageLayout = resolvePageLayout(route.meta.pageLayout)
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
</style>
