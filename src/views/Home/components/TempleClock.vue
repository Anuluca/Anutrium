<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ immersive?: boolean }>(), {
  immersive: false,
})
const group = ref<HTMLElement | null>(null)
const clock = ref<HTMLElement | null>(null)
const clockScaleX = ref(1)
const clockScaleY = ref(1)
const timeHidden = ref(false)
const timePreview = ref(false)
const hideHintSuppressed = ref(false)
const toggleTime = () => {
  if (!props.immersive) return
  timeHidden.value = !timeHidden.value
  timePreview.value = false
  // 恢复时间后，保留本次悬停的时间显示，移出后再启用隐藏提示。
  hideHintSuppressed.value = !timeHidden.value
}
const leaveTime = () => {
  timePreview.value = false
  hideHintSuppressed.value = false
}
let resizeObserver: ResizeObserver | undefined
let anchorObserver: MutationObserver | undefined
let measureFrame: number | undefined
let disposed = false

const fitImmersiveClock = () => {
  measureFrame = undefined
  if (!props.immersive || !group.value || !clock.value || disposed) return
  const bounds = clock.value.getBoundingClientRect()
  const style = getComputedStyle(clock.value)
  const groupTransform = new DOMMatrixReadOnly(
    getComputedStyle(group.value).transform
  )
  const baseHeight = parseFloat(style.height) * Math.abs(groupTransform.m22)
  const baseWidth = parseFloat(style.width) * Math.abs(groupTransform.m11)
  if (!baseHeight || !baseWidth) return
  // 保留顶部模型锚点，底边上收并随视口留出 24–48px 空间。
  const bottomInset = Math.min(48, Math.max(24, window.innerHeight * 0.04))
  const verticalScale = Math.max(
    1,
    (window.innerHeight - bottomInset - bounds.top) / baseHeight
  )
  const center = (bounds.left + bounds.right) / 2
  const availableWidth = Math.max(
    1,
    2 * Math.min(center - 16, innerWidth - center - 16)
  )
  clockScaleY.value = verticalScale
  clockScaleX.value = Math.max(
    1,
    Math.min(verticalScale / 1.15, availableWidth / baseWidth)
  )
}
const scheduleClockFit = () => {
  if (disposed || !props.immersive || measureFrame !== undefined) return
  measureFrame = requestAnimationFrame(fitImmersiveClock)
}
const stopClockFit = () => {
  resizeObserver?.disconnect()
  anchorObserver?.disconnect()
  if (measureFrame !== undefined) cancelAnimationFrame(measureFrame)
  measureFrame = undefined
}
const syncClockFit = () => {
  stopClockFit()
  if (disposed || !props.immersive || !group.value || !clock.value) return
  // 普通布局由 CSS 和场景锚点定位；仅沉浸模式监听尺寸与锚点，避免逐帧空回调。
  resizeObserver?.observe(clock.value)
  const stage = group.value.parentElement
  if (stage) {
    resizeObserver?.observe(stage)
    anchorObserver?.observe(stage, {
      attributes: true,
      attributeFilter: ['style'],
    })
  }
  scheduleClockFit()
}
watch(
  () => props.immersive,
  () => {
    timeHidden.value = false
    timePreview.value = false
    hideHintSuppressed.value = false
    void nextTick(syncClockFit)
  }
)

const formatTime = () => {
  const now = new Date()
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}
const currentTime = ref(formatTime())
const displayTime = computed(() =>
  props.immersive ? currentTime.value.slice(0, 5) : currentTime.value
)
let timer: number | undefined

const updateTime = () => {
  currentTime.value = formatTime()
  // 对齐真实秒边界，避免后台暂停或计时误差导致显示落后。
  timer = window.setTimeout(updateTime, 1000 - (Date.now() % 1000))
}

onMounted(() => {
  updateTime()
  resizeObserver = new ResizeObserver(scheduleClockFit)
  anchorObserver = new MutationObserver(scheduleClockFit)
  syncClockFit()
  void document.fonts.ready.then(scheduleClockFit)
})
onBeforeUnmount(() => {
  disposed = true
  window.clearTimeout(timer)
  stopClockFit()
})
</script>

<template>
  <div ref="group" class="temple-clock-group no-rem">
    <p class="temple-clock__tagline">DRIVEN BY PASSION.</p>
    <time
      ref="clock"
      class="temple-clock no-rem"
      :class="{
        'is-immersive': props.immersive,
        'is-time-hidden': timeHidden,
        'is-time-preview': timePreview,
        'is-hide-hint-suppressed': hideHintSuppressed,
      }"
      :style="{
        '--immersive-clock-scale-x': clockScaleX,
        '--immersive-clock-scale-y': clockScaleY,
      }"
      :datetime="currentTime"
      :aria-label="displayTime"
      :role="props.immersive ? 'button' : undefined"
      :tabindex="props.immersive ? 0 : undefined"
      :aria-pressed="props.immersive ? !timeHidden : undefined"
      @click.stop="toggleTime"
      @keydown.enter.prevent="toggleTime"
      @keydown.space.prevent="toggleTime"
      @pointerenter="timePreview = timeHidden"
      @pointerleave="leaveTime"
      @focus="timePreview = timeHidden"
      @blur="timePreview = false"
    >
      <span
        v-for="(character, index) in displayTime"
        :key="index"
        class="temple-clock__character"
        :class="{ 'temple-clock__character--separator': character === ':' }"
        :style="{ '--character-index': index }"
        aria-hidden="true"
      >
        <span :class="{ 'temple-clock__colon': character === ':' }">{{
          character
        }}</span>
      </span>
    </time>
  </div>
</template>

<style lang="less" scoped>
.temple-clock-group.no-rem {
  position: absolute;
  z-index: 3;
  top: calc(var(--temple-clock-y) + 30px);
  left: calc(var(--temple-clock-x) + 4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  color: var(--page-theme-color);
  font-family: 'Anton', sans-serif;
  font-size: clamp(14px, 1.35vw, 22px);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.16em;
  line-height: 1;
  white-space: nowrap;
  transform: translateX(-50%) scaleY(1.3);
  transform-origin: center top;
  pointer-events: none;
}

.temple-clock__tagline {
  position: relative;
  left: 0.16em;
  margin: 0;
  font-size: 1.2em;
  font-weight: 400;
  letter-spacing: 0.16em;
  transform: perspective(180px) rotateX(60deg);
  transform-origin: center top;
}

// 简易入场和缓存场景返回也在挂载时播放，避免依赖父级过渡是否触发 enter。
.temple-clock-group,
.temple-clock-reveal-enter-active {
  animation: temple-clock-reveal-in 960ms ease both;

  .temple-clock__tagline {
    animation: temple-tagline-in 960ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

.temple-clock-reveal-leave-active {
  animation: temple-clock-reveal-out 480ms ease both;

  .temple-clock__tagline {
    animation: temple-tagline-out 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

@keyframes temple-clock-reveal-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes temple-clock-reveal-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes temple-tagline-in {
  from {
    transform: perspective(180px) rotateX(60deg) translateY(-18px);
  }
  to {
    transform: perspective(180px) rotateX(60deg);
  }
}

@keyframes temple-tagline-out {
  from {
    transform: perspective(180px) rotateX(60deg);
  }
  to {
    transform: perspective(180px) rotateX(60deg) translateY(-18px);
  }
}

.temple-clock.no-rem {
  display: flex;
  gap: 0.16em;
  letter-spacing: 0;
  opacity: 0.5;
  font-weight: 700;
}

.temple-clock-group.no-rem .temple-clock.no-rem {
  transform: scale(1);
  transform-origin: center top;
  transition: transform 2000ms ease, opacity 250ms ease, visibility 0s;

  &.is-immersive {
    pointer-events: auto;
    cursor: pointer;
    &.is-time-hidden {
      opacity: 0;
      &.is-time-preview {
        // 常态为 0.5，隐藏时的悬停预览取常态的一半。
        opacity: 0.25;
      }
    }
    gap: 0;
    .temple-clock__character {
      flex-basis: 0.58em;
      width: 0.58em;
    }
    .temple-clock__character--separator {
      flex-basis: 0.24em;
      width: 0.24em;
    }
    .temple-clock__colon {
      animation: temple-clock-colon-blink 4s ease-in-out infinite;
    }
    transform: scale(
      var(--immersive-clock-scale-x),
      var(--immersive-clock-scale-y)
    );
  }
}

@media (hover: hover) {
  .temple-clock-group.no-rem
    .temple-clock.is-immersive:not(.is-time-hidden):not(
      .is-hide-hint-suppressed
    ):hover {
    .temple-clock__character {
      opacity: 0;
    }
    // 保留数字占位，切换提示时不改变缩放和点击区域。
    &::before {
      content: 'HIDE';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.1em;
      text-indent: 0.1em;
      pointer-events: none;
    }
  }
}

.temple-clock__character {
  position: relative;
  flex: 0 0 0.65em;
  width: 0.65em;
  text-align: center;
  letter-spacing: 0;
  animation: temple-clock-type 1ms steps(1, end)
    calc(var(--character-index) * 80ms) both;

  // 光标随字符依次推进，当前字符的打字阶段结束后自动隐藏。
  &::after {
    content: '';
    position: absolute;
    left: 100%;
    bottom: 0;
    width: 0.55em;
    border-bottom: 0.08em solid currentColor;
    opacity: 0;
    animation: temple-clock-cursor 80ms steps(1, end)
      calc(var(--character-index) * 80ms) forwards;
  }
}

.temple-clock__character--separator {
  flex-basis: 0.3em;
  width: 0.3em;
}

@keyframes temple-clock-colon-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes temple-clock-type {
  from {
    visibility: hidden;
  }
  to {
    visibility: visible;
  }
}

@keyframes temple-clock-cursor {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .temple-clock-group.no-rem .temple-clock.no-rem {
    transition: none;

    &.is-immersive .temple-clock__colon {
      animation: none;
    }
  }
  .temple-clock-group,
  .temple-clock-reveal-enter-active,
  .temple-clock-reveal-leave-active {
    animation-duration: 1ms;

    .temple-clock__tagline {
      animation-duration: 1ms;
    }
  }

  .temple-clock__character,
  .temple-clock__character::after {
    animation: none;
  }
}
</style>
