import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'

import NotFound from '@/views/404/index.vue'
import Tools from '@/views/Craft/index.vue'
import Home from '@/views/Home/index.vue'
import About from '@/views/About/index.vue'

import i18n from '../locales' // 导入 i18n 实例

import 'nprogress/nprogress.css'

// 路由配置常量
const ROUTE_CONFIG = {
  DEFAULT_PATH: '/',
  NOT_FOUND_PATH: '/404',
  TITLE_TEMPLATE: '[%s/%s%s]',
} as const

// 定义路由类型
interface RouteMeta {
  titleEn: string
  titleCn: string
  fullFooter: boolean
  ifShow: boolean
}

// 定义路由配置接口
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
    component: Home,
    meta: {
      titleEn: 'HOME',
      titleCn: '主页',
      fullFooter: false,
      ifShow: true,
    },
  },
  {
    path: '/archieve',
    name: 'ARCHIVE',
    component: NotFound,
    meta: {
      titleEn: 'ARCHIVE',
      titleCn: '作品集',
      fullFooter: true,
      ifShow: true,
    },
  },
  {
    path: '/island',
    name: 'ISLAND',
    component: NotFound,
    meta: {
      titleEn: 'ISLAND',
      titleCn: '个人海湾',
      fullFooter: true,
      ifShow: true,
    },
  },
  {
    path: '/pokeyard',
    name: 'POKEYARD',
    component: Tools,
    meta: {
      titleEn: 'POKÉYARD',
      titleCn: '宝可后院',
      fullFooter: true,
      ifShow: true,
    },
  },
  {
    path: '/craft',
    name: 'CRAFT',
    component: Tools,
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
    component: About,
    meta: {
      titleEn: 'ABOUT',
      titleCn: '关于',
      fullFooter: false,
      ifShow: true,
    },
  },
  // 【404】404
  {
    path: '/404',
    name: '404',
    component: NotFound,
    meta: {
      titleEn: '404',
      titleCn: '404',
      fullFooter: false,
      ifShow: false,
    },
  },
]

// 配置 NProgress
NProgress.configure({
  easing: 'ease', // 动画方式
  speed: 500, // 递增进度条的速度
  showSpinner: false, // 是否显示加载 icon
  trickleSpeed: 200, // 自动递增间隔
  minimum: 0.3, // 初始化时的最小百分比
})

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to) => {
  NProgress.start() // 开始进度条

  // 检查路由是否存在
  if (!router.hasRoute(to.name)) {
    // 如果不是404页面，则跳转到404页面
    if (to.path !== ROUTE_CONFIG.NOT_FOUND_PATH) {
      return { path: ROUTE_CONFIG.NOT_FOUND_PATH }
    }
  }

  return true
})

router.afterEach((to) => {
  NProgress.done() // 结束进度条

  // 设置页面标题
  if (to.meta.titleEn) {
    const siteNamePrefix = i18n.global.t('name[0]')
    const siteNameSuffix = i18n.global.t('name[2]')

    document.title = ROUTE_CONFIG.TITLE_TEMPLATE.replace('%s', to.meta.titleEn)
      .replace('%s', siteNamePrefix)
      .replace('%s', siteNameSuffix)
  }

  // 重置页面滚动位置到顶部
  setTimeout(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth', // 平滑滚动到顶部
    })
  }, 100) // 延迟执行，确保页面已经渲染
})

export default router
