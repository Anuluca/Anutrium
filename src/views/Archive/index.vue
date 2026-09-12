<template>
  <div class="archives-page main-container">
    <PageHeroTitle />
    <ArchiveAvailabilityPanel />

    <section class="works-section">
      <Sections
        section-number="1"
        :title="$t('archive.title01')"
        title-en="MAIN"
      >
        <template #actions>
          <SectionCount :count="mainWorks.length" label="PROJECTS" />
        </template>
        <div class="works-grid">
          <WorkCard
            v-for="work in mainWorks"
            :key="work.id"
            :work="work"
            display-mode="always-visible"
            @select="openDetail"
          />
        </div>
      </Sections>
    </section>

    <section class="works-section personal-works-section">
      <Sections
        section-number="2"
        :title="$t('archive.title02')"
        title-en="PERSONAL"
      >
        <template #actions>
          <SectionCount :count="personalWorks.length" label="PROJECTS" />
        </template>
        <div class="works-grid">
          <WorkCard
            v-for="work in personalWorks"
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
        section-number="3"
        :title="$t('archive.title03')"
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
    <PageFooter />

    <WorkDetailModal
      :work="selectedWork"
      :visible="!!selectedWork"
      @close="closeDetail"
    />
  </div>
</template>

<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ArchiveAvailabilityPanel from '@/components/ArchiveAvailabilityPanel/index.vue'
import SectionCount from '@/components/SectionCount/index.vue'
import Sections from '@/components/Sections/index.vue'
import WorkCard from '@/components/WorkCard/index.vue'
import WorkDetailModal from '@/components/WorkDetailModal/index.vue'
import PageHeroTitle from '@/components/PageHeroTitle/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import type { ArchiveWork } from '@/types/archive'
import { trackProjectClick } from '@/utils/analytics'

const { tm } = useI18n()

const mainWorks = computed<ArchiveWork[]>(
  () => tm('archive.dynamic.WebArchives') as ArchiveWork[]
)

const personalWorks = computed<ArchiveWork[]>(
  () => tm('archive.dynamic.PersonalArchives') as ArchiveWork[]
)

const miscWorks = computed<ArchiveWork[]>(
  () => tm('archive.dynamic.MiscWorks') as ArchiveWork[]
)

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
</script>

<style lang="less" scoped>
.archives-page {
  width: 100%;
  color: #fff;
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

.personal-works-section {
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
</style>
