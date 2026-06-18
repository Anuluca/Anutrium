<script setup lang="ts">
import { computed } from 'vue'

import { visualState } from '@/stores'

import AboutMobile from './Mobile.vue'
import AboutPC from './PC.vue'

const visualStateStore = visualState()
const activeComponent = computed(() =>
  visualStateStore.deviceType === 'desktop' ? AboutPC : AboutMobile
)
</script>

<template>
  <component :is="activeComponent" />
</template>
