<script setup lang="ts">
import { computed } from 'vue'

import { visualState } from '@/stores'

import IslandMobile from './Mobile.vue'
import IslandPC from './PC.vue'

const visualStateStore = visualState()
const activeComponent = computed(() =>
  visualStateStore.deviceType === 'desktop' ? IslandPC : IslandMobile
)
</script>

<template>
  <component :is="activeComponent" />
</template>
