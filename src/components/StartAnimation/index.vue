<script setup lang="ts">
import { ref, onMounted, defineEmits, computed } from "vue";
import { visualState } from "@/stores";
import Logo from "@/assets/img/logo/logo.png";
import LogoDark from "@/assets/img/logo/logo_black.png";

const emit = defineEmits(["finished"]);

const isAnimating = ref(true);
const logoVisible = ref(true); // 控制 Logo 自身的显示/擦除
const isLogoWipingOut = ref(false); // 触发 Logo 擦出状态
const isBarsExiting = ref(false); // 触发背景竖条移出

const visualStateStore = visualState();
const showLogo = computed(() => {
  return visualStateStore.theme === "dark" ? Logo : LogoDark;
});

// 根据屏幕尺寸生成不同数量的竖条
const bars = computed(() => {
  // 检测是否为移动端
  const isMobile = window.innerWidth < 768; // 可根据实际断点调整
  const barCount = isMobile ? 10 : 20;
  const middleIndex = barCount / 2;
  
  return Array.from({ length: barCount }, (_, i) => ({
    id: i,
    direction: i < middleIndex ? -1 : 1,
    delay: Math.abs(middleIndex - i) * 0.05 // 从中间向两侧扩散的延迟
  }));
});

onMounted(() => {
  // 1. Logo 擦入完成（约 2s ）
  
  // 2. Logo 擦出阶段：停留 0.8s 后开始擦出
  setTimeout(() => {
    isLogoWipingOut.value = true;
    
    // 3. 背景竖条移出阶段：在 Logo 擦出即将完成时启动
    setTimeout(() => {
      isBarsExiting.value = true;
      setTimeout(() => {
      emit("finished");
        
      }, 300);

      // 4. 彻底销毁组件：等待竖条移出动画完成
      setTimeout(() => {
        isAnimating.value = false;
      }, 1200);
    }, 800);
  }, 1600); 
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isAnimating" class="entry-overlay-container">
      <div class="bars-layout">
        <div
          v-for="bar in bars"
          :key="bar.id"
          class="bg-bar"
          :class="{ 'is-exit': isBarsExiting }"
          :style="{
            '--dir': bar.direction,
            '--delay': `${bar.delay}s`
          }"
        ></div>
      </div>

      <div 
        class="logo-wrapper" 
        :class="{ 'is-wiping-out': isLogoWipingOut }"
      >
        <div class="blinds-container">
          <img :src="showLogo" alt="Logo" class="logo-img" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="less" scoped>
@tech-ease: cubic-bezier(0.7, 0, 0.3, 1);
@wipe-ease: cubic-bezier(0.29, 1, 0.22, 1);

.entry-overlay-container {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  pointer-events: none;
}

// --- 背景竖条布局 ---
.bars-layout {
  position: absolute;
  inset: 0;
  display: flex;
  z-index: 1;

  .bg-bar {
    flex: 1;
    height: 100%;
    background-color: #000000c0; // 默认深色
    backdrop-filter: blur(4px);
    transition: transform 1s @tech-ease;
    will-change: transform;
    
    // 退出动画：根据 --dir 变量决定向上还是向下位移
    &.is-exit {
      // --dir 为 -1 时向上位移 100%，为 1 时向下位移 100%
      transform: translateY(calc(var(--dir) * 100%));
      transition-delay: var(--delay);
    }
  }
}

// --- Logo 动画逻辑 ---
.logo-wrapper {
  position: relative;
  z-index: 2;
  transition: opacity 0.4s;

  .blinds-container {
    width: 200px;
    height: 200px;
    margin-top: -50px;
    // 初始擦入动画
    clip-path: inset(0 100% 0 0);
    animation: logo-wipe-in 1.2s @wipe-ease forwards;
    animation-delay: 0.6s;

    .logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      animation: logo-fade-blur 1s @wipe-ease forwards;
      animation-delay: 0.6s;
    }
  }

  // Logo 擦出逻辑：改回由右侧向左侧收缩（或你指定的擦出方式）
  &.is-wiping-out {
    animation: logo-wipe-out 0.8s @tech-ease forwards !important;

    // .logo-img {
    //   animation: logo-fade-out 1s @wipe-ease forwards;
    // }
  }
}

@keyframes logo-wipe-in {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

@keyframes logo-wipe-out {
  from { width:200px; opacity: 1; }
  to {  width:0; opacity: 0; }
}

@keyframes logo-fade-blur {
  0% { opacity: 0; filter: blur(10px); transform: scale(1.1); }
  100% { opacity: 1; filter: blur(0px); transform: scale(1); }
}

@keyframes logo-fade-out {
  0% { opacity: 1; filter: blur(0px); transform: scale(1); }
  100% { opacity: 0; filter: blur(10px); transform: scale(1.1); }
}

// --- 主题适配 ---
.light .bg-bar {
  background-color: #ffffffb8;
}
</style>