<template>
  <div :class="[pageClass, 'main-container']">
    <DetailPageHeader back-label="CRAFT" :back-path="backPath" :title="title" />

    <slot />

    <div class="footer-wrap">
      <PageFooter third-party :recommended-tools="recommendedTools" />
    </div>
  </div>
</template>

<script setup lang="ts">
import DetailPageHeader from '@/components/DetailPageHeader/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

export interface RecommendedTool {
  label: string
  path: string
}

withDefaults(
  defineProps<{
    backPath?: string
    pageClass: string
    recommendedTools?: RecommendedTool[]
    title: string
  }>(),
  {
    backPath: '/craft',
    recommendedTools: () => [],
  }
)
</script>

<style lang="less" scoped>
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
