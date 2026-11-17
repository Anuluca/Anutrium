<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import WorkCard from '@/components/WorkCard/index.vue'
import { aiReplicaExperiments } from '@/config/aiReplicaExperiments'

defineProps<{ expanded?: boolean }>()
const { locale } = useI18n()
const router = useRouter()
const tests = computed(() =>
  aiReplicaExperiments.map((experiment) => ({
    id: experiment.id,
    title: locale.value === 'en' ? experiment.titleEn : experiment.title,
    company: experiment.model,
    img: experiment.cover,
    link: experiment.path,
  }))
)
</script>

<template>
  <section class="ai-agent-tests" :class="{ 'is-expanded': expanded }">
    <div class="ai-agent-tests__grid laboratory-gallery-grid">
      <WorkCard
        v-for="item in tests"
        :key="item.id"
        :work="item"
        theme-color="var(--page-theme-color)"
        display-mode="always-visible"
        @select="router.push(item.link)"
      />
    </div>
  </section>
</template>

<style scoped lang="less" src="./laboratoryGallery.less" />
