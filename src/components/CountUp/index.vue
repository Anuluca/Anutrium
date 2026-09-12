<template>
  <span ref="elementRef">{{ formattedValue }}</span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
const currentValue = ref(props.from)
const hasPlayed = ref(false)
const isInView = ref(false)
let animationFrame: number | null = null
let observer: IntersectionObserver | null = null

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
  if (hasPlayed.value) return
  hasPlayed.value = true

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
    currentValue.value = startValue + distance * easedProgress

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
  currentValue.value = props.from
  hasPlayed.value = false
  if (isInView.value) play()
})

onMounted(() => {
  if (!elementRef.value) return

  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return
      isInView.value = true
      play()
      observer?.disconnect()
      observer = null
    },
    { threshold: 0.2 }
  )
  observer.observe(elementRef.value)
})

onBeforeUnmount(() => {
  stopAnimation()
  observer?.disconnect()
})
</script>
