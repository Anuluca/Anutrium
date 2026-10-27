<template>
  <div
    v-if="shouldTrackCursor"
    ref="cursorElement"
    class="cursor-position"
    :class="{
      'is-hidden':
        shouldHideCursor ||
        isCursorIdle ||
        !hasPointerPosition ||
        !isPointerInside ||
        !isPageVisible,
      'is-loading': isLoading,
    }"
  >
    <div class="cursor-scale" :class="{ 'is-clicked': isClicked }">
      <div
        class="cursor-shape"
        :class="{
          'is-active': isInteractiveCursor,
          'is-moving': isMoving && !isLoading && !isInteractiveCursor,
          'is-scrolling': isScrolling && !isLoading && !isInteractiveCursor,
        }"
      >
        <div class="cursor-size">
          <div class="cursor-body" />
          <div class="cursor-triangle">
            <div class="cursor-triangle-rotation" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { cursorState } from '@/stores'
import { useTempleNavigation } from '@/stores/templeNavigation'
import { subscribePointerSamples } from '@/utils/pointerSamples'

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
})

const cursorStateStore = cursorState()
const navigation = useTempleNavigation()

const HIDDEN_CURSOR_SELECTOR =
  '.no-cursor, .hide-cursor, .cursor-none, .native-cursor'
const INTERACTIVE_CURSOR_SELECTOR =
  'a, button, [role="button"], [data-magnetic], .is-clickable, .el-image-viewer__close, .el-image-viewer__prev, .el-image-viewer__next'
const FINE_POINTER_MEDIA = '(hover: hover) and (pointer: fine)'

const cursorElement = ref(null)
const targetPosition = { x: 0, y: 0 }
const follower = { x: 0, y: 0 }

const isHovering = ref(false)
const isClicked = ref(false)
const isMoving = ref(false)
const isScrolling = ref(false)
const shouldHideCursor = ref(false)
const isPageVisible = ref(true)
const hasPointerPosition = ref(false)
const hasFinePointer = ref(false)
const isPointerInside = ref(false)
const isCursorIdle = computed({
  get: () => cursorStateStore.isIdle,
  set: (idle) => {
    cursorStateStore.isIdle = idle
  },
})
const cursorIdleDelay = computed(() => (navigation.immersive ? 1000 : 30000))
let cursorIdleTimer = null
let lastCursorMove = 0
const clearCursorIdle = () => {
  if (cursorIdleTimer !== null) window.clearTimeout(cursorIdleTimer)
  cursorIdleTimer = null
  isCursorIdle.value = false
}
const checkCursorIdle = () => {
  const remaining = cursorIdleDelay.value - (performance.now() - lastCursorMove)
  if (remaining > 0) {
    cursorIdleTimer = window.setTimeout(checkCursorIdle, remaining)
    return
  }
  cursorIdleTimer = null
  isCursorIdle.value = true
}
const refreshCursorIdle = () => {
  if (!shouldAnimateCursor.value) {
    clearCursorIdle()
    return
  }
  isCursorIdle.value = false
  lastCursorMove = performance.now()
  // 高频移动只更新时间戳，共用一个空闲计时器。
  if (cursorIdleTimer === null)
    cursorIdleTimer = window.setTimeout(checkCursorIdle, cursorIdleDelay.value)
}

// 以 60Hz 下每帧追赶 30% 为基准，按时间衰减统一不同刷新率的惯性感受。
const referenceEase = 0.3
const followDecay = -Math.log1p(-referenceEase) / (1000 / 60)
const settleThreshold = 0.35
let animationFrameId = null
let lastFrameTime = null
let unsubscribePointerSamples = null
let finePointerQuery = null
let hasPendingPointerMove = false
let shouldSnapToPointer = true
const scrollIdleDelay = 220
let lastWheelTime = 0
let scrollIdleTimer = null
let scrollReturnAnimation = null

const cancelScrollReturn = () => {
  scrollReturnAnimation?.cancel()
  scrollReturnAnimation = null
}

const stopScrollAnimation = () => {
  cancelScrollReturn()
  if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer)
  scrollIdleTimer = null
  isScrolling.value = false
}

const checkScrollIdle = () => {
  const remaining = scrollIdleDelay - (performance.now() - lastWheelTime)
  if (remaining > 0) {
    scrollIdleTimer = window.setTimeout(checkScrollIdle, remaining)
    return
  }
  scrollIdleTimer = null
  const body = cursorElement.value?.querySelector('.cursor-body')
  if (
    body &&
    !isLoading.value &&
    !isInteractiveCursor.value &&
    body
      .getAnimations()
      .some((animation) =>
        animation.animationName?.includes('cursor-scroll-morph')
      )
  ) {
    // 仅结束时读取一次当前形态，由浏览器插值恢复，避免逐帧执行 JS。
    cancelScrollReturn()
    scrollReturnAnimation = body.animate(
      [
        { transform: getComputedStyle(body).transform },
        { transform: isMoving.value ? 'scale(1.2)' : 'scale(1)' },
      ],
      { duration: 240, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }
    )
    scrollReturnAnimation.onfinish = () => {
      scrollReturnAnimation = null
    }
  }
  isScrolling.value = false
}

const onWheel = (event) => {
  if (
    event.ctrlKey ||
    (!event.deltaX && !event.deltaY) ||
    !isCustomCursorReady.value ||
    shouldHideCursor.value
  )
    return

  refreshCursorIdle()
  // 高频滚轮只更新时间；共用一个结束计时器，不启动位置渲染或重启动画。
  lastWheelTime = performance.now()
  if (scrollIdleTimer !== null) return
  cancelScrollReturn()
  isScrolling.value = true
  scrollIdleTimer = window.setTimeout(checkScrollIdle, scrollIdleDelay)
}

const shouldTrackCursor = computed(() => {
  return props.enabled && hasFinePointer.value
})
const isLoading = computed(() => cursorStateStore.isLoading)
const isInteractiveCursor = computed(
  () =>
    isHovering.value ||
    (!shouldHideCursor.value && cursorStateStore.isInteractive)
)

const shouldAnimateCursor = computed(
  () => shouldTrackCursor.value && isPageVisible.value
)
const isCustomCursorReady = computed(
  () =>
    shouldAnimateCursor.value &&
    hasPointerPosition.value &&
    isPointerInside.value
)

const syncNativeCursor = () => {
  document.documentElement.classList.toggle(
    'custom-cursor-enabled',
    isCustomCursorReady.value
  )
}

const syncCursorTarget = (target) => {
  const element = target instanceof Element ? target : null
  shouldHideCursor.value = !!element?.closest(HIDDEN_CURSOR_SELECTOR)
  isHovering.value =
    !shouldHideCursor.value && !!element?.closest(INTERACTIVE_CURSOR_SELECTOR)
  if (shouldHideCursor.value) {
    stopScrollAnimation()
    shouldSnapToPointer = true
    stopRender()
  }
}

const onPointerMove = (event) => {
  if (!shouldAnimateCursor.value || shouldHideCursor.value) return
  if (
    hasPointerPosition.value &&
    !shouldSnapToPointer &&
    event.clientX === targetPosition.x &&
    event.clientY === targetPosition.y
  )
    return

  // 高频输入只更新最新目标；移动状态和 DOM 写入统一在下一帧处理。
  refreshCursorIdle()
  targetPosition.x = event.clientX
  targetPosition.y = event.clientY
  hasPendingPointerMove = true
  startRender()
}

const onPointerOver = (event) => {
  if (!shouldAnimateCursor.value) return
  if (!isPointerInside.value) isPointerInside.value = true
  const wasHidden = shouldHideCursor.value
  syncCursorTarget(event.target)
  if (wasHidden || shouldSnapToPointer) onPointerMove(event)
}

const onPointerOut = (event) => {
  // 元素间的切换由下一次 pointerover 统一识别，避免重复 closest 查询。
  if (!event.relatedTarget) onPointerLeaveViewport()
}

const onPointerLeaveViewport = () => {
  clearCursorIdle()
  stopScrollAnimation()
  hasPendingPointerMove = false
  shouldSnapToPointer = true
  isPointerInside.value = false
  isClicked.value = false
  stopRender()
}

const onPointerDown = () => (isClicked.value = true)
const onPointerUp = () => (isClicked.value = false)

const syncCursorPosition = () => {
  if (!cursorElement.value) return
  cursorElement.value.style.transform = `translate3d(${follower.x}px, ${follower.y}px, 0)`
}

const startRender = () => {
  if (!shouldAnimateCursor.value || animationFrameId !== null) return
  lastFrameTime = performance.now()
  animationFrameId = requestAnimationFrame(render)
}

const stopRender = () => {
  lastFrameTime = null
  isMoving.value = false
  if (animationFrameId === null) return
  cancelAnimationFrame(animationFrameId)
  animationFrameId = null
}

const render = (timestamp) => {
  animationFrameId = null
  const elapsed = Math.max(0, timestamp - (lastFrameTime ?? timestamp))
  lastFrameTime = timestamp
  if (!shouldAnimateCursor.value) {
    hasPendingPointerMove = false
    return
  }
  if (!hasPointerPosition.value && !hasPendingPointerMove) return

  if (hasPendingPointerMove) {
    const shouldSnap = shouldSnapToPointer || !hasPointerPosition.value
    hasPendingPointerMove = false
    isPointerInside.value = true

    if (shouldSnap) {
      follower.x = targetPosition.x
      follower.y = targetPosition.y
      hasPointerPosition.value = true
      shouldSnapToPointer = false
    } else {
      isMoving.value = true
    }
  }

  const dx = targetPosition.x - follower.x
  const dy = targetPosition.y - follower.y
  const isSettled =
    Math.abs(dx) < settleThreshold && Math.abs(dy) < settleThreshold

  if (isSettled) {
    isMoving.value = false
    follower.x = targetPosition.x
    follower.y = targetPosition.y
    lastFrameTime = null
  } else {
    const ease = -Math.expm1(-followDecay * elapsed)
    follower.x += dx * ease
    follower.y += dy * ease
  }

  // 初次定位、追赶和收敛共用一次写入，每帧最多修改一次位置样式。
  syncCursorPosition()
  if (!isSettled) animationFrameId = requestAnimationFrame(render)
}

const handleVisibilityChange = () => {
  isPageVisible.value = document.visibilityState !== 'hidden'
}

const addPointerListeners = () => {
  if (unsubscribePointerSamples) return

  unsubscribePointerSamples = subscribePointerSamples(onPointerMove)
  window.addEventListener('pointerover', onPointerOver, { passive: true })
  window.addEventListener('pointerout', onPointerOut, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerUp, true)
  window.addEventListener('blur', onPointerLeaveViewport)
  window.addEventListener('wheel', onWheel, { passive: true, capture: true })
}

const removePointerListeners = () => {
  stopScrollAnimation()
  if (!unsubscribePointerSamples) {
    stopRender()
    return
  }

  unsubscribePointerSamples()
  unsubscribePointerSamples = null
  window.removeEventListener('pointerover', onPointerOver)
  window.removeEventListener('pointerout', onPointerOut)
  window.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('pointerup', onPointerUp, true)
  window.removeEventListener('pointercancel', onPointerUp, true)
  window.removeEventListener('blur', onPointerLeaveViewport)
  window.removeEventListener('wheel', onWheel, true)
  isHovering.value = false
  shouldHideCursor.value = false
  hasPointerPosition.value = false
  onPointerLeaveViewport()
}

const syncPointerListeners = () => {
  if (shouldAnimateCursor.value) {
    addPointerListeners()
    return
  }

  removePointerListeners()
}

const syncFinePointer = () => {
  hasFinePointer.value = !!finePointerQuery?.matches
}

onMounted(() => {
  finePointerQuery = window.matchMedia(FINE_POINTER_MEDIA)
  syncFinePointer()
  finePointerQuery.addEventListener('change', syncFinePointer)
  handleVisibilityChange()
  syncPointerListeners()
  syncNativeCursor()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  clearCursorIdle()
  finePointerQuery?.removeEventListener('change', syncFinePointer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  removePointerListeners()
  document.documentElement.classList.remove('custom-cursor-enabled')
})

watch(isCustomCursorReady, syncNativeCursor, { flush: 'sync' })

watch(shouldAnimateCursor, syncPointerListeners)
watch([cursorIdleDelay, shouldAnimateCursor], () => {
  clearCursorIdle()
  refreshCursorIdle()
})
watch([isLoading, isInteractiveCursor], cancelScrollReturn)
</script>

<style>
@media (hover: hover) and (pointer: fine) {
  html.custom-cursor-enabled,
  html.custom-cursor-enabled * {
    cursor: none !important;
  }

  html.custom-cursor-enabled .native-cursor,
  html.custom-cursor-enabled .native-cursor * {
    cursor: default !important;
  }

  html.custom-cursor-enabled .native-cursor a,
  html.custom-cursor-enabled .native-cursor button,
  html.custom-cursor-enabled .native-cursor [role='button'] {
    cursor: pointer !important;
  }

  html.custom-cursor-enabled .native-cursor input,
  html.custom-cursor-enabled .native-cursor textarea {
    cursor: text !important;
  }
}
</style>

<style lang="less" scoped>
@follower-size: 24px;

@triangle-size: 36px;

.cursor-position {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 20000;

  // 白色差值混合按背景反相，避免主题色与同色背景相减后接近黑色。
  --cursor-inversion-color: #fff;
  mix-blend-mode: difference;
  transition: opacity 0.2s ease;
  will-change: transform;

  &.is-hidden {
    opacity: 0;
  }
}

.cursor-scale {
  position: relative;
  display: flow-root;
  width: 0;
  height: 0;
  // 按裁剪后的轮廓发光，避免箭头和三角形的光晕被 clip-path 截断。
  filter: drop-shadow(
    0 0 10px
      color-mix(in srgb, var(--page-theme-color, #e23456) 70%, transparent)
  );
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);

  &.is-clicked {
    transform: scale(1.3);
  }
}

.cursor-shape {
  position: relative;
  width: @triangle-size;
  height: @triangle-size;
  margin-top: -(@triangle-size / 2);
  margin-left: -(@triangle-size / 2);
  border-radius: 50%;

  &.is-active {
    .cursor-size {
      transform: scale(1);
    }

    .cursor-body {
      opacity: 0;
    }

    .cursor-triangle {
      opacity: 1;
    }

    .cursor-triangle-rotation {
      animation-play-state: running;
    }
  }
}

// 所有形状共用固定 36px 布局框；尺寸过渡独立于旋转和滚动变形。
.cursor-size {
  position: absolute;
  inset: 0;
  transform: scale(unit((@follower-size / @triangle-size)));
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
}

.cursor-body,
.cursor-triangle,
.cursor-triangle-rotation {
  position: absolute;
  inset: 0;
  transform-origin: center;
}

.cursor-body {
  border-radius: 50%;
  background-color: var(--cursor-inversion-color);
  transition: opacity 0.24s ease, transform 0.18s ease;
}

.cursor-triangle {
  opacity: 0;
  transition: opacity 0.24s ease;
}

// 旋转只作用于三角形，离开时暂停并保留角度，避免淡出与再次进入时跳转。
.cursor-triangle-rotation {
  background-color: var(--cursor-inversion-color);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  animation: spin 2s linear infinite paused;
}

// 圆形缩放与三角形旋转分层，避免两种 transform 相互覆盖。
.cursor-shape.is-moving .cursor-body {
  transform: scale(1.2);
}

.cursor-shape.is-scrolling .cursor-body {
  animation: cursor-scroll-morph 800ms ease-in-out infinite;
}

@keyframes cursor-scroll-morph {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.3, 0.77);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cursor-shape.is-scrolling .cursor-body {
    animation: none;
  }
}

.cursor-position.is-loading {
  .cursor-scale {
    transform: none;
    animation: cursor-loading-scale 1.2s ease-in-out infinite;
  }

  .cursor-shape,
  .cursor-shape.is-active {
    border-radius: 50%;
    clip-path: none;

    .cursor-size {
      transform: scale(unit((@follower-size / @triangle-size)));
      clip-path: none;
      transition: none;
    }

    .cursor-triangle {
      opacity: 0;
      transition: none;
    }

    .cursor-body {
      opacity: 1;
    }

    .cursor-triangle-rotation {
      animation-play-state: paused;
    }

    opacity: 0.5;
    transition: none;
    animation: cursor-loading-opacity 1.2s ease-in-out infinite;
  }
}

.cursor-position.is-hidden {
  .cursor-shape,
  .cursor-scale,
  .cursor-body,
  .cursor-triangle-rotation {
    animation-play-state: paused;
  }
}

@keyframes cursor-loading-scale {
  0%,
  50%,
  100% {
    transform: scale(0.65);
  }

  25%,
  75% {
    transform: scale(1.15);
  }
}

@keyframes cursor-loading-opacity {
  0%,
  50%,
  100% {
    opacity: 0.5;
  }

  25%,
  75% {
    opacity: 0.9;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
