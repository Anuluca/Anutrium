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
      <div class="logo-box" @click="returnHome">
        <Logo id="0" class="logo" :active="false" />
        <div :class="['right', locale]">
          <p>
            <span>{{ $t('name[0]') }}</span>
            <span :class="['name-center', { active: logoActive }]">{{
              $t('name[1]')
            }}</span>
            <span>{{ $t('name[2]') }}</span>
          </p>
        </div>
      </div>

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

    <div
      v-if="isMobile"
      :class="{ 'mobile-menu-icon': true, scrolled: isScrolled }"
      @click="toggleMobileMenu"
    >
      <div class="hamburger" :class="{ active: isMobileMenuOpen }">
        <span />
        <span />
        <span />
      </div>
    </div>

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
            <div class="mobile-menu-language" @click="toggleLanguage">
              <span v-if="locale === 'zhCn'" class="first cnArt">汉</span>
              <span v-if="locale === 'zhCn'" class="second">En</span>
              <span v-if="locale === 'en'" class="first">En</span>
              <span v-if="locale === 'en'" class="second cnArt">汉</span>
            </div>
            <div class="mobile-menu-theme" @click="toggleTheme">
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
            </div>
          </div>
          <div class="contact-item">
            <el-button link type="danger" @click="contact('GITHUB')">
              &lt; GITHUB &gt;
            </el-button>
            <el-button link type="danger" @click="contact('WEIBO')">
              &lt; WEIBO &gt;
            </el-button>
            <el-button link type="danger" @click="contact('TWITTER')">
              &lt; TWITTER &gt;
            </el-button>
            <el-button link type="danger" @click="contact('BILIBILI')">
              &lt; BILIBILI &gt;
            </el-button>
          </div>
          <div class="contact-item">
            <span>E-MAIL: </span>
            <el-button
              class="mail-link"
              link
              type="danger"
              @click="contact('EMAIL')"
            >
              tilucario@outlook.com
            </el-button>
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
    <div class="fullscreen" @click="toggleFullscreen" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Moon, Sunny } from '@element-plus/icons-vue'

import BackToTop from '@/components/BackToTop/index.vue'
import Logo from '@/components/Logo/index.vue'
import { routes } from '@/router'
import { visualState } from '@/stores'

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
  if (locale.value === 'zhCn') {
    locale.value = 'en'
  } else {
    locale.value = 'zhCn'
  }
}

const toggleTheme = () => {
  visualStateStore.toggleTheme()
}

const contact = (type: string) => {
  console.log(`${type} clicked`)
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
  transform-origin: center center;
  transition: opacity 0.6s ease, transform 0.6s ease, filter 0.6s ease;
  will-change: opacity, transform, filter;
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
