<template>
  <div
    ref="layoutPage"
    :class="{
      'layout-page': true,
      'layout-show': layoutShow,
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
        <Logo id="0" class="logo" :active="false" />
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
              ANULUCA'S ATRIUM
            </span>
          </span>
        </div>
      </button>

      <el-menu
        v-if="!isMobile"
        :default-active="currentRouter"
        mode="horizontal"
        router
        :ellipsis="false"
      >
        <div class="menu-box">
          <RouterLink
            v-for="(item, index) in filterRoutes"
            :key="index"
            :to="item.path"
          >
            <el-menu-item :index="item.path" :class="item.name">
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
        <transition name="route" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
    <BackToTop />
    <button
      class="fullscreen"
      type="button"
      :aria-label="locale === 'en' ? 'Toggle fullscreen' : '切换全屏'"
      @click="toggleFullscreen"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Moon, Sunny } from '@element-plus/icons-vue'

import BackToTop from '@/components/BackToTop/index.vue'
import Logo from '@/components/Logo/index.vue'
import { CONTACT_LINKS, getContactLink } from '@/data/contactLinks'
import { routes, syncSeoMeta } from '@/router'
import { visualState } from '@/stores'
import { persistLocale, type SiteLocale } from '@/utils/locale'

const { locale } = useI18n()

const logoActive = ref(true)

const route = useRoute()
const router = useRouter()
const visualStateStore = visualState()
const currentRouter = computed(() => {
  return route.path
})

const layoutPage = ref<HTMLElement | null>(null)
const isScrolled = ref(false)
const layoutShow = ref(false)
const theme = computed(() => visualStateStore.theme)
const socialContacts = CONTACT_LINKS.filter((item) => item.type !== 'MAIL')
const mailContact = getContactLink('MAIL')!

const filterRoutes = routes.filter((item) => {
  return item?.meta?.ifShow
})

const ifNoMenu = computed(() => !!route.meta?.noMenu)

const isMobile = computed(() => visualStateStore.deviceType !== 'desktop')
const isMobileMenuOpen = ref(false)

const isFullscreen = ref(false)
let scrollRafId: number | null = null
let logoTimer: number | null = null
let layoutTimer: number | null = null

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

const handleScroll = () => {
  if (scrollRafId !== null) return

  scrollRafId = window.requestAnimationFrame(() => {
    const nextValue =
      window.scrollY > 50 || document.documentElement.scrollTop > 50
    if (isScrolled.value !== nextValue) {
      isScrolled.value = nextValue
    }
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

onMounted(() => {
  logoTimer = window.setTimeout(() => {
    logoActive.value = false
  }, 400)
  layoutTimer = window.setTimeout(() => {
    layoutShow.value = true
  }, 100)
  handleScroll()
  document.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('scroll', handleScroll)
  if (scrollRafId !== null) window.cancelAnimationFrame(scrollRafId)
  if (logoTimer !== null) window.clearTimeout(logoTimer)
  if (layoutTimer !== null) window.clearTimeout(layoutTimer)
})
</script>

<style lang="less" scoped>
@import './index.less';

.route-enter-active {
  transition: opacity 0.2s ease, transform 0.6s ease, filter 0.6s ease;
}

.route-leave-active {
  transition: opacity 0.2s ease;
  will-change: opacity;
}

.route-enter-from {
  opacity: 0;
  transform: scale(0.8);
  filter: blur(10px);
}

.route-leave-to {
  opacity: 0;
}
</style>
