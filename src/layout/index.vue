<template>
  <div class="layout-page">
    <!-- 头部 -->
    <el-header class="el-menu-layout-all">
      <div class="logo-box">
        <img :src="showLogo" />
        <div class="right clickable">
          <p>
            <span>{{ $t("name[0]") }}</span>
            <span :class="'name-center active ' + locale">{{
              $t("name[1]")
            }}</span>
            <span>{{ $t("name[2]") }}</span>
          </p>
        </div>
      </div>
      <el-menu
        :default-active="currentRouter"
        mode="horizontal"
        router
        :ellipsis="false"
      >
        <!-- @select="handleSelect" -->
        <div class="flex-grow" />
        <div class="menu-box">
          <RouterLink
            v-for="(item, index) in filterRoutes"
            :key="index"
            :to="item.path"
          >
            <el-menu-item :index="item.path" :class="item.meta.titleEn">
              {{ item.meta.titleEn }}
            </el-menu-item>
          </RouterLink>
        </div>
      </el-menu>
    </el-header>
    <!-- body -->
    <RouterView />
    <div class="fullscreen" @click="toggleFullscreen"></div>
  </div>
</template>

<script setup>
import { routes } from "@/router";
import { useRouter, useRoute } from "vue-router";
import Logo from "@/assets/img/logo.png";
import LogoDark from "@/assets/img/logo_black.png";
import { computed, onMounted, watch, ref } from "vue";
import { visualState } from "@/stores";
import { useI18n } from "vue-i18n";

const { locale } = useI18n();

watch(locale, () => {
  setTimeout(() => {
    changeTitle(true);
  }, 0);
});

const route = useRoute();
const visualStateStore = visualState();
const showLogo = computed(() => {
  return visualStateStore.theme === "dark" ? Logo : LogoDark;
});
const currentRouter = computed(() => {
  return route.path;
});
const filterRoutes = routes.filter((item) => {
  return item?.meta?.ifShow;
});

// 标题动画
const changeTitle = (close = false) => {
  const name_center_element = document.getElementsByClassName("name-center")[0];
  if (name_center_element) {
    if (close) {
      name_center_element.classList.remove("active");
    } else {
      name_center_element.classList.add("active");
    }
  }
};

// 全屏状态
const isFullscreen = ref(false);

// 切换全屏
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement
      .requestFullscreen()
      .then(() => {
        isFullscreen.value = true;
      })
      .catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err}`);
      });
  } else {
    if (document.exitFullscreen) {
      document
        .exitFullscreen()
        .then(() => {
          isFullscreen.value = false;
        })
        .catch((err) => {
          console.error(`Error attempting to exit fullscreen: ${err}`);
        });
    }
  }
};

onMounted(() => {
  setTimeout(() => {
    changeTitle(true);
  }, 0);

  // 监听全屏变化事件
  document.addEventListener("fullscreenchange", () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
});
</script>
<style lang="less" scoped src="./index.less" />