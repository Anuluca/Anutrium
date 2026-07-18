<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'

import { visualState } from '@/stores'

import IslandMobile from './Mobile.vue'
import IslandPC from './PC.vue'

const visualStateStore = visualState()
const activeComponent = computed(() =>
  visualStateStore.deviceType === 'desktop' ? IslandPC : IslandMobile
)
const activeShellClass = computed(() =>
  visualStateStore.deviceType === 'desktop'
    ? 'island-pc-shell'
    : 'island-mobile-shell'
)
const islandBodyClasses = [
  'island-pc-shell',
  'island-mobile-shell',
  'island-pc-shell-leaving',
  'island-mobile-shell-leaving',
] as const
let stopShellClassWatch: (() => void) | null = null

const clearIslandBodyClasses = () => {
  document.body.classList.remove(...islandBodyClasses)
}

onMounted(() => {
  stopShellClassWatch = watch(
    activeShellClass,
    (shellClass) => {
      clearIslandBodyClasses()
      document.body.classList.add(shellClass)
    },
    { immediate: true }
  )
})

onUnmounted(() => {
  stopShellClassWatch?.()
  stopShellClassWatch = null
  clearIslandBodyClasses()
})
</script>

<template>
  <component :is="activeComponent" />
</template>
