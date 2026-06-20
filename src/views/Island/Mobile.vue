<template>
  <main class="island-mobile-page" :aria-label="t('island.ariaLabel')">
    <MobileHero />

    <section
      class="mobile-latest"
      :class="{
        'is-latest-at-start': isLatestScrollAtStart,
        'is-latest-at-end': isLatestScrollAtEnd,
      }"
    >
      <header class="section-heading">
        <span />
        <strong>{{ t('island.latestTitle') }}</strong>
        <em>RECENT PAGES</em>
      </header>

      <div
        ref="latestScrollRef"
        class="latest-strip"
        @scroll="updateLatestScrollState"
      >
        <RouterLink
          v-for="page in latestPages"
          :key="`${page.path}-${page.title}`"
          class="latest-card"
          :to="page.path"
        >
          <img :src="page.img" :alt="page.title" loading="lazy" />
          <span>
            <strong>{{ page.title }}</strong>
            <em>{{ page.module }}</em>
          </span>
        </RouterLink>
      </div>
    </section>

    <section class="mobile-ports">
      <article
        v-for="(section, index) in harborSections"
        :key="section.id"
        class="mobile-port"
        :class="`mobile-port--${section.id}`"
      >
        <header class="port-label">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <div>
            <strong>{{ section.title }}</strong>
            <em>{{ section.subtitle }}</em>
          </div>
          <svg viewBox="0 0 80 72" aria-hidden="true">
            <path
              d="M40 5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 13v50M40 36H27m13 0h13"
            />
            <path d="M15 45c5 16 13 23 25 23s20-7 25-23" />
            <path d="M15 45l16 4-11 10M65 45l-16 4 11 10" />
          </svg>
        </header>

        <div class="port-content">
          <div
            class="mobile-card-row"
            :style="{ '--card-count': section.items.length }"
          >
            <button
              v-for="item in section.items"
              :key="item.title"
              class="mobile-bay-card"
              type="button"
            >
              <img :src="item.img" :alt="item.title" loading="lazy" />
              <span class="card-vignette" />
              <span class="mobile-card-info">
                <strong>{{ item.title }}</strong>
                <em>{{ item.subtitle }}</em>
                <b>
                  <span>{{ splitCount(item.count).value }}</span>
                  <small>{{ splitCount(item.count).unit }}</small>
                </b>
              </span>
            </button>
          </div>
        </div>
      </article>
    </section>

    <section class="mobile-player" :aria-label="t('island.playerAria')">
      <audio
        ref="audioRef"
        :src="track.src"
        loop
        preload="auto"
        @play="isPlaying = true"
        @pause="isPlaying = false"
      />
      <button class="player-cover-btn" type="button" @click="togglePlayback">
        <img :src="track.cover" :alt="`${track.title} cover`" loading="lazy" />
        <span>ANUTRIUM</span>
      </button>
      <div class="player-copy">
        <strong>{{ track.title }}</strong>
        <em>{{ track.artist }}</em>
      </div>
      <span class="player-status">{{ t('island.nowPlaying') }}</span>
      <div class="player-controls">
        <button
          class="player-control player-control--prev"
          type="button"
          :aria-label="t('island.prevTrack')"
          @click="playPreviousTrack"
        >
          <i />
        </button>
        <button
          class="player-control player-control--pause"
          :class="{ 'is-paused': !isPlaying }"
          type="button"
          :aria-label="
            isPlaying ? t('island.pauseTrack') : t('island.playTrack')
          "
          @click="togglePlayback"
        >
          <i />
        </button>
        <button
          class="player-control player-control--next"
          type="button"
          :aria-label="t('island.nextTrack')"
          @click="playNextTrack"
        >
          <i />
        </button>
      </div>
      <div class="player-clock">
        <span>{{ currentDate }}</span>
        <time>{{ currentTime }}</time>
      </div>
      <i class="player-radar" aria-hidden="true" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import MobileHero from './MobileHero.vue'

const { t, tm } = useI18n()

interface HarborItem {
  title: string
  subtitle: string
  count: string
  img: string
}

interface HarborSection {
  id: string
  title: string
  subtitle: string
  progress: string
  items: HarborItem[]
}

interface LatestPage {
  title: string
  module: string
  path: string
  img: string
}

interface TrackItem {
  title: string
  artist: string
  cover: string
  src: string
}

const placeholder = (label: string, width = 760, height = 480) =>
  `https://placehold.co/${width}x${height}/14070c/e23456?text=${encodeURIComponent(
    label
  )}`

const harborSections: HarborSection[] = [
  {
    id: 'photography',
    title: '影像',
    subtitle: 'PHOTOGRAPHY',
    progress: '52%',
    items: [
      {
        title: '摄影作品',
        subtitle: 'PHOTO WORKS',
        count: '32 PICS',
        img: placeholder('PHOTO WORKS'),
      },
      {
        title: '周边摄影',
        subtitle: 'MERCH PHOTOS',
        count: '24 PICS',
        img: placeholder('MERCH PHOTO'),
      },
      {
        title: '图像记录',
        subtitle: 'IMAGE LOG',
        count: '18 PICS',
        img: placeholder('IMAGE LOG'),
      },
    ],
  },
  {
    id: 'works',
    title: '创作',
    subtitle: 'WORKS',
    progress: '78%',
    items: [
      {
        title: '绘画',
        subtitle: 'ILLUSTRATION',
        count: '28 ITEMS',
        img: placeholder('ILLUSTRATION'),
      },
      {
        title: '训练家卡',
        subtitle: 'TRAINER CARD',
        count: '18 ITEMS',
        img: placeholder('TRAINER CARD'),
      },
      {
        title: '实验',
        subtitle: 'EXPERIMENTS',
        count: '16 ITEMS',
        img: placeholder('EXPERIMENTS'),
      },
      {
        title: '设计小物',
        subtitle: 'DESIGN GOODS',
        count: '14 ITEMS',
        img: placeholder('DESIGN GOODS'),
      },
    ],
  },
  {
    id: 'notes',
    title: '札记',
    subtitle: 'NOTES',
    progress: '46%',
    items: [
      {
        title: '学习笔记',
        subtitle: 'STUDY NOTES',
        count: '34 NOTES',
        img: placeholder('STUDY NOTES'),
      },
      {
        title: '文章杂谈',
        subtitle: 'ESSAYS & TALKS',
        count: '30 ARTICLES',
        img: placeholder('ESSAYS & TALKS'),
      },
    ],
  },
  {
    id: 'games',
    title: '游戏档案',
    subtitle: 'GAMES',
    progress: '72%',
    items: [
      {
        title: '游戏库',
        subtitle: 'GAME LIBRARY',
        count: '72 GAMES',
        img: placeholder('GAME LIBRARY', 900, 720),
      },
    ],
  },
]

const latestPages = computed<LatestPage[]>(
  () => tm('island.dynamic.latestPages') as LatestPage[]
)

const tracks = computed<TrackItem[]>(
  () => tm('island.dynamic.tracks') as TrackItem[]
)

const fallbackTrack: TrackItem = {
  title: 'Harbor Light Placeholder',
  artist: 'ANUTRIUM SINGLE TRACK',
  cover: placeholder('ALBUM COVER', 320, 320),
  src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
}

const audioRef = ref<HTMLAudioElement | null>(null)
const latestScrollRef = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const isLatestScrollAtStart = ref(true)
const isLatestScrollAtEnd = ref(false)
const currentDate = ref('')
const currentTime = ref('')
const currentTrackIndex = ref(0)
let clockTimer: number | undefined

const track = computed(
  () => tracks.value[currentTrackIndex.value] || fallbackTrack
)

const splitCount = (count: string) => {
  const [, value = count, unit = ''] = count.match(/^(\S+)\s*(.*)$/) || []
  return { value, unit }
}

const startPlayback = async () => {
  try {
    await audioRef.value?.play()
    isPlaying.value = true
  } catch {
    isPlaying.value = false
  }
}

const playTrackAt = async (index: number) => {
  const trackCount = tracks.value.length
  if (!trackCount) return

  const shouldResume = isPlaying.value || !audioRef.value?.paused
  currentTrackIndex.value = (index + trackCount) % trackCount
  await nextTick()
  audioRef.value?.load()

  if (shouldResume) await startPlayback()
}

const playPreviousTrack = () => {
  void playTrackAt(currentTrackIndex.value - 1)
}

const playNextTrack = () => {
  void playTrackAt(currentTrackIndex.value + 1)
}

const togglePlayback = async () => {
  const audio = audioRef.value
  if (!audio) return

  if (audio.paused) {
    await startPlayback()
    return
  }

  audio.pause()
}

const updateCurrentTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')

  currentDate.value = `${year}/${month}/${date}`
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const updateLatestScrollState = () => {
  const scrollEl = latestScrollRef.value
  if (!scrollEl) return

  const maxScrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth
  isLatestScrollAtStart.value = maxScrollLeft <= 2 || scrollEl.scrollLeft <= 2
  isLatestScrollAtEnd.value =
    maxScrollLeft <= 2 || scrollEl.scrollLeft >= maxScrollLeft - 2
}

const resetLatestScroll = () => {
  const scrollEl = latestScrollRef.value
  if (!scrollEl) return

  scrollEl.scrollLeft = 0
  updateLatestScrollState()
}

onMounted(() => {
  document.body.classList.add('island-mobile-shell')
  updateCurrentTime()
  nextTick(resetLatestScroll)
  clockTimer = window.setInterval(updateCurrentTime, 1000)
  window.addEventListener('resize', updateLatestScrollState)
})

onUnmounted(() => {
  document.body.classList.remove('island-mobile-shell')
  if (clockTimer) window.clearInterval(clockTimer)
  window.removeEventListener('resize', updateLatestScrollState)
})

watch(tracks, (nextTracks) => {
  if (currentTrackIndex.value >= nextTracks.length) currentTrackIndex.value = 0
})

watch(latestPages, () => {
  nextTick(resetLatestScroll)
})
</script>

<style lang="less" scoped>
@red: #e23456;
@page-bg: #050105;
@mobile-gutter: 28px;
@route-enter-delay: 0.62s;

:global(html),
:global(body),
:global(#app) {
  overflow-x: hidden;
  background: @page-bg;
}

:global(body.island-mobile-shell) {
  width: 100%;
  height: 100svh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  isolation: isolate;
  background: @page-bg;
}

:global(body.island-mobile-shell .router-container) {
  width: 100% !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
}

.island-mobile-page {
  position: relative;
  display: grid;
  grid-template-rows:
    clamp(160px, 34svh, 260px)
    clamp(100px, 12svh, 128px)
    minmax(0, 1fr)
    clamp(66px, 8svh, 82px);
  gap: 15px;
  width: 100vw;
  height: 100svh;
  box-sizing: border-box;
  margin-top: -120px;
  padding: clamp(76px, 10.8svh, 92px) 0 max(12px, env(safe-area-inset-bottom));
  color: #fff;
  overflow-x: hidden;
  overflow-y: hidden;
  overscroll-behavior-x: none;
  background: transparent;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    opacity: 0;
    background: radial-gradient(
        ellipse at center,
        rgba(0, 0, 0, 0) 0%,
        rgba(0, 0, 0, 0.18) 54%,
        rgba(0, 0, 0, 0.74) 100%
      ),
      linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.42),
        rgba(0, 0, 0, 0.06) 30%,
        rgba(0, 0, 0, 0.08) 68%,
        rgba(0, 0, 0, 0.5)
      );
    pointer-events: none;
    animation: mobile-bg-vignette-in 0.9s ease @route-enter-delay forwards;
  }

  &::after {
    content: '';
    position: fixed;
    inset: -30vh -30vw;
    z-index: 0;
    background-image: linear-gradient(
        rgba(226, 52, 86, 0.035) 1px,
        transparent 1px
      ),
      linear-gradient(90deg, rgba(226, 52, 86, 0.03) 1px, transparent 1px);
    background-size: 54px 54px;
    opacity: 0;
    mask-image: linear-gradient(
      to right,
      transparent,
      #000 10%,
      #000 92%,
      transparent
    );
    pointer-events: none;
    animation: mobile-bg-grid-in 0.9s ease calc(@route-enter-delay + 0.1s)
      forwards;
  }

  * {
    box-sizing: border-box;
  }
}

.mobile-hero,
.mobile-latest,
.mobile-ports,
.mobile-player {
  position: relative;
  z-index: 1;
  width: calc(100% - (@mobile-gutter * 2));
  margin-right: auto;
  margin-left: auto;
}

.mobile-hero {
  opacity: 0;
  transform: translateY(16px);
  animation: mobile-block-enter 1.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.section-heading em,
.mobile-card-info em,
.mobile-card-info b,
.port-label em,
.player-copy,
.player-status,
.player-clock,
.player-cover-btn span,
.player-control {
  font-family: 'cn-custom', monospace;
}

.mobile-port {
  border: 1px solid rgba(226, 52, 86, 0.34);
  background: linear-gradient(135deg, rgba(226, 52, 86, 0.12), transparent 38%),
    rgba(8, 2, 8, 0.62);
  box-shadow: inset 0 0 34px rgba(226, 52, 86, 0.06);
}

.mobile-latest {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 18px;
  margin-top: -20px;
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(16px);
  animation: mobile-block-enter 1.65s cubic-bezier(0.16, 1, 0.3, 1) 0.28s
    forwards;

  &.is-latest-at-start {
    .latest-strip {
      mask-image: linear-gradient(
        to right,
        #000 0,
        #000 calc(100% - 64px),
        rgba(0, 0, 0, 0.74) calc(100% - 34px),
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        #000 0,
        #000 calc(100% - 64px),
        rgba(0, 0, 0, 0.74) calc(100% - 34px),
        transparent 100%
      );
    }
  }

  &.is-latest-at-end {
    .latest-strip {
      mask-image: linear-gradient(
        to right,
        transparent 0,
        rgba(0, 0, 0, 0.74) 34px,
        #000 64px,
        #000 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0,
        rgba(0, 0, 0, 0.74) 34px,
        #000 64px,
        #000 100%
      );
    }
  }

  &.is-latest-at-start.is-latest-at-end {
    .latest-strip {
      mask-image: none;
      -webkit-mask-image: none;
    }
  }
}

.section-heading {
  display: grid;
  grid-template-columns: 12px auto auto minmax(42px, 1fr) auto;
  gap: 10px;
  align-items: center;

  > span {
    width: 12px;
    height: 12px;
    background: @red;
    box-shadow: 0 0 14px rgba(226, 52, 86, 0.72);
  }

  strong {
    color: #fff;
    font-size: clamp(20px, 4.8vw, 26px);
    font-weight: 900;
    white-space: nowrap;
  }

  em {
    color: rgba(255, 255, 255, 0.48);
    font-size: 18px;
    font-style: normal;
    font-weight: 900;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }

  i {
    height: 2px;
    background: linear-gradient(90deg, @red, transparent);
  }

  b {
    color: rgba(255, 255, 255, 0.34);
    font-size: 36px;
    font-weight: 300;
    line-height: 1;
  }
}

.latest-strip {
  display: grid;
  grid-auto-columns: minmax(250px, 72%);
  grid-auto-flow: column;
  width: 100%;
  height: 100%;
  padding: 12px 16px;
  padding-left: 0;
  border-radius: 6px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  // border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(50, 50, 50, 0.24);
  mask-image: linear-gradient(
    to right,
    transparent 0,
    rgba(0, 0, 0, 0.74) 34px,
    #000 64px,
    #000 calc(100% - 64px),
    rgba(0, 0, 0, 0.74) calc(100% - 34px),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    rgba(0, 0, 0, 0.74) 34px,
    #000 64px,
    #000 calc(100% - 64px),
    rgba(0, 0, 0, 0.74) calc(100% - 34px),
    transparent 100%
  );

  &::-webkit-scrollbar {
    display: none;
  }
}

.latest-card {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding-left: 15px;

  img {
    width: 70px;
    height: 70px;
    object-fit: cover;
    border: 1px solid rgba(226, 52, 86, 0.58);
    filter: saturate(0.82) brightness(0.7);
  }

  span {
    min-width: 0;
  }

  strong,
  em {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #fff;
    font-size: 20px;
    font-weight: 900;
  }

  em {
    margin-top: 5px;
    color: @red;
    font-family: 'cn-custom', monospace;
    font-size: 9px;
    font-style: normal;
    letter-spacing: 0.04em;
  }
}

.mobile-ports {
  display: grid;
  content-visibility: auto;
  contain-intrinsic-size: 620px;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(
      0,
      1fr
    );
  gap: 15px;
  min-height: 0;
  margin-top: 0;
  overflow: hidden;
  border-left: 1px solid #e2345712;
  padding-left: 15px;
  padding-right: 12px;
  opacity: 0;
  transform: translateY(22px);
  animation: mobile-block-enter 1.65s cubic-bezier(0.16, 1, 0.3, 1) 0.5s
    forwards;
}

.mobile-port {
  position: relative;
  display: grid;
  grid-template-columns: clamp(128px, 34vw, 164px) minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  padding: 14px;
  padding-left: 26px;
  overflow: hidden;
  border-radius: 6px;
  opacity: 0;
  transform: translateY(22px);
  animation: mobile-port-enter 1.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  &:nth-child(1) {
    animation-delay: 0.5s;
  }

  &:nth-child(2) {
    animation-delay: 0.74s;
  }

  &:nth-child(3) {
    animation-delay: 0.98s;
  }

  &:nth-child(4) {
    animation-delay: 1.22s;
  }
}

.port-label {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: start;
  min-width: 0;

  > span {
    color: @red;
    font-family: 'cn-custom', monospace;
    font-size: 24px;
    font-weight: 900;
    line-height: 1;
    text-shadow: 0 0 18px rgba(226, 52, 86, 0.46);
    margin: 10px 0;
  }

  strong {
    display: block;
    margin-top: 12px;
    color: #fff;
    font-size: 35px !important;
    font-weight: 100;
    font-family: 'cn-custom', monospace;
    line-height: 1;
    white-space: nowrap;
  }

  em {
    display: block;
    margin-top: 10px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 12px;
    font-style: normal;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  svg {
    position: absolute;
    bottom: -80px;
    left: 0px;
    z-index: -1;
    width: 186px;
    fill: none;
    stroke: rgb(255, 255, 255);
    opacity: 0.05;
    stroke-width: 4.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    transform: translateY(-35%);
  }
}

.port-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  min-width: 0;
}

.mobile-card-row {
  display: grid;
  grid-template-columns: repeat(var(--card-count), minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.mobile-bay-card {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(226, 52, 87, 0.296);
  border-radius: 5px;
  background: #050105;
  color: inherit;
  text-align: left;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: grayscale(1) saturate(0.65) brightness(0.42);
  }
}

.mobile-port--works {
  min-height: 0;

  .mobile-card-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .mobile-bay-card {
    min-height: 0;
  }
}

.card-vignette {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.88), transparent 56%),
    linear-gradient(90deg, rgba(226, 52, 86, 0.13), transparent);
}

.mobile-card-info {
  position: absolute;
  right: 8px;
  bottom: 6px;
  left: 8px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;

  strong,
  em {
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #fff;
    font-size: 20px;
    font-weight: 900;
  }

  em {
    color: rgba(255, 255, 255);
    opacity: 0.3;
    font-size: 9px;
    font-style: normal;
    font-weight: 900;
    font-family: 'Anton';
    letter-spacing: 0.05em;
    margin-top: -5px;
  }

  b {
    grid-row: 1 / span 2;
    grid-column: 2;
    display: grid;
    justify-items: end;
    color: @red;
    font-weight: 100;
    font-family: 'Anton';
    line-height: 1;

    span {
      font-family: 'Anton';
      font-size: 24px;
    }

    small {
      font-family: 'Anton';
      margin-top: 2px;
      font-size: 8px;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }
  }
}

.mobile-player {
  position: relative;
  display: grid;
  content-visibility: auto;
  contain-intrinsic-size: 90px;
  grid-template-columns: 50px minmax(0, 1fr) auto 42px;
  gap: 20px;
  align-items: center;
  min-height: 0;
  margin-top: 0;
  border-radius: 1000px;
  padding: 0 40px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  margin-left: 40px;
  width: calc(100% - 80px);
  opacity: 0;
  transform: translateY(18px);
  animation: mobile-block-enter 1.65s cubic-bezier(0.16, 1, 0.3, 1) 0.92s
    forwards;
}

.player-cover-btn {
  position: relative;
  width: 50px;
  height: 50px;
  padding: 0;
  overflow: hidden;
  border: none;
  border-radius: 6px;
  background: #070207;
  color: @red;
  cursor: pointer;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.28;
    filter: grayscale(1) brightness(0.54);
  }

  span {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }
}

.player-copy {
  min-width: 0;

  strong,
  em {
    display: block;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #fff;
    font-size: 20px;
    font-weight: 900;
  }

  em {
    margin-top: 4px;
    color: rgba(255, 255, 255, 0.42);
    font-size: 13px;
    font-style: normal;
    font-weight: 900;
    letter-spacing: 0.04em;
  }
}

.player-status {
  display: none;
}

.player-controls {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: center;
  min-width: 162px;
}

.player-control {
  position: relative;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  --control-color: @red;

  i,
  &::before,
  &::after {
    position: absolute;
    display: block;
    content: '';
  }
}

.player-clock {
  display: none;
}

.player-control--prev,
.player-control--next {
  &::before {
    top: 7px;
    width: 2px;
    height: 14px;
    background: var(--control-color);
  }

  &::after {
    top: 5px;
    width: 0;
    height: 0;
    border-top: 9px solid transparent;
    border-bottom: 9px solid transparent;
  }
}

.player-control--prev {
  &::before {
    left: 6px;
  }

  &::after {
    left: 10px;
    border-right: 12px solid var(--control-color);
  }
}

.player-control--next {
  &::before {
    right: 6px;
  }

  &::after {
    right: 10px;
    border-left: 12px solid var(--control-color);
  }
}

.player-control--pause {
  width: 40px;
  height: 40px;

  i,
  &::before {
    top: 9px;
    width: 5px;
    height: 22px;
    background: var(--control-color);
  }

  i {
    left: 12px;
  }

  &::before {
    right: 12px;
  }
}

.player-control--pause.is-paused {
  i {
    top: 8px;
    left: 14px;
    width: 0;
    height: 0;
    background: transparent;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-left: 17px solid var(--control-color);
  }

  &::before {
    display: none;
  }
}

.player-radar {
  position: relative;
  width: 42px;
  height: 42px;
  border: 1px solid @red;
  border-radius: 50%;
  background: linear-gradient(
      to right,
      transparent calc(50% - 0.5px),
      rgba(226, 52, 86, 0.42) 50%,
      transparent calc(50% + 0.5px)
    ),
    linear-gradient(
      to bottom,
      transparent calc(50% - 0.5px),
      rgba(226, 52, 86, 0.42) 50%,
      transparent calc(50% + 0.5px)
    ),
    radial-gradient(
      circle,
      transparent 0 34%,
      rgba(226, 52, 86, 0.28) 35% 36%,
      transparent 37%
    );
  box-shadow: 0 0 18px rgba(226, 52, 86, 0.3);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from -18deg,
      transparent 0deg,
      transparent 298deg,
      rgba(226, 52, 86, 0.12) 330deg,
      rgba(226, 52, 86, 0.9) 358deg,
      transparent 360deg
    );
    animation: mobile-radar 2.8s linear infinite;
  }
}

@keyframes mobile-radar {
  to {
    transform: rotate(360deg);
  }
}

@keyframes mobile-bg-vignette-in {
  to {
    opacity: 1;
  }
}

@keyframes mobile-bg-grid-in {
  to {
    opacity: 0.48;
  }
}

@keyframes mobile-block-enter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes mobile-port-enter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 520px) {
  .mobile-port {
    grid-template-columns: 150px minmax(0, 1fr);
    padding-right: 10px;
    padding-left: 12px;
  }

  .port-label {
    strong {
      font-size: 24px;
    }
  }

  .mobile-card-row {
    grid-template-columns: repeat(var(--card-count), minmax(0, 1fr));
  }

  .player-radar {
    display: none;
  }

  .mobile-player {
    grid-template-columns: 50px minmax(0, 1fr) auto;
  }
}

@media (min-width: 700px) {
  .player-clock {
    display: grid;
    justify-items: end;
    color: rgba(255, 255, 255, 0.42);
    font-size: 11px;
    font-weight: 900;

    time {
      margin-top: 4px;
      color: #fff;
      font-size: 20px;
    }
  }

  .mobile-player {
    grid-template-columns: 72px minmax(0, 1fr) auto auto 50px;
  }

  .latest-strip {
    grid-auto-columns: minmax(230px, 31%);
  }
}
</style>
