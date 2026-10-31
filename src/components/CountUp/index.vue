<template>
  <span ref="elementRef">{{ formattedValue }}</span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { observeCountVisibility } from './visibilityObserver'

const emit = defineEmits<{
  (event: 'end'): void
}>()

const props = withDefaults(
  defineProps<{
    to: number
    from?: number
    duration?: number
    minDigits?: number
  }>(),
  {
    from: 0,
    duration: 760,
    minDigits: 0,
  }
)

const elementRef = ref<HTMLElement | null>(null)
const currentValue = ref(Math.round(props.from))
let hasPlayed = false
let isInView = false
let animationFrame: number | null = null
let stopObserving: (() => void) | undefined

const normalizedTarget = computed(() => Math.max(0, Math.trunc(props.to)))
const formattedValue = computed(() =>
  String(Math.round(currentValue.value)).padStart(props.minDigits, '0')
)

const stopAnimation = () => {
  if (animationFrame === null) return
  cancelAnimationFrame(animationFrame)
  animationFrame = null
}

const play = () => {
  if (hasPlayed) return
  hasPlayed = true

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    currentValue.value = normalizedTarget.value
    emit('end')
    return
  }

  const startValue = props.from
  const distance = normalizedTarget.value - startValue
  if (!distance) {
    emit('end')
    return
  }

  const duration = Math.max(props.duration, 1)
  let startTime: number | null = null

  const step = (timestamp: number) => {
    startTime ??= timestamp
    const progress = Math.min((timestamp - startTime) / duration, 1)
    const easedProgress = 1 - (1 - progress) ** 3
    // 仅显示整数；数字不变时避免触发 Vue 更新。
    const nextValue = Math.round(startValue + distance * easedProgress)
    if (nextValue !== currentValue.value) currentValue.value = nextValue

    if (progress < 1) {
      animationFrame = requestAnimationFrame(step)
      return
    }

    currentValue.value = normalizedTarget.value
    animationFrame = null
    emit('end')
  }

  animationFrame = requestAnimationFrame(step)
}

watch(normalizedTarget, () => {
  stopAnimation()
  currentValue.value = Math.round(props.from)
  hasPlayed = false
  if (isInView) play()
})

onMounted(() => {
  if (!elementRef.value) return

  stopObserving = observeCountVisibility(elementRef.value, () => {
    isInView = true
    play()
  })
})

onBeforeUnmount(() => {
  stopAnimation()
  stopObserving?.()
})
</script>
