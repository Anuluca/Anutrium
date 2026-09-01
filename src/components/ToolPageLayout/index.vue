<template>
  <div :class="[pageClass, 'main-container', 'tool-page-layout']">
    <section class="tool-page-stage">
      <DetailPageHeader
        :back-label="backLabel"
        :back-path="backPath"
        :subtitle="subtitle"
        :title="title"
      />

      <main class="tool-page-content">
        <slot />
      </main>
    </section>

    <ToolRecommendationRow
      v-if="showRecommendations"
      class="tool-recommendation-row"
      :recommended-tools="recommendedTools"
    />
    <div
      v-else
      class="tool-recommendation-row tool-recommendation-row--empty"
      aria-hidden="true"
    />
    <PageFooter class="tool-page-footer" />
  </div>
</template>

<script setup lang="ts">
import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import ToolRecommendationRow, {
  type RecommendedTool,
} from '@/components/ToolRecommendationRow/index.vue'

export type { RecommendedTool }

withDefaults(
  defineProps<{
    backLabel?: string
    backPath?: string
    pageClass: string
    recommendedTools?: RecommendedTool[]
    showRecommendations?: boolean
    subtitle?: string
    title: string
  }>(),
  {
    backLabel: 'CRAFT',
    backPath: '/craft',
    recommendedTools: () => [],
    showRecommendations: true,
    subtitle: '',
  }
)
</script>

<style lang="less" scoped>
.tool-page-layout {
  min-height: calc(100dvh - 60px);
  height: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 0 !important;
  overflow: visible;
}

.tool-page-stage {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  justify-content: safe center;
  width: 100%;
  min-height: 0;
  transform: translateY(clamp(-36px, -3dvh, -20px));
}

.tool-page-content {
  width: 100%;
}

.tool-page-footer {
  flex-shrink: 0;
  margin-top: auto;
}

.tool-recommendation-row {
  flex-shrink: 0;
}

.tool-recommendation-row--empty {
  height: 0;
}

@media (min-width: 769px) {
  .tool-page-layout :deep(.detail-page-header) {
    margin-top: 0;
  }
}
</style>
