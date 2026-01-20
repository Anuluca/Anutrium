<script lang="ts" setup>
import { computed } from 'vue'

interface Props {
  theme?: 'light' | 'dark'
  isTextMenu?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'light',
  isTextMenu: false,
})

const STAR_COUNT = 200
const RADIUS = 200

// 预计算星星坐标
const stars = Array.from({ length: STAR_COUNT }, () => {
  const size = 0.2 + Math.random()
  const distance = RADIUS + Math.random() * 900
  return {
    transform: `
      translate3d(0, 0, -${distance}px) 
      rotateY(${Math.random() * 360}deg) 
      rotateX(${Math.random() * 50}deg) 
      scale(${size})
    `,
    origin: `0 0 ${distance}px`,
  }
})

const containerClass = computed(() => [
  'star-container',
  props.theme,
  { 'menu-hidden': props.isTextMenu },
])
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