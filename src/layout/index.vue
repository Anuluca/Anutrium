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
    <el-header class="el-menu-layout-all" :class="{ scrolled: isScrolled }">
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
              <component
                :is="getRouteIcon(item.meta.headerIcon)"
                class="menu-route-icon"
                aria-hidden="true"
              />
              <div class="title-box">
                <div class="main-title">{{ item.meta.titleEn }}</div>
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
      :class="{ 'mobile-menu-icon': true, scrolled: isScrolled }"
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
          <div class="contact-item">
            <a
              v-for="contact in socialContacts"
              :key="contact.type"
              class="mobile-contact-link"
              :href="contact.href"
              target="_blank"
              rel="noopener noreferrer"
            >
              &lt; {{ contact.label }} &gt;
            </a>
          </div>
          <div class="contact-item">
            <span>E-MAIL: </span>
            <a class="mail-link" :href="mailContact.href">
              tilucario@outlook.com
            </a>
          </div>
          <div class="about-me">© 2018-2026 ANULUCA</div>
          <div class="mobile-footer-left" />
        </div>
      </div>
    </div>

    <div
      :class="{ 'router-container': true, blur: isMobile && isMobileMenuOpen }"
    >
      <router-view v-slot="{ Component }">
        <transition
          name="route"
          @before-leave="lockIslandRouteGeometry"
          @after-leave="unlockIslandRouteGeometry"
          @after-enter="unlockIslandRouteGeometry"
          @leave-cancelled="unlockIslandRouteGeometry"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
    <BackToTop :suppressed="isMobile && isMobileMenuOpen" />
    <span
      v-if="isPageScrollable"
      class="page-scroll-progress no-rem"
      :style="{ '--scroll-progress': `${scrollProgress}%` }"
      aria-hidden="true"
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  Collection,
  HomeFilled,
  MapLocation,
  Moon,
  Ship,
  Sunny,
  Tools,
  UserFilled,
} from '@element-plus/icons-vue'

import BackToTop from '@/components/BackToTop/index.vue'
import Logo from '@/components/Logo/index.vue'
import type { ContactLink } from '@/locales/modules/contactLinks'
import { type HeaderIconName, routes, syncSeoMeta } from '@/router'
import { visualState } from '@/stores'
import { persistLocale, type SiteLocale } from '@/utils/locale'
import {
  addPageScrollListener,
  getPageMaxScrollTop,
  getPageScrollTop,
  scrollPageTo,
} from '@/utils/pageScroll'

const { locale, tm } = useI18n()
const props = defineProps({
  entryActive: {
    type: Boolean,
    default: false,
  },
})

const logoActive = ref(true)
const headerLogoReady = ref(false)

const route = useRoute()
const router = useRouter()
const visualStateStore = visualState()
const currentRouter = computed(() => {
  return typeof route.meta.activeMenu === 'string'
    ? route.meta.activeMenu
    : route.path
})
const isInnerMenuRoute = computed(
  () =>
    typeof route.meta.activeMenu === 'string' &&
    route.path !== route.meta.activeMenu
)
const routeIconMap: Record<HeaderIconName, typeof HomeFilled> = {
  Collection,
  HomeFilled,
  MapLocation,
  Ship,
  Tools,
  UserFilled,
}
const getRouteIcon = (icon?: HeaderIconName) =>
  routeIconMap[icon || 'HomeFilled']

const layoutPage = ref<HTMLElement | null>(null)
const isScrolled = ref(false)
const layoutShow = ref(false)
const theme = computed(() => visualStateStore.theme)
const contactLinks = computed(
  () => tm('contactLinks') as unknown as ContactLink[]
)
const socialContacts = computed(() =>
  contactLinks.value.filter((item) => item.type !== 'MAIL')
)
const mailContact = computed(
  () => contactLinks.value.find((item) => item.type === 'MAIL')!
)

const filterRoutes = routes.filter((item) => {
  return item?.meta?.ifShow
})

const ifNoMenu = computed(() => !!route.meta?.noMenu)

const isMobile = computed(() => visualStateStore.deviceType !== 'desktop')
const isMobileMenuOpen = ref(false)
let isMobileScrollLocked = false
let lockedMobileScrollY = 0
let removePageScrollListener: (() => void) | null = null

const isFullscreen = ref(false)
const scrollProgress = ref(0)
const isPageScrollable = ref(false)
let scrollRafId: number | null = null
let hasInitializedHeaderScrollState = false
let headerScrollAnimations: Animation[] = []
let logoTimer: number | null = null
let layoutTimer: number | null = null
let islandGeometryUnlockTimer: number | null = null
let hasPlayedEntryAnimation = false
const ISLAND_ROUTE_NAME = 'TEST'
const ISLAND_GEOMETRY_UNLOCK_DELAY = 260
const ENTRY_LOGO_REVEAL_DELAY = 600
const ENTRY_LOGO_REVEAL_DURATION = 300
const HEADER_SCROLL_ENTER_THRESHOLD = 50
const HEADER_SCROLL_EXIT_THRESHOLD = 32
const islandShellClasses = ['island-pc-shell', 'island-mobile-shell'] as const
const islandLeavingClasses = [
  'island-pc-shell-leaving',
  'island-mobile-shell-leaving',
] as const

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
  document.documentElement.classList.remove('mobile-menu-scroll-locked')
  document.body.classList.remove('mobile-menu-scroll-locked')
  document.removeEventListener('touchmove', preventBackgroundTouchMove)
  scrollPageTo({ top: scrollY })
}

const getHeaderAnimationTargets = () => {
  const header = document.querySelector<HTMLElement>('.el-menu-layout-all')
  if (!header) return []

  const logo = header.querySelector<HTMLElement>('.logo-box > .logo')
  const logoText = header.querySelector<HTMLElement>('.logo-box > .right')
  const menu = Array.from(header.children).find(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element.classList.contains('el-menu')
  )

  return [logo, logoText, menu].filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )
}

const cancelHeaderScrollAnimations = () => {
  headerScrollAnimations.forEach((animation) => animation.cancel())
  headerScrollAnimations = []
}

const setHeaderScrolledState = (nextValue: boolean) => {
  if (isScrolled.value === nextValue) return

  // 首次同步滚动位置时不播放，避免路由恢复位置后出现无意义的入场动画。
  if (!hasInitializedHeaderScrollState) {
    hasInitializedHeaderScrollState = true
    isScrolled.value = nextValue
    return
  }

  const targets = getHeaderAnimationTargets()
  const previousBounds = new Map(
    targets.map((element) => [element, element.getBoundingClientRect()])
  )

  cancelHeaderScrollAnimations()
  isScrolled.value = nextValue

  void nextTick(() => {
    headerScrollAnimations = targets.flatMap((element) => {
      const previous = previousBounds.get(element)
      if (!previous) return []

      const current = element.getBoundingClientRect()
      const offsetX = previous.left - current.left
      const offsetY = previous.top - current.top
      const scaleX = current.width > 0.5 ? previous.width / current.width : 1
      const scaleY = current.height > 0.5 ? previous.height / current.height : 1
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
          duration: 260,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }
      )
      animation.onfinish = () => {
        headerScrollAnimations = headerScrollAnimations.filter(
          (item) => item !== animation
        )
      }
      return [animation]
    })
  })
}

const handleScroll = () => {
  if (scrollRafId !== null) return

  scrollRafId = window.requestAnimationFrame(() => {
    const scrollTop = getPageScrollTop()
    const maxScroll = getPageMaxScrollTop()
    scrollProgress.value = maxScroll
      ? Math.min(100, (scrollTop / maxScroll) * 100)
      : 0
    isPageScrollable.value = maxScroll > 1

    // 使用滞回区间，避免在临界位置来回滚动时重复触发菜单动画与模糊层。
    const nextValue = isScrolled.value
      ? scrollTop > HEADER_SCROLL_EXIT_THRESHOLD
      : scrollTop > HEADER_SCROLL_ENTER_THRESHOLD
    setHeaderScrolledState(nextValue)
    scrollRafId = null
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

const toggleTheme = () => {
  visualStateStore.toggleTheme()
}

const clearIslandGeometryUnlockTimer = () => {
  if (islandGeometryUnlockTimer === null) return

  window.clearTimeout(islandGeometryUnlockTimer)
  islandGeometryUnlockTimer = null
}

const hasIslandShellClass = () =>
  [...islandShellClasses, ...islandLeavingClasses].some((className) =>
    document.body.classList.contains(className)
  )

const markIslandRouteLeaving = () => {
  if (document.body.classList.contains('island-pc-shell')) {
    document.body.classList.add('island-pc-shell-leaving')
  }

  if (document.body.classList.contains('island-mobile-shell')) {
    document.body.classList.add('island-mobile-shell-leaving')
  }
}

const refreshScrollState = () => {
  if (scrollRafId !== null) {
    window.cancelAnimationFrame(scrollRafId)
    scrollRafId = null
  }
  handleScroll()
}

const lockIslandRouteGeometry = (leavingElement: Element) => {
  clearIslandGeometryUnlockTimer()
  markIslandRouteLeaving()

  if (leavingElement instanceof HTMLElement) {
    const bounds = leavingElement.getBoundingClientRect()
    Object.assign(leavingElement.style, {
      position: 'fixed',
      top: `${bounds.top}px`,
      left: `${bounds.left}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      margin: '0',
    })
  }

  if (hasIslandShellClass() && route.name !== ISLAND_ROUTE_NAME) {
    unlockIslandRouteGeometry()
  }
}

const unlockIslandRouteGeometry = () => {
  clearIslandGeometryUnlockTimer()
  document.body.classList.remove(...islandLeavingClasses)

  if (route.name !== ISLAND_ROUTE_NAME) {
    document.body.classList.remove(...islandShellClasses)
  }

  nextTick(refreshScrollState)
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
  isScrolled.value = getPageScrollTop() > HEADER_SCROLL_ENTER_THRESHOLD
  hasInitializedHeaderScrollState = true
  handleScroll()
  removePageScrollListener = addPageScrollListener(handleScroll)
  window.addEventListener('resize', handleScroll, { passive: true })
})

onUnmounted(() => {
  clearIslandGeometryUnlockTimer()
  document.body.classList.remove(...islandShellClasses, ...islandLeavingClasses)
  unlockMobilePageScroll()
  removePageScrollListener?.()
  removePageScrollListener = null
  window.removeEventListener('resize', handleScroll)
  if (scrollRafId !== null) window.cancelAnimationFrame(scrollRafId)
  cancelHeaderScrollAnimations()
  clearEntryAnimationTimers()
})

watch(
  () => props.entryActive,
  (entryActive) => {
    if (entryActive) startEntryAnimation()
  }
)

watch([isMobile, isMobileMenuOpen], ([mobile, menuOpen]) => {
  if (mobile && menuOpen) {
    lockMobilePageScroll()
    return
  }

  unlockMobilePageScroll()
})

watch(
  () => route.fullPath,
  async () => {
    closeMobileMenu()
    if (route.name !== ISLAND_ROUTE_NAME) {
      clearIslandGeometryUnlockTimer()
      document.body.classList.remove(
        ...islandShellClasses,
        ...islandLeavingClasses
      )
    }
    await nextTick()
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
