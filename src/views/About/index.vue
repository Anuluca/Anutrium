<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown, DArrowRight, StarFilled } from '@element-plus/icons-vue'

import PokeAmice from '@/assets/img/about/pokeAmice.png'
import LogoRotating3D from '@/components/Logo_rotating3D/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'

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

const maxVisibleChangelogs = 4
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

const passionCrosshairActive = ref(false)
const passionCrosshairPosition = ref({
  x: 0,
  y: 0,
})

const passionCrosshairStyle = computed(() => ({
  '--passion-cross-x': `${passionCrosshairPosition.value.x}px`,
  '--passion-cross-y': `${passionCrosshairPosition.value.y}px`,
}))

const updatePassionCrosshair = (event: MouseEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  passionCrosshairPosition.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
  passionCrosshairActive.value = true
}

const hidePassionCrosshair = () => {
  passionCrosshairActive.value = false
}

const neighbors = ref([
  {
    name: 'DRRR情报屋',
    url: 'https://DRRR.anuluca.com',
    logo: 'https://assets.anuluca.com/Logo/drrrfavicon.svg',
    description: '《无头骑士异闻录》关系网｜非官方档案站',
  },
  {
    name: 'Poke Amice 宝可梦友会',
    url: 'http://pokeamice.com',
    logo: PokeAmice,
    description:
      '此处是由一位业余宝可梦爱好者Asimov创建的宝可梦全栈资料整理站点&个人研究据点。',
  },
])

const overflowingNeighborUrls = ref(new Set<string>())
const neighborDescElements = new Map<string, HTMLElement>()
let descMeasureRafId: number | null = null

const setNeighborDescRef = (url: string, element: Element | null) => {
  if (element instanceof HTMLElement) {
    neighborDescElements.set(url, element)
  } else {
    neighborDescElements.delete(url)
  }
}

const measureNeighborDescriptions = () => {
  const overflowingUrls = new Set<string>()

  neighborDescElements.forEach((element, url) => {
    const textElement = element.querySelector(
      '.nb-desc-text'
    ) as HTMLElement | null
    if (!textElement) return

    const overflowDistance = Math.ceil(
      textElement.scrollWidth - element.clientWidth
    )

    if (overflowDistance > 2) {
      overflowingUrls.add(url)
      element.style.setProperty('--nb-desc-distance', `${overflowDistance}px`)
    } else {
      element.style.removeProperty('--nb-desc-distance')
    }
  })

  overflowingNeighborUrls.value = overflowingUrls
}

const scheduleNeighborDescriptionMeasure = async () => {
  await nextTick()
  if (descMeasureRafId !== null) {
    window.cancelAnimationFrame(descMeasureRafId)
  }

  descMeasureRafId = window.requestAnimationFrame(() => {
    descMeasureRafId = null
    measureNeighborDescriptions()
  })
}

onMounted(() => {
  scheduleNeighborDescriptionMeasure()
  window.addEventListener('resize', scheduleNeighborDescriptionMeasure, {
    passive: true,
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleNeighborDescriptionMeasure)
  if (descMeasureRafId !== null) window.cancelAnimationFrame(descMeasureRafId)
})

watch(locale, scheduleNeighborDescriptionMeasure)
</script>

<template>
  <div class="about-page main-container">
    <PageHeader
      header-label="[HUAHUA_THE_CAT]"
      title-en="ABOUT"
      title-cn="关于"
      meta-item="LEARN MORE ABOUT THIS PROJECT"
      primary-color="#5D3ABA"
    />

    <div class="about-top-grid">
      <section class="block changelog-block">
        <div class="section-header">
          <h3 class="section-title">
            <span class="changelog">&lt; CHANGELOG &gt;</span>
            <span class="cn">{{ t('about.changelogLabel') }}</span>
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
          @click="toggleChangelogList"
        >
          <span>
            {{ showAllChangelogs ? 'CLICK TO CLOSE' : 'CLICK TO EXPLORE' }}
          </span>
          <ArrowDown class="changelog-list-toggle__icon" aria-hidden="true" />
        </button>
      </section>

      <section
        class="passion-section no-cursor"
        :class="{ 'is-crosshair-active': passionCrosshairActive }"
        :style="passionCrosshairStyle"
        aria-labelledby="passion-title"
        @mouseenter="updatePassionCrosshair"
        @mousemove="updatePassionCrosshair"
        @mouseleave="hidePassionCrosshair"
      >
        <div class="passion-back">
          <LogoRotating3D
            class="passion-logo-bg"
            low-power
            transparent
            :interactive="false"
            aria-hidden="true"
          />
        </div>
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

            <div class="passion-divider" aria-hidden="true" />

            <div class="passion-copy">
              <p class="passion-kicker">
                <span>ANUTRIUM / </span>{{ t('about.brandColorKicker') }}
              </p>
              <h2
                id="passion-title"
                class="passion-title"
                :class="{ 'is-en': locale === 'en' }"
              >
                <span>{{ t('about.brandColorTitleLead') }}</span>
              </h2>
            </div>
          </div>
        </div>
        <div class="passion-crosshair" aria-hidden="true" />
      </section>
    </div>

    <section class="block">
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
            <span class="nb-node" aria-hidden="true" />
            <span class="nb-hover-chevron" aria-hidden="true" />

            <div class="nb-logo">
              <img
                :src="nb.logo"
                :alt="nb.name"
                loading="lazy"
                decoding="async"
              />
            </div>

            <div class="nb-info">
              <div class="nb-title-row">
                <h4 class="nb-name">{{ nb.name }}</h4>
                <span class="nb-host">{{ getNeighborHost(nb.url) }}</span>
              </div>
              <p
                :ref="(element) => setNeighborDescRef(nb.url, element)"
                class="nb-desc"
                :class="{
                  'is-overflowing': overflowingNeighborUrls.has(nb.url),
                }"
              >
                <span class="nb-desc-text">{{ nb.description }}</span>
              </p>
            </div>

            <DArrowRight class="nb-arrow" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>

    <!-- <footer class="about-footer">
      <span class="footer-text">&lt; DRIVEN BY PASSION. &gt;</span>
    </footer> -->
    <PageFooter cn-title="关于" en-title="ABOUT" />
  </div>
</template>

<style lang="less" scoped>
@red: #e23456;
@red-dim: rgba(226, 52, 86, 0.15);
@border: rgba(255, 255, 255, 0.07);
@text-dim: rgba(255, 255, 255, 0.4);
@card-bg: rgba(255, 255, 255, 0.025);

.about-page {
  margin: 0 auto;
  color: #fff;
}

.block {
  margin-bottom: 50px;
  content-visibility: auto;
  contain-intrinsic-size: 760px;
}

.about-top-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  align-items: stretch;
  gap: 28px;
  margin-bottom: 20px;

  > .block,
  > .passion-section {
    align-self: stretch;
    min-height: 0;
    height: auto;
    margin: 0;
  }

  > .block {
    content-visibility: visible;
    contain-intrinsic-size: auto;
  }
}

.changelog-block {
  min-width: 0;

  .section-header {
    margin-top: 0;
  }
}

.passion-section {
  position: relative;
  min-height: 0;
  isolation: isolate;
  overflow: hidden;
  margin: 30px 0 68px;
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgba(226, 52, 86, 0.12),
    0 0 30px rgba(226, 52, 86, 0.1);
  &:hover {
    .passion-color-code {
      text-shadow: 0 0 30px #e23456;
      color: #000;
    }
  }
}

.passion-crosshair {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  opacity: 0;

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

.passion-copy {
  position: relative;
  z-index: 3;
  text-align: left;
  margin-left: 40px;
  min-width: 0;
  padding: 0;
}

.passion-kicker {
  color: @red;
  font-family: 'cn-custom', 'alibaba-puhuiti', sans-serif;
  font-size: 18px;
  margin-top: 10px;
  text-transform: uppercase;

  span {
    font-family: 'cn-custom', 'alibaba-puhuiti', sans-serif;
    font-size: 15px;
  }
}

.passion-title {
  margin: 0;
  color: @red;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 38px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.05;
  white-space: normal;
  text-shadow: 0 0 18px rgba(226, 52, 86, 0.2);

  span {
    font-family: inherit;
  }

  &.is-en {
    font-size: clamp(23px, 2vw, 32px);
    letter-spacing: 0;
  }
}

.passion-description {
  max-width: 780px;
  margin: 24px auto 0;
  color: rgba(0, 0, 0, 0.6);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(14px, 1.05vw, 18px);
  font-weight: 700;
  letter-spacing: 0.025em;
  line-height: 1.65;
}

.passion-color-field {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: @red;
}

.passion-content {
  position: absolute;
  left: 28px;
  right: 28px;
  bottom: clamp(18px, 5%, 34px);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  max-width: 100%;
  text-align: center;
}

.passion-back {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background-color: #000;
  filter: saturate(0) sepia(1) saturate(3.2) hue-rotate(310deg) brightness(0.95)
    contrast(1.02);

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
  position: absolute;
  top: clamp(-34px, 1.4vw, 18px);
  left: 50%;
  z-index: 1;
  width: clamp(360px, 36vw, 480px) !important;
  height: clamp(360px, 36vw, 480px) !important;
  overflow: visible;
  transform: translateX(-50%) scaleX(1.2);
  opacity: 1;
  pointer-events: none;
  user-select: none;
  filter: brightness(0.95) contrast(1.1);

  &::before,
  &::after {
    display: none;
  }

  :deep(.scene-container) {
    width: 100%;
    height: 100%;
    background: transparent;
  }

  :deep(.canvas-container) {
    width: 100%;
    height: 100%;
    background: transparent;
  }

  :deep(canvas) {
    width: 100% !important;
    height: 100% !important;
    background: transparent !important;
    transform-origin: center;
  }

  :deep(.loading-text) {
    display: none;
  }
}

.passion-brand {
  position: relative;
  z-index: 2;
  min-width: 0;
}

.passion-divider {
  position: relative;
  z-index: 2;
  display: none;
}

.passion-field-meta {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: center;
  margin-top: 10px;
  gap: 13px;
  min-width: 0;
  color: @red;

  span {
    font-family: 'cn-custom', 'anton', monospace;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.14em;
    white-space: nowrap;
  }
}

.passion-field-name {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  color: @red;

  span,
  strong {
    font-family: 'alibaba-puhuiti', sans-serif;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  span {
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 11px;
    font-weight: 900;
  }

  strong {
    font-family: 'cn-custom', 'anton', sans-serif;
    font-size: 11px;
    color: @red;
  }
}

.passion-color-code {
  font-family: 'anton', 'cn-custom', sans-serif;
  font-size: clamp(46px, 4.2vw, 68px);
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
  margin-bottom: 10px;
  margin-top: 20px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-family: 'anton', 'alibaba-puhuiti';
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1;
  white-space: nowrap;
  .changelog {
    font-family: 'anton', 'alibaba-puhuiti';
    margin-top: -10px;
  }

  .cn {
    font-family: 'alibaba-puhuiti';
    font-size: 1rem;
    font-weight: 800;
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

  &::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 17px;
    width: 1px;
    content: '';
    background: rgba(226, 52, 86, 0.35);
  }
}

.timeline-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 20px;
  position: relative;
  align-items: stretch;

  &.is-major {
    grid-template-columns: 20px 156px minmax(0, 1fr);
    min-height: 150px;

    .axis-diamond {
      border-color: @red;
      background: @red;
      box-shadow: 0 0 10px @red, 0 0 20px rgba(226, 52, 86, 0.4);

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
  letter-spacing: 1px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: calc(100% + 10px);
  min-height: 58px;
  margin: -58px 0 0;
  padding: 8px 16px;
  border: 0;
  color: #e23456;
  background: linear-gradient(
    to top,
    rgba(5, 2, 6, 0.96) 0%,
    rgba(5, 2, 6, 0) 100%
  );
  box-shadow: inset 0 0 24px rgba(226, 52, 86, 0.045);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  font-family: 'anton', monospace;
  font-size: 0.64rem;
  letter-spacing: 0.14em;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: linear-gradient(
        to top,
        rgba(5, 2, 6, 0.96) 0%,
        rgba(5, 2, 6, 0) 100%
      ),
      rgba(226, 52, 87, 0.141);
    box-shadow: inset 0 0 28px rgba(226, 52, 86, 0.08);
  }

  &.is-expanded {
    margin-top: 12px;
    padding: 12px 16px;

    .changelog-list-toggle__icon {
      transform: rotate(180deg);
    }
  }

  &__icon {
    width: 18px;
    height: 18px;
    transition: transform 0.25s ease;
  }
}

.neighbors-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.neighbor-item {
  position: relative;
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
  --neighbor-corner-size: 18px;
  --neighbor-corner-x: var(--neighbor-corner-size);
  --neighbor-corner-y: var(--neighbor-corner-size);
  --neighbor-frame-offset: calc(1px + 1px);
  --neighbor-frame-stroke: 1px;
  --neighbor-inner-bg: transparent;
  --neighbor-frame-color: rgba(114, 36, 52, 0.82);
  --neighbor-inner-bg: linear-gradient(
      rgba(226, 52, 86, 0.05),
      rgba(5, 5, 5, 0.08)
    ),
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.055) 0,
      rgba(255, 255, 255, 0.055) 1px,
      transparent 1px,
      transparent 5px
    ),
    rgba(5, 5, 5, 0.72);
  box-sizing: border-box;
  width: 100%;
  min-height: 86px;
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr) 46px;
  align-items: center;
  gap: 16px;
  padding: 16px 52px 16px 46px;
  text-decoration: none;
  color: #fff;
  position: relative;
  overflow: hidden;

  &:hover {
    --neighbor-frame-color: rgba(226, 52, 86, 0.82);
    --neighbor-inner-bg: linear-gradient(
        rgba(226, 52, 86, 0.05),
        rgba(5, 5, 5, 0.08)
      ),
      repeating-linear-gradient(
        0deg,
        rgba(255, 255, 255, 0.055) 0,
        rgba(255, 255, 255, 0.055) 1px,
        transparent 1px,
        transparent 5px
      ),
      rgba(5, 5, 5, 0.72);

    .nb-hover-chevron {
      transform: translateX(26%);
      opacity: 1;
    }

    .nb-logo {
      img {
        filter: brightness(1.06) saturate(1.16);
      }
    }

    .nb-node {
      background: @red;
      box-shadow: 0 0 0 6px rgba(226, 52, 86, 0.12),
        0 0 18px rgba(226, 52, 86, 0.65);
    }

    .nb-arrow {
      color: @red;
    }
  }

  &::before,
  &::after {
    position: absolute;
    content: '';
    pointer-events: none;
    clip-path: polygon(
      var(--neighbor-corner-x) 0,
      calc(100% - var(--neighbor-corner-x)) 0,
      100% var(--neighbor-corner-y),
      100% calc(100% - var(--neighbor-corner-y)),
      calc(100% - var(--neighbor-corner-x)) 100%,
      var(--neighbor-corner-x) 100%,
      0 calc(100% - var(--neighbor-corner-y)),
      0 var(--neighbor-corner-y)
    );
  }

  &::before {
    inset: var(--neighbor-frame-offset);
    z-index: 0;
    background: var(--neighbor-frame-color);
    transition: background 0.25s;
  }

  &::after {
    inset: calc(var(--neighbor-frame-offset) + var(--neighbor-frame-stroke));
    z-index: 1;
    background: var(--neighbor-inner-bg);
    transition: background 0.25s;
  }
}

.neighbor-card > :not(.nb-node):not(.nb-hover-chevron) {
  position: relative;
  z-index: 3;
}

.nb-hover-chevron {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  z-index: 2;
  opacity: 0;
  width: 64%;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.36);
  clip-path: polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%, 10% 50%);
  transform: translateX(-12%);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s;
}

.nb-node {
  position: absolute;
  left: -34px;
  top: 50%;
  z-index: 2;
  width: 9px;
  height: 9px;
  border: 1px solid @red;
  background: #050505;
  transform: translateY(-50%) rotate(45deg);
  transition: background 0.25s, box-shadow 0.25s;
}

.nb-logo {
  width: 50px;
  height: 50px;
  position: relative;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.86) saturate(0.86);
    transition: filter 0.25s;
  }
}

.nb-info {
  min-width: 0;
}

.nb-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.nb-host {
  flex-shrink: 0;
  max-width: 45%;
  text-overflow: ellipsis;
  font-family: 'anton', monospace;
  font-size: 0.58rem;
  letter-spacing: 1.4px;
  margin-bottom: 5px;
  color: rgba(226, 52, 86, 0.72);
  white-space: nowrap;
}

.nb-name {
  flex: 1 1 auto;
  min-width: 0;
  font-family: 'alibaba-puhuiti', monospace;
  font-size: 0.8rem;
  font-weight: 900;
  color: #fff;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nb-host {
  color: rgba(255, 255, 255, 0.28);
}

.nb-desc {
  display: block;
  font-family: 'alibaba-puhuiti', monospace;
  font-size: 0.54rem;
  color: @text-dim;
  line-height: 1.45;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }

  &.is-overflowing {
    .nb-desc-text {
      padding-right: 1.2rem;
      animation: nbDescScroll 7.2s ease-in-out 0.8s infinite alternate;
    }
  }
}

.nb-desc-text {
  display: inline-block;
  min-width: max-content;
  font-size: 0.5rem;
  font-weight: 700;
  font-style: italic;
  will-change: transform;
}

.nb-arrow {
  justify-self: center;
  align-self: center;
  width: 28px;
  height: 28px;
  color: rgba(226, 52, 86, 0.45);
  transition: color 0.25s;
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

@keyframes nbDescScroll {
  0%,
  18% {
    transform: translateX(0);
  }

  82%,
  100% {
    transform: translateX(calc(var(--nb-desc-distance, 0px) * -1));
  }
}

.about-footer {
  text-align: center;
  border-top: 1px solid @border;
}

.footer-text {
  font-family: 'anton', monospace;
  font-size: 1.2rem;
  letter-spacing: 4px;
  line-height: 2rem;
  color: @red;
  filter: drop-shadow(0 0 10px @red);
}

@media (max-width: 768px) {
  .about-top-grid {
    display: flex;
    flex-direction: column;
    gap: 48px;
    margin: 32px 0 50px;

    > .block {
      height: auto;
    }

    > .passion-section {
      order: -1;
      display: block;
      width: 100%;
      aspect-ratio: 7 / 3;
      height: auto;
      min-height: 0;
      flex: 0 0 auto;
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

  .passion-color-field {
    inset: 0;
  }

  .passion-content {
    gap: 12px;
    left: 16px;
    right: 16px;
    bottom: 22px;
  }

  .passion-logo-bg {
    left: 50%;
    top: 14px;
    width: 128px !important;
    height: 128px !important;
    transform: translateX(-50%) scaleX(1.2);
    opacity: 0.95;

    :deep(.scene-container) {
      width: 100%;
      height: 100%;
    }

    :deep(canvas) {
      transform: scale(1.62);
    }
  }

  .passion-divider {
    display: none;
  }

  .passion-kicker {
    margin-bottom: 0;
    font-size: 17px;
    margin-top: -5px;

    span {
      font-size: 15px;
    }
  }

  .passion-color-code {
    font-size: clamp(38px, 11.8vw, 54px);
  }

  .passion-field-name {
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 8px;
    * {
      letter-spacing: 0 !important;
    }
  }

  .passion-title {
    font-size: clamp(28px, 7vw, 38px);
    line-height: 1.12;
  }

  .passion-field-meta {
    justify-self: start;
    gap: 8px;
    margin-top: 5px;

    span {
      font-size: 10px;
      line-height: 1.5;
    }
  }

  .section-title {
    font-size: 1.8rem;
  }

  .major-filter {
    min-height: 30px;
    padding: 4px 11px 6px;
    font-size: 0.66rem;
  }

  .timeline {
    min-width: 680px;
    padding-left: 8px;

    &::before {
      left: 17px;
    }
  }

  .timeline-item {
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 20px;

    &.is-major {
      grid-template-columns: 20px 156px minmax(0, 1fr);
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
      font-size: clamp(42px, 4.8vw, 64px);
    }

    small {
      margin-top: 12px;
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
      grid-template-columns: 154px minmax(0, 1fr);
      padding-right: 28px;
      column-gap: 22px;
    }

    &.is-major-card {
      padding-right: 28px;
    }
  }

  .log-inline-version {
    font-size: 1rem;
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

  .neighbors-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px;
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
    --neighbor-corner-size: 14px;
    min-height: auto;
    grid-template-columns: 32px minmax(0, 1fr) 22px;
    gap: 8px;
    padding: 20px 20px;
  }

  .nb-node {
    left: -27px;
    width: 8px;
    height: 8px;
  }

  .nb-logo {
    width: 32px;
    height: 32px;
  }

  .nb-name {
    font-size: 0.78rem;
  }

  .nb-desc {
    font-size: 0.66rem;
    margin-top: -6px;

    &.is-overflowing {
      .nb-desc-text {
        animation-duration: 8.8s;
      }
    }
  }

  .nb-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .nb-host {
    display: block;
    width: 100%;
    max-width: 100%;
    margin-bottom: 0;
    font-size: 0.48rem;
    letter-spacing: 0.8px;
  }

  .nb-arrow {
    width: 18px;
    height: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nb-desc.is-overflowing {
    overflow-x: auto;

    .nb-desc-text {
      animation: none;
    }
  }
}
</style>
