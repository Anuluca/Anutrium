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
    <ModalWrapper
      v-model="showAgentTests"
      :title="agentTestsTitle"
      width="min(1280px, 92vw)"
    >
      <template #header>
        <ModalContentTitle :title="agentTestsTitle" />
      </template>
      <AiAgentTests :expanded="expanded" />
    </ModalWrapper>
    <ModalWrapper
      v-model="showWebsiteHistory"
      :title="historyTitle"
      width="min(1280px, 92vw)"
    >
      <template #header>
        <ModalContentTitle :title="historyTitle" />
      </template>
      <AnutriumHistory :expanded="expanded" />
    </ModalWrapper>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import ModalContentTitle from '@/components/ModalContentTitle/index.vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import ToolCard from '@/components/ToolCard/index.vue'
import ToolCardGrid from '@/components/ToolCardGrid/index.vue'
import { aiReplicaExperiments } from '@/config/aiReplicaExperiments'
import {
  AI_AGENT_TEST_PATH,
  islandModules,
  WEBSITE_HISTORY_PATH,
} from '@/config/islandModules'

import AiAgentTests from './AiAgentTests.vue'
import AnutriumHistory from './AnutriumHistory.vue'

defineProps<{ expanded?: boolean }>()
const route = useRoute()
const router = useRouter()
const showAgentTests = computed({
  get: () => route.path.replace(/\/+$/, '') === AI_AGENT_TEST_PATH,
  set: (visible: boolean) => {
    if (!visible && showAgentTests.value)
      void router.replace(islandModules.LABORATORY.path)
  },
})
const { locale } = useI18n()
const agentTestsTitle = computed(() =>
  locale.value === 'en' ? 'AI Agent Capability Test' : 'AI Agent 能力测试'
)
const showWebsiteHistory = computed({
  get: () => route.path.replace(/\/+$/, '') === WEBSITE_HISTORY_PATH,
  set: (visible: boolean) => {
    if (!visible && showWebsiteHistory.value)
      void router.replace(islandModules.LABORATORY.path)
  },
})
const historyTitle = computed(() =>
  locale.value === 'en' ? 'Anutrium History' : 'Anutrium历史版本'
)
const experiments = computed(() => [
  {
    id: 'monkey-typewriter',
    title: locale.value === 'en' ? 'Monkey Typewriter' : '猴子打字',
    sub: locale.value === 'en' ? 'Generate random articles.' : '随机生成文章',
    tags: [],
    category: 'general' as const,
    icon: 'Aa',
    img: 'https://assets.anuluca.com/Island/laboratory/monkey-typewriter/20261109_135158_cover.webp',
    imageFit: 'cover' as const,
    statusLabel: 'EXPERIMENT',
    link: '/laboratory/monkey-typewriter',
  },
  {
    id: 'website-history',
    title: historyTitle.value,
    sub:
      locale.value === 'en'
        ? 'Explore the legacy blog and earlier Anutrium versions.'
        : '回顾旧版博客与 Anutrium 的历代页面。',
    tags: [],
    category: 'general' as const,
    icon: 'HISTORY',
    img: 'https://assets.anuluca.com/Island/laboratory/anutrium-history/20261117_173052_cover.webp',
    imageFit: 'cover' as const,
    statusLabel: '5 VERSIONS',
    link: WEBSITE_HISTORY_PATH,
  },
  {
    id: 'ai-agent-test',
    title:
      locale.value === 'en' ? 'AI Agent Capability Test' : 'AI Agent能力测试',
    sub:
      locale.value === 'en'
        ? 'Explore and test AI Agent capabilities.'
        : '探索与测试 AI Agent 的能力。',
    tags: [],
    category: 'general' as const,
    icon: 'AI',
    statusLabel:
      locale.value === 'en'
        ? `${aiReplicaExperiments.length} TESTS`
        : `${aiReplicaExperiments.length} 项测试`,
    link: AI_AGENT_TEST_PATH,
  },
])
</script>

<style lang="less" scoped>
.island-laboratory-content {
  width: 100%;
}
</style>
