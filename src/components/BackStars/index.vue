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

const isMotionPaused = ref(false)
let reducedMotionQuery: MediaQueryList | null = null

const updateMotionPreference = () => {
  isMotionPaused.value =
    document.visibilityState === 'hidden' || !!reducedMotionQuery?.matches
}

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
    <div class="star-field" aria-hidden="true" />
  </div>
</template>

<style lang="less" scoped>
@import './index.less';
</style>
