<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { cn } from '@inspira-ui/plugins'
import { Motion } from 'motion-v'

interface Sparkle {
  id: string
  x: string
  y: string
  color: string
  delay: number
  scale: number
  lifespan: number
}

interface Props {
  text: string
  active?: boolean
  rotate?: boolean
  sparkleSize?: number
  sparkleArea?: {
    left: number
    right: number
    top: number
    bottom: number
  }
  sparklesCount?: number
  colors?: {
    first: string
    second: string
  }
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  active: true,
  rotate: true,
  sparkleSize: 21,
  sparkleArea: () => ({ left: 0, right: 100, top: 0, bottom: 100 }),
  sparklesCount: 10,
  colors: () => ({ first: '#9E7AFF', second: '#FE8BBB' }),
  class: '',
})

const sparkles = ref<Sparkle[]>([])
const initialState = computed(() => ({
  opacity: 0,
  scale: 0,
  ...(props.rotate ? { rotate: 75 } : {}),
}))
let interval: number | null = null
let sparkleId = 0

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

const generateStar = (delay?: number, horizontalSlot?: number): Sparkle => {
  const { left, right, top, bottom } = props.sparkleArea
  const slotWidth =
    horizontalSlot === undefined
      ? 0
      : (right - left) / Math.max(1, props.sparklesCount)
  const minX =
    horizontalSlot === undefined ? left : left + slotWidth * horizontalSlot
  let maxX = horizontalSlot === undefined ? right : minX + slotWidth
  if (horizontalSlot === 0 && left < 0) {
    maxX = Math.min(0, maxX)
  }

  return {
    id: `sparkle-${sparkleId++}`,
    x: `${randomBetween(minX, maxX)}%`,
    y: `${randomBetween(top, bottom)}%`,
    color: Math.random() > 0.5 ? props.colors.first : props.colors.second,
    delay: delay ?? Math.random() * 2,
    scale: Math.random() + 0.3,
    lifespan: Math.random() * 10 + 5,
  }
}

const initializeStars = () => {
  sparkles.value = Array.from({ length: props.sparklesCount }, (_, index) =>
    generateStar(index === 0 ? 0 : undefined, index)
  )
}

const updateStars = () => {
  sparkles.value = sparkles.value.map((star) =>
    star.lifespan <= 0
      ? generateStar()
      : { ...star, lifespan: star.lifespan - 0.1 }
  )
}

const stopAnimation = () => {
  if (interval === null) return
  window.clearInterval(interval)
  interval = null
}

const startAnimation = () => {
  stopAnimation()
  initializeStars()
  interval = window.setInterval(updateStars, 100)
}

const syncAnimation = () => {
  stopAnimation()
  if (props.active) {
    startAnimation()
    return
  }
  sparkles.value = []
}

const getAnimatedState = (sparkle: Sparkle) => ({
  opacity: [0, 1, 0],
  scale: [0, sparkle.scale, 0],
  ...(props.rotate ? { rotate: [75, 120, 150] } : {}),
})

onMounted(syncAnimation)
onUnmounted(stopAnimation)

watch(
  () => [
    props.active,
    props.sparklesCount,
    props.sparkleArea.left,
    props.sparkleArea.right,
    props.sparkleArea.top,
    props.sparkleArea.bottom,
    props.colors.first,
    props.colors.second,
  ],
  syncAnimation
)
</script>

<template>
  <span :class="cn('sparkles-text text-6xl font-bold', props.class)">
    <span class="sparkles-text__content">
      <template v-for="sparkle in sparkles" :key="sparkle.id">
        <Motion
          v-if="props.active"
          :initial="initialState"
          :animate="getAnimatedState(sparkle)"
          :transition="{
            duration: 0.8,
            repeat: Infinity,
            delay: sparkle.delay,
          }"
          as="svg"
          class="sparkles-text__sparkle"
          :style="{
            left: sparkle.x,
            top: sparkle.y,
            opacity: 0,
          }"
          :width="props.sparkleSize"
          :height="props.sparkleSize"
          viewBox="0 0 21 21"
          aria-hidden="true"
        >
          <path
            d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
            :fill="sparkle.color"
          />
        </Motion>
      </template>
      <slot>{{ text }}</slot>
    </span>
  </span>
</template>

<style scoped>
.sparkles-text {
  display: inline-block;
  vertical-align: baseline;
}

.sparkles-text__content {
  position: relative;
  display: inline-block;
  white-space: nowrap;
}

.sparkles-text__sparkle {
  position: absolute;
  z-index: 20;
  display: block;
  pointer-events: none;
  transform-origin: center;
}
</style>
