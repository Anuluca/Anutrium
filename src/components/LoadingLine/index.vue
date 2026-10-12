<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{ progress: number; fading?: boolean; animate?: boolean }>(),
  { fading: false, animate: true }
)
const emit = defineEmits<{ complete: []; reveal: []; faded: [] }>()
const displayed = ref(props.animate ? 0 : props.progress)
const completing = computed(() => props.fading && displayed.value >= 100)
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
// 满宽后再通知入口退场，不能让模型在加载线仍伸展时提前入场。
watch(
  completing,
  (value) => {
    if (value) emit('complete')
  },
  { flush: 'post' }
)
const animationEnd = (event: AnimationEvent) => {
  if (
    event.target === event.currentTarget &&
    event.animationName.includes('loading-line-lifecycle')
  )
    emit('faded')
}
const animationStart = (event: AnimationEvent) => {
  if (
    event.target === event.currentTarget &&
    event.animationName.includes('loading-line-lifecycle')
  )
    emit('reveal')
}
onBeforeUnmount(() => {
  if (frame !== undefined) cancelAnimationFrame(frame)
})
</script>

<template>
  <div
    class="entry-loading-progress loading-line no-rem"
    :class="{ 'is-fading': completing }"
    :style="{ transform: `scaleX(${displayed / 100})` }"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.floor(displayed)"
    @animationend="animationEnd"
    @animationstart="animationStart"
  >
    <span class="loading-line__surface" aria-hidden="true">
      <span class="loading-line__flow" />
    </span>
    <span class="loading-line__projection" aria-hidden="true" />
  </div>
</template>

<style lang="less" scoped>
.loading-line.no-rem {
  position: absolute;
  top: var(--loading-horizon-y, 50%);
  left: 0;
  z-index: 3;
  width: 100vw;
  height: 1px;
  overflow: visible;
  opacity: 0.5;
  transform-origin: center;
  pointer-events: none;

  .loading-line__surface {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #e23456;
  }

  .loading-line__flow {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 25%,
      #fffff4 50%,
      transparent 75%
    );
    animation: loading-line-flow 1.6s linear infinite;
  }

  .loading-line__projection {
    position: absolute;
    top: 1px;
    left: 0;
    width: 100%;
    height: max(0px, calc(100dvh - var(--loading-horizon-y, 50dvh) - 1px));
    background: linear-gradient(
      to bottom,
      rgba(112, 16, 35, 0.4),
      rgba(112, 16, 35, 0.12) 55%,
      rgba(112, 16, 35, 0)
    );
    opacity: 0;
    transform: scaleY(0);
    transform-origin: top;
  }

  &.is-fading {
    opacity: 1;
    // 保留光幕到 1200ms 渐隐结束；线条独立使用原来的 600ms 渐隐。
    animation: loading-line-flash 240ms steps(1, end),
      loading-line-lifecycle 1200ms 1240ms steps(1, end) forwards;

    .loading-line__surface {
      animation: loading-line-fade 600ms 1240ms ease-out forwards;
    }

    .loading-line__flow {
      display: none;
    }
    .loading-line__projection {
      animation: loading-line-project 1s 240ms ease-out forwards,
        loading-line-fade 1200ms 1240ms ease-out forwards;
    }
  }
}
@keyframes loading-line-flow {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
@keyframes loading-line-flash {
  0%,
  50%,
  100% {
    opacity: 1;
  }
  25%,
  75% {
    opacity: 0;
  }
}
@keyframes loading-line-fade {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes loading-line-lifecycle {
  from {
    visibility: visible;
  }
  to {
    visibility: hidden;
  }
}
@keyframes loading-line-project {
  from {
    opacity: 0;
    transform: scaleY(0);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .loading-line.no-rem {
    .loading-line__flow {
      animation: none;
    }
    &.is-fading {
      animation-name: none, loading-line-lifecycle;
      .loading-line__projection {
        opacity: 1;
        transform: none;
        animation: loading-line-fade 1200ms 1240ms ease-out forwards;
      }
    }
  }
}
</style>
