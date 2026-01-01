<script setup lang="ts">
import { ref, onMounted, defineEmits, computed } from "vue";
import { visualState } from "@/stores";
import Logo from "@/assets/img/logo/logo.png";
import LogoDark from "@/assets/img/logo/logo_black.png";

const emit = defineEmits(["finished"]);

const isAnimating = ref(true);
const isZooming = ref(false);
const isFadingOut = ref(false);
const visualStateStore = visualState();

// 自动切换主题 Logo
const showLogo = computed(() => {
  return visualStateStore.theme === "dark" ? Logo : LogoDark;
});

onMounted(() => {
  // 阶段 1：等待擦入动画与视觉停留

  // 阶段 2：触发巨量缩放爆发
  setTimeout(() => {
    isZooming.value = true;
    setTimeout(() => {
      emit("finished");
    }, 400);

    // 阶段 3：在爆发的中后段启动背景渐隐，确保视觉连贯
    setTimeout(() => {
      isFadingOut.value = true;

      // 阶段 4：彻底销毁组件
      setTimeout(() => {
        isAnimating.value = false;
      }, 1500);
    }, 650); // 配合 1.4s 的爆炸动画节奏
  }, 1420); // 给左至右擦入留出充足的展示时间
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isAnimating"
      class="entry-overlay"
      :class="{ 'is-component-fade': isFadingOut }"
    >
      <div class="logo-wrapper" :class="{ 'is-zoomed': isZooming }">
        <div class="blinds-container">
          <img :src="showLogo" alt="Logo" class="logo-img" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="less" scoped>
// 核心曲线：极致的蓄力爆发曲线（开始极慢，结尾极快）
@zoom-explosive: cubic-bezier(0.85, 0, 0.15, 1);
@tech-ease-out: cubic-bezier(0.29, 1, 0.22, 1);

.entry-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  pointer-events: none;
  // 背景渐隐过渡
  transition: opacity 1.5s ease-out;
  will-change: opacity;

  &.is-component-fade {
    opacity: 0;
  }
}

.logo-wrapper {
  position: relative;
  z-index: 2;
  // 居中基准
  display: flex;
  justify-content: center;
  align-items: center;
  will-change: transform, opacity, filter;

  .blinds-container {
    position: relative;
    width: 200px; // 根据实际 Logo 尺寸微调
    height: 200px;
    margin-top: -50px;
    clip-path: inset(0 100% 0 0);
    // 擦入动画：由左向右
    animation: wipe-in-left-to-right 1.4s @tech-ease-out forwards;
    animation-delay: 0.6s;

    .logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      // 增加初始位移，让擦入更有“滑入”感
      animation: logo-clarity-v2 1.2s @tech-ease-out forwards;
    }
  }

  // --- 关键：巨量爆炸动画 ---
  &.is-zoomed {
    // 弃用 transition，改用更复杂的关键帧动画来实现“蓄力”
    animation: logo-explode-smooth 2s ease-out forwards;
  }
}

// 1. 擦入动画逻辑
@keyframes wipe-in-left-to-right {
  0% {
    clip-path: inset(0 100% 0 0);
  }
  100% {
    clip-path: inset(0 0 0 0);
  }
}

// 2. Logo 状态还原逻辑
@keyframes logo-clarity-v2 {
  0% {
    transform: scale(1.1) translateX(-30px);
    opacity: 0;
    filter: blur(10px);
  }
  40% {
    opacity: 1;
  }
  100% {
    transform: scale(1) translateX(0);
    opacity: 1;
    filter: blur(0px);
  }
}

// 3. 爆炸动画逻辑：包含预备动作 (Anticipation)
@keyframes logo-explode-smooth {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  10% {
    // 【蓄力阶段】轻微缩小，增加反向动力感
    transform: scale(0.92);
    opacity: 1;
  }
  90% {
    opacity: 0;
  }
  100% {
    // 【爆发阶段】
    transform: scale(150);
    opacity: 0;
  }
}

// 如果 App.vue 的 class 是写在 html 或 body 上，请用以下方式
.light .entry-overlay {
  background-color: #ffffff;
}
</style>
