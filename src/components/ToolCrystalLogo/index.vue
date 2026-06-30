<template>
  <CrystalLogo
    v-if="crystal"
    :image="crystal.image"
    :links="crystal.links"
    :text="crystal.text"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import CrystalLogo from '@/components/CrystalLogo/index.vue'

interface ToolCrystal {
  image?: string
  links?: Array<{
    href: string
    label: string
    target?: '_blank' | '_self'
  }>
  text?: string
}

interface ToolWithCrystal {
  crystal?: ToolCrystal
  id: string
}

const props = defineProps<{
  toolId: string
}>()

const { tm } = useI18n()

const crystal = computed(
  () =>
    (tm('craft.dynamic.tools') as unknown as ToolWithCrystal[]).find(
      (tool) => tool.id === props.toolId
    )?.crystal
)
</script>
