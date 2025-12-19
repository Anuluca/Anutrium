import { createRouter, createWebHistory } from "vue-router";
import Home from "@/views/Home/index.vue";
import NotFound from "@/views/404/index.vue";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import i18n from "../locales"; // 导入 i18n 实例

export const routes = [
  {
    path: "/",
    name: "HOME",
    component: Home,

    meta: {
      //路由元信息
      titleEn: "HOME", //拿取当前路由的title
      titleCn: "主页", //拿取当前路由的title
      hasPic: true, //是否显示左侧图片
      ifShow: true,
      //这里边还可设置其他的状态，比如登录的标志，路由是否缓存的标志
    },
  },
  {
    path: "/work",
    name: "WORK",
    component: NotFound,
    meta: {
      titleEn: "WORK",
      titleCn: "博客",
      hasPic: false,
      ifShow: true,
    },
  },
  {
    path: "/personal",
    name: "PERSONAL",
    component: NotFound,

    meta: {
      titleEn: "PERSONAL",
      titleCn: "游戏",
      hasPic: false,
      ifShow: true,
    },
  },
  {
    path: "/tools",
    name: "TOOLS",
    component: NotFound,

    meta: {
      titleEn: "TOOLS",
      titleCn: "工具",
      hasPic: false,
      ifShow: true,
    },
  },
  // {
  //   path: '/about',
  //   name: 'ABOUT',
  //   component: NotFound,

  //   meta: {
  //     titleEn: 'ABOUT',
  //     titleCn: '关于',
  //     hasPic: false,
  //     ifShow: true
  //   }
  // },
  // 【404】404
  {
    path: "/404",
    name: "404",
    component: NotFound,
    meta: {
      titleEn: "ABOUT",
      titleCn: "关于",
      hasPic: false,
      ifShow: false,
    },
  },
];

NProgress.configure({
  easing: "ease", // 动画方式
  speed: 500, // 递增进度条的速度
  showSpinner: false, // 是否显示加载 icon
  trickleSpeed: 200, // 自动递增间隔
  minimum: 0.3, // 初始化时的最小百分比
});

const router = createRouter({
  history: createWebHistory(),
  routes,
});

//路由守卫
router.beforeEach((guard) => {
  NProgress.start(); // 进度条开始
  console.log("guard", ["/"].indexOf(guard.fullPath));

  //检查路由是否存在
  if (!router.hasRoute(guard.name)) {
    //三层不同404路由

    router.push("/404");
    return;
  }
});

router.afterEach((to, from) => {
  NProgress.done(); // 进度条结束
  console.log("En router", to.meta.titleEn);
  if (to.meta.titleEn) {
    document.title = `[${to.meta.titleEn}/${i18n.global.t(
      "name[0]"
    )}${i18n.global.t("name[2]")}`;
  }
});

export default router;
