<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const formatTime = () => {
  const now = new Date()
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}
const currentTime = ref(formatTime())
let timer: number | undefined

const updateTime = () => {
  currentTime.value = formatTime()
  // 对齐真实秒边界，避免后台暂停或计时误差导致显示落后。
  timer = window.setTimeout(updateTime, 1000 - (Date.now() % 1000))
}

onMounted(updateTime)
onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <time
    class="temple-clock no-rem"
    :datetime="currentTime"
    :aria-label="currentTime"
  >
    <span
      v-for="(character, index) in currentTime"
      :key="index"
      class="temple-clock__character"
      :style="{ '--character-index': index }"
      aria-hidden="true"
    >
      <span :class="{ 'temple-clock__colon': character === ':' }">{{
        character
      }}</span>
    </span>
  </time>
</template>

<style lang="less" scoped>
.temple-clock.no-rem {
  position: absolute;
  z-index: 3;
  top: calc(var(--temple-clock-y) + 30px);
  left: calc(var(--temple-clock-x) + 4px);
  display: flex;
  color: var(--page-theme-color);
  opacity: 0.5;
  font-family: 'Anton', sans-serif;
  font-size: clamp(14px, 1.35vw, 22px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.16em;
  line-height: 1;
  white-space: nowrap;
  transform: translateX(-50%) scaleY(1.3);
  transform-origin: center top;
  pointer-events: none;
}

.temple-clock__character {
  position: relative;
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
  .temple-clock__character,
  .temple-clock__character::after {
    animation: none;
  }
}
</style>
