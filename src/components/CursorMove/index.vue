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
      <div class="cursor-shape" :class="{ 'is-active': isHovering }" />
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { cursorState } from '@/stores'

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
})

const cursorStateStore = cursorState()

const HIDDEN_CURSOR_CLASSNAMES = [
  'no-cursor',
  'hide-cursor',
  'cursor-none',
  'native-cursor',
]
const INTERACTIVE_CURSOR_SELECTOR =
  'a, button, [role="button"], [data-magnetic], .is-clickable'
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

const ease = 0.1
const settleThreshold = 0.35
let animationFrameId = null
let hasPointerListeners = false
let finePointerQuery = null

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
  if (!target || !target.classList) return false

  for (const className of HIDDEN_CURSOR_CLASSNAMES) {
    if (
      target.classList.contains(className) ||
      target.closest(`.${className}`)
    ) {
      return true
    }
  }
  return false
}

const onMouseMove = (e) => {
  if (!shouldAnimateCursor.value) return

  mouse.x = e.clientX
  mouse.y = e.clientY
  const isReenteringViewport = !isPointerInside.value
  isPointerInside.value = true
  if (!hasPointerPosition.value || isReenteringViewport) {
    follower.x = mouse.x
    follower.y = mouse.y
    hasPointerPosition.value = true
    syncCursorPosition()
  }
  syncNativeCursor()

  const nextShouldHideCursor = checkShouldHideCursor(e.target)
  if (shouldHideCursor.value !== nextShouldHideCursor) {
    shouldHideCursor.value = nextShouldHideCursor
  }

  const nextIsHovering =
    !nextShouldHideCursor && !!e.target.closest?.(INTERACTIVE_CURSOR_SELECTOR)
  if (isHovering.value !== nextIsHovering) {
    isHovering.value = nextIsHovering
  }

  startRender()
}

const onPointerLeaveViewport = () => {
  isPointerInside.value = false
  isClicked.value = false
  syncNativeCursor()
}

const onWindowBlur = () => {
  isPointerInside.value = false
  syncNativeCursor()
}

const onWindowMouseOut = (event) => {
  if (event.relatedTarget || event.toElement) return
  onPointerLeaveViewport()
}

const onPointerDown = () => (isClicked.value = true)
const onPointerUp = () => (isClicked.value = false)

const syncCursorPosition = () => {
  if (!cursorElement.value) return
  cursorElement.value.style.transform = `translate3d(${follower.x}px, ${follower.y}px, 0)`
}

const startRender = () => {
  if (!shouldAnimateCursor.value || animationFrameId !== null) return
  animationFrameId = requestAnimationFrame(render)
}

const stopRender = () => {
  if (animationFrameId === null) return
  cancelAnimationFrame(animationFrameId)
  animationFrameId = null
}

const render = () => {
  if (!shouldAnimateCursor.value || !hasPointerPosition.value) {
    stopRender()
    return
  }

  const dx = mouse.x - follower.x
  const dy = mouse.y - follower.y

  follower.x += (mouse.x - follower.x) * ease
  follower.y += (mouse.y - follower.y) * ease
  syncCursorPosition()

  if (Math.abs(dx) < settleThreshold && Math.abs(dy) < settleThreshold) {
    follower.x = mouse.x
    follower.y = mouse.y
    syncCursorPosition()
    stopRender()
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

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerUp, true)
  document.documentElement.addEventListener(
    'mouseleave',
    onPointerLeaveViewport
  )
  window.addEventListener('mouseout', onWindowMouseOut)
  window.addEventListener('blur', onWindowBlur)
  hasPointerListeners = true
}

const removePointerListeners = () => {
  if (!hasPointerListeners) return

  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('pointerup', onPointerUp, true)
  window.removeEventListener('pointercancel', onPointerUp, true)
  document.documentElement.removeEventListener(
    'mouseleave',
    onPointerLeaveViewport
  )
  window.removeEventListener('mouseout', onWindowMouseOut)
  window.removeEventListener('blur', onWindowBlur)
  hasPointerListeners = false
  isHovering.value = false
  isClicked.value = false
  shouldHideCursor.value = false
  hasPointerPosition.value = false
  isPointerInside.value = false
  syncNativeCursor()
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
  syncNativeCursor()
})

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
  z-index: 9999;

  mix-blend-mode: difference;
  transition: opacity 0.2s ease;
  will-change: transform;

  &.is-hidden {
    opacity: 0;
  }
}

.cursor-scale {
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);

  &.is-clicked {
    transform: scale(1.3);
  }
}

.cursor-shape {
  width: @follower-size;
  height: @follower-size;
  margin-top: -(@follower-size / 2);
  margin-left: -(@follower-size / 2);
  background-color: #e23456;
  border-radius: 50%;
  box-shadow: 0 0 20px #ffffff61;

  transition: all 1s cubic-bezier(0.25, 1, 0.5, 1);

  &.is-active {
    width: @triangle-size;
    height: @triangle-size;
    margin-top: -(@triangle-size / 2);
    margin-left: -(@triangle-size / 2);
    border-radius: 0;

    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);

    animation: spin 2s linear infinite;
  }
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
