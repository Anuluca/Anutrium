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
      mobile-tall
    />

    <section
      class="availability-panel"
      aria-labelledby="availability-title"
      @animationend="startAvailabilityTyping"
    >
      <div class="availability-copy">
        <div class="availability-kicker">
          <span class="availability-signal" aria-hidden="true" />
          {{ $t('archive.statusKicker') }}
        </div>
        <h2 id="availability-title">
          <TypedText
            class="availability-type availability-type--title"
            :text="$t('archive.statusTitle')"
            :delay="820"
            :speed="38"
            :start="availabilityTypingReady"
          />
        </h2>
        <p>
          <TypedText
            class="availability-type availability-type--desc"
            :text="$t('archive.statusDescription')"
            :delay="1060"
            :speed="20"
            :start="availabilityTypingReady"
          />
        </p>
      </div>

      <div class="availability-grid">
        <div
          v-for="(item, index) in availabilityItems"
          :key="item.label"
          class="availability-item"
        >
          <span>{{ item.label }}</span>
          <strong>
            <TypedText
              class="availability-type availability-type--metric-value"
              :text="item.value"
              :delay="760 + index * 220"
              :speed="30"
              :start="availabilityTypingReady"
            />
          </strong>
        </div>
      </div>

      <div class="availability-actions">
        <a
          class="availability-cta"
          href="mailto:tilucario@outlook.com?subject=Anutrium%20Collaboration"
        >
          <span>{{ $t('archive.statusCta') }}</span>
          <span aria-hidden="true">↗</span>
        </a>
        <RouterLink
          class="availability-cta availability-cta--resume"
          to="/resume"
          @click="trackResumeOpen"
        >
          <span>{{ $t('archive.statusResumeCta') }}</span>
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <div class="availability-corner availability-corner--tl" />
      <div class="availability-corner availability-corner--br" />
    </section>

    <section class="works-section">
      <HomeSectionBlock
        section-number="01"
        rail-label="MAIN"
        :title="$t('archive.title01')"
        title-en="MAIN PROJECTS"
      >
        <div class="works-grid">
          <WorkCard
            v-for="(work, index) in mainWorks"
            :key="work.id"
            :work="work"
            :index="index"
            @select="openDetail(work)"
          />
        </div>
      </HomeSectionBlock>
    </section>

    <section class="works-section personal-works-section">
      <HomeSectionBlock
        section-number="02"
        rail-label="PERSONAL"
        :title="$t('archive.title02')"
        title-en="PERSONAL PROJECTS"
      >
        <div class="works-grid">
          <WorkCard
            v-for="(work, index) in personalWorks"
            :key="work.id"
            :work="work"
            :index="index"
            @select="openDetail(work)"
          />
        </div>
      </HomeSectionBlock>
    </section>

    <section class="misc-section">
      <HomeSectionBlock
        section-number="03"
        rail-label="OTHER"
        :title="$t('archive.title03')"
        title-en="OTHER PROJECTS"
      >
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
      </HomeSectionBlock>
    </section>
    <PageFooter cn-title="作品集" en-title="ARCHIVE" />

    <WorkDetailModal
      :work="selectedWork"
      :visible="!!selectedWork"
      @close="closeDetail"
    />
  </div>
</template>

<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeSectionBlock from '@/components/HomeSectionBlock/index.vue'
import WorkCard from '@/components/WorkCard/index.vue'
import WorkDetailModal from '@/components/WorkDetailModal/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import TypedText from '@/components/TypedText/index.vue'
import { trackEvent, trackProjectClick } from '@/utils/analytics'

const { t, tm } = useI18n()

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
  confidential?: boolean
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

const availabilityItems = computed(() => [
  {
    label: t('archive.statusWorkLabel'),
    value: t('archive.statusWorkValue'),
  },
  {
    label: t('archive.statusFreelanceLabel'),
    value: t('archive.statusFreelanceValue'),
  },
  {
    label: t('archive.statusLocationLabel'),
    value: t('archive.statusLocationValue'),
  },
])

const selectedWork = ref<WorkItem | MiscWork | null>(null)
const flashingMiscId = ref('')
const availabilityTypingReady = ref(false)
let miscErrorTimer: ReturnType<typeof setTimeout> | null = null

const openDetail = (work: WorkItem | MiscWork) => {
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

const startAvailabilityTyping = (event: AnimationEvent) => {
  if (availabilityTypingReady.value) return
  if (event.target !== event.currentTarget) return
  if (!event.animationName.includes('availabilityCrtOn')) return

  availabilityTypingReady.value = true
}

const trackResumeOpen = () => {
  trackEvent('resume_click', {
    source: 'availability_panel',
  })
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

.availability-panel {
  position: relative;
  display: grid;
  grid-template-columns: minmax(360px, 1.2fr) minmax(420px, 1fr) 148px;
  align-items: stretch;
  gap: 0;
  margin: 24px 0;
  overflow: hidden;
  border: 1px solid rgba(90, 212, 128, 0.34);
  background: linear-gradient(90deg, rgba(90, 212, 128, 0.09), transparent 34%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.018) 0 1px,
      transparent 1px 28px
    ),
    rgba(9, 10, 12, 0.92);
  opacity: 0;
  transform-origin: center;
  will-change: opacity, transform, filter;
  animation: availabilityCrtOn 0.52s cubic-bezier(0.19, 1, 0.22, 1) 0.08s both;

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 2;
    width: 3px;
    background: #5ad480;
    box-shadow: 0 0 18px rgba(90, 212, 128, 0.4);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 3px;
    z-index: 2;
    width: 28%;
    height: 1px;
    background: linear-gradient(90deg, #5ad480, transparent);
    pointer-events: none;
  }
}

.availability-type {
  max-width: 100%;
}

.availability-type--desc {
  display: block;
  white-space: normal;
}

.availability-copy {
  position: relative;
  min-width: 0;
  padding: 13px 22px 12px 24px;
  border-right: 1px solid rgba(255, 255, 255, 0.09);

  h2 {
    margin: 5px 0 3px;
    color: #fff;
    font-family: 'anton', 'cn-custom';
    font-size: 1rem;

    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  p {
    max-width: 720px;
    margin: 0;
    color: rgba(255, 255, 255, 0.48);
    font-family: 'source-han-sans-simplified-c', sans-serif;
    font-size: 0.4rem;
    line-height: 1.5;
  }
}

.availability-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #5ad480;
  font-family: 'cn-custom', monospace;
  font-size: 0.34rem;
  letter-spacing: 0.14em;
}

.availability-signal {
  width: 6px;
  height: 6px;
  border-radius: 1px;
  background: #5ad480;
  box-shadow: 0 0 10px rgba(90, 212, 128, 0.9);
  transform: rotate(45deg);
  animation: availabilityPulse 1.8s ease-in-out infinite;
}

.availability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-width: 0;
  background: rgba(255, 255, 255, 0.012);
}

.availability-item {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 12px 14px;

  & + & {
    border-left: 1px solid rgba(255, 255, 255, 0.09);
  }

  &::after {
    content: '';
    position: absolute;
    right: 7px;
    bottom: 7px;
    width: 4px;
    height: 4px;
    border-right: 1px solid rgba(90, 212, 128, 0.45);
    border-bottom: 1px solid rgba(90, 212, 128, 0.45);
  }

  > span {
    color: rgba(255, 255, 255, 0.3);
    font-family: 'source-han-sans-simplified-c', sans-serif;
    font-size: 0.42rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  > strong {
    overflow: hidden;
    color: rgba(255, 255, 255, 0.88);
    font-family: 'source-han-sans-simplified-c', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.availability-actions {
  display: grid;
  min-width: 0;
  border-left: 1px solid rgba(90, 212, 128, 0.28);
}

.availability-cta {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  color: #5ad480;
  background: linear-gradient(135deg, rgba(90, 212, 128, 0.09), transparent);
  font-family: 'cn-custom', 'source-han-sans-simplified-c';
  font-size: 0.34rem;
  letter-spacing: 0.04em;
  line-height: 1.5;
  text-decoration: none;
  transition: color 0.25s ease, background 0.25s ease;

  &::before {
    content: 'CONTACT';
    position: absolute;
    top: 7px;
    right: 9px;
    color: rgba(90, 212, 128, 0.22);
    font-size: 0.24rem;
    letter-spacing: 0.16em;
  }

  &:hover,
  &:focus-visible {
    color: #071009;
    background: #5ad480;
    outline: none;

    &::before {
      color: rgba(7, 16, 9, 0.4);
    }
  }
}

.availability-cta--resume {
  border-top: 1px solid rgba(90, 212, 128, 0.22);

  &::before {
    content: 'RESUME';
  }
}

.availability-corner {
  position: absolute;
  z-index: 3;
  width: 9px;
  height: 9px;
  pointer-events: none;

  &--tl {
    top: 4px;
    left: 7px;
    border-top: 1px solid rgba(90, 212, 128, 0.65);
    border-left: 1px solid rgba(90, 212, 128, 0.65);
  }

  &--br {
    right: 4px;
    bottom: 4px;
    border-right: 1px solid rgba(90, 212, 128, 0.65);
    border-bottom: 1px solid rgba(90, 212, 128, 0.65);
  }
}

@keyframes availabilityPulse {
  50% {
    opacity: 0.35;
    box-shadow: 0 0 3px rgba(90, 212, 128, 0.4);
  }
}

@keyframes availabilityCrtOn {
  0% {
    transform: scale3d(0, 0.005, 1);
    filter: brightness(6) contrast(2);
    opacity: 0;
  }
  45% {
    transform: scale3d(1, 0.005, 1);
    filter: brightness(4) contrast(1.5);
    opacity: 0.36;
  }
  72% {
    transform: scale3d(1, 0.7, 1);
    filter: brightness(1.8) contrast(1.18);
    opacity: 0.72;
  }
  100% {
    transform: scale3d(1, 1, 1);
    filter: brightness(1) contrast(1);
    opacity: 1;
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
    font-family: 'cn-custom', monospace;
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
    font-family: 'cn-custom', monospace;
    font-size: 0.48rem;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .misc-card-id {
    color: rgba(255, 255, 255, 0.15);
    font-family: 'cn-custom', monospace;
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
  .availability-panel {
    grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
  }

  .availability-actions {
    min-height: 48px;
    grid-column: 1 / -1;
    border-top: 1px solid rgba(90, 212, 128, 0.22);
    border-left: 0;
  }

  .availability-cta {
    min-height: 42px;
  }

  .works-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .misc-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .availability-panel {
    grid-template-columns: 1fr;
    margin: 18px 0;
  }

  .availability-copy {
    padding: 16px 18px 14px 20px;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);

    h2 {
      font-size: 0.95rem;
    }

    p {
      font-size: 0.62rem;
    }
  }

  .availability-kicker {
    font-size: 0.52rem;
  }

  .availability-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .availability-item {
    padding: 9px 6px;

    span {
      font-size: 0.62rem;
    }

    strong {
      font-size: 0.55rem;
    }
  }

  .availability-actions {
    border-top: 1px solid rgba(90, 212, 128, 0.22);
    border-left: 0;
  }

  .availability-cta {
    min-height: 48px;
    padding: 0 16px;
    font-size: 0.54rem;
  }

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
