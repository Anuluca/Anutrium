/* eslint-disable simple-import-sort/imports */
import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'

import App from './App.vue'
import i18n from './locales'
import { installRouterGuards, routes } from './router'

import 'reset-css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/assets/style/global.less'

const restoreScrollAfterLayout = (position: ScrollToOptions) =>
  new Promise<ScrollToOptions>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve(position))
    })
  })

export const createApp = ViteSSG(
  App,
  {
    base: import.meta.env.BASE_URL,
    routes,
    scrollBehavior: (_to, _from, savedPosition) => {
      if (!savedPosition) return { left: 0, top: 0 }
      return restoreScrollAfterLayout(savedPosition)
    },
  },
  ({ app, router }) => {
    app.use(i18n)
    app.use(createPinia())
    installRouterGuards(router)
  }
)
