<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown, Setting, StarFilled } from '@element-plus/icons-vue'

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
const activeLogKey = ref<string | null>(null)
const majorOnly = ref(false)
const showAllChangelogs = ref(false)

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

const isMajorLog = (log: ChangelogItem) => log.version === 'v1.0'

const filteredChangelogs = computed(() => {
  return majorOnly.value
    ? changelogs.value.filter((log) => isMajorLog(log))
    : changelogs.value
})

const maxVisibleChangelogs = 3
const displayedChangelogs = computed(() =>
  showAllChangelogs.value
    ? filteredChangelogs.value
    : filteredChangelogs.value.slice(0, maxVisibleChangelogs + 1)
)
const hasMoreChangelogs = computed(
  () => filteredChangelogs.value.length > maxVisibleChangelogs
)

const latestLogVersion = computed(() => changelogs.value[0]?.version ?? '')

const getDefaultDetailCount = (log: ChangelogItem) => (isMajorLog(log) ? 4 : 1)

const getDefaultDetails = (log: ChangelogItem) =>
  log.details.slice(0, getDefaultDetailCount(log))

const getHiddenDetails = (log: ChangelogItem) =>
  log.details.slice(getDefaultDetailCount(log))

const hasHiddenDetails = (log: ChangelogItem) => {
  return log.details.length > getDefaultDetailCount(log)
}

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

const toggleMajorOnly = () => {
  majorOnly.value = !majorOnly.value
  activeLogKey.value = null
  showAllChangelogs.value = false
}

const toggleChangelogList = () => {
  showAllChangelogs.value = !showAllChangelogs.value
}

const toggleLog = (logKey: string) => {
  activeLogKey.value = activeLogKey.value === logKey ? null : logKey
}

const toggleLogDetails = (log: ChangelogItem) => {
  if (hasHiddenDetails(log)) toggleLog(log.version)
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

      <div class="about-scroll-hint">
        <span class="about-scroll-hint__text">{{ t('scroll') }}</span>
        <span class="about-scroll-hint__line" aria-hidden="true" />
      </div>
    </section>

    <div class="about-updates-grid">
      <section class="block changelog-block">
        <div class="section-header">
          <h3 class="section-title">
            <span class="changelog">
              &lt; {{ t('about.changelogTagLabel') }} /&gt;
            </span>
          </h3>
          <div class="section-line" />
          <button
            class="major-filter"
            type="button"
            :class="{ 'is-active': majorOnly }"
            @click="toggleMajorOnly"
          >
            <StarFilled class="filter-icon" aria-hidden="true" />
            {{ t('about.majorOnlyLabel') }}
          </button>
        </div>

        <div class="timeline">
          <div
            v-for="(log, logIndex) in displayedChangelogs"
            :key="log.version"
            class="timeline-item"
            :style="{
              '--changelog-enter-delay': `${0.48 + logIndex * 0.09}s`,
            }"
            :class="{
              'is-expanded': activeLogKey === log.version,
              'is-major': isMajorLog(log),
              'is-changelog-preview':
                !showAllChangelogs && logIndex === maxVisibleChangelogs,
            }"
          >
            <div class="axis">
              <div class="axis-diamond" />
              <div class="axis-line" />
            </div>

            <div v-if="isMajorLog(log)" class="log-side is-major">
              <strong>{{ log.version }}</strong>
              <span v-if="log.codename" class="log-side-codename">
                {{ log.codename }}
              </span>
              <small>{{ t('about.majorUpdateLabel') }}</small>
            </div>

            <div
              class="log-card"
              :class="{
                'is-major-card': isMajorLog(log),
                'is-regular-card': !isMajorLog(log),
                'is-clickable': hasHiddenDetails(log),
                'is-expanded': activeLogKey === log.version,
              }"
              :role="hasHiddenDetails(log) ? 'button' : undefined"
              :tabindex="hasHiddenDetails(log) ? 0 : undefined"
              @click="toggleLogDetails(log)"
              @keydown.enter.prevent="toggleLogDetails(log)"
              @keydown.space.prevent="toggleLogDetails(log)"
            >
              <span
                v-if="!isMajorLog(log)"
                class="log-inline-version"
                :class="{ 'is-simple-version': !log.version.includes('-') }"
              >
                {{ log.version }}
              </span>

              <div class="log-main">
                <div class="log-head">
                  <div class="log-title-wrap">
                    <span class="log-title">{{ log.title }}</span>
                    <span
                      v-if="log.version === latestLogVersion"
                      class="log-latest"
                    >
                      {{ t('about.latestLabel') }}
                    </span>
                  </div>
                  <div class="log-right">
                    <span class="log-date">{{ log.date }}</span>
                  </div>
                </div>

                <ul class="log-details">
                  <li v-for="(item, i) in getDefaultDetails(log)" :key="i">
                    <span class="li-bullet">◆</span>
                    <span class="log-detail-text">
                      <span
                        v-for="(segment, segmentIndex) in parseMarkedText(item)"
                        :key="segmentIndex"
                        :class="{
                          'log-detail-highlight': segment.highlighted,
                        }"
                      >
                        {{ segment.text }}
                      </span>
                    </span>
                  </li>
                </ul>

                <div v-if="hasHiddenDetails(log)" class="log-extra">
                  <ul class="log-details log-details-extra">
                    <li
                      v-for="(item, i) in getHiddenDetails(log)"
                      :key="`extra-${i}`"
                    >
                      <span class="li-bullet">◆</span>
                      <span class="log-detail-text">
                        <span
                          v-for="(segment, segmentIndex) in parseMarkedText(
                            item
                          )"
                          :key="segmentIndex"
                          :class="{
                            'log-detail-highlight': segment.highlighted,
                          }"
                        >
                          {{ segment.text }}
                        </span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <ArrowDown
                v-if="hasHiddenDetails(log)"
                class="log-expand-icon"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <button
          v-if="hasMoreChangelogs"
          class="changelog-list-toggle"
          :class="{ 'is-expanded': showAllChangelogs }"
          type="button"
          :aria-expanded="showAllChangelogs"
          :aria-label="
            showAllChangelogs ? 'Collapse changelog' : 'Expand changelog'
          "
          @click="toggleChangelogList"
        >
          <span class="changelog-list-toggle__triangle" aria-hidden="true" />
        </button>
      </section>

      <section class="block roadmap-block">
        <div class="section-header">
          <h3 class="section-title">
            <span class="changelog">
              &lt; {{ t('about.roadmapTagLabel') }} /&gt;
            </span>
          </h3>
          <div class="section-line" />
        </div>

        <div class="roadmap-tags">
          <div
            v-for="(item, roadmapIndex) in roadmapItems"
            :key="item"
            class="roadmap-tag"
            :style="{
              '--roadmap-enter-delay': `${0.62 + roadmapIndex * 0.1}s`,
            }"
          >
            <span class="roadmap-tag__index" aria-hidden="true">
              {{ String(roadmapIndex + 1).padStart(2, '0') }}
            </span>
            <span class="roadmap-tag__text">
              <span
                v-for="(segment, segmentIndex) in parseMarkedText(item)"
                :key="segmentIndex"
                :class="{ 'roadmap-highlight': segment.highlighted }"
              >
                {{ segment.text }}
              </span>
            </span>
            <Setting class="roadmap-tag__gear" aria-hidden="true" />
          </div>
        </div>
      </section>
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

            <span class="nb-return-icon" aria-hidden="true">↵</span>
          </a>
        </div>
      </div>
    </section>

    <PageFooter />
  </div>
</template>

<style src="./index.less" lang="less" scoped />
