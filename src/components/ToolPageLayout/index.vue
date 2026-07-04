<template>
  <div :class="[pageClass, 'main-container']">
    <DetailPageHeader
      back-label="CRAFT"
      :back-path="backPath"
      divider
      :subtitle="description"
      :title="title"
    >
      <template #actions>
        <ToolHeaderActions
          :tool-id="toolId"
          :title="title"
          :description="shareDescription || description"
        />
      </template>
      <template #subtitle-extra>
        <span class="tool-header-motto">// {{ motto }}</span>
      </template>
    </DetailPageHeader>

    <slot />

    <div class="footer-wrap">
      <PageFooter third-party :recommended-tools="recommendedTools" />
    </div>
  </div>
</template>

<script setup lang="ts">
import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import ToolHeaderActions from '@/components/ToolHeaderActions/index.vue'

export interface RecommendedTool {
  label: string
  path: string
}

withDefaults(
  defineProps<{
    backPath?: string
    description: string
    motto?: string
    pageClass: string
    recommendedTools?: RecommendedTool[]
    shareDescription?: string
    title: string
    toolId: string
  }>(),
  {
    backPath: '/craft',
    motto: 'HUAHUA_THE_CAT',
    recommendedTools: () => [],
    shareDescription: '',
  }
)
</script>

<style lang="less" scoped>
.tool-header-motto {
  color: rgba(255, 255, 255, 0.15);
  font-family: 'STSong', monospace;
  font-size: 11px;
}

.footer-wrap {
  animation: tool-section-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.25s both;
}

@keyframes tool-section-in {
  0% {
    opacity: 0;
    transform: translateY(15px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
