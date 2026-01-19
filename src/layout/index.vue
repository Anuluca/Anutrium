<template>
  <div ref="layoutPage" class="layout-page">
    <!-- 头部 -->
    <el-header class="el-menu-layout-all" :class="{ scrolled: isScrolled }">
      <div class="logo-box" @click="returnHome">
        <img :src="showLogo" />
        <div class="right">
          <p>
            <span>{{ $t('name[0]') }}</span>
            <span :class="'name-center active ' + locale">{{
              $t('name[1]')
            }}</span>
            <span>{{ $t('name[2]') }}</span>
          </p>
        </div>
      </div>

      <!-- 桌面端菜单 -->
      <el-menu
        v-if="!isMobile"
        :default-active="currentRouter"
        mode="horizontal"
        router
        :ellipsis="false"
      >
        <!-- @select="handleSelect" -->
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

    <!-- 移动端菜单按钮 -->
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

    <!-- 移动端菜单面板 -->
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
              GITHUB
            </el-button>
            <el-button link type="danger" @click="contact('GITHUB')">
              WEIBO
            </el-button>
            <el-button link type="danger" @click="contact('GITHUB')">
              TWITTER
            </el-button>
            <el-button link type="danger" @click="contact('GITHUB')">
              BILIBILI
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
          <div class="about-me">© 2018-2025 ANULUCA</div>
          <div class="mobile-footer-left" />
        </div>
      </div>
    </div>

    <!-- body -->
    <div
      :class="{ 'router-container': true, blur: isMobile && isMobileMenuOpen }"
    >
      <transition name="route" mode="out-in">
        <RouterView />
      </transition>
    </div>
    <div class="fullscreen" @click="toggleFullscreen" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Moon, Sunny } from '@element-plus/icons-vue'

import Logo from '@/assets/img/logo/logo.png'
import LogoDark from '@/assets/img/logo/logo_black.png'
import { routes } from '@/router'
import { visualState } from '@/stores'

const { locale } = useI18n()

watch(locale, () => {
  setTimeout(() => {
    changeTitle(true)
  }, 0)
})

const route = useRoute()
const router = useRouter()
const visualStateStore = visualState()
const showLogo = computed(() => {
  return visualStateStore.theme === 'dark' ? Logo : LogoDark
})
const currentRouter = computed(() => {
  return route.path
})

// 新增的滚动相关引用和状态
const layoutPage = ref(null)
const isScrolled = ref(false)
const theme = ref(null)

const filterRoutes = routes.filter((item) => {
  return item?.meta?.ifShow
})

// 移动端相关状态
const isMobile = ref(window.innerWidth <= 620)
const isMobileMenuOpen = ref(false)

// 标题动画
const changeTitle = (close = false) => {
  const name_center_element = document.getElementsByClassName('name-center')[0]
  if (name_center_element) {
    if (close) {
      name_center_element.classList.remove('active')
    } else {
      name_center_element.classList.add('active')
    }
  }
}

// 全屏状态
const isFullscreen = ref(false)

// 切换全屏
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

// 移动端菜单控制
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// 监听窗口大小变化
const handleResize = () => {
  isMobile.value = window.innerWidth <= 620
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

// 监听滚动事件
const handleScroll = () => {
  isScrolled.value = document.documentElement.scrollTop > 50
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
  if (visualStateStore.theme === 'dark') {
    visualStateStore.setTheme('light')
    theme.value = 'light'
    // // 如果是手机端，切换主题后刷新页面
    // if (isMobile.value) {
    //   location.reload();
    // }
  } else {
    visualStateStore.setTheme('dark')
    theme.value = 'dark'
  }
}

onMounted(() => {
  setTimeout(() => {
    changeTitle(true)
    theme.value = localStorage.getItem('theme')
  }, 400)

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize, { passive: true })

  // 添加滚动事件监听器
  document.addEventListener('scroll', handleScroll, { passive: true })
})

// 清理事件监听器
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('scroll', handleScroll)
})
</script>

<style lang="less" scoped>
@import './index.less';

// 添加路由切换过渡动画
.route-enter-active,
.route-leave-from {
  transition: opacity 0.2s ease, transform 0.6s ease, filter 0.6s ease;
}

.route-enter-from {
  opacity: 0;
  transform: scale(0.8);
  filter: blur(10px);
}

.route-leave-from {
  opacity: 0;
  transform: scale(14) !important;
}
</style>
