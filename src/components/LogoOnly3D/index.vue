<template>
  <div class="scene">
    <div class="logo-artifact-stage">
      <div v-for="i in 3" :key="i" :class="['logo-layer', `layer-${i}`]">
        <Logo id="0" class="logo-element" :active="false" />
      </div>
    </div>
  </div>
</template>

<script setup>
// 按原样导入 Logo 组件
import Logo from '@/components/Logo/index.vue'
</script>

<style lang="less" scoped>
// 1. 确保 Logo 也是 PNG，不需要背景颜色，我们这里强制透明化
// 这里根据组件内部可能的 img 标签或 svg 进行样式穿透控制
:deep(.logo-element) {
  width: 100%;
  height: 100%;
  // 关键：确保 Logo 内部及其容器没有任何背景色
  background-color: transparent !important;
  display: flex;
  justify-content: center;
  align-items: center;

  img,
  svg {
    display: block;
    width: 100%;
    height: auto;
    // 基础亮度提升，适合背景
    filter: brightness(1.3);
  }
}

.scene {
  // 保持外部放大布局
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  // overflow: hidden;
  // 确保场景本身也是透明的，防止充当背景时遮挡其他内容
  background: transparent;
}

.logo-artifact-stage {
  position: relative;
  // 对应原代码的基础尺寸
  width: 400px;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  // 背景元素不应干扰鼠标事件
  pointer-events: none;
  user-select: none;
  // 启用 3D 景深，为微量 skew 提供立体感
  perspective: 1500px;

  .logo-layer {
    position: absolute;
    // 对应原代码中的 logo 元素尺寸比例，此处用父级尺寸按比例缩放
    width: 200px;
    height: auto;
    // 避免持续动画 filter，主要让 transform/opacity 走合成层
    will-change: transform, opacity;
    mix-blend-mode: screen; // 屏幕混合，保留黑色，让彩色色散层完美融合
  }

  // 第一层：基底重构层 (慢速呼吸与微量偏移)
  .layer-1 {
    z-index: 2;
    opacity: 0.7;
    filter: blur(1.2px) drop-shadow(0 28px 32px rgba(0, 0, 0, 0.12));
    animation: baseFloat 18s infinite ease-in-out;
  }

  // 第二层：混沌青色色散层 (快速偏移与斜切)
  .layer-2 {
    z-index: 1;
    opacity: 0.3;
    filter: drop-shadow(0 0 14px rgba(0, 255, 255, 0.34));
    animation: artifactCyan 12s infinite alternate-reverse
      cubic-bezier(0.68, -0.55, 0.27, 1.55);
  }

  // 第三层：混沌品红色散层 (反向时差偏移)
  .layer-3 {
    z-index: 1;
    opacity: 0.3;
    filter: drop-shadow(0 0 14px #e2345680);
    animation: artifactMagenta 12s infinite alternate
      cubic-bezier(0.68, -0.55, 0.27, 1.55);
  }
}

/* --- 高级感核心动画：混沌重构风格 --- */

// 主体层慢速呼吸与旋转
@keyframes baseFloat {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg) scale(1);
    opacity: 0.7;
  }
  50% {
    // 缓慢上浮、轻微旋转和放大
    transform: translateY(-20px) rotate(3deg) scale(1.05);
    opacity: 0.9;
  }
}

// 青色色散：横向撕裂抖动 (Glitch-style Displacement)
@keyframes artifactCyan {
  0% {
    transform: translate(0, 0) skew(0deg);
    opacity: 0.3;
  }
  15% {
    transform: translate(-10px, 3px) skew(-2deg);
  }
  20% {
    transform: translate(-30px, -5px) skew(2deg);
    opacity: 0.5;
  }
  25% {
    transform: translate(0, 0) skew(0deg);
    opacity: 0.3;
  }
  60% {
    transform: translate(-15px, 0) skew(1deg);
  }
  100% {
    transform: translate(0, 0) skew(0deg);
  }
}

// 品红色散：反向撕裂抖动 (Glitch-style Displacement)
@keyframes artifactMagenta {
  0% {
    transform: translate(0, 0) skew(0deg);
    opacity: 0.3;
  }
  18% {
    transform: translate(10px, -3px) skew(2deg);
  }
  22% {
    transform: translate(50px, 5px) skew(-2deg);
    opacity: 0.8;
  }
  28% {
    transform: translate(0, 0) skew(0deg);
    opacity: 0.3;
  }
  65% {
    transform: translate(15px, 0) skew(-1deg);
  }
  100% {
    transform: translate(0, 0) skew(0deg);
  }
}
</style>
