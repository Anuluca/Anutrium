<template>
  <div
    ref="layoutPage"
    :class="{
      'layout-page': true,
      'layout-show': layoutShow,
      'entry-logo-ready': headerLogoReady,
      'temple-header-default': templeHeaderDefault,
      'temple-header-balanced':
        isTempleRoute && !isMobile && !templeHeaderDefault,
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
      <button
        class="logo-box"
        type="button"
        :aria-label="locale === 'en' ? 'Return home' : '返回首页'"
        @click="returnHome"
      >
        <Logo id="0" class="logo" :active="false" data-entry-logo-target />
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
            <span class="site-brand">Anutrium</span>
            <Transition name="module-name" mode="out-in" :duration="560">
              <span
                v-if="displayedHeader.moduleName"
                :key="displayedHeader.moduleName"
                :class="[
                  'current-module-name',
                  displayedHeader.moduleTheme &&
                    `current-module-name--${displayedHeader.moduleTheme}`,
                ]"
              >
                <span
                  v-for="(character, index) in splitModuleName(
                    displayedHeader.moduleName
                  )"
                  :key="`${character}:${index}`"
                  class="module-name-character"
                  :style="{
                    '--module-character-delay': `${index * 24}ms`,
                  }"
                  >{{ character === ' ' ? '\u00a0' : character }}</span
                >
              </span>
            </Transition>
          </span>
        </Transition>
      </button>

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
              :class="[
                'desktop-menu-item',
                item.id.toUpperCase(),
                {
                  'is-active': activeNavigation === item.id,
                  'is-inner-active':
                    isInnerMenuRoute && activeNavigation === item.id,
                },
              ]"
            >
              <button
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
                  <div class="second-title">
                    <div class="line" />
                    <span>{{ item.label }}</span>
                  </div>
                </div>
              </button>
            </li>
          </ul>
        </nav>
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
              v-for="item in menuItems"
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
            <FooterSocialLinks />
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
          :css="!isEntryContentRefreshing"
          @before-enter="beginRouteEnter"
          @before-leave="lockIslandRouteGeometry"
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
import { InfoFilled } from '@element-plus/icons-vue'

import BackToTop from '@/components/BackToTop/index.vue'
import HeaderThemeIcon from '@/components/HeaderThemeIcon.vue'
import Logo from '@/components/Logo/index.vue'
import MenuToggleIcon from '@/components/MenuToggleIcon/index.vue'
import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
import TextRoll from '@/components/TextRoll/index.vue'
import { HOME_RETURN_TO_PASSION_EVENT } from '@/config/homeNavigation'
import { isTempleMutedMenuItem } from '@/config/templeModelDisplay'
import {
  templeNavigation,
  type TempleNavigationId,
} from '@/config/templeNavigation'
import {
  finishRouteCursorLoading,
  type PageLayout,
  routes,
  syncPageTheme,
  syncSeoMeta,
} from '@/router'
import { visualState } from '@/stores'
import { useTempleNavigation } from '@/stores/templeNavigation'
import { consumeJourneyReturnState } from '@/utils/journeyReturnState'
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
const dismissTempleFocusFromHeader = (event: MouseEvent) => {
  if (
    !isTempleRoute.value ||
    !navigation.activeSelection ||
    navigation.aboutOpen
  )
    return
  if (
    event.target instanceof Element &&
    event.target.closest(
      'a, button, input, select, textarea, [role="button"], [contenteditable="true"]'
    )
  )
    return
  if (!navigation.closeInlineDetail()) navigation.request(null)
}
const wantsNavigation = computed(
  () =>
    !isTempleRoute.value || !!navigation.activeSelection || navigation.aboutOpen
)
const templeHeaderDefault = ref(!wantsNavigation.value)
const navigationRevealed = ref(wantsNavigation.value)
const showNavigation = computed(
  () =>
    wantsNavigation.value &&
    navigationRevealed.value &&
    navigationEntryReady.value
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
    () => navigation.aboutOpen,
    () => navigation.companionFocused,
  ],
  () => {
    if (isTempleRoute.value)
      syncPageTheme(
        route,
        navigation.companionFocused
          ? 'SPRIGATITO'
          : navigation.activeModule?.toUpperCase() || 'HOME'
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
        : templeNavigation.find(
            (item) => item.id === navigation.activeSelection
          )?.title || '',
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
// 退出时保留文字布局，Logo 独立移动，避免渐隐中的菜单位置跳变。
const lastTempleHeader = ref(headerPresentation.value)
const displayedHeader = computed(() =>
  isTempleRoute.value ? lastTempleHeader.value : headerPresentation.value
)
let logoMotion: Animation | undefined
let logoCentering = false
let headerMotionRevision = 0
const moveTempleLogo = async (centered: boolean) => {
  const revision = ++headerMotionRevision
  const logo = document.querySelector<HTMLElement>('.logo-box .logo')
  const before = logo?.getBoundingClientRect()
  logoMotion?.cancel()
  logoCentering = centered
  if (!centered) templeHeaderDefault.value = false
  await nextTick()
  if (!logo || !before || revision !== headerMotionRevision) return
  const after = logo.getBoundingClientRect()
  let targetX = after.x
  let targetY = after.y
  if (centered) {
    // 回正布局清除负上边距；直接补偿居中对齐偏移，避免临时 display:none 中断标题渐隐。
    const marginTop = parseFloat(
      getComputedStyle(logo.parentElement!).marginTop
    )
    targetX = (window.innerWidth - after.width) / 2
    targetY = after.y - marginTop / 2
  }
  const animation = logo.animate(
    [
      {
        transform: `translate(${before.x - after.x}px, ${
          before.y - after.y
        }px)`,
      },
      {
        transform: centered
          ? `translate(${targetX - after.x}px, ${targetY - after.y}px)`
          : 'none',
      },
    ],
    {
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 1
        : 2000,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards',
    }
  )
  logoMotion = animation
  try {
    await animation.finished
  } catch {
    return false
  }
  if (revision !== headerMotionRevision) return false
  if (centered) {
    templeHeaderDefault.value = true
    await nextTick()
    if (revision !== headerMotionRevision) return false
    logoCentering = false
  }
  animation.cancel()
  return true
}
const centerTempleLogo = () => {
  if (
    isTempleRoute.value &&
    !wantsNavigation.value &&
    !templeHeaderDefault.value &&
    !logoCentering
  )
    moveTempleLogo(true)
}
watch(
  [wantsNavigation, headerPresentation],
  async ([visible, presentation]) => {
    if (visible) {
      lastTempleHeader.value = presentation
      if (templeHeaderDefault.value || logoCentering) {
        navigationRevealed.value = false
        if (await moveTempleLogo(false))
          navigationRevealed.value = wantsNavigation.value
      } else navigationRevealed.value = true
    }
    if (!visible) {
      navigationRevealed.value = false
      centerTempleLogo()
    }
    if (!isTempleRoute.value) {
      templeHeaderDefault.value = false
      navigationRevealed.value = true
    }
  }
)
onUnmounted(() => {
  headerMotionRevision++
  logoMotion?.cancel()
})
const splitModuleName = (moduleName: string) => Array.from(moduleName)
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
const menuItems = templeNavigation
const menuItemById = new Map(menuItems.map((item) => [item.id, item]))
const balancedMenuItems = (
  [
    'archive',
    'flanerie',
    'statue',
    'about',
    'sprigatito',
    'pokeyard',
    'island',
  ] as const
).map((id) => menuItemById.get(id)!)
const desktopMenuGroups = computed(() =>
  isTempleRoute.value
    ? [balancedMenuItems.slice(0, 4), balancedMenuItems.slice(4)]
    : [menuItems]
)
const activeNavigation = computed(() =>
  navigation.aboutOpen ? 'about' : navigation.activeSelection
)
const activateNavigation = async (id: TempleNavigationId) => {
  closeMobileMenu()
  if (!isTempleRoute.value) await router.push('/')
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
    !isTempleRoute.value &&
    (visualStateStore.pageScrollProgressOverride !== null ||
      isPageScrollable.value)
)
const isHeaderScrollLayoutActive = ref(false)
const isEntryContentRefreshing = ref(false)
let logoTimer: number | null = null
let navigationEntryTimer: number | null = null
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
const ENTRY_LOGO_REVEAL_DELAY = 900
const ENTRY_NAVIGATION_REVEAL_DELAY = 300
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
const routeShellClasses = [
  ...islandShellClasses,
  ...islandLeavingClasses,
] as const
const islandLeavingClassByRouteShell = {
  'island-pc': 'island-pc-shell-leaving',
  'island-mobile': 'island-mobile-shell-leaving',
} as const

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
    headerLogoReady.value = true

    logoTimer = window.setTimeout(() => {
      logoTimer = null
    }, ENTRY_LOGO_REVEAL_DURATION)
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
  activePageLayout.value = pendingPageLayout
  noMenuShellActive.value = pendingNoMenuShell
  document.body.classList.remove(...islandLeavingClasses)

  if (route.name !== ISLAND_ROUTE_NAME && route.name !== 'HOME') {
    document.body.classList.remove(...islandShellClasses)
  }

  void nextTick(schedulePageMetricsRefresh)
}

const completeRouteLeave = () => {
  unlockIslandRouteGeometry()
  visualStateStore.markRouteLeaveComplete()
}

const beginRouteEnter = () => {
  routeEntryActive.value = true
}

const completeRouteTransition = () => {
  routeEntryActive.value = false
  unlockIslandRouteGeometry()
  finishRouteCursorLoading()
  emit('routeTransitionComplete')
}

const scheduleIslandGeometryUnlock = () => {
  if (
    route.name === ISLAND_ROUTE_NAME ||
    route.name === 'HOME' ||
    !hasIslandShellClass() ||
    islandGeometryUnlockTimer !== null
  ) {
    return
  }

  const leavingElement = lockedIslandRouteGeometry?.element
  let fallbackDelay = ISLAND_GEOMETRY_UNLOCK_DELAY
  if (leavingElement) {
    const style = getComputedStyle(leavingElement)
    const milliseconds = (value: string) =>
      parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)
    const delays = style.transitionDelay.split(',').map(milliseconds)
    const durations = style.transitionDuration.split(',').map(milliseconds)
    // 超时兜底须晚于真实 CSS 离场；固定 260ms 会在慢过渡中提前恢复盒模型。
    fallbackDelay = Math.max(
      fallbackDelay,
      ...durations.map(
        (duration, index) => duration + delays[index % delays.length] + 100
      )
    )
  }
  islandGeometryUnlockTimer = window.setTimeout(
    unlockIslandRouteGeometry,
    fallbackDelay
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
  document.body.classList.remove(...islandShellClasses, ...islandLeavingClasses)
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

watch(isMobileMenuMounted, (mounted) => {
  if (!mounted && !wantsNavigation.value) centerTempleLogo()
})
watch(showNavigation, (visible) => {
  if (!visible) closeMobileMenu()
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
