/* eslint-disable simple-import-sort/imports */
import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'

import i18n from '../locales'

import 'nprogress/nprogress.css'

const ROUTE_CONFIG = {
  DEFAULT_PATH: '/',
  NOT_FOUND_PATH: '/404',
  TITLE_TEMPLATE: '[%s/%s%s]',
} as const

interface RouteMeta {
  titleEn: string
  titleCn: string
  fullFooter: boolean
  ifShow: boolean
  noMenu?: boolean
}

interface RouteConfig {
  path: string
  name: string
  component: any
  meta: RouteMeta
}

export const routes: RouteConfig[] = [
  {
    path: ROUTE_CONFIG.DEFAULT_PATH,
    name: 'HOME',
    component: () => import('@/views/Home/index.vue'),
    meta: {
      titleEn: 'HOME',
      titleCn: '主页',
      fullFooter: false,
      ifShow: true,
    },
  },
  {
    path: '/archive',
    name: 'ARCHIVE',
    component: () => import('@/views/Archive/index.vue'),
    meta: {
      titleEn: 'ARCHIVE',
      titleCn: '作品集',
      fullFooter: true,
      ifShow: true,
    },
  },
  {
    path: '/flanerie',
    name: 'FLANERIE',
    component: () => import('@/views/Flânerie/index.vue'),
    meta: {
      titleEn: 'FLÂNERIE',
      titleCn: '旅程',
      fullFooter: true,
      ifShow: true,
    },
  },
  {
    path: '/flanerie/:vlogId',
    name: 'FLANERIE_DETAIL',
    component: () => import('@/views/Flânerie/Detail/index.vue'),
    meta: {
      titleEn: 'FLÂNERIE',
      titleCn: '旅程',
      fullFooter: true,
      ifShow: false,
      noMenu: false,
    },
  },

  {
    path: '/island',
    name: 'ISLAND',
    component: () => import('@/views/404/index.vue'),
    // component: () => import('@/views/Island/index.vue'),
    meta: {
      titleEn: 'ISLAND',
      titleCn: '个人海湾',
      fullFooter: true,
      ifShow: true,
    },
  },
  {
    path: '/craft',
    name: 'CRAFT',
    component: () => import('@/views/Craft/index.vue'),
    meta: {
      titleEn: 'CRAFT',
      titleCn: '工具',
      fullFooter: true,
      ifShow: true,
    },
  },
  {
    path: '/about',
    name: 'ABOUT',
    component: () => import('@/views/About/index.vue'),
    meta: {
      titleEn: 'ABOUT',
      titleCn: '关于',
      fullFooter: false,
      ifShow: true,
    },
  },

  {
    path: '/404',
    name: '404',
    component: () => import('@/views/404/index.vue'),
    meta: {
      titleEn: '404',
      titleCn: '404',
      fullFooter: false,
      ifShow: false,
    },
  },
  {
    path: '/colorPalette',
    name: 'COLORPALETTE',
    component: () => import('@/views/Craft/ColorPalette/index.vue'),
    meta: {
      titleEn: 'COLOR PALETTE',
      titleCn: '调色盘',
      fullFooter: true,
      ifShow: false,
      noMenu: true,
    },
  },
  {
    path: '/easeStudio',
    name: 'EASESTUDIO',
    component: () => import('@/views/Craft/EaseStudio/index.vue'),
    meta: {
      titleEn: 'EASE STUDIO',
      titleCn: '缓动工作室',
      fullFooter: true,
      ifShow: false,
      noMenu: true,
    },
  },
  {
    path: '/metronome',
    name: 'METRONOME',
    component: () => import('@/views/Craft/Metronome/index.vue'),
    meta: {
      titleEn: 'METRONOME',
      titleCn: '节拍器',
      fullFooter: true,
      ifShow: false,
      noMenu: true,
    },
  },
  {
    path: '/bounceDynamics',
    name: 'BOUNCEDYNAMICS',
    component: () => import('@/views/Craft/BounceDynamics/index.vue'),
    meta: {
      titleEn: 'BOUNCING BALL',
      titleCn: '弹力球',
      fullFooter: true,
      ifShow: false,
      noMenu: true,
    },
  },
  {
    path: '/htmlEntities',
    name: 'HTMLENTITIES',
    component: () => import('@/views/Craft/HtmlEntities/index.vue'),
    meta: {
      titleEn: 'HTML ENTITIES',
      titleCn: 'HTML常用转义字符',
      fullFooter: true,
      ifShow: false,
      noMenu: true,
    },
  },
  {
    path: '/base64Codec',
    name: 'BASE64CODEC',
    component: () => import('@/views/Craft/Base64Codec/index.vue'),
    meta: {
      titleEn: 'BASE64 CODEC',
      titleCn: 'Base64加解密',
      fullFooter: true,
      ifShow: false,
      noMenu: true,
    },
  },
  {
    path: '/imageBase64',
    name: 'IMAGEBASE64',
    component: () => import('@/views/Craft/ImageBase64/index.vue'),
    meta: {
      titleEn: 'IMAGE BASE64',
      titleCn: '图片转Base64',
      fullFooter: true,
      ifShow: false,
      noMenu: true,
    },
  },
  {
    path: '/test',
    name: 'TEST',
    component: () => import('@/views/Island/index.vue'),
    meta: {
      titleEn: 'TEST',
      titleCn: '测试',
      fullFooter: true,
      ifShow: false,
    },
  },
]

NProgress.configure({
  easing: 'ease',
  speed: 500,
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.3,
})

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  NProgress.start()

  if (!router.hasRoute(to.name)) {
    if (to.path !== ROUTE_CONFIG.NOT_FOUND_PATH) {
      return { path: ROUTE_CONFIG.NOT_FOUND_PATH }
    }
  }

  return true
})

router.afterEach((to) => {
  NProgress.done()

  if (to.meta.titleEn) {
    const vlogId =
      typeof to.params.vlogId === 'string' ? to.params.vlogId : undefined
    const vlogs = i18n.global.tm('flanerie.dynamic.vlogs') as Array<{
      id: string
      title: string
    }>
    const vlogTitle = vlogId
      ? vlogs.find((vlog) => vlog.id === vlogId)?.title
      : undefined
    const siteNamePrefix = i18n.global.t('name[0]')
    const siteNameSuffix = i18n.global.t('name[2]')

    document.title = ROUTE_CONFIG.TITLE_TEMPLATE.replace(
      '%s',
      vlogTitle || (to.meta.titleEn as string)
    )
      .replace('%s', siteNamePrefix)
      .replace('%s', siteNameSuffix)
  }

  setTimeout(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    })
  }, 100)
})

export default router
