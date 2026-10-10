<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'

import { visualState } from '@/stores'

import TemplePage from './TemplePage.vue'
import { templePresentations } from './templePresentation'

const state = visualState()
const touchDevice = useMediaQuery('(pointer: coarse)')
const presentation = computed(() =>
  state.deviceType === 'desktop' && !touchDevice.value
    ? templePresentations.desktop
    : templePresentations.mobile
)
</script>

<template>
  <TemplePage :key="presentation.id" :presentation="presentation" />
</template>
