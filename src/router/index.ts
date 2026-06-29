/* eslint-disable simple-import-sort/imports */
import { type RouteLocationNormalizedLoaded, type Router } from 'vue-router'
import NProgress from 'nprogress'

import i18n from '../locales'

import 'nprogress/nprogress.css'

const ROUTE_CONFIG = {
  DEFAULT_PATH: '/',
  NOT_FOUND_PATH: '/404',
  SITE_URL: 'https://anutrium.com',
} as const

const PAGE_DESCRIPTIONS: Record<string, { zhCn: string; en: string }> = {
  HOME: {
    zhCn: 'Anutrium 是前端工程师 Anuluca 的个人网站，记录作品、创意工具、生活记录与设计实践。',
    en: 'Anutrium is the portfolio of frontend engineer Anuluca, featuring web projects, creative tools, travel logs, and design experiments.',
  },
  ARCHIVE: {
    zhCn: '浏览 Anuluca 的主要项目与个人项目，包括 Vue、React、TypeScript、Three.js、WebGL 与数据可视化实践。',
    en: 'Explore Anuluca’s main and personal projects across Vue, React, TypeScript, Three.js, WebGL, and data visualization.',
  },
  FLANERIE: {
    zhCn: 'Anuluca 的旅行影像、摄影与城市漫游记录。',
    en: 'Travel films, photography, and city wandering logs by Anuluca.',
  },
  CRAFT: {
    zhCn: '由 Anuluca 设计与开发的前端创意工具和交互实验。',
    en: 'Frontend utilities and interactive experiments designed and built by Anuluca.',
  },
  ABOUT: {
    zhCn: '了解前端工程师 Anuluca 的经历、技能与设计理念。',
    en: 'About Anuluca, a frontend engineer: experience, skills, and design approach.',
  },
  ISLAND: {
    zhCn: 'Anuluca 的个人内容与兴趣空间。',
    en: 'A personal space for Anuluca’s interests and collected fragments.',
  },
}

const DESCRIPTION_ROUTE_GROUPS: Record<string, keyof typeof PAGE_DESCRIPTIONS> =
  {
    FLANERIE_DETAIL: 'FLANERIE',
    COLORPALETTE: 'CRAFT',
    EASESTUDIO: 'CRAFT',
    METRONOME: 'CRAFT',
    BOUNCEDYNAMICS: 'CRAFT',
    HTMLENTITIES: 'CRAFT',
    BASE64CODEC: 'CRAFT',
    IMAGEBASE64: 'CRAFT',
  }

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

const setMetaContent = (
  selector: string,
  content: string,
  attribute = 'content'
) => {
  const element = document.head.querySelector(selector)
  if (element) element.setAttribute(attribute, content)
}

export type SeoLocale = 'zhCn' | 'en'

interface VlogSeoItem {
  id: string
  title: string
}

export const getSeoMeta = (
  to: RouteLocationNormalizedLoaded,
  locale: SeoLocale,
  vlogs: VlogSeoItem[]
) => {
  const routeName = String(to.name || 'HOME')
  const vlogId =
    typeof to.params.vlogId === 'string' ? to.params.vlogId : undefined
  const vlogTitle = vlogId
    ? vlogs.find((vlog) => vlog.id === vlogId)?.title
    : undefined
  const pageTitle = vlogTitle || String(to.meta.titleEn || 'HOME')
  const siteTitle = locale === 'en' ? 'Anutrium by Anuluca' : 'Anutrium'
  const descriptionRouteName = DESCRIPTION_ROUTE_GROUPS[routeName] || routeName
  const description =
    PAGE_DESCRIPTIONS[descriptionRouteName]?.[locale] ||
    PAGE_DESCRIPTIONS.HOME[locale]
  const canonicalUrl = `${ROUTE_CONFIG.SITE_URL}${
    to.path === '/' ? '/' : to.path.replace(/\/$/, '')
  }`

  return {
    title: `${pageTitle} | ${siteTitle}`,
    description,
    canonicalUrl,
    lang: locale === 'en' ? 'en' : 'zh-CN',
    openGraphLocale: locale === 'en' ? 'en_US' : 'zh_CN',
  }
}

export const syncSeoMeta = (to: RouteLocationNormalizedLoaded) => {
  if (typeof document === 'undefined') return

  const locale = i18n.global.locale.value === 'en' ? 'en' : 'zhCn'
  const vlogs = i18n.global.tm('flanerie.dynamic.vlogs') as VlogSeoItem[]
  const seoMeta = getSeoMeta(to, locale, vlogs)

  document.title = seoMeta.title
  document.documentElement.lang = seoMeta.lang
  setMetaContent('meta[name="description"]', seoMeta.description)
  setMetaContent('meta[property="og:title"]', seoMeta.title)
  setMetaContent('meta[property="og:description"]', seoMeta.description)
  setMetaContent('meta[property="og:url"]', seoMeta.canonicalUrl)
  setMetaContent('meta[property="og:locale"]', seoMeta.openGraphLocale)
  setMetaContent('meta[name="twitter:title"]', seoMeta.title)
  setMetaContent('meta[name="twitter:description"]', seoMeta.description)
  setMetaContent('link[rel="canonical"]', seoMeta.canonicalUrl, 'href')
}

export const installRouterGuards = (router: Router) => {
  router.beforeEach((to) => {
    if (typeof document !== 'undefined') NProgress.start()

    if (!router.hasRoute(to.name)) {
      if (to.path !== ROUTE_CONFIG.NOT_FOUND_PATH) {
        return { path: ROUTE_CONFIG.NOT_FOUND_PATH }
      }
    }

    return true
  })

  router.afterEach((to) => {
    if (typeof window === 'undefined') return

    NProgress.done()
    syncSeoMeta(to)
  })
}
