<template>
  <component
    :is="currentItem?.link ? RouterLink : 'span'"
    class="random-typed-text"
    :class="`is-${phase === 'type' ? 'typing' : 'deleting'}`"
    :to="currentItem?.link"
    @click.stop
  >
    <TypedText
      v-if="currentText"
      :key="cycleKey"
      :direction="phase"
      :start="active"
      :text="currentText"
      :speed="phase === 'type' ? speed : deleteSpeed"
      keep-cursor
      @complete="handlePhaseComplete"
    />
  </component>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import TypedText from '@/components/TypedText/index.vue'

interface RandomTypedTextItem {
  text: string
  link?: string
}

const props = withDefaults(
  defineProps<{
    active?: boolean
    deleteSpeed?: number
    holdDuration?: number
    items: readonly (string | RandomTypedTextItem)[]
    speed?: number
  }>(),
  {
    active: true,
    deleteSpeed: 85,
    holdDuration: 2200,
    speed: 70,
  }
)

const currentItem = ref<RandomTypedTextItem | null>(null)
const currentText = computed(() => currentItem.value?.text ?? '')
const cycleKey = ref(0)
const phase = ref<'type' | 'delete'>('type')
let currentIndex = -1
let phaseTimer: ReturnType<typeof setTimeout> | null = null

const clearPhaseTimer = () => {
  if (!phaseTimer) return
  clearTimeout(phaseTimer)
  phaseTimer = null
}

const chooseNextIndex = () => {
  if (props.items.length <= 1) return 0

  const candidate = Math.floor(Math.random() * (props.items.length - 1))
  return candidate >= currentIndex ? candidate + 1 : candidate
}

const showNextItem = () => {
  if (!props.items.length || !props.active) {
    clearPhaseTimer()
    currentItem.value = null
    return
  }

  currentIndex = chooseNextIndex()
  const item = props.items[currentIndex]
  currentItem.value = typeof item === 'string' ? { text: item } : item ?? null
  phase.value = 'type'
  cycleKey.value += 1
}

const restart = () => {
  clearPhaseTimer()
  currentIndex = -1
  showNextItem()
}

const handlePhaseComplete = () => {
  clearPhaseTimer()
  if (!props.active || document.visibilityState === 'hidden') return

  if (phase.value === 'type') {
    phaseTimer = setTimeout(() => {
      phase.value = 'delete'
      cycleKey.value += 1
      phaseTimer = null
    }, props.holdDuration)
    return
  }

  phaseTimer = setTimeout(() => {
    phaseTimer = null
    showNextItem()
  }, 180)
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    clearPhaseTimer()
  } else if (props.active) {
    cycleKey.value += 1
  }
}

watch(() => [JSON.stringify(props.items), props.active], restart)

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  restart()
})

onUnmounted(() => {
  clearPhaseTimer()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style lang="less" scoped>
.random-typed-text {
  display: inline-block;
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
}
</style>
