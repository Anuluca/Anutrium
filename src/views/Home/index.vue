<script setup lang="ts">
import { useTemplePresentation } from '@/composables/useTemplePresentation'

import TemplePage from './TemplePage.vue'

const presentation = useTemplePresentation()
</script>

<template>
  <TemplePage :key="presentation.id" :presentation="presentation" />
</template>
