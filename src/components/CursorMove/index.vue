<template>
  <div
    v-if="!isMobile"
    ref="cursorElement"
    class="cursor-position"
    :class="{ 'is-hidden': shouldHideCursor }"
  >
    <div class="cursor-scale" :class="{ 'is-clicked': isClicked }">
      <div class="cursor-shape" :class="{ 'is-active': isHovering }" />
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { visualState } from '@/stores'

const visualStateStore = visualState()

const isMobile = computed(() => visualStateStore.deviceType !== 'desktop')

const HIDDEN_CURSOR_CLASSNAMES = ['no-cursor', 'hide-cursor', 'cursor-none']
const INTERACTIVE_CURSOR_SELECTOR =
  'a, button, [role="button"], [data-magnetic], .is-clickable'

const cursorElement = ref(null)
const mouse = { x: 0, y: 0 }
const follower = { x: 0, y: 0 }

const isHovering = ref(false)
const isClicked = ref(false)
const shouldHideCursor = ref(false)
const isPageVisible = ref(true)

const ease = 0.1
const settleThreshold = 0.35
let animationFrameId = null
let hasPointerPosition = false
let hasPointerListeners = false

const shouldTrackCursor = computed(() => {
  return !isMobile.value
})

const shouldAnimateCursor = computed(
  () => shouldTrackCursor.value && isPageVisible.value
)

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
  hasPointerPosition = true

  shouldHideCursor.value = checkShouldHideCursor(e.target)
  startRender()
}

const onMouseDown = () => (isClicked.value = true)
const onMouseUp = () => (isClicked.value = false)

const onMouseOver = (e) => {
  if (!shouldAnimateCursor.value) return

  if (checkShouldHideCursor(e.target)) {
    return
  }

  if (e.target.closest(INTERACTIVE_CURSOR_SELECTOR)) {
    isHovering.value = true
  }
}

const onMouseOut = (e) => {
  if (!shouldAnimateCursor.value) return

  if (e.target.closest(INTERACTIVE_CURSOR_SELECTOR)) {
    isHovering.value = false
  }
}

const startRender = () => {
  if (!shouldAnimateCursor.value || animationFrameId) return
  animationFrameId = requestAnimationFrame(render)
}

const stopRender = () => {
  if (!animationFrameId) return
  cancelAnimationFrame(animationFrameId)
  animationFrameId = null
}

const render = () => {
  if (!shouldAnimateCursor.value || !hasPointerPosition) {
    stopRender()
    return
  }

  const dx = mouse.x - follower.x
  const dy = mouse.y - follower.y

  follower.x += (mouse.x - follower.x) * ease
  follower.y += (mouse.y - follower.y) * ease
  if (cursorElement.value) {
    cursorElement.value.style.transform = `translate3d(${follower.x}px, ${follower.y}px, 0)`
  }

  if (Math.abs(dx) < settleThreshold && Math.abs(dy) < settleThreshold) {
    follower.x = mouse.x
    follower.y = mouse.y
    if (cursorElement.value) {
      cursorElement.value.style.transform = `translate3d(${follower.x}px, ${follower.y}px, 0)`
    }
    stopRender()
    return
  }

  animationFrameId = requestAnimationFrame(render)
}

const handleVisibilityChange = () => {
  isPageVisible.value = document.visibilityState !== 'hidden'
  if (!isPageVisible.value) stopRender()
  else startRender()
}

const addPointerListeners = () => {
  if (hasPointerListeners) return

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mouseover', onMouseOver)
  window.addEventListener('mouseout', onMouseOut)
  hasPointerListeners = true
}

const removePointerListeners = () => {
  if (!hasPointerListeners) return

  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('mouseover', onMouseOver)
  window.removeEventListener('mouseout', onMouseOut)
  hasPointerListeners = false
  isHovering.value = false
  isClicked.value = false
  shouldHideCursor.value = false
}

const syncPointerListeners = () => {
  if (shouldTrackCursor.value) {
    addPointerListeners()
    return
  }

  removePointerListeners()
  stopRender()
}

onMounted(() => {
  handleVisibilityChange()
  syncPointerListeners()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  removePointerListeners()
  stopRender()
})

watch(shouldTrackCursor, syncPointerListeners)

watch(shouldAnimateCursor, (canAnimate) => {
  if (canAnimate) startRender()
  else stopRender()
})
</script>

<style>
@media (hover: hover) and (pointer: fine) {
  * {
    cursor: none !important;
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
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &.is-clicked {
    transform: scale(1.5);
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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
