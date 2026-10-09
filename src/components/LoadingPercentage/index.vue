<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{ progress: number; fading?: boolean; animate?: boolean }>(),
  { fading: false, animate: false }
)
const displayed = ref(props.animate ? 0 : props.progress)
const emit = defineEmits<{ faded: [] }>()
const percentage = computed(() => String(Math.floor(displayed.value)))
const padding = computed(() =>
  '0'.repeat(Math.max(0, 3 - percentage.value.length))
)
let frame: number | undefined
let lastTime = 0
const advance = (now: number) => {
  frame = undefined
  displayed.value = Math.min(
    props.progress,
    displayed.value + Math.min((now - lastTime) / 1000, 0.1) * 100
  )
  lastTime = now
  if (displayed.value < props.progress) frame = requestAnimationFrame(advance)
}
watch(
  () => props.progress,
  (value) => {
    if (!props.animate) {
      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = undefined
      displayed.value = value
    } else if (frame === undefined && value > displayed.value) {
      lastTime = performance.now()
      frame = requestAnimationFrame(advance)
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  if (frame !== undefined) cancelAnimationFrame(frame)
})
</script>

<template>
  <div
    class="entry-loading-progress no-rem"
    :class="{ 'is-fading': fading }"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.floor(displayed)"
    @animationend="emit('faded')"
  >
    <span v-if="padding" class="progress-padding">{{ padding }}</span
    ><span>{{ percentage }}%</span>
  </div>
</template>

<style lang="less" scoped>
.entry-loading-progress.no-rem {
  position: absolute;
  top: calc(50% + 14dvh + 68px);
  left: 50%;
  z-index: 3;
  color: transparent;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Narrow',
    sans-serif;
  font-size: clamp(42px, 3.5vw, 56px);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  -webkit-text-stroke: 1px #e23456;
  letter-spacing: 0;
  line-height: 1;
  opacity: 1;
  scale: 0.85 1;
  translate: -50% 0;
  transform-origin: center;
  pointer-events: none;
  &.is-fading {
    animation: entry-flash-twice-fade-out 0.6s linear forwards;
  }
  .progress-padding {
    opacity: 0.5;
  }
}
@keyframes entry-flash-twice-fade-out {
  0%,
  12%,
  20.1%,
  32%,
  40.1% {
    opacity: 1;
  }
  12.1%,
  20%,
  32.1%,
  40%,
  100% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .entry-loading-progress.no-rem.is-fading {
    opacity: 0;
    animation: none !important;
  }
}
</style>
