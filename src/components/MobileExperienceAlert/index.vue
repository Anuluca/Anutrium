<template>
  <div class="mobile-experience-alert no-rem">
    <ElAlert
      title="使用电脑访问以获得最佳体验"
      type="error"
      :closable="true"
      :show-icon="true"
      close-text="别说了！"
    >
      <template #icon>
        <InfoFilled />
      </template>
    </ElAlert>
  </div>
</template>

<script setup lang="ts">
import { InfoFilled } from '@element-plus/icons-vue'
import { ElAlert } from 'element-plus'

import 'element-plus/es/components/alert/style/css'
</script>

<style scoped lang="less">
.mobile-experience-alert {
  display: none;
}

@media screen and (max-aspect-ratio: @ratio-threshold),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .mobile-experience-alert.no-rem {
    position: fixed;
    right: auto;
    bottom: calc(env(safe-area-inset-bottom) + 112px);
    left: 50%;
    z-index: 10000;
    display: block;
    width: max-content;
    max-width: calc(100vw - 24px);
    pointer-events: none;
    transform: translateX(-50%);

    :deep(.el-alert) {
      width: max-content;
      max-width: 100%;
      padding-right: 6rem;
      background: rgb(15 13 17 / 60%) !important;
      box-shadow: 0 18px 52px 10px rgb(0 0 0 / 74%);
      pointer-events: auto;
      transform-origin: center;
      animation: mobileExperienceAlertCrtOn 0.58s cubic-bezier(0.19, 1, 0.22, 1)
        both;
    }

    :deep(.el-alert__icon) {
      width: 1.22rem;
      font-size: 1.22rem;
    }

    :deep(.el-alert__title) {
      font-size: 1.08rem;
    }

    :deep(.el-alert__close-btn.is-customed) {
      top: 50%;
      right: 1rem;
      color: #71cb7d !important;
      background: transparent;
      font-family: 'alibaba-puhuiti', sans-serif;
      font-size: 0.9rem;
      font-weight: 700;
      line-height: 1.2;
      transform: translateY(-50%);

      &:hover,
      &:focus-visible {
        color: #91e59c !important;
        background: transparent;
        transform: translateY(-50%);
      }
    }

    :deep(.el-alert::after) {
      position: absolute;
      inset: 0;
      z-index: 3;
      content: '';
      background: #fff;
      opacity: 0;
      mix-blend-mode: screen;
      pointer-events: none;
      animation: mobileExperienceAlertCrtFlashOn 0.58s linear both;
    }

    :deep(.el-alert-fade-leave-active) {
      transform-origin: center;
      animation: mobileExperienceAlertCrtOff 0.46s cubic-bezier(0.2, 1, 0.22, 1)
        forwards !important;

      &::after {
        animation: mobileExperienceAlertCrtFlashOff 0.46s linear forwards;
      }
    }
  }
}

@keyframes mobileExperienceAlertCrtOn {
  0% {
    opacity: 0;
    filter: brightness(8) contrast(2);
    transform: scale3d(0, 0.015, 1);
  }

  45% {
    opacity: 1;
    filter: brightness(4) contrast(1.5);
    transform: scale3d(1, 0.015, 1);
  }

  100% {
    opacity: 1;
    filter: brightness(1) contrast(1);
    transform: scale3d(1, 1, 1);
  }
}

@keyframes mobileExperienceAlertCrtFlashOn {
  0%,
  22%,
  48%,
  74%,
  100% {
    opacity: 0;
  }

  34% {
    opacity: 0.68;
  }

  60% {
    opacity: 0.46;
  }
}

@keyframes mobileExperienceAlertCrtOff {
  0% {
    opacity: 1;
    filter: brightness(1);
    transform: scale3d(1, 1, 1);
  }

  55% {
    opacity: 1;
    filter: brightness(4) contrast(1.5);
    transform: scale3d(1, 0.015, 1);
  }

  100% {
    opacity: 0;
    filter: brightness(10);
    transform: scale3d(0, 0, 1);
  }
}

@keyframes mobileExperienceAlertCrtFlashOff {
  0%,
  10%,
  34%,
  64%,
  100% {
    opacity: 0;
  }

  20% {
    opacity: 0.58;
  }

  48% {
    opacity: 0.72;
  }
}
</style>
