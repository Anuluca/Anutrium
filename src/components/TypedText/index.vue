<template>
  <span ref="typedTextRef" class="typed-text" :aria-label="text">
    <span class="typed-text__ghost" aria-hidden="true">
      {{ text
      }}<span v-if="keepCursor" class="typed-text__cursor-reserve">{{
        cursor
      }}</span>
    </span>
    <span
      ref="activeTextRef"
      class="typed-text__active"
      :class="{ 'typed-text__active--looping': shouldLoopOverflow }"
      aria-hidden="true"
    >
      <template v-if="shouldLoopOverflow">
        <span
          class="typed-text__loop-track"
          :style="{ '--typed-text-loop-distance': `${loopDistance}px` }"
        >
          <span ref="loopSegmentRef">{{ visibleText }}</span>
          <span aria-hidden="true">{{ visibleText }}</span>
        </span>
      </template>
      <template v-else>
        <span>{{ visibleText }}</span>
        <span v-if="showCursor" class="typed-text__cursor">{{ cursor }}</span>
      </template>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    delay?: number
    speed?: number
    cursor?: string
    keepCursor?: boolean
    loopOverflow?: boolean
    start?: boolean
    direction?: 'type' | 'delete'
  }>(),
  {
    delay: 0,
    speed: 34,
    cursor: '_',
    keepCursor: false,
    loopOverflow: false,
    start: true,
    direction: 'type',
  }
)
const emit = defineEmits<{ (event: 'complete'): void }>()

const visibleText = ref('')
const isComplete = ref(false)
const hasStarted = ref(false)
const activeTextRef = ref<HTMLElement | null>(null)
const typedTextRef = ref<HTMLElement | null>(null)
const loopSegmentRef = ref<HTMLElement | null>(null)
const shouldLoopOverflow = ref(false)
const loopDistance = ref(0)
let delayTimer: ReturnType<typeof setTimeout> | null = null
let cursorTimer: ReturnType<typeof setTimeout> | null = null
let typeTimer: ReturnType<typeof setTimeout> | null = null
let scrollFrame: number | null = null
let resizeObserver: ResizeObserver | null = null
const CURSOR_LEAD_TIME = 180
const LOOP_GAP = 28

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
  if (scrollFrame !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(scrollFrame)
    scrollFrame = null
  }
}

const syncActiveTextScroll = () => {
  if (typeof window === 'undefined') return
  if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null
    const activeText = activeTextRef.value
    if (!activeText) return

    const textWidth = shouldLoopOverflow.value
      ? loopSegmentRef.value?.scrollWidth ?? activeText.scrollWidth
      : activeText.scrollWidth
    const overflowDistance = Math.max(0, textWidth - activeText.clientWidth)

    if (props.loopOverflow && isComplete.value && overflowDistance > 0) {
      loopDistance.value = textWidth + LOOP_GAP
      shouldLoopOverflow.value = true
      return
    }

    shouldLoopOverflow.value = false
    activeText.scrollLeft = overflowDistance
  })
}

const typeNext = (characters: string[], index: number) => {
  if (index >= characters.length) {
    isComplete.value = true
    emit('complete')
    return
  }

  visibleText.value =
    props.direction === 'delete'
      ? characters.slice(0, characters.length - index - 1).join('')
      : visibleText.value + characters[index]
  typeTimer = setTimeout(() => typeNext(characters, index + 1), props.speed)
}

const startTyping = () => {
  clearTimers()
  visibleText.value = props.direction === 'delete' ? props.text : ''
  isComplete.value = false
  hasStarted.value = false
  shouldLoopOverflow.value = false
  loopDistance.value = 0

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

watch(
  () => [props.text, props.delay, props.speed, props.start, props.direction],
  startTyping,
  { immediate: true }
)

watch(visibleText, syncActiveTextScroll, { flush: 'post' })
watch(isComplete, syncActiveTextScroll, { flush: 'post' })

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(syncActiveTextScroll)
  if (typedTextRef.value) resizeObserver.observe(typedTextRef.value)
})

onBeforeUnmount(() => {
  clearTimers()
  resizeObserver?.disconnect()
})
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

.typed-text__active--looping {
  overflow: hidden;
}

.typed-text__loop-track {
  display: inline-flex;
  width: max-content;
  gap: 28px;
  animation: typedTextOverflowLoop 8s linear infinite;
  will-change: transform;
}

.typed-text__cursor {
  display: inline-block;
  animation: typedTextCursor 0.82s steps(1, end) infinite;
}

.typed-text__cursor-reserve {
  visibility: hidden;
}

@keyframes typedTextCursor {
  50% {
    opacity: 0;
  }
}

@keyframes typedTextOverflowLoop {
  0%,
  12% {
    transform: translateX(0);
  }

  88%,
  100% {
    transform: translateX(calc(-1 * var(--typed-text-loop-distance)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .typed-text__loop-track {
    animation: none;
  }
}
</style>
