<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  onClickOutside,
  useElementBounding,
  useResizeObserver,
} from '@vueuse/core'

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
const crewRoles = [
  'originalConcept',
  'creativeDirection',
  'visualDesign',
  'engineering',
  'motion',
  'photography',
  'editorial',
  'maintenance',
] as const
const activeAboutPanel = ref<'changelog' | 'roadmap' | 'crew' | null>(null)
const visibleAboutPanel = ref<'changelog' | 'roadmap' | 'crew' | null>(null)
const panelLayout = ref<'changelog' | 'roadmap' | 'crew'>('changelog')
const crewOpen = computed(() => activeAboutPanel.value === 'crew')
const passionRef = ref<HTMLElement | null>(null)
const crewTriggerRef = ref<HTMLElement | null>(null)
const panelDockRef = ref<HTMLElement | null>(null)
const heroShellRef = ref<HTMLElement | null>(null)
const panelAnchorStyle = ref<Record<string, string>>({})
const { width: panelLayoutWidth, update: updatePanelBounds } =
  useElementBounding(panelDockRef)
const { top: passionTop } = useElementBounding(passionRef)
const { top: crewTriggerTop } = useElementBounding(crewTriggerRef)
// 保留入口上方的定位，以 passion 区域为基础额外增高约 80px。
const crewBodyHeight = computed(() =>
  Math.max(0, crewTriggerTop.value - 16 - passionTop.value - 8 - 28 + 80)
)
const aboutPanelRef = ref<HTMLElement | null>(null)
const aboutTriggersRef = ref<HTMLElement | null>(null)
let panelLeaving = false

const positionPanelDock = () => {
  const shell = heroShellRef.value?.getBoundingClientRect()
  const trigger =
    panelLayout.value === 'crew'
      ? crewTriggerRef.value
      : aboutTriggersRef.value?.querySelector<HTMLElement>(
          `[aria-controls="about-${panelLayout.value}-panel"]`
        )
  if (!shell || !trigger) return
  const rect = trigger.getBoundingClientRect()
  panelAnchorStyle.value = {
    left: panelLayout.value === 'crew' ? 'auto' : `${rect.left - shell.left}px`,
    right:
      panelLayout.value === 'crew' ? `${shell.right - rect.right}px` : 'auto',
    bottom: `${shell.bottom - rect.bottom}px`,
    height: `${rect.height}px`,
    width: `${
      panelLayout.value === 'crew'
        ? shell.width / 3
        : Math.min(700, shell.right - rect.left - 8)
    }px`,
  }
}

useResizeObserver(
  [heroShellRef, aboutTriggersRef, crewTriggerRef],
  positionPanelDock
)

const showRequestedPanel = async () => {
  const panel = activeAboutPanel.value
  if (!panel) return
  panelLayout.value = panel
  await nextTick()
  if (activeAboutPanel.value !== panel) return
  positionPanelDock()
  await nextTick()
  if (activeAboutPanel.value !== panel) return
  updatePanelBounds()
  visibleAboutPanel.value = panel
}

// 离场结束前保留旧窗口的定位和尺寸，再布置新窗口并触发入场。
watch(activeAboutPanel, () => {
  if (panelLeaving) return
  if (visibleAboutPanel.value) {
    panelLeaving = true
    visibleAboutPanel.value = null
  } else {
    void showRequestedPanel()
  }
})

const finishPanelLeave = () => {
  panelLeaving = false
  void showRequestedPanel()
}

const preparePanelLeave = (element: Element) => {
  if (activeAboutPanel.value)
    element.classList.add('about-program-instant-leave')
}

onClickOutside(
  aboutPanelRef,
  () => {
    activeAboutPanel.value = null
  },
  { ignore: [aboutTriggersRef, crewTriggerRef] }
)

const toggleAboutPanel = (panel: 'changelog' | 'roadmap') => {
  activeAboutPanel.value = activeAboutPanel.value === panel ? null : panel
}

const toggleCrew = () => {
  activeAboutPanel.value = crewOpen.value ? null : 'crew'
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
    <div
      ref="heroShellRef"
      class="about-hero-shell"
      :class="{ 'is-crew-open': crewOpen }"
    >
      <section class="about-hero-section">
        <PageHeroTitle />

        <section
          ref="passionRef"
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

      <div
        ref="panelDockRef"
        class="about-update-dock about-panel-dock no-rem"
        :class="{ 'is-crew-panel': panelLayout === 'crew' }"
        :style="{
          ...panelAnchorStyle,
          '--program-layout-width': `${panelLayoutWidth}px`,
          ...(panelLayout === 'crew'
            ? { '--program-open-height': `${crewBodyHeight}px` }
            : {}),
        }"
      >
        <Transition
          name="about-program"
          mode="out-in"
          @before-leave="preparePanelLeave"
          @after-leave="finishPanelLeave"
        >
          <section
            v-if="visibleAboutPanel"
            :key="visibleAboutPanel"
            ref="aboutPanelRef"
            class="about-update-dock__panel"
            :aria-label="
              t(
                visibleAboutPanel === 'changelog'
                  ? 'about.changelogTagLabel'
                  : visibleAboutPanel === 'roadmap'
                  ? 'about.roadmapTagLabel'
                  : 'about.crewTagLabel'
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
                  visibleAboutPanel === 'changelog'
                    ? 'CHANGELOG'
                    : visibleAboutPanel === 'roadmap'
                    ? 'ROADMAP'
                    : 'CREDITS'
                }}
              </span>
            </header>

            <div class="update-program__body">
              <div
                class="update-program__body-content"
                data-lenis-nested-scroll
              >
                <div
                  v-if="visibleAboutPanel === 'changelog'"
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
                  v-else-if="visibleAboutPanel === 'roadmap'"
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
                <div v-else id="about-crew-content" class="staff-credits">
                  <header class="staff-credits__intro">
                    <h2>STAFF &amp; CREDITS</h2>
                  </header>
                  <div class="staff-credits__group">
                    <section
                      v-for="role in crewRoles"
                      :key="role"
                      class="staff-credits__role"
                    >
                      <h3>{{ t(`about.staff.roles.${role}`) }}</h3>
                      <p>Anuluca</p>
                    </section>
                  </div>
                  <section class="staff-credits__group">
                    <h3>{{ t('about.staff.ai') }}</h3>
                    <p>OpenAI Codex</p>
                  </section>
                  <section class="staff-credits__group">
                    <h3>{{ t('about.staff.typefaces') }}</h3>
                    <div class="staff-credits__font-list">
                      <p class="staff-credits__font-entry">
                        <strong class="staff-credits__typeface">{{
                          t('about.staff.unbounded')
                        }}</strong>
                        <a
                          class="staff-credits__author"
                          href="https://github.com/maoken-fonts/unbounded-sans#致谢-acknowledgement"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ t('about.staff.unboundedAuthors') }}</a
                        >
                      </p>
                      <p class="staff-credits__font-entry">
                        <strong
                          class="staff-credits__typeface staff-credits__typeface--anton"
                          >Anton</strong
                        >
                        <a
                          class="staff-credits__author"
                          href="https://fonts.google.com/specimen/Anton"
                          target="_blank"
                          rel="noopener noreferrer"
                          >Vernon Adams</a
                        >
                      </p>
                      <p class="staff-credits__font-entry">
                        <strong
                          class="staff-credits__typeface staff-credits__typeface--alibaba"
                          >{{ t('about.staff.alibaba') }}</strong
                        >
                        <a
                          class="staff-credits__author"
                          href="https://www.hanyi.com.cn/weixin/h5/customizedfont/aliBaBa.php"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ t('about.staff.alibabaAuthors') }}</a
                        >
                      </p>
                    </div>
                  </section>
                  <section class="staff-credits__group">
                    <h3>{{ t('about.staff.models') }}</h3>
                    <p class="staff-credits__model-details">
                      <strong class="staff-credits__model-name">{{
                        t('about.staff.lucario')
                      }}</strong
                      ><br />{{ t('about.staff.modelSource') }}: Pokémon 3D
                      API<br />{{ t('about.staff.repository') }}:
                      <a
                        href="https://github.com/Pokemon-3D-api/assets"
                        target="_blank"
                        rel="noopener noreferrer"
                        >Pokemon-3D-api/assets</a
                      >
                    </p>
                    <p class="staff-credits__model-details">
                      {{ t('about.staff.originalIP') }}:<br />Nintendo ·
                      Creatures Inc. · GAME FREAK inc.
                    </p>
                  </section>
                  <section class="staff-credits__group">
                    <h3>{{ t('about.staff.thanks') }}</h3>
                    <p>{{ t('about.staff.huahua') }}</p>
                    <p class="staff-credits__audience">
                      <span class="staff-credits__audience-text">AND YOU</span>
                      <span class="staff-credits__bloom" aria-hidden="true"
                        >AND YOU</span
                      >
                      <span class="staff-credits__bloom" aria-hidden="true"
                        >AND YOU</span
                      >
                    </p>
                  </section>
                  <p class="staff-credits__closing">DRIVEN BY PASSION.</p>
                </div>
              </div>
            </div>
          </section>
        </Transition>
      </div>
      <div class="about-update-dock no-rem">
        <div ref="aboutTriggersRef" class="about-update-dock__triggers">
          <button
            class="about-update-trigger"
            :class="{ 'is-active': activeAboutPanel === 'changelog' }"
            type="button"
            aria-controls="about-changelog-panel"
            :aria-expanded="activeAboutPanel === 'changelog'"
            @click="toggleAboutPanel('changelog')"
          >
            <span>&lt; {{ t('about.changelogTagLabel') }} /&gt;</span>
          </button>
          <button
            class="about-update-trigger"
            :class="{ 'is-active': activeAboutPanel === 'roadmap' }"
            type="button"
            aria-controls="about-roadmap-panel"
            :aria-expanded="activeAboutPanel === 'roadmap'"
            @click="toggleAboutPanel('roadmap')"
          >
            <span>&lt; {{ t('about.roadmapTagLabel') }} /&gt;</span>
          </button>
        </div>
      </div>
      <button
        ref="crewTriggerRef"
        class="about-crew-trigger no-rem"
        :class="{ 'is-active': crewOpen }"
        type="button"
        aria-controls="about-crew-content"
        :aria-expanded="crewOpen"
        @click="toggleCrew"
      >
        <span>&lt; {{ t('about.crewTagLabel') }} /&gt;</span>
      </button>
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
      <div class="asset-credits">
        <h4>{{ t('about.assetCredits.title') }}</h4>
        <p>
          {{ t('about.assetCredits.unbounded') }}
          <a
            href="https://github.com/maoken-fonts/unbounded-sans"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t('about.assetCredits.source') }}</a
          >
          ·
          <a
            href="https://github.com/maoken-fonts/unbounded-sans/blob/main/OFL.txt"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t('about.assetCredits.license') }}</a
          >
        </p>
        <p>
          {{ t('about.assetCredits.anton') }}
          <a
            href="https://fonts.google.com/specimen/Anton"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t('about.assetCredits.source') }}</a
          >
          ·
          <a
            href="https://github.com/google/fonts/blob/main/ofl/anton/OFL.txt"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t('about.assetCredits.license') }}</a
          >
        </p>
        <p>
          {{ t('about.assetCredits.alibaba') }}
          <a
            href="https://supplier.alibaba.com/us/news/PX909446.htm"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t('about.assetCredits.official') }}</a
          >
        </p>
        <p>
          {{ t('about.assetCredits.lucario') }}
          <a
            href="https://github.com/Pokemon-3D-api/assets#%EF%B8%8F-license--credits"
            target="_blank"
            rel="noopener noreferrer"
            >{{ t('about.assetCredits.modelSource') }}</a
          >
        </p>
      </div>
    </section>

    <PageFooter />
  </div>
</template>

<style src="./index.less" lang="less" scoped />
