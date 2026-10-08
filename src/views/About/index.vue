<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onClickOutside } from '@vueuse/core'

import LinkFlowMark from '@/components/LinkFlowMark/index.vue'
import LogoRotating3D from '@/components/Logo_rotating3D/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import PageHeroTitle from '@/components/PageHeroTitle/index.vue'

interface ChangelogItem {
  version: string
  codename: string | null
  date: string
  title: string
  details: string[]
}

interface MarkedTextSegment {
  highlighted: boolean
  text: string
}

interface NeighbourItem {
  name: string
  url: string
  logo: string
  description: string
}

const { locale, t, tm } = useI18n()
const activeAboutPanel = ref<'changelog' | 'roadmap' | null>(null)
const aboutPanelRef = ref<HTMLElement | null>(null)
const aboutTriggersRef = ref<HTMLElement | null>(null)

onClickOutside(
  aboutPanelRef,
  () => {
    activeAboutPanel.value = null
  },
  { ignore: [aboutTriggersRef] }
)

const toggleAboutPanel = (panel: 'changelog' | 'roadmap') => {
  activeAboutPanel.value = activeAboutPanel.value === panel ? null : panel
}

const getNeighborHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '')
  }
}

const changelogs = computed<ChangelogItem[]>(() => {
  return tm('about.dynamic.changelogs') as ChangelogItem[]
})

const parseMarkedText = (value: string): MarkedTextSegment[] => {
  const segments: MarkedTextSegment[] = []
  const markerPattern = /____([\s\S]+?)____|__([\s\S]+?)__/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = markerPattern.exec(value)) !== null) {
    if (match.index > cursor) {
      segments.push({
        highlighted: false,
        text: value.slice(cursor, match.index),
      })
    }

    segments.push({
      highlighted: true,
      text: match[1] ?? match[2],
    })
    cursor = markerPattern.lastIndex
  }

  if (cursor < value.length) {
    segments.push({
      highlighted: false,
      text: value.slice(cursor),
    })
  }

  return segments
}

const updatePassionCrosshair = (event: MouseEvent) => {
  const section = event.currentTarget as HTMLElement
  const rect = section.getBoundingClientRect()
  section.style.setProperty(
    '--passion-cross-x',
    `${event.clientX - rect.left}px`
  )
  section.style.setProperty(
    '--passion-cross-y',
    `${event.clientY - rect.top}px`
  )
}

const showPassionCrosshair = (event: MouseEvent) => {
  const section = event.currentTarget as HTMLElement
  section.classList.add('is-crosshair-active')
  updatePassionCrosshair(event)
}

const hidePassionCrosshair = (event: MouseEvent) => {
  const section = event.currentTarget as HTMLElement
  section.classList.remove('is-crosshair-active')
}

const neighbors = computed<NeighbourItem[]>(() => {
  return tm('about.dynamic.neighbours') as NeighbourItem[]
})

const roadmapItems = computed<string[]>(() => {
  return tm('about.dynamic.roadmap') as string[]
})
</script>

<template>
  <div class="about-page main-container">
    <div class="about-hero-shell">
      <section class="about-hero-section">
        <PageHeroTitle />

        <section
          class="passion-section no-cursor"
          :aria-label="t('about.brandColorName')"
          @mouseenter="showPassionCrosshair"
          @mousemove="updatePassionCrosshair"
          @mouseleave="hidePassionCrosshair"
        >
          <div class="passion-back" />
          <LogoRotating3D
            class="passion-logo-bg"
            low-power
            mobile-high-resolution
            transparent
            resource-cache-key="about-passion-logo"
            render-mode="edges"
            edge-color="#E23456"
            :edge-width="1"
            :interactive="false"
            aria-hidden="true"
          />
          <div class="passion-color-field">
            <div class="passion-content">
              <div class="passion-brand">
                <div class="passion-field-name">
                  <strong>PASSION RED</strong>
                  <span v-if="locale !== 'en'">
                    {{ t('about.brandColorName') }}
                  </span>
                </div>
                <div class="passion-color-code"><span>#</span>E23456</div>

                <div class="passion-field-meta">
                  <span>RGB / 226 · 52 · 86</span>
                </div>
              </div>
            </div>
          </div>
          <div class="passion-crosshair" aria-hidden="true" />
        </section>
      </section>

      <div class="about-update-dock no-rem">
        <section
          v-if="activeAboutPanel"
          :key="activeAboutPanel"
          ref="aboutPanelRef"
          class="about-update-dock__panel"
          :aria-label="
            t(
              activeAboutPanel === 'changelog'
                ? 'about.changelogTagLabel'
                : 'about.roadmapTagLabel'
            )
          "
          @keydown.esc.stop="activeAboutPanel = null"
        >
          <header class="update-program__bar">
            <button
              class="update-program__collapse"
              type="button"
              :aria-label="locale === 'en' ? 'Close updates' : '收起更新'"
              @click="activeAboutPanel = null"
            >
              <span aria-hidden="true">×</span>
            </button>
            <span class="update-program__path">
              C:\{{
                activeAboutPanel === 'changelog' ? 'CHANGELOG' : 'ROADMAP'
              }}.PROGRAM
            </span>
          </header>

          <div class="update-program__body" data-lenis-nested-scroll>
            <div class="update-program__body-content">
              <div
                v-if="activeAboutPanel === 'changelog'"
                id="about-changelog-panel"
                class="update-program__entries"
              >
                <section
                  v-for="log in changelogs"
                  :key="log.version"
                  class="update-program__entry"
                >
                  <div class="update-program__meta">
                    <strong>{{ log.version }}</strong>
                    <span v-if="log.codename">{{ log.codename }}</span>
                    <time :datetime="log.date">{{ log.date }}</time>
                  </div>
                  <h3>{{ log.title }}</h3>
                  <ul class="update-program__details">
                    <li
                      v-for="(item, detailIndex) in log.details"
                      :key="detailIndex"
                    >
                      <span class="update-program__bullet" aria-hidden="true"
                        >›</span
                      >
                      <span>
                        <span
                          v-for="(segment, segmentIndex) in parseMarkedText(
                            item
                          )"
                          :key="segmentIndex"
                          :class="{
                            'update-program__highlight': segment.highlighted,
                          }"
                          >{{ segment.text }}</span
                        >
                      </span>
                    </li>
                  </ul>
                </section>
              </div>
              <div
                v-else
                id="about-roadmap-panel"
                class="update-program__entries"
              >
                <section
                  v-for="item in roadmapItems"
                  :key="item"
                  class="update-program__entry update-program__entry--roadmap"
                >
                  <h3>
                    <span
                      v-for="(segment, segmentIndex) in parseMarkedText(item)"
                      :key="segmentIndex"
                      :class="{
                        'update-program__highlight': segment.highlighted,
                      }"
                      >{{ segment.text }}</span
                    >
                  </h3>
                </section>
              </div>
            </div>
          </div>
        </section>

        <div ref="aboutTriggersRef" class="about-update-dock__triggers">
          <button
            class="about-update-trigger"
            :class="{ 'is-active': activeAboutPanel === 'changelog' }"
            type="button"
            aria-controls="about-changelog-panel"
            :aria-expanded="activeAboutPanel === 'changelog'"
            @click="toggleAboutPanel('changelog')"
          >
            <span>&lt;{{ t('about.changelogTagLabel') }}/&gt;</span>
          </button>
          <button
            class="about-update-trigger"
            :class="{ 'is-active': activeAboutPanel === 'roadmap' }"
            type="button"
            aria-controls="about-roadmap-panel"
            :aria-expanded="activeAboutPanel === 'roadmap'"
            @click="toggleAboutPanel('roadmap')"
          >
            <span>&lt;{{ t('about.roadmapTagLabel') }}/&gt;</span>
          </button>
        </div>
      </div>
    </div>

    <section id="about-neighbors" class="block neighbors-block">
      <div class="section-header">
        <h3 class="section-title">
          <span class="c-gear" aria-hidden="true">
            <span class="gear-diamonds">
              <i />
              <i />
              <i />
              <i class="is-hollow" />
            </span>
            <span class="gear-letters">
              <b><span>G</span></b>
              <b><span>E</span></b>
              <b><span>A</span></b>
              <b><span>R</span></b>
            </span>
          </span>
          <span class="cn">友情链接</span>
        </h3>
        <div class="section-line" />
      </div>

      <div class="neighbors-grid">
        <div v-for="nb in neighbors" :key="nb.url" class="neighbor-item">
          <a
            :href="nb.url"
            target="_blank"
            rel="noopener noreferrer"
            class="neighbor-card"
          >
            <div class="nb-centered-content">
              <div class="nb-media-slot">
                <div class="nb-logo">
                  <img
                    :src="nb.logo"
                    :alt="nb.name"
                    loading="lazy"
                    decoding="async"
                    width="160"
                    height="160"
                  />
                </div>
              </div>

              <div class="nb-heading">
                <h4 class="nb-name">{{ nb.name }}</h4>
                <span class="nb-host">{{ getNeighborHost(nb.url) }}</span>
              </div>

              <p class="nb-desc">{{ nb.description }}</p>
            </div>

            <LinkFlowMark />
          </a>
        </div>
      </div>
    </section>

    <PageFooter />
  </div>
</template>

<style src="./index.less" lang="less" scoped />
