<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useTemplePresentation } from '@/composables/useTemplePresentation'
import { needsFreshTempleScene } from '@/config/templeNavigation'

import TemplePage from './TemplePage.vue'

const presentation = useTemplePresentation()
const route = useRoute()
const sceneRevision = ref(0)
const freshScene = ref(false)
watch(
  [() => route.path, () => route.query.module],
  ([path, module], [previous]) => {
    if (!needsFreshTempleScene(previous, path, module)) return
    freshScene.value = true
    sceneRevision.value++
  },
  { flush: 'sync' }
)
</script>

<template>
  <TemplePage
    :key="`${presentation.id}:${sceneRevision}`"
    :presentation="presentation"
    :fresh-scene="freshScene"
    @fresh-scene-consumed="freshScene = false"
  />
</template>
