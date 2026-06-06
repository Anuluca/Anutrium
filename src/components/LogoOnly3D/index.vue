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
import Logo from '@/components/Logo/index.vue'
</script>

<style lang="less" scoped>
:deep(.logo-element) {
  width: 100%;
  height: 100%;

  background-color: transparent !important;
  display: flex;
  justify-content: center;
  align-items: center;

  img,
  svg {
    display: block;
    width: 100%;
    height: auto;

    filter: brightness(1.3);
  }
}

.scene {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  background: transparent;
}

.logo-artifact-stage {
  position: relative;

  width: 400px;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;

  pointer-events: none;
  user-select: none;

  perspective: 1500px;

  .logo-layer {
    position: absolute;

    width: 200px;
    height: auto;

    will-change: transform, opacity;
    mix-blend-mode: screen;
  }

  .layer-1 {
    z-index: 2;
    opacity: 0.7;
    filter: blur(1.2px) drop-shadow(0 28px 32px rgba(0, 0, 0, 0.12));
    animation: baseFloat 18s infinite ease-in-out;
  }

  .layer-2 {
    z-index: 1;
    opacity: 0.3;
    filter: drop-shadow(0 0 14px rgba(0, 255, 255, 0.34));
    animation: artifactCyan 12s infinite alternate-reverse
      cubic-bezier(0.68, -0.55, 0.27, 1.55);
  }

  .layer-3 {
    z-index: 1;
    opacity: 0.3;
    filter: drop-shadow(0 0 14px #e2345680);
    animation: artifactMagenta 12s infinite alternate
      cubic-bezier(0.68, -0.55, 0.27, 1.55);
  }
}

@keyframes baseFloat {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-20px) rotate(3deg) scale(1.05);
    opacity: 0.9;
  }
}

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
