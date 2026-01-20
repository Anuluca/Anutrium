<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ElLoading } from 'element-plus'

import bilibiliImg from '@/assets/img/bilibili_profile.png'
import githubImg from '@/assets/img/github_profile.png'
import twitterImg from '@/assets/img/twitter_profile.png'
import bottomLineData from '@/data/bottomLine.js'
import { visualState } from '@/stores'

import 'element-plus/theme-chalk/index.css'
import './index.less'

const SOCIAL_LINKS = {
  TWITTER: 'https://twitter.com/TILucario',
  BILIBILI: 'https://space.bilibili.com/128735968',
  GITHUB: 'https://github.com/Anuluca',
}

const SOCIAL_TYPES = ['TWITTER', 'WEIBO', 'BILIBILI', 'GITHUB', 'EMAIL']

const weiboImg = ref(
  'https://widget.weibo.com/weiboshow/index.php?language=&width=0&height=520&fansRow=1&ptype=1&speed=0&skin=10&isTitle=1&noborder=1&isWeibo=1&isFans=1&uid=7738638501&verifier=4838f435&dpc=1'
)

const { locale } = useI18n()
const router = useRouter()
const route = useRoute()
const visualStateStore = visualState()

const fullFooter = computed(() => router.currentRoute.value.meta.fullFooter)
const currentRouter = computed(() => route.path)
const theme = ref(false)
const isScrollingDown = ref<boolean>(false)
let lastScrollTop = 0

onMounted(() => {
  initFooterAnimation()
  document.addEventListener('scroll', handleScroll, { passive: true })
})

const initFooterAnimation = () => {
  const expandElement = document.querySelector('.expand') as HTMLElement
  const textElement = document.querySelector('.text-links') as HTMLElement
  const weiboElement = document.querySelector('.WEIBO_detail') as HTMLElement

  if (!expandElement || !textElement || !weiboElement) return

  expandElement.style.width = '0px'
  expandElement.style.overflow = 'hidden'
  textElement.style.opacity = '0'
  weiboElement.style.opacity = '0'

  setTimeout(() => {
    expandElement.style.width = '100%'
    expandElement.style.overflow = 'visible'
    textElement.style.opacity = '1'
    theme.value = localStorage.getItem('theme') === 'dark'
  }, 400)
}

const changeLanguage = (lang: string) => {
  localStorage.setItem('lang', lang)
  locale.value = lang
}

const changeTheme = () => {
  const newTheme = theme.value ? 'dark' : 'light'

  if (currentRouter.value === '/') {
    const loadingInstance = ElLoading.service({
      fullscreen: true,
      background: 'rgba(0, 0, 0, 0.2)',
      spinner: '1',
    })

    setTimeout(() => {
      visualStateStore.setTheme(newTheme)
    }, 150)

    setTimeout(() => {
      loadingInstance.close()
    }, 150)
  } else {
    visualStateStore.setTheme(newTheme)
  }
}

const contact = (type: string) => {
  if (!SOCIAL_TYPES.includes(type)) return

  if (type === 'EMAIL') {
    window.location.href = 'mailto:tilucario@outlook.com'
    return
  }

  if (type === 'WEIBO') {
    toggleWeiboVisibility()
    return
  }

  const url = SOCIAL_LINKS[type as keyof typeof SOCIAL_LINKS]
  if (url) {
    window.open(url, '_blank')
  }
}

const toggleWeiboVisibility = () => {
  const element = document.querySelector('.WEIBO_detail') as HTMLElement
  if (!element) return

  const isVisible = element.style.opacity === '1'
  element.style.bottom = isVisible ? '-540px' : '30px'
  element.style.opacity = isVisible ? '0' : '1'
}

const handleSocialHover = (type: string, isHover: boolean) => {
  const element = document.querySelector(`.${type}_detail`) as HTMLElement
  if (!element) return

  if (isHover) {
    element.classList.add('hover')
  } else {
    element.classList.remove('hover')
  }
}

const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  isScrollingDown.value = scrollTop > lastScrollTop
  lastScrollTop = Math.max(0, scrollTop)
}

onUnmounted(() => {
  document.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div
    :class="{
      'footer-com': true,
      'full-footer': fullFooter,
      'scrolling-down': isScrollingDown,
    }"
  >
    <!-- 左侧 -->
    <div class="left">
      <div class="language">
        <el-button
          link
          type="danger"
          :disabled="locale === 'zhCn'"
          @click="changeLanguage('zhCn')"
        >
          汉语
        </el-button>
        <el-button link type="danger" disabled>|</el-button>
        <el-button
          link
          type="danger"
          style="margin-right: 2px"
          :disabled="locale === 'en'"
          @click="changeLanguage('en')"
        >
          En
        </el-button>
      </div>
    </div>
    <!-- 中间 -->
    <div class="center">
      <div class="expand">
        <div class="marquee-wrap">
          <span class="left-space" />
          <span class="recommend">
            <a
              v-for="(item, key) in bottomLineData.recommand"
              :key="key"
              style="color: white"
              :href="item.href"
            >
              「
              <span
                :style="[
                  {
                    color: item.color || '#5F9DDD',
                    fontWeight: 'bold',
                  },
                ]"
                >{{ item.title }}\{{ item.sort }}</span
              >
              」
              <span style="color: #ffffff96">{{ item.date }}</span>
              &nbsp;
            </a>
          </span>
          <b>{{ bottomLineData.intro }}</b>
        </div>
      </div>
    </div>
    <!-- 右侧 -->
    <div class="right">
      <div class="text-links">
        <span>
          <div class="TWITTER_detail">
            <img :src="twitterImg" alt="Twitter profile" />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('TWITTER')"
            @mouseover="handleSocialHover('TWITTER', true)"
            @mouseleave="handleSocialHover('TWITTER', false)"
          >
            TWITTER
          </el-button>
        </span>
        <span>
          <div class="WEIBO_detail">
            <iframe
              width="100%"
              height="520"
              class="share_self"
              frameborder="0"
              scrolling="no"
              :src="weiboImg"
            />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('WEIBO')"
            @mouseover="handleSocialHover('WEIBO', true)"
            @mouseleave="handleSocialHover('WEIBO', false)"
          >
            WEIBO
          </el-button>
        </span>
        <span>
          <div class="BILIBILI_detail">
            <img
              :src="bilibiliImg"
              width="220px"
              height="220px"
              alt="Bilibili profile"
            />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('BILIBILI')"
            @mouseover="handleSocialHover('BILIBILI', true)"
            @mouseleave="handleSocialHover('BILIBILI', false)"
          >
            BILIBILI
          </el-button>
        </span>
        <span>
          <div class="GITHUB_detail">
            <img :src="githubImg" alt="GitHub profile" />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('GITHUB')"
            @mouseover="handleSocialHover('GITHUB', true)"
            @mouseleave="handleSocialHover('GITHUB', false)"
          >
            GITHUB
          </el-button>
        </span>
        <span>
          <el-button link type="danger" @click="contact('EMAIL')">
            MAIL
          </el-button>
        </span>
      </div>
      <span class="mark"> 2018-2026 ANULUCA </span>
      <el-switch
        v-model="theme"
        style="
          --el-switch-on-color: #1a1a1aa8;
          --el-switch-off-color: #ffffff1f;
        "
        @change="changeTheme()"
      />
    </div>
  </div>
</template>
