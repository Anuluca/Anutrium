<template>
  <div class="tool-header-actions">
    <ShareButton
      :target-id="toolId"
      :target-title="title"
      target-type="tool"
      :text="description || title"
      :title="title"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import ShareButton from '@/components/ShareButton/index.vue'
import { trackToolUse } from '@/utils/analytics'

const props = withDefaults(
  defineProps<{
    description?: string
    title: string
    toolId: string
  }>(),
  {
    description: '',
  }
)

onMounted(() => {
  trackToolUse({
    id: props.toolId,
    title: props.title,
  })
})
</script>

<style lang="less" scoped>
.tool-header-actions {
  display: flex;
  align-items: center;
  margin: -4px 0 12px;
}
</style>
