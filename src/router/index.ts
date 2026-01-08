import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'

import NotFound from '@/views/404/index.vue'
import Tools from '@/views/Craft/index.vue'
import Home from '@/views/Home/index.vue'

import i18n from '../locales' // 导入 i18n 实例

import 'nprogress/nprogress.css'

export const routes = [
  {
    path: '/',
    name: 'HOME',
    component: Home,

    meta: {
      //路由元信息
      titleEn: 'HOME', //拿取当前路由的title
      titleCn: '主页', //拿取当前路由的title
      fullFooter: false,
      ifShow: true,
      //这里边还可设置其他的状态，比如登录的标志，路由是否缓存的标志
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
    component: NotFound,

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

//路由守卫
router.beforeEach((guard) => {
  NProgress.start() // 进度条开始
  console.log('guard', ['/'].indexOf(guard.fullPath))

  //检查路由是否存在
  if (!router.hasRoute(guard.name)) {
    //三层不同404路由

    router.push('/404')
    return
  }
})

router.afterEach((to) => {
  NProgress.done() // 进度条结束
  console.log('En router', to.meta.titleEn)
  if (to.meta.titleEn) {
    document.title = `[${to.meta.titleEn}/${i18n.global.t(
      'name[0]'
    )}${i18n.global.t('name[2]')}]`
  }

  // 重置页面滚动位置到顶部
  setTimeout(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth', // 平滑滚动到顶部
    })
  }, 100) // 延迟一下，确保页面已经渲染
})

export default router
