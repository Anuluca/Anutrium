/* eslint-disable simple-import-sort/imports */
import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'

import App from './App.vue'
import i18n from './locales'
import { installRouterGuards, routes } from './router'
import { scrollPageTo } from './utils/pageScroll'

import 'reset-css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'lenis/dist/lenis.css'
import '@/assets/style/global.less'
import '@/assets/style/inspira.css'

const restoreScrollAfterLayout = (position: ScrollToOptions) =>
  new Promise<ScrollToOptions>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollPageTo({
          top: position.top ?? 0,
          left: position.left ?? 0,
          behavior: position.behavior,
        })
        resolve(position)
      })
    })
  })

export const createApp = ViteSSG(
  App,
  {
    base: import.meta.env.BASE_URL,
    routes,
    scrollBehavior: (_to, _from, savedPosition) => {
      return restoreScrollAfterLayout(savedPosition || { left: 0, top: 0 })
    },
  },
  ({ app, router }) => {
    app.use(i18n)
    app.use(createPinia())
    installRouterGuards(router)
  }
)
