<template>
  <div class="layout-page" ref="layoutPage">
    <!-- 头部 -->
    <el-header class="el-menu-layout-all" :class="{ 'scrolled': isScrolled }">
      
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
      
      <!-- 桌面端菜单 -->
      <el-menu
        v-if="!isMobile"
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
      
      <!-- 移动端菜单按钮 -->
      <div v-else class="mobile-menu-icon" @click="toggleMobileMenu">
        <div class="hamburger" :class="{ active: isMobileMenuOpen }">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </el-header>
    
    <!-- 移动端菜单面板 -->
    <div v-if="isMobile && isMobileMenuOpen" class="mobile-menu-panel" @click="closeMobileMenu">
      <div class="mobile-menu-content" @click.stop>
        <div class="mobile-menu-items">
          <RouterLink
            v-for="(item, index) in filterRoutes"
            :key="index"
            :to="item.path"
            @click="closeMobileMenu"
          >
            <div 
              class="mobile-menu-item" 
              :class="{ active: currentRouter === item.path, [item.meta.titleEn]: true }"
            >
              {{ item.meta.titleEn }}
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
    
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
import { computed, onMounted, onUnmounted, watch, ref } from "vue";
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

// 新增的滚动相关引用和状态
const layoutPage = ref(null);
const isScrolled = ref(false);

const filterRoutes = routes.filter((item) => {
  return item?.meta?.ifShow;
});

// 移动端相关状态
const isMobile = ref(window.innerWidth <= 1050);
const isMobileMenuOpen = ref(false);

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

// 移动端菜单控制
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

// 监听窗口大小变化
const handleResize = () => {
  isMobile.value = window.innerWidth <= 1050;
  if (!isMobile.value) {
    isMobileMenuOpen.value = false;
  }
};

// 监听滚动事件
const handleScroll = () => {
    isScrolled.value = document.documentElement.scrollTop > 50;
};

onMounted(() => {
  setTimeout(() => {
    changeTitle(true);
  }, 0);

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
  
  // 监听全屏变化事件
  document.addEventListener("fullscreenchange", () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
  
  // 添加滚动事件监听器
    document.addEventListener('scroll', handleScroll);
});

// 清理事件监听器
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
    document.removeEventListener('scroll', handleScroll);
});
</script>
<style lang="less" scoped src="./index.less" />