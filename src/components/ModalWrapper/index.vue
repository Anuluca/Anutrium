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
    :class="`modal-close-placement--${closePlacement}`"
    :style="{
      '--modal-width': typeof width === 'number' ? `${width}px` : width,
    }"
    @close="handleDialogClose"
    @closed="handleClosed"
  >
    <div class="modal-close-row">
      <DiamondCloseBtn :title="closeTitle" @click="requestClose" />
    </div>

    <div class="corner corner-tl" />
    <div class="corner corner-tr" />
    <div class="corner corner-bl" />
    <div class="corner corner-br" />

    <div v-if="showTacticalText" class="modal-tactical-text">
      {{ tacticalText }}
    </div>

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

import 'element-plus/es/components/dialog/style/css'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    width?: string | number
    showTacticalText?: boolean
    tacticalText?: string
    closeTitle?: string
    appendToBody?: boolean
    closePlacement?: 'outside-bottom' | 'work-detail'
  }>(),
  {
    width: '1280px',
    showTacticalText: true,
    tacticalText: '[PROJECT_DETAIL]',
    closeTitle: 'Close (ESC)',
    appendToBody: true,
    closePlacement: 'outside-bottom',
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
@red: #e23456;

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
  font-family: 'cn-custom', monospace;
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
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85) !important;

  margin: 0 !important;
  width: var(--modal-width, 1280px) !important;
  max-height: 90vh !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 !important;
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

.modal-wrapper-dialog.modal-close-placement--outside-bottom {
  margin-bottom: 56px !important;
  overflow: visible;

  .modal-close-row .diamond-close-btn {
    top: calc(100% + 14px);
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

    &.modal-close-placement--work-detail .modal-close-row {
      min-height: 52px;
      display: flex;
      flex: 0 0 52px;
      align-items: center;
      justify-content: flex-end;
      box-sizing: border-box;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(226, 52, 86, 0.18);
    }

    &.modal-close-placement--work-detail .modal-close-row .diamond-close-btn {
      position: relative;
      top: auto;
      right: auto;
      flex: 0 0 36px;
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
