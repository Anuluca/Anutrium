<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

import { aiReplicaExperiments } from '@/config/aiReplicaExperiments'

import ReplicaExperimentLayout from './components/ReplicaExperimentLayout.vue'

const route = useRoute()
const experiment = computed(() =>
  aiReplicaExperiments.find((item) => item.routeName === route.name)
)
// 配置决定异步加载的场景；同一模板路由之间切换时也会重新选择案例。
const scene = computed(() =>
  experiment.value ? defineAsyncComponent(experiment.value.loadScene) : null
)
</script>

<template>
  <ReplicaExperimentLayout
    v-if="experiment"
    :key="experiment.id"
    :experiment="experiment"
  >
    <component :is="scene" />
  </ReplicaExperimentLayout>
</template>
