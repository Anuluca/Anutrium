<template>
  <ElDialog
    v-model="dialogVisible"
    :show-close="false"
    :width="width"
    :close-on-click-modal="true"
    :append-to-body="appendToBody"
    :align-center="true"
    :lock-scroll="false"
    transition="crt-effect"
    class="modal-wrapper-dialog no-rem"
    :class="{ 'modal-wrapper-dialog--flush-desktop': flushDesktop }"
    :style="{
      '--modal-width': typeof width === 'number' ? `${width}px` : width,
      '--modal-theme-color': themeColor || 'var(--page-theme-color, #e23456)',
    }"
    @close="handleDialogClose"
    @closed="handleClosed"
  >
    <div class="modal-close-row">
      <DiamondCloseBtn :title="closeTitle" @click="requestClose" />
    </div>

    <div v-if="title" class="modal-external-title" aria-hidden="true">
      <span>{{ title }}</span>
    </div>

    <div class="corner corner-tl" />
    <div class="corner corner-tr" />
    <div class="corner corner-bl" />
    <div class="corner corner-br" />

    <div class="modal-scanlines" />

    <div class="modal-scroll-region" data-lenis-nested-scroll>
      <slot />
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElDialog } from 'element-plus'

import DiamondCloseBtn from '@/components/DiamondCloseBtn/index.vue'
import { useOverlayScrollLock } from '@/composables/useOverlayScrollLock'

import 'element-plus/theme-chalk/dark/css-vars.css'

import 'element-plus/es/components/dialog/style/css'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    width?: string | number
    themeColor?: string
    title?: string
    closeTitle?: string
    appendToBody?: boolean
    flushDesktop?: boolean
  }>(),
  {
    width: '1280px',
    closeTitle: 'Close (ESC)',
    appendToBody: true,
    flushDesktop: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  closed: []
}>()

const dialogVisible = ref(false)

watch(
  () => props.modelValue,
  (newVal) => {
    dialogVisible.value = newVal
  },
  { immediate: true }
)

watch(
  dialogVisible,
  (newVal) => {
    emit('update:modelValue', newVal)
  },
  { immediate: true }
)

useOverlayScrollLock('modal-wrapper', () => dialogVisible.value)

const requestClose = () => {
  dialogVisible.value = false
}

const handleDialogClose = () => {
  emit('close')
}

const handleClosed = () => {
  emit('closed')
}
</script>

<style lang="less" scoped>
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

.modal-external-title {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 5;
  color: var(--modal-accent, var(--page-theme-color, #e23456));
  font-family: 'UnboundedSans', sans-serif;
  font-size: 0.96rem;
  font-weight: 400;
  letter-spacing: 1px;
  line-height: 1;
  opacity: 0.2;
  transform: translateX(-50%);
  pointer-events: none;

  span {
    display: block;
  }
}

.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid
    color-mix(
      in srgb,
      var(--modal-accent, var(--page-theme-color, #e23456)) 45%,
      transparent
    );
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
</style>

<style lang="less">
.modal-wrapper-dialog {
  --modal-accent: var(--modal-theme-color, var(--page-theme-color, #e23456));

  background: #0f0d11 !important;
  border: 1px solid color-mix(in srgb, var(--modal-accent) 35%, transparent) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85) !important;

  margin: 0 0 60px !important;
  width: var(--modal-width, 1280px) !important;
  max-height: 90vh !important;
  display: flex;
  flex-direction: column;
  overflow: visible;
  padding: 10px !important;
  border-radius: 0 !important;

  transform-origin: center center !important;

  .el-dialog__header {
    display: none;
  }
  .el-dialog__body {
    display: flex;
    min-height: 0;
    flex-direction: column;
    padding: 0;
    flex: 1 1 auto;
    overflow: visible;
  }
}

.modal-scroll-region {
  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: auto;
  overscroll-behavior: contain;
}

.modal-wrapper-dialog {
  .modal-close-row .diamond-close-btn {
    top: calc(100% + 30px);
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }
}

.modal-close-row {
  display: contents;
}

.modal-wrapper-dialog .modal-aside,
.modal-wrapper-dialog .modal-gallery {
  overscroll-behavior: contain;
}

@media (min-width: 769px) {
  .modal-wrapper-dialog--flush-desktop {
    padding: 0 !important;
  }
}

@media (max-width: 768px) {
  .modal-wrapper-dialog.no-rem {
    width: calc(100vw - 20px) !important;
    height: calc(100dvh - 192px);
    max-height: calc(100dvh - 192px) !important;

    .el-dialog__body {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
  }
}

.el-overlay {
  background: rgba(4, 2, 6, 0.85) !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}
.el-overlay-dialog {
  position: fixed !important;
  inset: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
