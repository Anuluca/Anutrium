<template>
  <button
    class="scroll-down-hint no-rem"
    :class="{ 'is-hidden': !isVisible }"
    :aria-hidden="!isVisible"
    :aria-label="label"
    :disabled="!isVisible"
    type="button"
    @click="emit('activate')"
  >
    <span class="scroll-down-hint__label">{{ label }}</span>
    <span class="scroll-down-hint__rail">
      <span class="scroll-down-hint__marker" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    enterDelay?: number
    hidden?: boolean
    initialEnterDelay?: number
    label?: string
  }>(),
  {
    enterDelay: 0,
    hidden: false,
    initialEnterDelay: 0,
    label: 'EXPLORE',
  }
)
const emit = defineEmits<{ (event: 'activate'): void }>()

const isVisible = ref(false)
let enterTimer: ReturnType<typeof setTimeout> | null = null
let reducedMotionQuery: MediaQueryList | null = null

const clearEnterTimer = () => {
  if (!enterTimer) return
  clearTimeout(enterTimer)
  enterTimer = null
}

const scheduleEnter = (delay: number) => {
  clearEnterTimer()
  if (props.hidden) return

  const effectiveDelay = reducedMotionQuery?.matches ? 0 : delay
  enterTimer = setTimeout(() => {
    isVisible.value = true
    enterTimer = null
  }, effectiveDelay)
}

watch(
  () => props.hidden,
  (hidden) => {
    if (hidden) {
      clearEnterTimer()
      isVisible.value = false
      return
    }
    scheduleEnter(props.enterDelay)
  }
)

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  scheduleEnter(props.initialEnterDelay)
})
onUnmounted(() => {
  clearEnterTimer()
  reducedMotionQuery = null
})
</script>

<style lang="less" scoped>
.scroll-down-hint.no-rem {
  position: absolute;
  bottom: max(
    clamp(48px, 7dvh, 76px),
    calc(env(safe-area-inset-bottom) + 32px)
  );
  left: 50%;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.52);
  cursor: pointer;
  opacity: 1;
  transform: translateX(-50%);
  transition: opacity 0.42s ease-out;

  &.is-hidden {
    opacity: 0;
    pointer-events: none;
  }

  &:focus-visible {
    outline: 1px solid #e23456;
    outline-offset: 6px;
  }

  &:hover .scroll-down-hint__label {
    color: #e23456;
  }
}

.scroll-down-hint__label {
  margin-bottom: 10px;
  font-family: 'anton', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
  transition: color 0.22s ease-out;
}

.scroll-down-hint__rail {
  position: relative;
  width: 1px;
  height: 28px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.18);
}

.scroll-down-hint__marker {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 9px;
  background: #e23456;
  animation: scrollDownHintMove 1.5s cubic-bezier(0.76, 0, 0.24, 1) infinite;
}

@keyframes scrollDownHintMove {
  from {
    transform: translateY(-100%);
  }

  to {
    transform: translateY(38px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-down-hint.no-rem {
    transition-duration: 0.01ms;
  }

  .scroll-down-hint__marker {
    animation: none;
    transform: translateY(10px);
  }
}
</style>
