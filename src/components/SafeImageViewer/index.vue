<template>
  <ElImageViewer
    :url-list="urlList"
    :initial-index="initialIndex"
    :z-index="zIndex"
    :hide-on-click-modal="hideOnClickModal"
    :teleported="teleported"
    @close="emit('close')"
  />
</template>

<script setup lang="ts">
import { ElImageViewer } from 'element-plus'

import { useOverlayScrollLock } from '@/composables/useOverlayScrollLock'

import 'element-plus/es/components/image-viewer/style/css'

withDefaults(
  defineProps<{
    hideOnClickModal?: boolean
    initialIndex?: number
    teleported?: boolean
    urlList: string[]
    zIndex?: number
  }>(),
  {
    hideOnClickModal: true,
    initialIndex: 0,
    teleported: true,
    zIndex: undefined,
  }
)

const emit = defineEmits<{
  close: []
}>()

useOverlayScrollLock('safe-image-viewer', () => true)
</script>
