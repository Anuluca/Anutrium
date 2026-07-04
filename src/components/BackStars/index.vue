<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface Props {
  theme?: 'light' | 'dark'
  isTextMenu?: boolean
  deepBlack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'dark',
  isTextMenu: false,
  deepBlack: false,
})

const isMobileViewport =
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 768px)').matches

const STAR_COUNT = isMobileViewport ? 52 : 84
const RADIUS = 200
const isMotionPaused = ref(false)
let reducedMotionQuery: MediaQueryList | null = null

const updateMotionPreference = () => {
  isMotionPaused.value =
    document.visibilityState === 'hidden' || !!reducedMotionQuery?.matches
}

const seededValue = (index: number, offset: number) => {
  const value = Math.sin(index * 91.17 + offset * 47.31) * 10000
  return value - Math.floor(value)
}

const stars = Array.from({ length: STAR_COUNT }, (_, index) => {
  const sizeSeed = seededValue(index, 1)
  const size = isMobileViewport ? 0.6 + sizeSeed * 0.95 : 0.2 + sizeSeed
  const distance = RADIUS + seededValue(index, 2) * 900
  return {
    transform: `
      translate3d(0, 0, -${distance}px)
      rotateY(${seededValue(index, 3) * 360}deg)
      rotateX(${seededValue(index, 4) * 50}deg)
      scale(${size})
    `,
    origin: `0 0 ${distance}px`,
  }
})

const containerClass = computed(() => [
  'star-container',
  props.theme,
  {
    'menu-hidden': props.isTextMenu,
    'is-deep-black': props.deepBlack,
    'is-paused': isMotionPaused.value,
  },
])

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionPreference()
  document.addEventListener('visibilitychange', updateMotionPreference)
  reducedMotionQuery.addEventListener('change', updateMotionPreference)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', updateMotionPreference)
  reducedMotionQuery?.removeEventListener('change', updateMotionPreference)
})
</script>

<template>
  <div :class="containerClass">
    <div class="star-field">
      <div
        v-for="(star, index) in stars"
        :key="index"
        class="star"
        :style="{
          transform: star.transform,
          transformOrigin: star.origin,
        }"
      />
    </div>
  </div>
</template>

<style lang="less" scoped>
@import './index.less';
</style>
