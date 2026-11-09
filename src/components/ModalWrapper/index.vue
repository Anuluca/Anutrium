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
    :class="[
      dialogClass,
      {
        'modal-wrapper-dialog--flush-desktop': flushDesktop,
        'modal-wrapper-dialog--work-detail': closePlacement === 'work-detail',
        'modal-wrapper-dialog--origin-motion': !!originElement,
      },
    ]"
    :style="{
      '--modal-width': typeof width === 'number' ? `${width}px` : width,
      '--modal-theme-color': themeColor || 'var(--page-theme-color, #e23456)',
    }"
    @close="handleDialogClose"
    @open="handleDialogOpen"
    @closed="handleClosed"
  >
    <slot name="background" />

    <div
      class="modal-close-row"
      :class="{ 'is-closing': !!originElement && !dialogVisible }"
    >
      <DiamondCloseBtn :title="closeTitle" @click="requestClose" />
    </div>

    <div class="corner corner-tl" aria-hidden="true" />
    <div class="corner corner-br" aria-hidden="true" />

    <div class="modal-scanlines" />

    <div v-if="$slots.header" class="modal-fixed-header">
      <slot name="header" />
    </div>

    <div
      ref="scrollRegion"
      class="modal-scroll-region"
      data-lenis-nested-scroll
    >
      <slot />
    </div>
    <PageScrollProgress
      class="modal-scroll-progress"
      embedded
      :scroll-target="scrollRegion"
      color="var(--modal-theme-color, var(--page-theme-color, #e23456))"
    />
  </ElDialog>

  <Teleport
    v-if="backgroundTitleTarget && (title || $slots.viewport)"
    :to="backgroundTitleTarget"
  >
    <slot name="viewport" />
    <OverlayBackgroundTitle
      v-if="title"
      :title="title"
      :active="dialogVisible"
      :color="themeColor"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { ElDialog } from 'element-plus'

import DiamondCloseBtn from '@/components/DiamondCloseBtn/index.vue'
import OverlayBackgroundTitle from '@/components/OverlayBackgroundTitle/index.vue'
import PageScrollProgress from '@/components/PageScrollProgress/index.vue'
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
    closePlacement?: 'external-bottom' | 'work-detail'
    originElement?: HTMLElement | null
    dialogClass?: string
  }>(),
  {
    appendToBody: true,
    closeTitle: 'Close (ESC)',
    flushDesktop: false,
    closePlacement: 'external-bottom',
    themeColor: undefined,
    title: undefined,
    width: '1280px',
    originElement: null,
    dialogClass: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  closed: []
  'origin-return': [remainingMs: number]
}>()

const dialogVisible = ref(false)
const scrollRegion = ref<HTMLElement | null>(null)
const backgroundTitleTarget = shallowRef<HTMLElement | null>(null)
let originAnimation: Animation | undefined
let originReturnFrame = 0
const animateFromOrigin = (closing = false) => {
  cancelAnimationFrame(originReturnFrame)
  originAnimation?.cancel()
  const origin = props.originElement
  const dialog = scrollRegion.value?.closest<HTMLElement>('.el-dialog')
  if (
    !origin?.isConnected ||
    !dialog ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return
  const source = origin.getBoundingClientRect()
  const target = dialog.getBoundingClientRect()
  // 动画实际宽高，避免缩放连带压小文字，回到原容器时再突然恢复字号。
  const collapsed = {
    translate: `${
      source.left + source.width / 2 - target.left - target.width / 2
    }px ${source.top + source.height / 2 - target.top - target.height / 2}px`,
    width: `${source.width}px`,
    height: `${source.height}px`,
  }
  const expanded = {
    translate: '0px 0px',
    width: `${dialog.offsetWidth}px`,
    height: `${dialog.offsetHeight}px`,
  }
  originAnimation = dialog.animate(
    closing ? [expanded, collapsed] : [collapsed, expanded],
    {
      duration: closing ? 840 : 420,
      easing: closing
        ? 'cubic-bezier(0.22, 1, 0.36, 1)'
        : 'cubic-bezier(0.3, 0, 0.25, 1)',
      fill: closing ? 'forwards' : 'none',
    }
  )
  if (closing) {
    const animation = originAnimation
    const handoff = () => {
      const elapsed = Number(animation.currentTime ?? 0)
      const bounds = dialog.getBoundingClientRect()
      const delta = Math.max(
        Math.abs(bounds.left - source.left),
        Math.abs(bounds.top - source.top),
        Math.abs(bounds.width - source.width),
        Math.abs(bounds.height - source.height)
      )
      // 几何接近原位后提前归还页面层，留出余下时间平滑交接遮挡关系。
      if (elapsed >= 640 && delta <= 8) {
        emit('origin-return', Math.max(0, 840 - elapsed))
        return
      }
      if (animation.playState === 'running')
        originReturnFrame = requestAnimationFrame(handoff)
    }
    originReturnFrame = requestAnimationFrame(handoff)
  }
}

const handleDialogOpen = async () => {
  await nextTick()
  if (dialogVisible.value) animateFromOrigin()
}
onBeforeUnmount(() => {
  cancelAnimationFrame(originReturnFrame)
  originAnimation?.cancel()
})

const getDialogElement = () =>
  scrollRegion.value?.closest<HTMLElement>('.modal-wrapper-dialog') ?? null

defineExpose({ getDialogElement })

const resolveBackgroundTitleTarget = async () => {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const dialog = getDialogElement()
  backgroundTitleTarget.value =
    dialog?.closest<HTMLElement>('.el-overlay-dialog') ?? null
}

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

watch(
  dialogVisible,
  async (visible) => {
    if (visible) await resolveBackgroundTitleTarget()
  },
  { immediate: true }
)

useOverlayScrollLock('modal-wrapper', () => dialogVisible.value)

const requestClose = () => {
  dialogVisible.value = false
}

const handleDialogClose = () => {
  // 遮罩和 ESC 先触发内部 close，需同步关闭态，按钮才能立即开始渐隐。
  if (props.originElement) dialogVisible.value = false
  animateFromOrigin(true)
  emit('close')
}

const handleClosed = () => {
  cancelAnimationFrame(originReturnFrame)
  originAnimation?.cancel()
  backgroundTitleTarget.value = null
  emit('closed')
}
</script>

<style lang="less" scoped>
@import '../../assets/style/modalFrame.less';

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
  .modal-frame-corner();

  &-tl {
    .modal-frame-corner-top-left();
  }
  &-br {
    .modal-frame-corner-bottom-right();
  }
}
</style>

<style lang="less">
// 盒子外壳只做几何展开，电视机动画由盒内的封面和图片列表承担。
.crt-effect-enter-active .el-dialog.modal-wrapper-dialog--origin-motion,
.crt-effect-leave-active .el-dialog.modal-wrapper-dialog--origin-motion {
  animation: none !important;
  &::after {
    animation: none;
  }
}
.crt-effect-enter-from:has(.modal-wrapper-dialog--origin-motion),
.crt-effect-leave-to:has(.modal-wrapper-dialog--origin-motion) {
  opacity: 1;
  background-color: transparent !important;
}
.crt-effect-enter-active:has(.modal-wrapper-dialog--origin-motion),
.crt-effect-leave-active:has(.modal-wrapper-dialog--origin-motion) {
  transition-property: background-color;
}
.crt-effect-enter-active:has(.modal-wrapper-dialog--origin-motion) {
  transition-duration: 420ms;
}
.crt-effect-leave-active:has(.modal-wrapper-dialog--origin-motion) {
  transition-duration: 840ms;
}
.modal-wrapper-dialog--origin-motion
  .modal-close-row.is-closing
  .diamond-close-btn {
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease;
}
</style>

<style lang="less">
@import '../../assets/style/modalFrame.less';

.modal-wrapper-dialog.no-rem {
  .modal-frame-variables();
}

.modal-wrapper-dialog {
  --modal-accent: var(--modal-theme-color, var(--page-theme-color, #e23456));

  position: relative;
  z-index: 1;
  background: #050505 !important;
  color: var(--text-color);
  border: var(--modal-border-width) solid var(--modal-border-color) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85) !important;

  margin: 0 0 60px !important;
  width: var(--modal-width, 1280px);
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
    color: inherit;
    display: flex;
    min-height: 0;
    flex-direction: column;
    padding: 0;
    flex: 1 1 auto;
    overflow: visible;
  }
}

.modal-wrapper-dialog:not(.modal-wrapper-dialog--origin-motion) {
  width: var(--modal-width, 1280px) !important;
}

.modal-fixed-header {
  flex: 0 0 auto;
  min-width: 0;
}

.modal-scroll-region {
  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
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

.modal-wrapper-dialog--work-detail {
  .modal-close-row .diamond-close-btn {
    top: 14px;
    right: 14px;
    left: auto;
    transform: none;
  }
  @media (max-width: 768px) {
    .modal-close-row {
      display: flex;
      flex: 0 0 auto;
      justify-content: flex-end;
      margin-bottom: 8px;
    }
    .modal-close-row .diamond-close-btn {
      position: relative;
      top: auto;
      right: auto;
    }
  }
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
    width: calc(100vw - 20px);
    height: calc(100dvh - 192px);
    max-height: calc(100dvh - 192px) !important;

    .el-dialog__body {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
  }
  .modal-wrapper-dialog.no-rem:not(.modal-wrapper-dialog--origin-motion) {
    width: calc(100vw - 20px) !important;
  }
}

.el-overlay {
  background: rgba(4, 4, 4, 0.85) !important;
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
