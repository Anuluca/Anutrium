/* eslint-disable simple-import-sort/imports */
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import i18n from './locales'
import router from './router'

import 'reset-css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'element-plus/theme-chalk/index.css'
import '@/assets/style/global.less'

async function initApp() {
  try {
    const app = createApp(App)

    app.use(i18n)
    app.use(createPinia())
    app.use(router)

    app.mount('#app')
  } catch (error) {
    console.error('应用初始化失败:', error)

    const app = createApp(App)
    app.use(i18n)
    app.use(createPinia())
    app.use(router)
    app.mount('#app')
  }
}

initApp()
