<template>
  <span class="typed-text" :aria-label="text">
    <span class="typed-text__ghost" aria-hidden="true">{{ text }}</span>
    <span class="typed-text__active" aria-hidden="true">
      <span>{{ visibleText }}</span>
      <span v-if="showCursor" class="typed-text__cursor">{{ cursor }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    delay?: number
    speed?: number
    cursor?: string
    keepCursor?: boolean
    start?: boolean
  }>(),
  {
    delay: 0,
    speed: 34,
    cursor: '_',
    keepCursor: false,
    start: true,
  }
)

const visibleText = ref('')
const isComplete = ref(false)
const hasStarted = ref(false)
let delayTimer: ReturnType<typeof setTimeout> | null = null
let cursorTimer: ReturnType<typeof setTimeout> | null = null
let typeTimer: ReturnType<typeof setTimeout> | null = null
const CURSOR_LEAD_TIME = 180

const showCursor = computed(
  () => props.keepCursor || (hasStarted.value && !isComplete.value)
)

const clearTimers = () => {
  if (delayTimer) {
    clearTimeout(delayTimer)
    delayTimer = null
  }
  if (cursorTimer) {
    clearTimeout(cursorTimer)
    cursorTimer = null
  }
  if (typeTimer) {
    clearTimeout(typeTimer)
    typeTimer = null
  }
}

const typeNext = (characters: string[], index: number) => {
  if (index >= characters.length) {
    isComplete.value = true
    return
  }

  visibleText.value += characters[index]
  typeTimer = setTimeout(() => typeNext(characters, index + 1), props.speed)
}

const startTyping = () => {
  clearTimers()
  visibleText.value = ''
  isComplete.value = false
  hasStarted.value = false

  if (!props.start) return

  const characters = Array.from(props.text)
  if (!characters.length) {
    isComplete.value = true
    return
  }

  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    visibleText.value = props.text
    isComplete.value = true
    return
  }

  const cursorDelay = Math.max(0, props.delay - CURSOR_LEAD_TIME)
  cursorTimer = setTimeout(() => {
    hasStarted.value = true
    cursorTimer = null
  }, cursorDelay)
  delayTimer = setTimeout(() => {
    delayTimer = null
    typeNext(characters, 0)
  }, props.delay)
}

watch(() => [props.text, props.delay, props.speed, props.start], startTyping, {
  immediate: true,
})

onBeforeUnmount(clearTimers)
</script>

<style lang="less" scoped>
.typed-text {
  position: relative;
  display: inline-block;
  max-width: 100%;
  vertical-align: inherit;
}

.typed-text__ghost {
  display: inline-block;
  visibility: hidden;
  pointer-events: none;
  white-space: inherit;
}

.typed-text__active {
  position: absolute;
  inset: 0 auto auto 0;
  max-width: 100%;
  overflow: hidden;
  white-space: inherit;
}

.typed-text__cursor {
  display: inline-block;
  animation: typedTextCursor 0.82s steps(1, end) infinite;
}

@keyframes typedTextCursor {
  50% {
    opacity: 0;
  }
}
</style>
