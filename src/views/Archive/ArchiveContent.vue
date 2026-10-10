<template>
  <div
    ref="contentRoot"
    class="archive-content"
    :class="{ 'is-embedded': embedded }"
  >
    <ArchiveAvailabilityPanel />

    <section
      v-for="(group, index) in companyGroups"
      :key="group.company"
      class="works-section company-works-section"
      :data-company="group.company"
    >
      <Sections
        :navigation="!embedded"
        :reveal="!embedded"
        :section-number="index + 1"
        :title="group.company"
        :title-en="group.companyEn"
      >
        <template #actions>
          <SectionCount :count="group.works.length" label="PROJECTS" />
        </template>
        <div class="works-grid">
          <WorkCard
            v-for="work in group.works"
            :key="work.id"
            :work="work"
            display-mode="always-visible"
            @select="openDetail"
          />
        </div>
      </Sections>
    </section>

    <section class="misc-section">
      <Sections
        :navigation="!embedded"
        :reveal="!embedded"
        :section-number="companyGroups.length + 1"
        :title="$t('archive.otherWorksTitle')"
        title-en="OTHER"
      >
        <template #actions>
          <SectionCount :count="miscWorks.length" label="PROJECTS" />
        </template>
        <div class="misc-grid">
          <WorkCard
            v-for="item in miscWorks"
            :key="item.id"
            class="misc-work-card"
            background="grid"
            display-mode="always-visible"
            :work="item"
            @select="openDetail"
          />
        </div>
      </Sections>
    </section>

    <Teleport v-if="detailTarget" :to="detailTarget">
      <Transition name="work-detail-panel" mode="out-in" appear>
        <WorkDetailModal
          v-if="inlineDetail && selectedWork"
          :key="selectedWork.id"
          :work="selectedWork"
          visible
          inline
          @close="closeDetail"
        />
      </Transition>
    </Teleport>
    <WorkDetailModal
      v-if="!inlineDetail"
      :work="selectedWork"
      :visible="!!selectedWork"
      @close="closeDetail"
    />
  </div>
</template>

<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ArchiveAvailabilityPanel from '@/components/ArchiveAvailabilityPanel/index.vue'
import SectionCount from '@/components/SectionCount/index.vue'
import Sections from '@/components/Sections/index.vue'
import WorkCard from '@/components/WorkCard/index.vue'
import WorkDetailModal from '@/components/WorkDetailModal/index.vue'
import type { ArchiveWork } from '@/types/archive'
import { trackProjectClick } from '@/utils/analytics'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
    detailTarget?: HTMLElement | null
    inlineDetails?: boolean
  }>(),
  { embedded: false, detailTarget: null, inlineDetails: true }
)
const contentRoot = ref<HTMLElement | null>(null)
const embedded = computed(() => props.embedded)
const inlineDetail = computed(
  () => props.embedded && !!props.detailTarget && props.inlineDetails
)

const { messages, tm } = useI18n()

const works = computed<ArchiveWork[]>(
  () => tm('archive.dynamic.Works') as ArchiveWork[]
)
const englishWorks = computed<ArchiveWork[]>(() => {
  const englishMessages = messages.value.en as {
    archive?: { dynamic?: { Works?: ArchiveWork[] } }
  }

  return englishMessages.archive?.dynamic?.Works || []
})

const miscWorks = computed<ArchiveWork[]>(
  () => tm('archive.dynamic.MiscWorks') as ArchiveWork[]
)

const companyGroups = computed(() => {
  const groups = new Map<
    string,
    { company: string; companyEn: string; works: ArchiveWork[] }
  >()

  works.value.forEach((work, index) => {
    const companyEn = englishWorks.value[index]?.company || work.company
    const companyGroup = groups.get(companyEn)
    if (companyGroup) {
      companyGroup.works.push(work)
      return
    }

    groups.set(companyEn, {
      company: work.company,
      companyEn: companyEn.replace(/_/g, ' '),
      works: [work],
    })
  })

  return Array.from(groups.values())
})

const selectedWork = ref<ArchiveWork | null>(null)

const openDetail = (work: ArchiveWork) => {
  selectedWork.value = work
  trackProjectClick({
    id: work.id,
    title: work.title,
    source: 'archive',
  })
}

const closeDetail = () => {
  selectedWork.value = null
}
// 展开/收起只切换展示方式，不把当前侧栏详情自动转换成弹窗。
watch(inlineDetail, closeDetail)
</script>

<style lang="less" scoped>
.archive-content {
  width: 100%;
  color: inherit;
}

.works-section {
  padding: 30px 0;
  content-visibility: auto;
  contain-intrinsic-size: 980px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.company-works-section + .company-works-section {
  padding-top: 60px;
}

.misc-section {
  padding: 60px 0 30px;
  content-visibility: auto;
  contain-intrinsic-size: 620px;
}

.misc-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

:deep(.misc-work-card) {
  min-height: 150px;
  aspect-ratio: auto;
}

@media (max-width: 1199px) and (min-width: 769px) {
  .works-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .misc-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-title {
    flex-direction: column;
    gap: 4px;
    font-size: 1.8rem;

    .title-en {
      font-size: 2.5rem;
      word-break: break-word;
    }

    .title-cn {
      font-size: 0.35em !important;
      padding: 3px 20px !important;
      display: block !important;
      margin-left: 0 !important;
      right: -3rem !important;
      bottom: -0.5rem !important;
    }
  }

  .works-grid {
    grid-template-columns: 1fr;
  }

  .misc-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}

@media screen and (max-aspect-ratio: @ratio-threshold),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  :deep(.misc-work-card .work-card-info strong) {
    font-size: 0.95rem;
  }
}
// 容器宽度决定嵌入布局，避免半屏内容误用整个视口的桌面列数。
.is-embedded {
  container-type: inline-size;
  box-sizing: border-box;
  padding-top: 24px;
  .works-grid,
  .misc-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .company-works-section + .company-works-section {
    padding-top: 32px;
  }
  :deep(.availability-panel),
  :deep(.availability-panel--en) {
    grid-template-columns: minmax(0, 1fr);
  }
  :deep(.availability-copy) {
    grid-column: auto;
    border-right: 0;
  }
  :deep(.availability-actions) {
    grid-column: auto;
    grid-row: auto;
    display: flex;
    min-height: 48px;
  }
  :deep(.availability-cta) {
    min-height: 48px;
    flex: 1;
  }
}
@container (min-width: 800px) {
  .is-embedded .works-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .is-embedded .misc-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .is-embedded :deep(.availability-panel) {
    grid-template-columns: minmax(360px, 1fr) 178px;
  }
  .is-embedded :deep(.availability-panel--en) {
    grid-template-columns: minmax(360px, 1fr) 258px;
  }
  .is-embedded :deep(.availability-copy) {
    border-right: 1px solid rgba(255, 255, 255, 0.09);
  }
  .is-embedded :deep(.availability-actions) {
    display: grid;
  }
}
@container (max-width: 420px) {
  .is-embedded .works-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
