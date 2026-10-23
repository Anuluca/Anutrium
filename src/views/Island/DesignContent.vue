<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import WorkCard from '@/components/WorkCard/index.vue'
import { type CreativeDesign, creativeDesigns } from '@/config/creativeDesign'

import DesignDetail from './DesignDetail.vue'

const props = defineProps<{
  detailTarget?: HTMLElement | null
  inlineDetails?: boolean
  expanded?: boolean
}>()
const { locale } = useI18n()
const works = computed(() =>
  creativeDesigns.map((work) => ({
    ...work,
    title: locale.value === 'en' ? work.titleEn : work.title,
    company: locale.value === 'en' ? 'SELF-MADE' : work.company,
  }))
)
const selectedWork = ref<CreativeDesign | null>(null)
const inlineDetail = computed(
  () => !!props.detailTarget && !!props.inlineDetails
)
const openDetail = (id: string) => {
  selectedWork.value = creativeDesigns.find((work) => work.id === id) || null
}
const closeDetail = () => {
  selectedWork.value = null
}
defineExpose({
  closeInlineDetail: () => {
    if (!inlineDetail.value || !selectedWork.value) return false
    closeDetail()
    return true
  },
})
watch(inlineDetail, closeDetail)
</script>

<template>
  <div
    class="creative-design"
    :class="{ 'creative-design--expanded': expanded }"
  >
    <div class="creative-design__cards">
      <WorkCard
        v-for="work in works"
        :key="work.id"
        :work="work"
        :current="inlineDetail && selectedWork?.id === work.id"
        :data-design="work.id"
        theme-color="var(--page-theme-color)"
        display-mode="always-visible"
        @select="openDetail($event.id)"
      />
    </div>
    <Teleport v-if="detailTarget" :to="detailTarget">
      <Transition name="design-detail-panel" mode="out-in" appear>
        <DesignDetail
          v-if="inlineDetail && selectedWork"
          :key="selectedWork.id"
          :work="selectedWork"
          inline
          @close="closeDetail"
        />
      </Transition>
    </Teleport>
    <DesignDetail
      v-if="!inlineDetail && selectedWork"
      :key="selectedWork.id"
      :work="selectedWork"
      :inline="false"
      @close="closeDetail"
    />
  </div>
</template>

<style scoped lang="less">
.creative-design__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.creative-design--expanded .creative-design__cards {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.creative-design :deep([data-design='lucarioCard'] .work-card-image) {
  object-position: center 35%;
}
@container (max-width: 420px) {
  .creative-design__cards {
    gap: 12px;
  }
}
</style>
