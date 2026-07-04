<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import BackStars from '@/components/BackStars/index.vue'
import { visualState } from '@/stores'

const route = useRoute()
const visualStateStore = visualState()

const currentRouter = computed(() => route.path)

const isTextMenu = computed(() => currentRouter.value !== '/')
const useDeepBlackBackground = computed(
  () => route.meta.starBackground === 'deep-black'
)
</script>

<template>
  <div class="back-controller">
    <BackStars
      :theme="visualStateStore.theme"
      :is-text-menu="isTextMenu"
      :deep-black="useDeepBlackBackground"
    />
  </div>
</template>

<style>
.back-controller {
  width: 100%;
  height: 100%;
}
</style>
