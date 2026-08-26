<template>
  <nav class="tool-recommendation-row" aria-label="推荐工具">
    <RouterLink class="tool-recommendation-row__link" to="/craft">
      工具集
    </RouterLink>
    <span class="tool-recommendation-row__separator">|</span>
    <span>热门工具:</span>
    <RouterLink
      v-for="tool in displayedRecommendedTools"
      :key="tool.path"
      class="tool-recommendation-row__link"
      :to="tool.path"
    >
      {{ tool.label }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface RecommendedTool {
  label: string
  path: string
}

const props = withDefaults(
  defineProps<{
    recommendedTools?: RecommendedTool[]
  }>(),
  {
    recommendedTools: () => [],
  }
)

const defaultRecommendedTools: RecommendedTool[] = [
  { label: '配色提取器', path: '/colorPalette' },
  { label: 'EASE STUDIO', path: '/easeStudio' },
]

const displayedRecommendedTools = computed(() =>
  props.recommendedTools.length
    ? props.recommendedTools
    : defaultRecommendedTools
)
</script>

<style lang="less" scoped>
.tool-recommendation-row {
  margin-top: 24px;
  color: #a52b43;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
}

.tool-recommendation-row__separator {
  padding: 0 12px 0 8px;
}

.tool-recommendation-row__link {
  padding: 0 2px 2px;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  transition: color 0.2s, background-color 0.2s;

  &::before {
    content: '[ ';
    opacity: 0;
  }

  &::after {
    content: ' ]';
    opacity: 0;
  }

  &:hover,
  &:focus-visible {
    color: #000;
    background-color: #e23456;

    &::before,
    &::after {
      opacity: 1;
    }
  }
}
</style>
