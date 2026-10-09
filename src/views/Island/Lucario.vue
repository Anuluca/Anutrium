<script setup lang="ts">
import { computed } from 'vue'

import { visualState } from '@/stores'

import LucarioMobile from './LucarioMobile.vue'
import TempleHarbor from './TempleHarbor.vue'

const state = visualState()
const activeComponent = computed(() =>
  state.deviceType === 'desktop' ? TempleHarbor : LucarioMobile
)
</script>

<template>
  <component :is="activeComponent" />
</template>
