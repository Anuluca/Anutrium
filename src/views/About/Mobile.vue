<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import PokeAmice from '@/assets/img/about/pokeAmice.png'
import PageFooter from '@/components/PageFooter/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'

interface ChangelogItem {
  version: string
  codename: string | null
  date: string
  title: string
  details: string[]
}

interface ChangelogGroup {
  key: string
  label: string
  logs: ChangelogItem[]
}

const { locale, t, tm } = useI18n()
const activeGroupKey = ref<string | null>(null)
const fullGroupKey = ref<string | null>(null)
const activeLogKey = ref<string | null>(null)

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

const changelogGroups = computed<ChangelogGroup[]>(() => {
  const groups = new Map<number, ChangelogItem[]>()

  changelogs.value.forEach((log) => {
    const versionMatch = log.version.match(/^v(\d+)(?:\.(\d+))?/)
    const major = Number(versionMatch?.[1] || 0)
    const minor = Number(versionMatch?.[2] || 0)
    const releaseMajor = minor === 0 ? major : major + 1
    const currentGroup = groups.get(releaseMajor) || []

    currentGroup.push(log)
    groups.set(releaseMajor, currentGroup)
  })

  return Array.from(groups.entries()).map(([major, logs]) => ({
    key: `v${major}.0`,
    label: `v${major}.0`,
    logs,
  }))
})

const expandedGroupKey = computed(() => {
  return activeGroupKey.value ?? changelogGroups.value[0]?.key ?? null
})

const expandedLogKey = computed(() => {
  if (activeLogKey.value !== null) return activeLogKey.value

  const latestGroup = changelogGroups.value[0]
  return latestGroup ? `${latestGroup.key}-0` : null
})

const toggleGroup = (groupKey: string) => {
  if (fullGroupKey.value === groupKey) {
    fullGroupKey.value = ''
    activeGroupKey.value = null
    return
  }

  if (expandedGroupKey.value !== groupKey) {
    activeGroupKey.value = groupKey
    fullGroupKey.value = groupKey
    return
  }

  fullGroupKey.value = groupKey
}

const toggleLog = (logKey: string) => {
  activeLogKey.value = expandedLogKey.value === logKey ? '' : logKey
}

const neighbors = ref([
  {
    name: 'Poke Amice 宝可梦友会',
    url: 'http://pokeamice.com',
    logo: PokeAmice,
    description:
      '此处是由一位业余宝可梦爱好者Asimov创建的宝可梦全栈资料整理站点&个人研究据点。',
  },
])
</script>

<template>
  <div class="about-page main-container">
    <PageHeader
      header-label="[HUAHUA_THE_CAT]"
      title-en="ABOUT"
      title-cn="关于"
      meta-item="LEARN MORE ABOUT THIS PROJECT"
      primary-color="#5D3ABA"
      mobile-tall
    />

    <section class="passion-section" aria-labelledby="passion-title">
      <div class="passion-color-field">
        <div class="passion-field-meta">
          <span>ANUTRIUM COLOR</span>
          <span>RGB / 226 · 52 · 86</span>
        </div>

        <div class="passion-copy">
          <p class="passion-kicker">{{ t('about.brandColorKicker') }}</p>
          <h2
            id="passion-title"
            class="passion-title"
            :class="{ 'is-en': locale === 'en' }"
          >
            <span>{{ t('about.brandColorTitleLead') }}</span>
          </h2>
        </div>

        <div class="passion-field-content">
          <div class="passion-field-name">
            <span>{{ t('about.brandColorName') }}</span>
            <strong v-if="locale !== 'en'">PASSION RED</strong>
          </div>
          <div class="passion-color-code"><span>#</span>E23456</div>
        </div>

        <div class="passion-orbit" aria-hidden="true">
          <i />
        </div>
      </div>
    </section>

    <section class="block">
      <div class="section-header">
        <h3 class="section-title">
          <span class="changelog">&lt; CHANGELOG &gt;</span>
          <span class="cn">{{ t('about.changelogLabel') }}</span>
        </h3>
        <div class="section-line" />
      </div>

      <div class="version-groups">
        <section
          v-for="group in changelogGroups"
          :key="group.key"
          class="version-group"
          :class="{
            'is-expanded': expandedGroupKey === group.key,
            'is-full': fullGroupKey === group.key,
          }"
        >
          <button
            class="version-group-head"
            type="button"
            :aria-expanded="fullGroupKey === group.key"
            @click="toggleGroup(group.key)"
          >
            <span class="version-group-mark" aria-hidden="true" />
            <span class="version-group-label">
              {{ t('about.majorReleaseLabel') }}
            </span>
            <strong>{{ group.label }}</strong>
            <span class="version-group-range">
              {{ group.logs[group.logs.length - 1].version }} →
              {{ group.logs[0].version }}
            </span>
            <span class="version-group-count">
              {{ group.logs.length }} {{ t('about.entriesLabel') }}
            </span>
            <span class="version-group-arrow" aria-hidden="true" />
          </button>

          <div class="version-group-expand">
            <div class="version-group-expand-inner">
              <div class="timeline">
                <div
                  v-for="(log, index) in group.logs"
                  :key="`${group.key}-${index}`"
                  class="timeline-item"
                  :class="{
                    'is-active': expandedLogKey === `${group.key}-${index}`,
                  }"
                >
                  <div class="axis">
                    <div class="axis-diamond" />
                    <div class="axis-line" />
                  </div>

                  <div class="log-card">
                    <div
                      class="log-head"
                      @click="toggleLog(`${group.key}-${index}`)"
                    >
                      <div class="log-meta">
                        <span class="log-version">{{ log.version }}</span>
                        <span v-if="log.codename" class="log-codename">{{
                          log.codename
                        }}</span>
                      </div>
                      <div class="log-center">
                        <span class="log-title">{{ log.title }}</span>
                      </div>
                      <div class="log-right">
                        <span class="log-date">{{ log.date }}</span>
                        <span class="log-arrow" />
                      </div>
                    </div>

                    <div class="log-expand">
                      <div class="log-expand-inner">
                        <ul>
                          <li v-for="(item, i) in log.details" :key="i">
                            <span class="li-bullet">▸</span>{{ item }}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                v-if="
                  expandedGroupKey === group.key && fullGroupKey !== group.key
                "
                class="version-group-more"
                type="button"
                @click="toggleGroup(group.key)"
              >
                {{ t('about.expandReleaseLabel') }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>

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
              <p class="nb-desc">{{ nb.description }}</p>
            </div>

            <span class="nb-arrow">↗</span>
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

.passion-section {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  margin: 30px 0 68px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: @red;
}

.passion-copy {
  position: relative;
  z-index: 3;
  margin: 0 auto;
  padding: clamp(42px, 4vw, 68px) 30px 28px;
  text-align: center;
}

.passion-kicker {
  margin: 0 0 18px;
  color: rgba(0, 0, 0, 0.66);
  font-family: 'source-han-sans-simplified-c', sans-serif;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.passion-title {
  display: flex;
  flex-direction: column;
  margin: 0;
  color: #070708;
  font-family: 'source-han-sans-simplified-c', sans-serif;
  font-size: clamp(42px, 4.6vw, 82px);
  font-weight: 900;
  letter-spacing: -0.055em;
  line-height: 1.02;

  span {
    font-family: inherit;
    white-space: nowrap;
    margin-left: 60px;
  }

  &.is-en {
    font-size: clamp(38px, 3.9vw, 68px);
    letter-spacing: -0.04em;
  }
}

.passion-description {
  max-width: 780px;
  margin: 24px auto 0;
  color: rgba(0, 0, 0, 0.6);
  font-family: 'source-han-sans-simplified-c', sans-serif;
  font-size: clamp(14px, 1.05vw, 18px);
  font-weight: 700;
  letter-spacing: 0.025em;
  line-height: 1.65;
}

.passion-color-field {
  position: relative;
  display: flex;
  min-height: clamp(500px, 43vw, 560px);
  overflow: hidden;
  background: @red;
  color: #070708;
  flex-direction: column;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px);
    background-size: 54px 54px;
    mask-image: linear-gradient(to right, rgba(0, 0, 0, 0.75), transparent 72%);
  }
}

.passion-field-meta {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.18);

  span {
    font-family: 'cn-custom', 'anton', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
  }
}

.passion-field-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  min-height: 0;
  margin-top: auto;
  padding: 20px clamp(26px, 1vw, 68px) 28px;
  zoom: 1.4;
}

.passion-field-name {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: -0.055em;

  span,
  strong {
    font-family: 'source-han-sans-simplified-c', sans-serif;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  span {
    font-size: clamp(16px, 1.5vw, 24px);
    font-family: 'cn-custom';
    font-weight: 100;
  }

  strong {
    font-family: 'cn-custom', 'anton', sans-serif;
    font-size: clamp(10px, 0.85vw, 13px);
  }
}

.passion-color-code {
  font-family: 'anton', 'cn-custom', sans-serif;
  font-size: clamp(76px, 10vw, 180px);
  font-weight: 900;
  letter-spacing: -0.055em;
  line-height: 0.95;
  white-space: nowrap;

  span {
    margin-right: 0.025em;
    font-family: inherit;
    font-size: 0.42em;
    vertical-align: top;
  }
}

.passion-orbit {
  position: absolute;
  right: clamp(-160px, -8vw, -70px);
  bottom: clamp(-240px, -13vw, -110px);
  z-index: 1;
  width: clamp(360px, 37vw, 680px);
  aspect-ratio: 1;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  background: #070708;
  box-shadow: 0 0 0 34px rgba(7, 7, 8, 0.12),
    0 0 0 35px rgba(255, 255, 255, 0.14);

  &::before,
  &::after,
  i {
    content: '';
    position: absolute;
    border-radius: 50%;
  }

  &::before {
    inset: 15%;
    border: 1px solid rgba(226, 52, 86, 0.42);
  }

  &::after {
    inset: 32%;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: @red;
  }

  i {
    inset: 45%;
    z-index: 1;
    background: #070708;
    box-shadow: 0 0 30px rgba(226, 52, 86, 0.55);
  }
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 10px;
  margin-top: 20px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1;
  white-space: nowrap;
  .changelog {
    font-family: 'anton', 'source-han-sans-simplified-c';
    margin-top: -10px;
  }

  .cn {
    font-family: 'source-han-sans-simplified-c';
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

.version-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 30px;
}

.version-group {
  border: 1px solid @border;
  background: rgba(255, 255, 255, 0.018);
  overflow: hidden;

  &.is-expanded {
    border-color: rgba(226, 52, 86, 0.24);

    .version-group-head {
      background: rgba(226, 52, 86, 0.06);
    }

    .version-group-mark {
      background: @red;
      box-shadow: 0 0 12px rgba(226, 52, 86, 0.7);
    }

    .version-group-expand {
      grid-template-rows: 1fr;
      border-top-width: 1px;
    }

    .version-group-expand-inner {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &.is-full {
    .version-group-arrow {
      border-color: @red;
      transform: rotate(-135deg);
    }

    .version-group-expand-inner {
      max-height: 5000px;
    }
  }
}

.version-group-head {
  display: grid;
  grid-template-columns: auto auto auto 1fr auto auto;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 20px;
  padding-top: 10px;
  border: 0;
  color: #fff;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.25s;
  > * {
    display: block;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  strong {
    font-family: 'anton', monospace;
    font-size: 1.05rem;
    margin-top: -5px;
    letter-spacing: 1.5px;
  }
}

.version-group-mark {
  width: 7px;
  height: 7px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.12);
  margin-top: 6px;
  transform: rotate(45deg);
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
}

.version-group-label,
.version-group-range,
.version-group-count {
  font-family: 'anton', 'source-han-sans-simplified-c', monospace;
  font-size: 0.62rem;
  letter-spacing: 1.2px;
  color: @text-dim;
}

.version-group-label {
  color: rgba(255, 255, 255, 0.7);
}

.version-group-range {
  justify-self: start;
}

.version-group-count {
  justify-self: end;
}

.version-group-arrow {
  width: 8px;
  height: 8px;
  margin-bottom: 4px;
  border-right: 1.5px solid rgba(255, 255, 255, 0.35);
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.35);
  transform: rotate(45deg);
  transition: transform 0.35s, border-color 0.2s;
}

.version-group-expand {
  display: grid;
  grid-template-rows: 0fr;
  border-top: 0 solid @border;
  transition: grid-template-rows 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.version-group-expand-inner {
  position: relative;
  min-height: 0;
  max-height: 460px;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-8px);
  transition: max-height 0.7s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s 0.05s,
    transform 0.3s 0.05s;
}

.version-group-more {
  position: absolute;
  z-index: 3;
  right: 0;
  bottom: 0;
  left: 0;
  height: 82px;
  padding-top: 34px;
  padding-bottom: 10px;
  border: 0;
  color: rgba(255, 255, 255, 0.72);
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(5, 2, 6, 0.94) 58%,
    #050206
  );
  cursor: pointer;
  font-family: 'anton', 'source-han-sans-simplified-c', monospace;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 1.5px;
  transition: color 0.2s;

  &:hover {
    color: @red;
  }
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 18px 20px 6px;
}

.timeline-item {
  display: flex;
  gap: 24px;
  position: relative;

  &.is-active {
    .axis-diamond {
      border-color: @red;
      background: @red;
      box-shadow: 0 0 10px @red, 0 0 20px rgba(226, 52, 86, 0.4);

      &::before {
        border-color: rgba(226, 52, 86, 0.3);
      }
    }

    .log-card {
      border-color: rgba(226, 52, 86, 0.3);
      background: rgba(226, 52, 86, 0.04);
    }

    .log-expand {
      grid-template-rows: 1fr;

      ul {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .log-arrow {
      transform: rotate(-135deg) !important;
      border-color: @red !important;
    }
  }
}

.axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
  padding-top: 19px;
}

.axis-diamond {
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
  flex: 1;
  width: 1px;
  background: @border;
  margin-top: 8px;
}

.log-card {
  flex: 1;
  border: 1px solid @border;
  background: @card-bg;
  margin-bottom: 12px;
  transition: border-color 0.3s, background 0.3s;
  overflow: hidden;
}

.log-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);

    .log-arrow {
      border-color: rgba(255, 255, 255, 0.6);
    }
  }
}

.log-meta {
  display: flex;
  align-items: center;
  justify-content: start;
  gap: 8px;
  width: 7rem;
}

.log-version {
  font-family: 'anton', monospace;
  font-size: 0.72rem;
  display: inline-block;
  letter-spacing: 1px;
  color: #fff;
  opacity: 0.9;
}

.log-codename {
  font-family: 'anton', monospace;
  font-size: 0.58rem;
  letter-spacing: 2px;
  color: #fff;
  background: @red;
  padding: 0px 6px;
  padding-bottom: 3px;
  margin-top: 6px;
  line-height: 1.6;
}

.log-title {
  font-family: 'source-han-sans-simplified-c';
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 1px;
  color: #fff;
}

.log-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.log-date {
  font-family: 'anton', monospace;
  font-size: 0.62rem;
  letter-spacing: 1px;
  color: @text-dim;
}

.log-arrow {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid rgba(255, 255, 255, 0.3);
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.3);
  transform: rotate(45deg);
  transition: transform 0.35s, border-color 0.2s;
  flex-shrink: 0;
  margin-bottom: 3px;
}

.log-expand {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 0px solid @border;

  .is-active & {
    border-top-width: 1px;
  }
}

.log-expand-inner {
  min-height: 0;
  overflow: hidden;

  ul {
    list-style: none;
    padding: 12px 20px 16px 20px;
    margin: 0;
    opacity: 0;
    transform: translateY(-8px);
    transition: opacity 0.35s 0.05s, transform 0.35s 0.05s;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  li {
    display: flex;
    gap: 10px;
    font-family: 'source-han-sans-simplified-c', monospace;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.5);
  }
}

.li-bullet {
  color: @red;
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 15px;
}

.neighbors-grid {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-left: 38px;

  &::before {
    content: '';
    position: absolute;
    left: 9px;
    top: 10px;
    bottom: 10px;
    width: 1px;
    background: linear-gradient(
      180deg,
      transparent,
      rgba(226, 52, 86, 0.55),
      transparent
    );
  }
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
  min-height: 72px;
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 16px;
  padding: 10px 0 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-decoration: none;
  color: #fff;
  position: relative;
  transition: border-color 0.25s, transform 0.25s;

  &::before {
    content: '';
    position: absolute;
    left: -28px;
    top: 50%;
    width: 28px;
    height: 1px;
    background: rgba(226, 52, 86, 0.52);
    transform: translateY(-50%);
  }

  &::after {
    content: '';
    position: absolute;
    left: 16px;
    right: 0;
    bottom: -1px;
    height: 1px;
    background: linear-gradient(90deg, @red, transparent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
  }

  &:hover {
    border-color: rgba(226, 52, 86, 0.55);
    transform: translateX(6px);

    &::after {
      transform: scaleX(1);
    }

    .nb-logo {
      transform: scale(1.2);

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
      transform: translate(4px, -4px);
    }
  }
}

.nb-node {
  position: absolute;
  left: -34px;
  top: 50%;
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
  border: 1px solid rgba(255, 255, 255, 0.16);
  clip-path: polygon(22% 0, 78% 0, 100% 50%, 78% 100%, 22% 100%, 0 50%);
  background: rgba(255, 255, 255, 0.035);
  transition: border-color 0.25s, transform 0.25s;

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
  margin-bottom: 5px;
}

.nb-host {
  font-family: 'anton', monospace;
  font-size: 0.58rem;
  letter-spacing: 1.4px;
  color: rgba(226, 52, 86, 0.72);
  white-space: nowrap;
}

.nb-name {
  font-family: 'source-han-sans-simplified-c';
  font-size: 0.98rem;
  font-weight: 900;
  letter-spacing: 1px;
  color: #fff;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nb-host {
  color: rgba(255, 255, 255, 0.28);
}

.nb-desc {
  font-family: 'source-han-sans-simplified-c', monospace;
  font-size: 0.74rem;
  color: @text-dim;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nb-arrow {
  font-family: 'anton', monospace;
  justify-self: center;
  font-size: 1.1rem;
  color: rgba(226, 52, 86, 0.45);
  transition: color 0.25s, transform 0.25s;
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
  .passion-section {
    margin: 32px 0 48px;
  }

  .passion-copy {
    padding: 36px 16px 18px;
  }

  .passion-kicker {
    margin-bottom: 12px;
    font-size: 10px;
  }

  .passion-title {
    font-size: clamp(32px, 9.5vw, 52px);
    letter-spacing: -0.045em;
    line-height: 1.06;

    span {
      white-space: normal;
    }

    &.is-en {
      font-size: clamp(27px, 7.3vw, 40px);

      span {
        white-space: nowrap;
      }
    }
  }

  .passion-description {
    margin-top: 16px;
    font-size: 12px;
    line-height: 1.55;
  }

  .passion-color-field {
    min-height: 470px;
  }

  .passion-field-meta {
    gap: 10px;
    padding: 14px 16px;

    span {
      font-size: 7px;
      line-height: 1.5;
    }

    span:last-child {
      text-align: right;
    }
  }

  .passion-field-content {
    min-height: 0;
    padding: 18px 16px 20px;
  }

  .passion-field-name {
    flex-direction: column;
    gap: 2px;
    margin-bottom: 7px;
  }

  .passion-color-code {
    font-size: clamp(62px, 19vw, 104px);
  }

  .passion-orbit {
    right: -140px;
    bottom: -145px;
    width: 330px;
  }

  .section-title {
    font-size: 1.8rem;
  }

  .version-group-head {
    grid-template-columns: auto 1fr auto auto;
    gap: 10px;
    padding: 13px 14px;
  }

  .version-group-label,
  .version-group-range {
    display: none;
  }

  .version-group-count {
    font-size: 0.55rem;
  }

  .timeline {
    padding: 14px 10px 2px;
  }

  .timeline-item {
    gap: 10px;
  }

  .log-head {
    grid-template-columns: 1fr auto;

    .log-center {
      display: none;
    }
  }

  .neighbors-grid {
    gap: 18px;
    padding-left: 28px;

    &::before {
      left: 7px;
    }
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
    grid-template-columns: 42px minmax(0, 1fr) 28px;
    gap: 12px;
    padding-left: 12px;
  }

  .neighbor-card::before {
    left: -21px;
    width: 21px;
  }

  .nb-node {
    left: -27px;
    width: 8px;
    height: 8px;
  }

  .nb-logo {
    width: 38px;
    height: 38px;
  }

  .nb-name {
    font-size: 0.9rem;
  }

  .nb-desc {
    font-size: 0.72rem;
  }

  .nb-title-row {
    flex-wrap: wrap;
    gap: 5px 8px;
  }

  .nb-host {
    width: 100%;
  }

  .nb-arrow {
    font-size: 0.95rem;
  }
}
</style>
