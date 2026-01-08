/* eslint-disable simple-import-sort/imports */
import { createApp } from 'vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createPinia } from 'pinia'

import { loadAllFonts, showPageContent } from './utils/fontLoader'
import App from './App.vue'
import i18n from './locales'
import router from './router'

import 'reset-css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'element-plus/theme-chalk/index.css'
import '@/assets/style/global.less'

// 设置根字体大小
function setRootFontSize() {
  const deviceWidth = document.documentElement.clientWidth
  const deviceHeight = document.documentElement.clientHeight
  const aspectRatio = deviceWidth / deviceHeight

  let rootFontSize = null

  if (aspectRatio <= 2 / 3) {
    // 长宽比大于等于3:2，认为是移动端
    rootFontSize = (deviceWidth / 375) * 14
  } else {
    // 长宽比小于3:2，认为是桌面端
    rootFontSize = (deviceWidth / 375) * 4.9
  }
  document.documentElement.style.fontSize = rootFontSize + 'px'
}

// 初始化和监听窗口变化
setRootFontSize()
window.addEventListener('resize', setRootFontSize)
// 等待字体加载完成后再初始化应用
async function initApp() {
  try {
    // 等待字体加载完成
    await loadAllFonts()

    // 创建 Vue 应用实例
    const app = createApp(App)

    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(key, component)
    }

    app.use(i18n)
    app.use(createPinia())
    app.use(router)

    app.mount('#app')

    // 显示页面内容
    showPageContent()
  } catch (error) {
    console.error('应用初始化失败:', error)
    // 即使字体加载失败也显示页面，保证基本可用性
    showPageContent()

    const app = createApp(App)
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(key, component)
    }
    app.use(i18n)
    app.use(createPinia())
    app.use(router)
    app.mount('#app')
  }
}

// 启动应用
initApp()
