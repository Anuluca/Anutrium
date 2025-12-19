import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import i18n from './locales'
import 'reset-css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'element-plus/theme-chalk/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@/assets/style/global.less'
import { loadAllFonts, showPageContent } from './utils/fontLoader'

// 设置根字体大小
function setRootFontSize() {
  const deviceWidth = document.documentElement.clientWidth;
  let rootFontSize = null;

  if (deviceWidth <= 810) {
    rootFontSize = (deviceWidth / 375) * 10;
  } else {
    // 桌面端：固定基准值
    rootFontSize = (deviceWidth / 375) * 4.5;
  }
  document.documentElement.style.fontSize = rootFontSize + 'px';
}

// 初始化和监听窗口变化
setRootFontSize();
window.addEventListener('resize', setRootFontSize);
// 等待字体加载完成后再初始化应用
async function initApp() {
  try {
    // 等待字体加载完成
    await loadAllFonts();
    
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
    showPageContent();
  } catch (error) {
    console.error('应用初始化失败:', error)
    // 即使字体加载失败也显示页面，保证基本可用性
    showPageContent();
    
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