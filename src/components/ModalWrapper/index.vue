<template>
  <ElDialog
    v-model="dialogVisible"
    :show-close="false"
    :width="width"
    :close-on-click-modal="true"
    :append-to-body="appendToBody"
    :align-center="true"
    transition="crt-effect"
    class="modal-wrapper-dialog"
    :style="{
      '--modal-width': typeof width === 'number' ? `${width}px` : width,
    }"
    @closed="handleClosed"
  >
    <DiamondCloseBtn :title="closeTitle" @click="handleClose" />

    <div class="corner corner-tl" />
    <div class="corner corner-tr" />
    <div class="corner corner-bl" />
    <div class="corner corner-br" />

    <div v-if="showTacticalText" class="modal-tactical-text">
      {{ tacticalText }}
    </div>

    <div class="modal-scanlines" />

    <slot />
  </ElDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElDialog } from 'element-plus'

import DiamondCloseBtn from '@/components/DiamondCloseBtn/index.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    width?: string | number
    showTacticalText?: boolean
    tacticalText?: string
    closeTitle?: string
    appendToBody?: boolean
  }>(),
  {
    width: '1280px',
    showTacticalText: true,
    tacticalText: '[PROJECT_DETAIL]',
    closeTitle: 'Close (ESC)',
    appendToBody: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  closed: []
  opened: []
  open: []
}>()

const dialogVisible = ref(false)

watch(
  () => props.modelValue,
  (newVal) => {
    dialogVisible.value = newVal
  },
  { immediate: true }
)

watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal)
})

const handleClose = () => {
  dialogVisible.value = false
  emit('close')
}

const handleClosed = () => {
  emit('closed')
}
</script>

<style lang="less" scoped>
@red: #e23456;
@border: rgba(255, 255, 255, 0.08);

.modal-scanlines {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.015) 1px,
    transparent 1px
  );
  background-size: 100% 4px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}

.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid rgba(226, 52, 86, 0.45);
  z-index: 5;
  pointer-events: none;

  &-tl {
    top: 10px;
    left: 10px;
    border-right: 0;
    border-bottom: 0;
  }
  &-tr {
    top: 10px;
    right: 10px;
    border-left: 0;
    border-bottom: 0;
  }
  &-bl {
    bottom: 10px;
    left: 10px;
    border-right: 0;
    border-top: 0;
  }
  &-br {
    bottom: 10px;
    right: 10px;
    border-left: 0;
    border-top: 0;
  }
}

.modal-tactical-text {
  position: absolute;
  top: 6px;
  left: 30px;
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.48rem;
  color: rgba(255, 255, 255, 0.12);
  letter-spacing: 2px;
  z-index: 5;
  pointer-events: none;
}
</style>

<style lang="less">
@red: #e23456;

.modal-wrapper-dialog {
  background: rgba(11, 7, 14, 0.99) !important;
  border: 1px solid rgba(226, 52, 86, 0.35) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(226, 52, 86, 0.05) !important;

  /* 🌟 核心优化：斩断写死的上边距，改为纯净的 Flex 轴自适应居中 */
  margin: 0 !important;
  width: var(--modal-width, 1280px) !important;
  max-height: 90vh !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 !important;
  border-radius: 0 !important;

  /* 锁定几何中心点，确保 CRT 粒子向最中心坍缩 */
  transform-origin: center center !important;

  .el-dialog__header {
    display: none;
  }
  .el-dialog__body {
    padding: 0;
    flex: 1;
    overflow: hidden;
  }
}

/* 🌟 全局遮罩层调谐（配合居中） */
.el-overlay {
  background: rgba(4, 2, 6, 0.85) !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  display: flex;
  align-items: center; /* 垂直居中核心轴 */
  justify-content: center; /* 水平居中核心轴 */
}
.el-overlay-dialog {
  position: relative !important;
}

/* ══════════════════════════════════════
   📺 CRT 电视机复古光栅特殊动效引擎
   ══════════════════════════════════════ */

/* 1. 让外层黑色背景只做纯粹的淡入淡出 */
.crt-effect-enter-active,
.crt-effect-leave-active {
  transition: opacity 0.35s ease;
}
.crt-effect-enter-from,
.crt-effect-leave-to {
  opacity: 0;
}

/* 2. 精准定位：只让内部的对话框舱体执行 CRT 缩放与闪烁特效 */
.crt-effect-enter-active .modal-wrapper-dialog {
  animation: crtOn 0.48s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}
.crt-effect-leave-active .modal-wrapper-dialog {
  animation: crtOff 0.42s cubic-bezier(0.2, 1, 0.22, 1) forwards;
}

@keyframes crtOn {
  0% {
    transform: scale3d(0, 0.005, 1);
    filter: brightness(6) contrast(2);
    opacity: 0;
  }
  45% {
    transform: scale3d(1, 0.005, 1);
    filter: brightness(4) contrast(1.5);
    opacity: 1;
  }
  100% {
    transform: scale3d(1, 1, 1);
    filter: brightness(1) contrast(1);
    opacity: 1;
  }
}

@keyframes crtOff {
  0% {
    transform: scale3d(1, 1, 1);
    filter: brightness(1);
    opacity: 1;
  }
  55% {
    transform: scale3d(1, 0.005, 1);
    filter: brightness(4) contrast(1.5);
    opacity: 1;
  }
  100% {
    transform: scale3d(0, 0, 1);
    filter: brightness(12);
    opacity: 0;
  }
}
</style>
