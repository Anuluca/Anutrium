<template>
  <div class="tool-header-actions">
    <ShareButton
      :target-id="toolId"
      :target-title="title"
      target-type="tool"
      :text="description || title"
      :title="title"
      :show-arrow="false"
      show-icon
      :show-label="false"
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
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
}
</style>
