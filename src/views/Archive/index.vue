<template>
  <div class="archives-page main-container">
    <PageHeader
      header-label="[MENTOR_NV42]"
      title-en="ARCHIVE"
      title-cn="作品集"
      :meta-item="
        'TOTAL — ' +
        (mainWorks.length + personalWorks.length + miscWorks.length) +
        ' PROJECTS'
      "
      primary-color="#5AD480"
    />

    <section class="works-section">
      <h2 class="section-title" data-section="01">
        {{ $t('archive.title01') }}
      </h2>
      <div class="works-grid">
        <WorkCard
          v-for="(work, index) in mainWorks"
          :key="work.id"
          :work="work"
          :index="index"
          @select="openDetail(work)"
        />
      </div>
    </section>

    <section class="works-section personal-works-section">
      <h2 class="section-title" data-section="02">
        {{ $t('archive.title02') }}
      </h2>
      <div class="works-grid">
        <WorkCard
          v-for="(work, index) in personalWorks"
          :key="work.id"
          :work="work"
          :index="index"
          @select="openDetail(work)"
        />
      </div>
    </section>

    <section class="misc-section">
      <h2 class="section-title" data-section="03">
        {{ $t('archive.title03') }}
      </h2>
      <div class="misc-grid">
        <div
          v-for="(item, index) in miscWorks"
          :key="item.id"
          class="misc-card"
          :class="{
            'has-detail': hasMiscDetail(item),
            'is-error': flashingMiscId === item.id,
          }"
          role="button"
          tabindex="0"
          @click="openMiscDetail(item)"
          @keydown.enter.prevent="openMiscDetail(item)"
          @keydown.space.prevent="openMiscDetail(item)"
        >
          <div class="misc-card-content">
            <div class="misc-card-head">
              <div class="misc-card-index">
                {{ String(index + 1).padStart(2, '0') }}
              </div>
              <div v-if="item.logo" class="misc-card-logo" aria-hidden="true">
                <img
                  :src="item.logo"
                  :alt="item.company"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <h4 class="misc-card-title">{{ item.title }}</h4>
            <div class="misc-card-footer">
              <div class="misc-card-company">{{ item.company }}</div>
              <div class="misc-card-id">{{ item.id }}</div>
            </div>
          </div>
          <div class="corner corner-tl" />
          <div class="corner corner-tr" />
          <div class="corner corner-bl" />
          <div class="corner corner-br" />
        </div>
      </div>
    </section>
    <PageFooter cn-title="作品集" en-title="ARCHIVE" />

    <WorkDetailModal
      :work="selectedWork"
      :visible="!!selectedWork"
      @close="selectedWork = null"
    />
  </div>
</template>

<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import WorkCard from '@/components/WorkCard/index.vue'
import WorkDetailModal from '@/components/WorkDetailModal/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const { tm } = useI18n()

interface WorkItem {
  id: string
  title: string
  tags: string[]
  img: string
  company: string
  logo: string
  time?: string
  description?: string
  images?: string[]
  link?: string
  links?: Array<{ label: string; url: string; icon?: string }>
}

interface MiscWork {
  id: string
  title: string
  company: string
  logo?: string
  description?: string
  images?: string[]
  link?: string
  tags?: string[]
}

const mainWorks = computed<WorkItem[]>(
  () => tm('archive.dynamic.WebArchives') as WorkItem[]
)

const personalWorks = computed<WorkItem[]>(
  () => tm('archive.dynamic.PersonalArchives') as WorkItem[]
)

const miscWorks = computed<MiscWork[]>(
  () => tm('archive.dynamic.MiscWorks') as MiscWork[]
)

const selectedWork = ref<WorkItem | MiscWork | null>(null)
const flashingMiscId = ref('')
let miscErrorTimer: ReturnType<typeof setTimeout> | null = null

const openDetail = (work: WorkItem | MiscWork) => {
  selectedWork.value = work
}

const hasMiscDetail = (work: MiscWork) => {
  return (
    typeof work.description === 'string' && work.description.trim().length > 0
  )
}

const triggerMiscError = (id: string) => {
  if (miscErrorTimer) clearTimeout(miscErrorTimer)

  flashingMiscId.value = ''
  requestAnimationFrame(() => {
    flashingMiscId.value = id
  })

  miscErrorTimer = setTimeout(() => {
    if (flashingMiscId.value === id) flashingMiscId.value = ''
    miscErrorTimer = null
  }, 720)
}

const openMiscDetail = (work: MiscWork) => {
  if (hasMiscDetail(work)) {
    openDetail(work)
    return
  }

  triggerMiscError(work.id)
}

onBeforeUnmount(() => {
  if (miscErrorTimer) clearTimeout(miscErrorTimer)
})
</script>

<style lang="less" scoped>
@red: #e23456;
@red-dim: rgba(226, 52, 86, 0.15);
@border: rgba(255, 255, 255, 0.08);
@text-dim: rgba(255, 255, 255, 0.4);
@card-bg: rgba(13, 9, 18, 0.8);

.archives-page {
  width: 100%;
  color: #fff;
}

.section-title {
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 1.2rem;
  font-weight: 900;
  color: @red;
  border-bottom: 1px solid var(--opacity-color2);
  padding-bottom: 20px;
  margin-bottom: 20px;

  .section-cn {
    font-family: 'source-han-sans-simplified-c';
    font-size: 0.9rem;
    opacity: 0.6;
    margin-left: 10px;
  }

  &::before {
    content: attr(data-section);
    display: inline-block;
    background: @red;
    color: #000;
    padding: 2px 12px;
    margin-right: 8px;
    font-size: 1.1rem;
    line-height: 1.2;
    clip-path: polygon(0% 50%, 15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%);
  }
}

.corner {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 3;
  pointer-events: none;
  transition: all 0.4s ease;

  &-tl {
    top: 15px;
    left: 15px;
    border-right: 0;
    border-bottom: 0;
  }
  &-tr {
    top: 15px;
    right: 15px;
    border-left: 0;
    border-bottom: 0;
  }
  &-bl {
    bottom: 15px;
    left: 15px;
    border-right: 0;
    border-top: 0;
  }
  &-br {
    bottom: 15px;
    right: 15px;
    border-left: 0;
    border-top: 0;
  }
}

.works-section {
  padding: 30px 0;
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
}

.misc-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.misc-card {
  position: relative;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid @border;
  outline: none;
  background: linear-gradient(135deg, rgba(226, 52, 86, 0.08), transparent 42%),
    rgba(13, 9, 18, 0.78);
  cursor: pointer;
  transition: transform 0.4s ease, border-color 0.4s ease,
    background-color 0.4s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    opacity: 0.35;
    background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.035) 1px,
        transparent 1px
      ),
      linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: 22px 22px;
    transition: opacity 0.2s;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
    width: 44%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(226, 52, 86, 0.08));
    clip-path: polygon(28% 0, 100% 0, 100% 100%, 0 100%);
    pointer-events: none;
  }

  &:focus-visible {
    border-color: rgba(226, 52, 86, 0.65);
    box-shadow: 0 0 0 2px rgba(226, 52, 86, 0.22);
  }

  &.is-error {
    animation: miscDetailError 0.72s ease both;

    &::before {
      animation: miscDetailErrorGrid 0.72s ease both;
    }

    &::after {
      animation: miscDetailErrorWash 0.72s ease both;
    }

    .corner {
      border-color: @red;
    }
  }

  &:hover {
    border-color: @red;
    transform: translateY(-2px);

    &::before {
      opacity: 0.55;
    }

    .misc-card-index {
      color: @red;
    }

    .misc-card-title {
      color: #fff;
    }

    .misc-card-logo {
      opacity: 1;
      filter: grayscale(0) contrast(1);
      border-color: rgba(135, 135, 135, 0.75);
      background: rgba(226, 52, 86, 0.1);
    }

    .corner {
      width: 10px;
      height: 10px;
      border-color: @red;
      border-width: 1.2px;
    }
  }

  .misc-card-content {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: space-between;
    padding: 18px;
  }

  .misc-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .misc-card-index {
    color: rgba(255, 255, 255, 0.3);
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.5rem;
    letter-spacing: 1.5px;
    transition: color 0.3s ease;
  }

  .misc-card-logo {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 2px solid rgba(184, 184, 184, 0.28);
    background: rgba(0, 0, 0, 0.22);
    opacity: 0.62;
    filter: contrast(1.05);
    transition: opacity 0.3s ease, filter 0.3s ease, border-color 0.3s ease,
      background 0.3s ease;

    img {
      max-width: 100%;
      max-height: 100%;
      display: block;
      object-fit: contain;
    }
  }

  .misc-card-title {
    display: -webkit-box;
    margin: -18px 0 12px;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.95);
    font-family: 'anton', 'source-han-sans-simplified-c';
    font-size: 0.75rem;
    font-weight: 900;
    line-height: 1.2;
    letter-spacing: 0.3px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .misc-card-footer {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }

  .misc-card-company {
    margin-bottom: 2px;
    color: @text-dim;
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.48rem;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .misc-card-id {
    color: rgba(255, 255, 255, 0.15);
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.43rem;
    letter-spacing: 0.8px;
  }

  .corner {
    width: 8px;
    height: 8px;

    &-tl {
      top: 8px;
      left: 8px;
    }

    &-tr {
      top: 8px;
      right: 8px;
    }

    &-bl {
      bottom: 8px;
      left: 8px;
    }

    &-br {
      right: 8px;
      bottom: 8px;
    }
  }
}

@keyframes miscDetailError {
  0%,
  100% {
    border-color: @border;
    box-shadow: none;
  }

  12%,
  42% {
    border-color: @red;
    box-shadow: 0 0 0 1px rgba(226, 52, 86, 0.4),
      0 0 22px rgba(226, 52, 86, 0.28);
  }

  24%,
  54% {
    border-color: rgba(255, 255, 255, 0.18);
    box-shadow: none;
  }
}

@keyframes miscDetailErrorGrid {
  0%,
  100% {
    opacity: 0.35;
  }

  12%,
  42% {
    opacity: 0.85;
  }

  24%,
  54% {
    opacity: 0.45;
  }
}

@keyframes miscDetailErrorWash {
  0%,
  100% {
    background: linear-gradient(90deg, transparent, rgba(226, 52, 86, 0.08));
  }

  12%,
  42% {
    background: linear-gradient(
      90deg,
      rgba(226, 52, 86, 0.12),
      rgba(226, 52, 86, 0.42)
    );
  }

  24%,
  54% {
    background: linear-gradient(90deg, transparent, rgba(226, 52, 86, 0.14));
  }
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

  .misc-card {
    min-height: 120px;
  }
}
</style>
