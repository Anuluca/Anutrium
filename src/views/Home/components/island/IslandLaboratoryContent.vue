<template>
  <div class="island-laboratory-content">
    <ToolCardGrid aria-label="实验室项目">
      <ToolCard
        v-for="(experiment, index) in experiments"
        :key="experiment.id"
        :tool="experiment"
        :index="index"
        :total="experiments.length"
        @select="router.push(experiment.link)"
      />
    </ToolCardGrid>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ToolCard from '@/components/ToolCard/index.vue'
import ToolCardGrid from '@/components/ToolCardGrid/index.vue'

const router = useRouter()
const { locale } = useI18n()
const experiments = computed(() => [
  {
    id: 'ai-agent-test',
    title:
      locale.value === 'en' ? 'AI Agent Capability Test' : 'AI Agent能力测试',
    sub:
      locale.value === 'en'
        ? 'Explore and test AI Agent capabilities.'
        : '探索与测试 AI Agent 的能力。',
    tags: [],
    category: 'work' as const,
    icon: 'AI',
    statusLabel: locale.value === 'en' ? 'IN DEVELOPMENT' : '开发中',
    link: '/404',
  },
])
</script>

<style lang="less" scoped>
.island-laboratory-content {
  width: 100%;
}
</style>
