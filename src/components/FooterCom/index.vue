<script setup lang="ts">
import './index.less'
import { useRouter, useRoute } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import { visualState } from '@/stores'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/theme-chalk/index.css'
import { useI18n } from 'vue-i18n'
import twitterImg from '@/assets/img/twitter_profile.png'
import bilibiliImg from '@/assets/img/bilibili_profile.png'
import githubImg from '@/assets/img/github_profile.png'
import bottomLineData from '@/data/bottomLine.js'


const { locale } = useI18n()

const router = useRouter()
const route = useRoute()
const visualStateStore = visualState()
const hasPic = computed(() => {
  return router.currentRoute.value.meta.hasPic
})
const currentRouter = computed(() => {
  return route.path
})
let nightMode = ref()

onMounted(() => {
  // 底部新闻条入场动画
  const expand_element = document.getElementsByClassName('expand')[0]
  const text_element = document.getElementsByClassName('text-links')[0]
  expand_element['style'].width = '0px'
  expand_element['style'].overflow = 'hidden'
  text_element['style'].opacity = '0'
  document.getElementsByClassName(`WEIBO_detail`)[0]['style'].opacity = '0'
  setTimeout(() => {
    expand_element['style'].width = '100%'
    expand_element['style'].overflow = 'hidden'
    text_element['style'].opacity = '1'
    nightMode.value = localStorage.getItem('theme') === 'dark'
  }, 0)
})

const changeLanguage = (lang) => {
  localStorage.setItem('lang', lang)
  locale.value = lang
}

const changeTheme = () => {

  if (currentRouter.value === '/') {
    const loadingInstance = ElLoading.service({ fullscreen: true, text: 'Theme Changing' })
    console.log(nightMode.value)
    setTimeout(() => {
      const currentMode = nightMode.value ? 'dark' : 'light'
      // localStorage.setItem('theme', currentMode)
      visualStateStore.setTheme(currentMode)
    }, 500)
    setTimeout(() => {
      loadingInstance.close()
    }, 500)
  } else {
    const currentMode = nightMode.value ? 'dark' : 'light'
    // localStorage.setItem('theme', currentMode)
    visualStateStore.setTheme(currentMode)
  }
}

// 点击事件
const contact = (type: string) => {
  let url = ''
  if (type !== 'EMAIL' && type !== 'WEIBO') {
    if (type === 'TWITTER') {
      url = 'https://twitter.com/TILucario'
    } else if (type === 'BILIBILI') {
      url = 'https://space.bilibili.com/128735968'
    } else if (type === 'GITHUB') {
      url = 'https://github.com/Anuluca'
    }
    window.open(url)
  } else if (type === 'EMAIL') {
    const linkNode = document.createElement('a')
    linkNode.href = 'mailto:tilucario@outlook.com'
    document.body.appendChild(linkNode)
    linkNode.click()
  } else {
    // url = 'https://weibo.com/ryugamine'
    let element = document.getElementsByClassName(`WEIBO_detail`)[0]
    if (element['style'].opacity == '0') {
      element['style'].bottom = '30px'
      element['style'].opacity = '1'
    } else {
      element['style'].bottom = '-540px'
      element['style'].opacity = '0'
    }
  }
}

// 鼠标移入
const mouseOver = (type: string) => {
  let element = document.getElementsByClassName(`${type}_detail`)[0]
  element['style'].bottom = '30px'
  element['style'].opacity = '1'
}

// 鼠标移出
const mouseLeave = (type: string) => {
  let element = document.getElementsByClassName(`${type}_detail`)[0]
  element['style'].bottom = '-140px'
  element['style'].opacity = '0'
}
</script>

<template>
  <div :class="{ 'footer-com': true, 'full-footer': !hasPic }">
    <!-- 左侧 -->
    <div class="left">
      <div class="language">
        <el-button link type="danger" @click="changeLanguage('zhCn')" :disabled="locale === 'zhCn'"
          >中文</el-button
        >
        <el-button link type="danger" disabled>|</el-button>
        <el-button link type="danger" @click="changeLanguage('en')" :disabled="locale === 'en'"
          >English</el-button
        >
      </div>
    </div>
    <!-- 中间 -->
    <div class="center">
      <div class="expand">
        <div class="marquee-wrap">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;
          <span style="color: #ffc61b">{{ bottomLineData.intro }}</span
          >&nbsp;&nbsp;|&nbsp;&nbsp;
          <b
            >RECOMMEND:
            <a v-for="(item, key) in bottomLineData.recommand" :key="key" :href="item.href">
              {{ item.title }}
              <span :style="'color: ' + item.color">[{{ item.sort }} {{ item.date }}]</span>
            </a>
          </b>
        </div>
      </div>
    </div>
    <!-- 右侧 -->
    <div class="right">
      <div class="text-links">
        <span>
          <div class="TWITTER_detail">
            <img :src="twitterImg" alt="" />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('TWITTER')"
            @mouseover="mouseOver('TWITTER')"
            @mouseleave="mouseLeave('TWITTER')"
            >TWITTER</el-button
          >
        </span>
        <span>
          <div class="WEIBO_detail">
            <iframe
              width="100%"
              height="520"
              class="share_self"
              frameborder="0"
              scrolling="no"
              src="https://widget.weibo.com/weiboshow/index.php?language=&width=0&height=520&fansRow=1&ptype=1&speed=0&skin=10&isTitle=1&noborder=1&isWeibo=1&isFans=1&uid=7738638501&verifier=4838f435&dpc=1"
            ></iframe>
          </div>
          <el-button link type="danger" @click="contact('WEIBO')">WEIBO</el-button>
        </span>
        <span>
          <div class="BILIBILI_detail">
            <img :src="bilibiliImg" width="220px" height="220px" alt="" />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('BILIBILI')"
            @mouseover="mouseOver('BILIBILI')"
            @mouseleave="mouseLeave('BILIBILI')"
            >BILIBILI</el-button
          >
        </span>
        <span>
          <el-button link type="danger" @click="contact('EMAIL')">E-MAIL</el-button>
        </span>
        <span>
          <div class="GITHUB_detail">
            <img :src="githubImg" alt="" />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('GITHUB')"
            @mouseover="mouseOver('GITHUB')"
            @mouseleave="mouseLeave('GITHUB')"
            >GITHUB</el-button
          >
        </span>
        <el-button link type="danger" disabled>@2018-2026 ANULUCA</el-button>
      </div>
      <el-switch
        v-model="nightMode"
        class="ml-cus"
        @Change="changeTheme()"
        style="--el-switch-on-color: #1a1a1aa8; --el-switch-off-color: #ffffff1f"
      />
      <!-- @change="changeTheme" -->
    </div>
  </div>
</template>
