<template>
  <div
    v-if="shouldTrackCursor"
    ref="cursorElement"
    class="cursor-position"
    :class="{
      'is-hidden': shouldHideCursor || !hasPointerPosition || !isPointerInside,
      'is-loading': isLoading,
    }"
  >
    <div class="cursor-scale" :class="{ 'is-clicked': isClicked }">
      <div class="cursor-motion">
        <div
          class="cursor-shape"
          :class="{
            'is-active':
              isHovering ||
              (!shouldHideCursor && cursorStateStore.isInteractive),
          }"
        >
          <svg class="cursor-body" viewBox="-24 -24 48 48" aria-hidden="true">
            <circle cx="0" cy="0" r="12" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { cursorState } from '@/stores'
import { subscribePointerSamples } from '@/utils/pointerSamples'

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
})

const cursorStateStore = cursorState()

const HIDDEN_CURSOR_SELECTOR =
  '.no-cursor, .hide-cursor, .cursor-none, .native-cursor'
const INTERACTIVE_CURSOR_SELECTOR =
  'a, button, [role="button"], [data-magnetic], .is-clickable, .el-image-viewer__close, .el-image-viewer__prev, .el-image-viewer__next'
const FINE_POINTER_MEDIA = '(hover: hover) and (pointer: fine)'

const cursorElement = ref(null)
const mouse = { x: 0, y: 0 }
const follower = { x: 0, y: 0 }

const isHovering = ref(false)
const isClicked = ref(false)
const shouldHideCursor = ref(false)
const isPageVisible = ref(true)
const hasPointerPosition = ref(false)
const hasFinePointer = ref(false)
const isPointerInside = ref(false)

// 以 60Hz 下每帧追赶 30% 为基准，按时间衰减统一不同刷新率的惯性感受。
const referenceFrameDuration = 1000 / 60
const referenceEase = 0.3
const settleThreshold = 0.35
let animationFrameId = null
let lastFrameTime = null
let hasPointerListeners = false
let unsubscribePointerSamples = null
let finePointerQuery = null
let latestPointerX = 0
let latestPointerY = 0
let hasPendingPointerMove = false
let shouldSnapToPointer = true

const shouldTrackCursor = computed(() => {
  return props.enabled && hasFinePointer.value
})
const isLoading = computed(() => cursorStateStore.isLoading)

const shouldAnimateCursor = computed(
  () => shouldTrackCursor.value && isPageVisible.value
)
const isCustomCursorReady = computed(
  () =>
    shouldTrackCursor.value && hasPointerPosition.value && isPointerInside.value
)

const syncNativeCursor = () => {
  document.documentElement.classList.toggle(
    'custom-cursor-enabled',
    isCustomCursorReady.value
  )
}

const checkShouldHideCursor = (target) => {
  return target instanceof Element && !!target.closest(HIDDEN_CURSOR_SELECTOR)
}

const syncCursorTarget = (target) => {
  const nextShouldHideCursor = checkShouldHideCursor(target)
  if (shouldHideCursor.value !== nextShouldHideCursor) {
    shouldHideCursor.value = nextShouldHideCursor
  }

  const nextIsHovering =
    !nextShouldHideCursor &&
    target instanceof Element &&
    !!target.closest(INTERACTIVE_CURSOR_SELECTOR)
  if (isHovering.value !== nextIsHovering) {
    isHovering.value = nextIsHovering
  }
}

const onPointerMove = (event) => {
  if (!shouldAnimateCursor.value) return

  latestPointerX = event.clientX
  latestPointerY = event.clientY
  hasPendingPointerMove = true
  startRender()
}

const onPointerOver = (event) => {
  if (!shouldAnimateCursor.value) return
  if (!isPointerInside.value) isPointerInside.value = true
  syncCursorTarget(event.target)
}

const onPointerOut = (event) => {
  if (!event.relatedTarget) {
    onPointerLeaveViewport()
    return
  }
  syncCursorTarget(event.relatedTarget)
}

const onPointerLeaveViewport = () => {
  hasPendingPointerMove = false
  shouldSnapToPointer = true
  isPointerInside.value = false
  isClicked.value = false
  stopRender()
}

const onWindowBlur = () => {
  isPointerInside.value = false
  hasPendingPointerMove = false
  shouldSnapToPointer = true
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
    mouse.x = latestPointerX
    mouse.y = latestPointerY
    hasPendingPointerMove = false
    isPointerInside.value = true

    if (shouldSnap) {
      follower.x = mouse.x
      follower.y = mouse.y
      hasPointerPosition.value = true
      shouldSnapToPointer = false
      syncCursorPosition()
    }
  }

  const dx = mouse.x - follower.x
  const dy = mouse.y - follower.y

  const ease = 1 - Math.pow(1 - referenceEase, elapsed / referenceFrameDuration)
  const moveX = dx * ease
  const moveY = dy * ease
  follower.x += moveX
  follower.y += moveY
  syncCursorPosition()

  if (Math.abs(dx) < settleThreshold && Math.abs(dy) < settleThreshold) {
    follower.x = mouse.x
    follower.y = mouse.y
    syncCursorPosition()
    lastFrameTime = null
    return
  }

  animationFrameId = requestAnimationFrame(render)
}

const handleVisibilityChange = () => {
  isPageVisible.value = document.visibilityState !== 'hidden'
  if (!isPageVisible.value) {
    onPointerLeaveViewport()
    stopRender()
    return
  }

  startRender()
}

const addPointerListeners = () => {
  if (hasPointerListeners) return

  unsubscribePointerSamples = subscribePointerSamples(onPointerMove)
  window.addEventListener('pointerover', onPointerOver, { passive: true })
  window.addEventListener('pointerout', onPointerOut, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerUp, true)
  document.documentElement.addEventListener(
    'mouseleave',
    onPointerLeaveViewport
  )
  window.addEventListener('blur', onWindowBlur)
  hasPointerListeners = true
}

const removePointerListeners = () => {
  if (!hasPointerListeners) return

  unsubscribePointerSamples?.()
  unsubscribePointerSamples = null
  window.removeEventListener('pointerover', onPointerOver)
  window.removeEventListener('pointerout', onPointerOut)
  window.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('pointerup', onPointerUp, true)
  window.removeEventListener('pointercancel', onPointerUp, true)
  document.documentElement.removeEventListener(
    'mouseleave',
    onPointerLeaveViewport
  )
  window.removeEventListener('blur', onWindowBlur)
  hasPointerListeners = false
  isHovering.value = false
  isClicked.value = false
  shouldHideCursor.value = false
  hasPointerPosition.value = false
  isPointerInside.value = false
  hasPendingPointerMove = false
  shouldSnapToPointer = true
}

const syncPointerListeners = () => {
  if (shouldTrackCursor.value) {
    addPointerListeners()
    return
  }

  removePointerListeners()
  stopRender()
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
  finePointerQuery?.removeEventListener('change', syncFinePointer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  removePointerListeners()
  stopRender()
  document.documentElement.classList.remove('custom-cursor-enabled')
})

watch(shouldTrackCursor, () => {
  syncPointerListeners()
})

watch(isCustomCursorReady, syncNativeCursor, { flush: 'sync' })

watch(shouldAnimateCursor, (canAnimate) => {
  if (canAnimate) startRender()
  else stopRender()
})
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

  transition: opacity 0.2s ease;
  will-change: transform;

  &.is-hidden {
    opacity: 0;
  }
}

.cursor-scale {
  position: relative;
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

.cursor-motion {
  display: flow-root;
  width: 0;
  height: 0;
  transform-origin: 0 0;
}

.cursor-shape {
  position: relative;
  width: @follower-size;
  height: @follower-size;
  margin-top: -(@follower-size / 2);
  margin-left: -(@follower-size / 2);
  background-color: transparent;
  border-radius: 50%;
  clip-path: none;

  transition: all 1s cubic-bezier(0.25, 1, 0.5, 1);

  &.is-active {
    width: @triangle-size;
    height: @triangle-size;
    margin-top: -(@triangle-size / 2);
    margin-left: -(@triangle-size / 2);
    border-radius: 0;
    background-color: var(--page-theme-color, #e23456);

    .cursor-body {
      opacity: 0;
    }

    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);

    animation: spin 2s linear infinite;
  }
}

.cursor-body {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  overflow: visible;
  fill: var(--page-theme-color, #e23456);
  transition: opacity 0.2s ease;
}

.cursor-position.is-loading {
  .cursor-scale {
    transform: none;
    animation: cursor-loading-scale 1.2s ease-in-out infinite;
  }

  .cursor-shape,
  .cursor-shape.is-active {
    width: @follower-size;
    height: @follower-size;
    margin-top: -(@follower-size / 2);
    margin-left: -(@follower-size / 2);
    border-radius: 50%;
    clip-path: none;
    background-color: transparent;

    .cursor-body {
      opacity: 1;
    }

    opacity: 0.5;
    transition: none;
    animation: cursor-loading-opacity 1.2s ease-in-out infinite;
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
