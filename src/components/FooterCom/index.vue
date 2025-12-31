<script setup lang="ts">
import "./index.less";
import { useRouter, useRoute } from "vue-router";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { visualState } from "@/stores";
import { ElLoading, ElMessage, ElMessageBox } from "element-plus";
import "element-plus/theme-chalk/index.css";
import { useI18n } from "vue-i18n";
import twitterImg from "@/assets/img/twitter_profile.png";
import bilibiliImg from "@/assets/img/bilibili_profile.png";
import githubImg from "@/assets/img/github_profile.png";
import bottomLineData from "@/data/bottomLine.js";
const weiboImg = ref(
  "https://widget.weibo.com/weiboshow/index.php?language=&width=0&height=520&fansRow=1&ptype=1&speed=0&skin=10&isTitle=1&noborder=1&isWeibo=1&isFans=1&uid=7738638501&verifier=4838f435&dpc=1"
);

const { locale } = useI18n();

const router = useRouter();
const route = useRoute();
const visualStateStore = visualState();
const fullFooter = computed(() => {
  return router.currentRoute.value.meta.fullFooter;
});
const currentRouter = computed(() => {
  return route.path;
});
const theme = ref();
const isScrollingDown = ref<boolean>(false);
let lastScrollTop = 0;

onMounted(() => {
  // 底部新闻条入场动画
  const expand_element = document.getElementsByClassName("expand")[0];
  const text_element = document.getElementsByClassName("text-links")[0];
  expand_element["style"].width = "0px";
  expand_element["style"].overflow = "hidden";
  text_element["style"].opacity = "0";
  document.getElementsByClassName(`WEIBO_detail`)[0]["style"].opacity = "0";
  setTimeout(() => {
    expand_element["style"].width = "100%";
    expand_element["style"].overflow = "hidden";
    text_element["style"].opacity = "1";
    theme.value = localStorage.getItem("theme") === "dark";
  }, 0);
  // 添加滚动事件监听器
  document.addEventListener("scroll", handleScroll, { passive: true });
});

const changeLanguage = (lang) => {
  localStorage.setItem("lang", lang);
  locale.value = lang;
};

const changeTheme = () => {
  if (currentRouter.value === "/") {
    const loadingInstance = ElLoading.service({
      fullscreen: true,
      background: "rgba(0, 0, 0, 0.2)",
      spinner: "1",
    });
    setTimeout(() => {
      const currentMode = theme.value ? "dark" : "light";
      visualStateStore.setTheme(currentMode);
    }, 150);
    setTimeout(() => {
      loadingInstance.close();
    }, 150);
  } else {
    const currentMode = theme.value ? "dark" : "light";
    visualStateStore.setTheme(currentMode);
  }
};

// 点击事件
const contact = (type: string) => {
  let url = "";
  if (type !== "EMAIL" && type !== "WEIBO") {
    if (type === "TWITTER") {
      url = "https://twitter.com/TILucario";
    } else if (type === "BILIBILI") {
      url = "https://space.bilibili.com/128735968";
    } else if (type === "GITHUB") {
      url = "https://github.com/Anuluca";
    }
    window.open(url);
  } else if (type === "EMAIL") {
    const linkNode = document.createElement("a");
    linkNode.href = "mailto:tilucario@outlook.com";
    document.body.appendChild(linkNode);
    linkNode.click();
  } else {
    // url = 'https://weibo.com/ryugamine'
    let element = document.getElementsByClassName(`WEIBO_detail`)[0];
    if (element["style"].opacity == "0") {
      element["style"].bottom = "30px";
      element["style"].opacity = "1";
    } else {
      element["style"].bottom = "-540px";
      element["style"].opacity = "0";
    }
  }
};

// 鼠标移入
const mouseOver = (type: string) => {
  let element = document.getElementsByClassName(`${type}_detail`)[0];
  element.classList.add("hover");
};

// 鼠标移出
const mouseLeave = (type: string) => {
  let element = document.getElementsByClassName(`${type}_detail`)[0];
  element.classList.remove("hover");
};

// 监听滚动事件
const handleScroll = () => {
  // 获取当前滚动高度 (兼容性处理)
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  if (scrollTop > lastScrollTop) {
    isScrollingDown.value = true;
  } else {
    isScrollingDown.value = false;
  }
  // 更新最后一次滚动位置，严禁负值 (移动端橡皮筋效果兼容)
  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
};

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <div
    :class="{
      'footer-com': true,
      // 'full-footer': fullFooter,
      'scrolling-down': isScrollingDown,
    }"
  >
    <!-- 左侧 -->
    <div class="left">
      <div class="language">
        <el-button
          link
          type="danger"
          @click="changeLanguage('zhCn')"
          :disabled="locale === 'zhCn'"
        >
          中文
        </el-button>
        <el-button link type="danger" disabled>|</el-button>
        <el-button
          link
          type="danger"
          style="margin-right: 2px"
          @click="changeLanguage('en')"
          :disabled="locale === 'en'"
        >
          En
        </el-button>
      </div>
    </div>
    <!-- 中间 -->
    <div class="center">
      <div class="expand">
        <div class="marquee-wrap">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;
          <span style="color: #ffc61b">{{ bottomLineData.intro }}</span
          >&nbsp;&nbsp;|&nbsp;&nbsp;
          <b
            >RECOMMEND:
            <a
              v-for="(item, key) in bottomLineData.recommand"
              :key="key"
              style="color: white"
              :href="item.href"
            >
              「<span
                :style="[
                  {
                    color: item.color || '#5F9DDD',
                    fontWeight: 'bold',
                  },
                ]"
                >{{ item.title }}\{{ item.sort }}</span
              >」<span style="color: #ffffff96">{{ item.date }}</span
              >&nbsp;
            </a>
          </b>
        </div>
      </div>
    </div>
    <!-- 右侧 -->
    <div class="right">
      <div class="text-links">
        <span>
          <div class="TWITTER_detail">
            <img :src="twitterImg" alt="" />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('TWITTER')"
            @mouseover="mouseOver('TWITTER')"
            @mouseleave="mouseLeave('TWITTER')"
          >
            TWITTER
          </el-button>
        </span>
        <span>
          <div class="WEIBO_detail">
            <iframe
              width="100%"
              height="520"
              class="share_self"
              frameborder="0"
              scrolling="no"
              :src="weiboImg"
            ></iframe>
          </div>
          <el-button
            link
            type="danger"
            @click="contact('WEIBO')"
            @mouseover="mouseOver('WEIBO')"
            @mouseleave="mouseLeave('WEIBO')"
          >
            WEIBO
          </el-button>
        </span>
        <span>
          <div class="BILIBILI_detail">
            <img :src="bilibiliImg" width="220px" height="220px" alt="" />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('BILIBILI')"
            @mouseover="mouseOver('BILIBILI')"
            @mouseleave="mouseLeave('BILIBILI')"
          >
            BILIBILI
          </el-button>
        </span>
        <span>
          <div class="GITHUB_detail">
            <img :src="githubImg" alt="" />
          </div>
          <el-button
            link
            type="danger"
            @click="contact('GITHUB')"
            @mouseover="mouseOver('GITHUB')"
            @mouseleave="mouseLeave('GITHUB')"
          >
            GITHUB
          </el-button>
        </span>
        <span>
          <el-button link type="danger" @click="contact('EMAIL')">
            MAIL
          </el-button>
        </span>
      </div>
      <span class="mark"> 2018-2026 ANULUCA </span>
      <el-switch
        v-model="theme"
        @change="changeTheme()"
        style="
          --el-switch-on-color: #1a1a1aa8;
          --el-switch-off-color: #ffffff1f;
        "
      />
    </div>
  </div>
</template>
