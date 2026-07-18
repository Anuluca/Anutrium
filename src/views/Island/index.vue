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
const islandActiveShellClasses = [
  'island-pc-shell',
  'island-mobile-shell',
] as const
const islandLeavingShellClasses = [
  'island-pc-shell-leaving',
  'island-mobile-shell-leaving',
] as const
let stopShellClassWatch: (() => void) | null = null

const clearIslandActiveShellClasses = () => {
  document.body.classList.remove(...islandActiveShellClasses)
}

const activateIslandShellClass = (shellClass: string) => {
  document.body.classList.remove(
    ...islandActiveShellClasses,
    ...islandLeavingShellClasses
  )
  document.body.classList.add(shellClass)
}

onMounted(() => {
  stopShellClassWatch = watch(activeShellClass, activateIslandShellClass, {
    immediate: true,
  })
})

onUnmounted(() => {
  stopShellClassWatch?.()
  stopShellClassWatch = null
  clearIslandActiveShellClasses()
})
</script>

<template>
  <component :is="activeComponent" />
</template>
