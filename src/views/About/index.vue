<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowDown,
  MoreFilled,
  Setting,
  StarFilled,
} from '@element-plus/icons-vue'

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
                  />
                </div>
              </div>

              <div class="nb-heading">
                <h4 class="nb-name">{{ nb.name }}</h4>
                <span class="nb-host">{{ getNeighborHost(nb.url) }}</span>
              </div>

              <p class="nb-desc">{{ nb.description }}</p>
            </div>

            <el-icon class="nb-arrow" aria-hidden="true">
              <MoreFilled />
            </el-icon>
          </a>
        </div>
      </div>
    </section>

    <PageFooter />
  </div>
</template>

<style lang="less" scoped>
@red: #e23456;
@border: rgba(255, 255, 255, 0.07);
@text-dim: rgba(255, 255, 255, 0.4);
@card-bg: rgba(255, 255, 255, 0.025);

.about-page {
  margin: 0 auto;
  color: #fff;
}

.about-hero-section {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: calc(100vh - 120px);
  height: calc(100dvh - 120px);
  padding-bottom: clamp(92px, 15dvh, 132px);

  > .passion-section {
    flex: 1 1 auto;
    width: 100%;
    height: auto;
    margin: clamp(12px, 2dvh, 20px) 0 0;
    aspect-ratio: 2.7 / 1;
  }
}

.block {
  margin-bottom: 50px;
  content-visibility: auto;
  contain-intrinsic-size: 760px;
}

.about-updates-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 28px;
  box-sizing: border-box;
  margin-bottom: 20px;

  > .block {
    align-self: stretch;
    min-height: 0;
    height: auto;
    margin: 0;
    content-visibility: visible;
    contain-intrinsic-size: auto;
  }

  > .block > .section-header {
    height: 50px;
    margin-top: 0;
  }
}

.about-scroll-hint {
  position: absolute;
  left: 50%;
  bottom: clamp(46px, 6dvh, 64px);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: rgba(255, 255, 255, 0.6);
  pointer-events: none;
  transform: translateX(-50%);
}

.about-scroll-hint__text {
  margin-bottom: 7px;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 12px;
  line-height: 12px;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.about-scroll-hint__line {
  position: relative;
  width: 1px;
  height: 30px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);

  &::after {
    position: absolute;
    inset: 0;
    content: '';
    background: @red;
    animation: aboutScrollHintDrop 1.4s cubic-bezier(0.77, 0, 0.175, 1) infinite;
  }
}

@keyframes aboutScrollHintDrop {
  from {
    transform: translateY(-100%);
  }

  to {
    transform: translateY(100%);
  }
}

.changelog-block {
  min-width: 0;

  .section-header {
    animation: changelogHeaderIn 0.46s cubic-bezier(0.2, 0.8, 0.2, 1) 0.32s both;
  }
}

.passion-section {
  --passion-fade-mask: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.28) 50%,
    #000 70%,
    #000 100%
  );

  position: relative;
  min-height: 0;
  isolation: isolate;
  margin: 30px 0 68px;
  border-radius: 2px;
  overflow: visible;

  &::after {
    position: absolute;
    inset: 0;
    z-index: 8;
    content: '';
    background: linear-gradient(
      to bottom,
      transparent 47%,
      rgba(255, 255, 255, 0.92) 50%,
      transparent 53%
    );
    opacity: 0;
    mix-blend-mode: screen;
    pointer-events: none;
    animation: passionCrtFlash 0.58s linear 0.44s both;
  }

  &:hover {
    .passion-color-code {
      text-shadow: 0 0 30px #e23456;
      color: #000;
    }
  }
}

.passion-back,
.passion-color-field {
  opacity: 0;
  animation: passionCrtOn 0.58s cubic-bezier(0.19, 1, 0.22, 1) 0.44s both;
}

@keyframes passionCrtOn {
  0% {
    opacity: 0;
    clip-path: inset(49.7% 50%);
    filter: brightness(7) contrast(2);
  }

  44% {
    opacity: 1;
    clip-path: inset(49.7% 0);
    filter: brightness(4) contrast(1.5);
  }

  58% {
    clip-path: inset(45% 0);
    filter: brightness(1.8) contrast(1.25);
  }

  100% {
    opacity: 1;
    clip-path: inset(0);
    filter: brightness(1) contrast(1);
  }
}

@keyframes passionCrtFlash {
  0%,
  37% {
    opacity: 0;
  }

  44% {
    opacity: 0.95;
  }

  58% {
    opacity: 0.28;
  }

  100% {
    opacity: 0;
  }
}

.passion-crosshair {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  opacity: 0;
  -webkit-mask-image: var(--passion-fade-mask);
  mask-image: var(--passion-fade-mask);

  &::before,
  &::after {
    position: absolute;
    content: '';
    background: @red;
  }

  &::before {
    top: 0;
    bottom: 0;
    left: var(--passion-cross-x);
    width: 1px;
    transform: translateX(-0.5px);
  }

  &::after {
    top: var(--passion-cross-y);
    left: 0;
    right: 0;
    height: 1px;
    transform: translateY(-0.5px);
  }
}

.passion-section.is-crosshair-active .passion-crosshair {
  opacity: 1;
}

.passion-color-field {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: @red;
}

.passion-content {
  position: absolute;
  left: 40px;
  right: 40px;
  bottom: clamp(46px, 10.5%, 74px);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
  text-align: center;
}

.passion-back {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  filter: saturate(0) sepia(1) saturate(3.2) hue-rotate(310deg) brightness(0.95)
    contrast(1.02);
  -webkit-mask-image: var(--passion-fade-mask);
  mask-image: var(--passion-fade-mask);

  &::before {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    content: '';
    background: linear-gradient(
        rgba(226, 52, 86, 0.08),
        rgba(226, 52, 86, 0.02)
      ),
      repeating-linear-gradient(
        0deg,
        rgba(255, 255, 255, 0.16) 0,
        rgba(255, 255, 255, 0.16) 1px,
        transparent 1px,
        transparent 5px
      );
    mix-blend-mode: screen;
    opacity: 0.42;
  }

  &::after {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    content: '';
    background: linear-gradient(
      180deg,
      transparent 0,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    opacity: 0.1;
    transform: translateY(-100%);
    animation: passion-scanline 4.8s linear infinite;
  }
}

@keyframes passion-scanline {
  to {
    transform: translateY(100%);
  }
}
.passion-logo-bg {
  --passion-logo-size: calc(
    clamp(660px, 60vw, 880px) - clamp(24px, 2.4vw, 34px)
  );
  --passion-logo-center-lift: 9.55vw;
  --passion-logo-canvas-scale: 1;
  --passion-logo-rest-transform: translate(
      -50%,
      calc(-50% - var(--passion-logo-center-lift))
    )
    scaleX(1.2);

  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: var(--passion-logo-size) !important;
  height: var(--passion-logo-size) !important;
  overflow: visible;
  transform: var(--passion-logo-rest-transform);
  pointer-events: none;
  user-select: none;
  filter: saturate(0) sepia(1) saturate(3.2) hue-rotate(310deg) brightness(0.95)
    contrast(1.1);
  animation: passionLogoDropIn 1.9s cubic-bezier(0.16, 1, 0.3, 1) 1.04s both;

  :deep(.scene-container),
  :deep(.canvas-container) {
    width: 100%;
    height: 100%;
  }

  :deep(canvas) {
    width: 100% !important;
    height: 100% !important;
    transform: scale(var(--passion-logo-canvas-scale));
    transform-origin: center;
  }
}

@keyframes passionLogoDropIn {
  from {
    opacity: 0;
    transform: translate(
        -50%,
        calc(-50% - var(--passion-logo-center-lift) - 130px)
      )
      scaleX(1.2);
  }

  to {
    opacity: 1;
    transform: var(--passion-logo-rest-transform);
  }
}

.passion-brand {
  min-width: 0;
}

.passion-field-meta {
  display: flex;
  justify-content: center;
  margin-top: 14px;
  gap: 16px;
  min-width: 0;
  color: @red;

  span {
    font-family: 'cn-custom', 'anton', monospace;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.14em;
    white-space: nowrap;
  }
}

.passion-field-name {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  color: @red;

  span,
  strong {
    font-family: 'alibaba-puhuiti', sans-serif;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  span {
    font-size: 16px;
  }

  strong {
    font-family: 'cn-custom', 'anton', sans-serif;
    font-size: 19px;
  }
}

.passion-color-code {
  font-family: 'anton', 'cn-custom', sans-serif;
  font-size: clamp(90px, 8vw, 132px);
  font-weight: 900;
  letter-spacing: -0.055em;
  margin-left: -12px;
  line-height: 0.9;
  white-space: nowrap;
  color: @red;
  text-shadow: 0 0 20px rgba(226, 52, 86, 0.24);

  span {
    margin-right: 0.025em;
    font-family: inherit;
    font-size: 0.42em;
    vertical-align: top;
  }
}

.section-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  height: 50px;
  margin-bottom: 10px;
  margin-top: 20px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  margin: 0;
  font-family: 'anton', 'alibaba-puhuiti';
  font-size: 1rem;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;

  .changelog {
    font-family: 'alibaba-puhuiti', sans-serif;
    margin-top: 0;
    font-size: inherit;
    line-height: inherit;
  }

  .cn {
    font-family: 'alibaba-puhuiti';
    font-size: inherit;
    font-weight: 800;
    line-height: inherit;
    opacity: 0.35;
    letter-spacing: 1px;
  }
}

.section-line {
  flex: 1;
  height: 1px;
  background: @border;
  margin-left: 8px;
  align-self: center;
}

.major-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 5px 14px 7px;
  border: 1px solid rgba(226, 52, 86, 0.36);
  color: rgba(255, 255, 255, 0.72);
  background: rgba(226, 52, 86, 0.035);
  cursor: pointer;
  font-family: 'alibaba-puhuiti', 'anton', sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 1px;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s, background 0.2s;

  &:hover {
    border-color: @red;
    color: #fff;
    background: rgba(226, 52, 86, 0.14);
  }

  &.is-active {
    border-color: #e23456;
    color: #000;
    background: #e23456;
  }
}

.filter-icon {
  width: 13px;
  height: 13px;
  color: currentColor;
  filter: drop-shadow(0 0 7px rgba(226, 52, 86, 0.75));
}

.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 30px;
  padding-left: 8px;
  perspective: 1000px;

  &::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 17px;
    width: 1px;
    content: '';
    background: rgba(226, 52, 86, 0.35);
    transform: scaleY(0);
    transform-origin: top;
    animation: changelogAxisIn 0.72s cubic-bezier(0.2, 0.8, 0.2, 1) 0.42s
      forwards;
  }
}

.timeline-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 20px;
  position: relative;
  align-items: stretch;
  opacity: 0;
  transform-origin: center top;
  animation: changelogItemIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)
    var(--changelog-enter-delay, 0.48s) both;

  &.is-major {
    grid-template-columns: 20px 156px minmax(0, 1fr);
    min-height: 150px;

    .axis-diamond {
      border-color: @red;
      background: @red;
      box-shadow: 0 0 10px @red;

      &::before {
        border-color: rgba(226, 52, 86, 0.3);
      }
    }
  }

  &.is-changelog-preview {
    height: 58px;
    max-height: 58px;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
    -webkit-mask-image: linear-gradient(
      to bottom,
      #000 0%,
      rgba(0, 0, 0, 0.82) 58%,
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      #000 0%,
      rgba(0, 0, 0, 0.82) 58%,
      transparent 100%
    );
  }
}

.axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
  padding-top: 44px;
}

.axis-diamond {
  z-index: 1;
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transform: rotate(45deg);
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -4px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: border-color 0.3s;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
          rgba(255, 255, 255, 0.3) 0%,
          rgba(255, 255, 255, 0.3) 100%
        )
        center/1px 100% no-repeat,
      linear-gradient(
          rgba(255, 255, 255, 0.3) 0%,
          rgba(255, 255, 255, 0.3) 100%
        )
        center/100% 1px no-repeat;
    opacity: 0.4;
  }
}

.axis-line {
  display: none;
}

.log-card {
  position: relative;
  border: 1px solid @border;
  background: @card-bg;
  min-width: 0;
  min-height: 84px;
  padding: 18px 28px 20px;
  transition: border-color 0.3s, background 0.3s;
  overflow: hidden;

  &:hover {
    border-color: #e23456;
    background: rgba(226, 52, 86, 0.12);
  }

  &.is-clickable {
    cursor: pointer;
    padding-right: 68px;
  }

  &.is-regular-card {
    display: grid;
    grid-template-columns: 153px minmax(0, 1fr);
    padding-right: 28px;
    column-gap: 22px;
  }

  &.is-major-card {
    padding-right: 28px;
  }

  &.is-expanded {
    .log-expand-icon {
      color: @red;
      transform: translateY(-50%) rotate(180deg);
    }
  }
}

.log-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 20px;
}

.log-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 104px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  background: rgba(255, 255, 255, 0.018);
  font-family: 'anton', 'alibaba-puhuiti', sans-serif;
  text-align: center;

  > span {
    font-size: 0.92rem;
    letter-spacing: 0.5px;
  }

  &.is-major {
    min-height: 150px;
    border-color: rgba(226, 52, 86, 0.62);
    background: rgba(0, 0, 0, 0.067);
    box-shadow: 0 0 18px rgba(226, 52, 86, 0.18);

    strong {
      font-family: 'anton', sans-serif;
      font-size: clamp(42px, 4.8vw, 64px);
      line-height: 0.95;
      letter-spacing: 1px;
      text-shadow: 0 0 40px #ef0030;
    }

    small {
      margin-top: 14px;
      color: rgba(255, 255, 255, 0.58);
      font-family: 'alibaba-puhuiti', sans-serif;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 1px;
    }
  }
}

.log-side-codename {
  font-family: 'anton', monospace;
  font-size: 0.6rem !important;
  box-shadow: 0 0 40px #ef0030;
  letter-spacing: 2px !important;
  color: #fff;
  background: @red;
  padding: 8px 8px;
  padding-top: 4px;
  padding-right: 5px;
  margin-top: 20px;
  line-height: 1;
  box-shadow: 0 0 12px rgba(226, 52, 86, 0.36);
}

.log-title-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.log-inline-version {
  flex-shrink: 0;
  align-self: center;
  justify-self: center;
  color: rgba(255, 255, 255, 0.88);
  font-family: 'anton', monospace;
  font-size: 1rem;
  letter-spacing: 0.5px;
  text-align: center;
  transform: translateX(-8px);

  &.is-simple-version {
    font-size: 1.12rem;
  }
}

.log-title {
  font-family: 'alibaba-puhuiti';
  font-size: clamp(18px, 1.55vw, 28px);
  font-weight: 900;
  letter-spacing: 0;
  color: #fff;
  min-width: 0;
  line-height: 1.2;
}

.log-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  white-space: nowrap;
}

.log-date {
  font-family: 'anton', monospace;
  font-size: 0.78rem;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.7);
}

.log-latest {
  padding: 3px 8px 5px;
  color: @red;
  border: 1px solid @red;
  font-family: 'anton', monospace;
  font-size: 0.58rem;
  letter-spacing: 1.5px;
  line-height: 1;
  box-shadow: 0 0 12px rgba(226, 52, 86, 0.4);
}

.log-details {
  list-style: none;
  padding: 14px 0 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-extra {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.38s cubic-bezier(0.22, 1, 0.36, 1),
    margin-top 0.38s cubic-bezier(0.22, 1, 0.36, 1);

  .log-card.is-expanded & {
    grid-template-rows: 1fr;
    margin-top: 8px;
  }
}

.log-details-extra {
  min-height: 0;
  overflow: hidden;
  padding-top: 0;
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity 0.24s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  .log-card.is-expanded & {
    opacity: 1;
    transform: translateY(0);
  }
}

.log-details li {
  display: flex;
  gap: 11px;
  font-family: 'alibaba-puhuiti', monospace;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.54);
}

.log-detail-text {
  min-width: 0;
}

.log-detail-highlight {
  color: rgba(255, 255, 255, 0.78);
}

.li-bullet {
  color: @red;
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 11px;
}

.log-expand-icon {
  position: absolute;
  bottom: 0;
  right: 22px;
  width: 24px;
  height: 24px;
  color: rgba(255, 255, 255, 0.36);
  pointer-events: none;
  transform: translateY(-50%);
  transition: color 0.2s, transform 0.25s;
}

.log-card.is-clickable:hover .log-expand-icon {
  color: rgba(226, 52, 86, 0.86);
}

.changelog-list-toggle {
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 52px;
  height: 40px;
  margin: -20px auto;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transform: translateY(0);
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);

  &__triangle {
    width: 32px;
    height: 22px;
    background: #e23456;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    pointer-events: none;
    rotate: 0deg;
    transform: scale(1);
    transform-origin: center;
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
      rotate 0.52s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover {
    transform: translateY(6px);

    .changelog-list-toggle__triangle {
      transform: scale(1.35);
    }
  }

  &.is-expanded {
    margin: 12px auto 0;

    .changelog-list-toggle__triangle {
      rotate: 180deg;
    }
  }
}

@keyframes changelogHeaderIn {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    clip-path: inset(0);
    transform: translateY(0);
  }
}

@keyframes changelogAxisIn {
  from {
    opacity: 0;
    transform: scaleY(0);
  }

  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes changelogItemIn {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0) rotateX(-8deg);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotateX(0);
  }
}

.roadmap-block {
  opacity: 0;
  animation: roadmapBlockIn 0.58s cubic-bezier(0.16, 1, 0.3, 1) 0.82s both;

  .section-header {
    animation: changelogHeaderIn 0.46s cubic-bezier(0.2, 0.8, 0.2, 1) 0.32s both;
  }
}

.roadmap-tags {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  margin-top: 24px;
  perspective: 1000px;
}

.roadmap-tag {
  --roadmap-accent: rgba(226, 52, 86, 0.72);

  position: relative;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  min-height: 78px;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.075);
  background: linear-gradient(90deg, rgba(226, 52, 86, 0.12), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.038), transparent 46%),
    rgba(8, 2, 8, 0.68);
  box-shadow: inset 0 0 0 1px rgba(226, 52, 86, 0.035),
    inset 0 -28px 42px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transform-origin: center top;
  animation: roadmapTagIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)
    var(--roadmap-enter-delay, 0.62s) both;
  transition: border-color 0.24s ease, background 0.24s ease,
    box-shadow 0.24s ease, transform 0.24s ease;

  &::before,
  &::after {
    position: absolute;
    content: '';
    pointer-events: none;
  }

  &::before {
    top: 0;
    bottom: 0;
    left: 72px;
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(226, 52, 86, 0.42) 76%,
      transparent
    );
  }

  &:hover {
    border-color: rgba(226, 52, 86, 0.38);
    background: linear-gradient(
      90deg,
      rgba(226, 52, 86, 0.17),
      transparent 38%
    );
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.26);
    transform: translateY(-2px);
  }
}

.roadmap-tag__index {
  position: relative;
  z-index: 1;
  display: grid;
  align-self: stretch;
  place-items: center;
  color: rgba(226, 52, 86, 0.78);
  font-family: 'anton', sans-serif;
  font-size: clamp(30px, 2.8vw, 46px);
  line-height: 1;
  margin-top: -8px;
  text-shadow: 0 0 18px rgba(226, 52, 86, 0.18);
}

.roadmap-tag__text {
  position: relative;
  z-index: 1;
  min-width: 0;
  padding: 18px 20px;
  color: rgba(255, 255, 255, 0.54);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(16px, 1.15vw, 21px);
  font-weight: 800;
  line-height: 1.32;
}

.roadmap-tag__gear {
  position: absolute;
  right: -22px;
  bottom: -30px;
  width: 104px;
  height: 104px;
  color: rgba(255, 255, 255, 0.12);
  pointer-events: none;
  transform: rotate(-16deg);
  transition: color 0.24s ease, transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.roadmap-tag:hover .roadmap-tag__gear {
  color: rgba(255, 255, 255, 0.2);
  transform: rotate(2deg) scale(1.04);
}

.roadmap-highlight {
  color: #fff;
  background: none;
  text-shadow: 0 0 18px rgba(226, 52, 86, 0.36);
}

@keyframes roadmapBlockIn {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes roadmapTagIn {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0) rotateX(-8deg);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotateX(0);
  }
}

.neighbors-block {
  opacity: 0;
  animation: neighborsBlockIn 0.56s cubic-bezier(0.16, 1, 0.3, 1) 1.16s both;
}

@keyframes neighborsBlockIn {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.neighbors-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
}

.neighbor-item {
  position: relative;

  &:not(:nth-child(3n + 1))::before,
  &:nth-child(n + 4)::after {
    position: absolute;
    z-index: 3;
    content: '';
    pointer-events: none;
    background: rgba(255, 255, 255, 0.1);
  }

  &:not(:nth-child(3n + 1))::before {
    top: 14px;
    bottom: 14px;
    left: 0;
    width: 1px;
  }

  &:nth-child(n + 4)::after {
    top: 0;
    left: 14px;
    right: 14px;
    height: 1px;
  }
}

.c-gear {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  vertical-align: middle;
}

.gear-diamonds {
  width: 34px;
  height: 30px;
  position: relative;
  flex-shrink: 0;
  transform: scaleY(0.78);
  transform-origin: center;

  i {
    position: absolute;
    width: 9px;
    height: 9px;
    box-sizing: border-box;
    background: #fff;
    transform: rotate(45deg);
    box-shadow: 0 0 7px rgba(255, 255, 255, 0.7);
    animation: gearDiamondBlink 1.45s ease-in-out infinite;
  }

  i:nth-child(1) {
    left: 12px;
    top: 1px;
  }

  i:nth-child(2) {
    left: 2px;
    top: 10px;
    animation-delay: 0.18s;
  }

  i:nth-child(3) {
    left: 12px;
    top: 19px;
    animation-delay: 0.36s;
  }

  .is-hollow {
    left: 22px;
    top: 10px;
    background: transparent;
    border: 1.5px solid #d91a8e;
    box-shadow: 0 0 8px rgba(217, 26, 142, 0.8);
    animation: none;
  }
}

.gear-letters {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  b {
    width: 20px;
    height: 18px;
    box-sizing: border-box;
    position: relative;
    display: block;
    clip-path: polygon(20% 0, 80% 0, 100% 50%, 80% 100%, 20% 100%, 0 50%);
    background: #fff;
    color: #111;
    font-family: Terminal, Monaco, 'Courier New', monospace;
    font-size: 0.58rem;
    font-weight: 900;
    line-height: 18px;
    box-shadow: 0 0 7px rgba(255, 255, 255, 0.62);

    span {
      position: absolute;
      left: 53%;
      top: 50%;
      display: block;
      line-height: 1;
      transform: translate(-50%, -50%) scaleY(0.78);
      transform-origin: center;
    }
  }
}

.neighbor-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  min-height: 84px;
  padding: 14px 64px;
  color: #fff;
  text-decoration: none;
  isolation: isolate;
  overflow: hidden;

  &::after {
    position: absolute;
    inset: 0;
    z-index: 0;
    content: '';
    background: @red;
    transform: scaleY(0);
    transform-origin: bottom center;
    transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
  }

  > * {
    position: relative;
    z-index: 1;
  }

  &:hover,
  &:focus-visible {
    color: #050505;

    &::after {
      transform: scaleY(1);
    }

    .nb-name,
    .nb-desc {
      color: #050505;
    }

    .nb-desc {
      opacity: 1;
      max-height: 120px;
      clip-path: inset(0);
    }

    .nb-logo {
      opacity: 0;
    }

    .nb-heading {
      transform: translateY(calc(-22px - 50%));
    }

    .nb-host {
      color: #1638c7;
    }

    .nb-arrow {
      color: #050505;
    }
  }

  &:focus-visible {
    outline: 1px solid rgba(226, 52, 86, 0.6);
    outline-offset: 3px;
  }
}

.nb-centered-content {
  --nb-top-slot-size: 56px;
  --nb-stack-gap: 8px;

  display: grid;
  grid-template-rows: var(--nb-top-slot-size) auto;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  justify-content: center;
  gap: var(--nb-stack-gap);
  max-width: 100%;
}

.nb-media-slot {
  position: relative;
  grid-row: 1;
  grid-column: 1;
  justify-self: center;
  width: 56px;
  height: 56px;
  min-width: 0;
}

.nb-logo {
  position: absolute;
  top: 0;
  left: 50%;
  width: 56px;
  height: 56px;
  box-sizing: border-box;
  overflow: hidden;
  opacity: 1;
  transform: translateX(-50%);
  transition: opacity 0.16s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.9) saturate(0.84);
  }
}

.nb-heading {
  grid-row: 2;
  grid-column: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  text-align: center;
  transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.nb-name {
  margin: 0;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(20px, 1.35vw, 24px);
  font-weight: 900;
  line-height: 1.2;
  color: #fff;
  transition: color 0.25s ease;
}

.nb-host {
  display: block;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 1.2px;
  color: rgba(226, 52, 86, 0.68);
  text-transform: uppercase;
  transform: scaleY(0.72);
  transform-origin: center;
  transition: color 0.25s ease;
}

.nb-desc {
  grid-row: 2;
  grid-column: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(280px, 46vw, 620px);
  max-width: 100%;
  max-height: 0;
  min-width: 0;
  margin: 0;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(15px, 1vw, 18px);
  font-weight: 500;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.28);
  text-align: center;
  white-space: normal;
  overflow: hidden;
  overflow-wrap: anywhere;
  opacity: 0;
  clip-path: inset(100% 0 0);
  transition: color 0.25s ease, opacity 0.2s ease, max-height 0.42s ease,
    clip-path 0.42s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: clip-path;
}

.nb-arrow {
  position: absolute !important;
  top: 50%;
  right: 30px;
  width: 22px;
  height: 22px;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.28);
  transform: translateY(-50%);
  transition: color 0.25s ease;
}

@keyframes gearDiamondBlink {
  0%,
  100% {
    opacity: 0.45;
    filter: brightness(0.75);
  }

  42% {
    opacity: 1;
    filter: brightness(1.35);
  }

  68% {
    opacity: 0.68;
    filter: brightness(0.95);
  }
}

@media (max-width: 768px) {
  .about-hero-section {
    padding-bottom: calc(clamp(84px, 14dvh, 112px) + 2.5dvh);

    > .passion-section {
      aspect-ratio: 7 / 3;
    }
  }

  .about-updates-grid {
    display: flex;
    flex-direction: column;
    gap: 48px;
    margin: 0 0 50px;

    > .block {
      height: auto;
    }
  }

  .changelog-block {
    overflow-x: auto;
    padding-bottom: 6px;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .passion-section {
    margin: 0;
  }

  .passion-content {
    left: 12px;
    right: 12px;
    bottom: 8dvh;
  }

  .passion-brand {
    width: 100%;
  }

  .passion-logo-bg {
    --passion-logo-size: 250px;
    --passion-logo-center-lift: 0px;
    --passion-logo-canvas-scale: 4;

    opacity: 0.95;
  }

  .passion-color-code {
    margin-left: -22px;
    font-size: clamp(115px, 34.2vw, 155px);
  }

  .passion-field-name {
    width: 100%;
    gap: 5px;
    margin-top: 14px;

    * {
      letter-spacing: 0 !important;
      font-size: 25px;
    }
  }

  .passion-field-meta {
    gap: 14px;
    margin-top: 9px;

    span {
      font-size: 22px;
      line-height: 1.5;
    }
  }

  .major-filter {
    min-height: 30px;
    padding: 4px 11px 6px;
    font-size: 0.66rem;
  }

  .timeline {
    min-width: 100%;
    box-sizing: border-box;
    padding-right: 1px;
    padding-left: 8px;

    &::before {
      left: 17px;
    }
  }

  .timeline-item {
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 20px;

    &.is-major {
      grid-template-columns: 30px 112px minmax(0, 1fr);
      gap: 10px;
      min-height: 150px;
    }
  }

  .axis {
    grid-row: auto;
    width: 20px;
    padding-top: 44px;
  }

  .log-side,
  .log-side.is-major {
    grid-column: auto;
    min-height: 104px;
    align-items: center;
    padding: 0;
  }

  .log-side.is-major {
    min-height: 150px;

    strong {
      font-size: clamp(30px, 3.6vw, 46px);
    }

    small {
      margin-top: 12px;
      font-size: 0.56rem;
    }
  }

  .log-card {
    grid-column: auto;
    min-height: 84px;
    padding: 18px 28px 20px;

    &.is-clickable {
      padding-right: 68px;
    }

    &.is-regular-card {
      grid-template-columns: 80px minmax(0, 1fr);
      padding-right: 28px;
      column-gap: 22px;
    }

    &.is-major-card {
      padding-right: 28px;
    }
  }

  .log-inline-version {
    font-size: 0.76rem;

    &.is-simple-version {
      font-size: 0.84rem;
    }
  }

  .log-latest {
    padding: 2px 6px 3px;
    font-size: 0.42rem;
    letter-spacing: 1px;
  }

  .log-expand-icon {
    right: 22px;
    width: 24px;
    height: 24px;
  }

  .log-head {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 20px;
  }

  .log-title-wrap {
    flex-wrap: nowrap;
    gap: 14px;
  }

  .log-title {
    font-size: clamp(18px, 1.55vw, 28px);
  }

  .log-right {
    justify-content: flex-end;
  }

  .log-details li {
    font-size: 15px;
  }

  .roadmap-tag__index {
    font-size: 1.3333rem;
  }

  .roadmap-tag__text {
    font-size: 0.72rem;
  }

  .neighbors-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .c-gear {
    height: 34px;
    gap: 4px;
  }

  .gear-diamonds {
    width: 34px;
    height: 30px;
    transform: scale(0.86, 0.67);
    transform-origin: left center;
  }

  .gear-letters {
    gap: 3px;

    b {
      width: 18px;
      height: 16px;
      font-size: 0.52rem;
    }
  }

  .neighbor-card {
    min-height: auto;
    padding: 12px 38px 12px 12px;

    &:hover,
    &:focus-visible {
      .nb-heading {
        transform: none;
      }

      .nb-desc {
        max-height: none;
        clip-path: none;
      }

      .nb-logo {
        opacity: 1;
      }
    }
  }

  .neighbor-item {
    &:not(:nth-child(3n + 1))::before,
    &:nth-child(n + 4)::after {
      display: none;
    }

    & + .neighbor-item::after {
      position: absolute;
      top: 0;
      left: 10px;
      right: 10px;
      z-index: 3;
      display: block;
      height: 1px;
      content: '';
      pointer-events: none;
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .nb-centered-content {
    display: grid;
    grid-template-columns: 44px max-content minmax(0, 1fr);
    grid-template-rows: auto;
    gap: 8px;
    width: 100%;
  }

  .nb-media-slot {
    grid-row: 1;
    grid-column: 1;
    width: 44px;
    height: 44px;
  }

  .nb-logo {
    top: 0;
    width: 44px;
    height: 44px;
  }

  .nb-name {
    font-size: 0.76rem;
    white-space: nowrap;
  }

  .nb-heading {
    grid-row: 1;
    grid-column: 2;
    align-items: flex-start;
    text-align: left;
  }

  .nb-desc {
    grid-row: 1;
    grid-column: 3;
    align-self: center;
    justify-content: flex-end;
    width: auto;
    max-height: none;
    padding-right: 16px;
    font-size: 0.48rem;
    line-height: 1.42;
    opacity: 1;
    text-align: right;
    white-space: normal;
    overflow-wrap: anywhere;
    clip-path: none;
  }

  .nb-host {
    font-size: 14px;
    letter-spacing: 1px;
  }

  .nb-arrow {
    right: 18px;
    width: 18px;
    height: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .about-scroll-hint__line::after {
    animation: none;
  }

  .changelog-block .section-header,
  .roadmap-block,
  .roadmap-block .section-header,
  .roadmap-tag,
  .timeline::before,
  .timeline-item {
    opacity: 1;
    animation: none;
    transform: none;
  }

  .changelog-list-toggle__triangle {
    transition: none;
  }

  .changelog-list-toggle {
    transition: none;
  }

  .passion-section {
    opacity: 1;
    animation: none;
    clip-path: none;
    filter: none;
    transform: none;

    &::after {
      animation: none;
    }
  }

  .passion-back,
  .passion-color-field {
    opacity: 1;
    animation: none;
    clip-path: none;
    filter: none;
  }

  .passion-logo-bg {
    opacity: 1;
    animation: none;
    transform: var(--passion-logo-rest-transform);
  }

  .neighbors-block {
    opacity: 1;
    animation: none;
    transform: none;
  }
}
</style>
