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
      <IslandClock variant="mobile" />
      <i class="player-radar" aria-hidden="true" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import IslandClock from '@/components/IslandClock/index.vue'

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
const currentTrackIndex = ref(0)

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
  nextTick(resetLatestScroll)
  window.addEventListener('resize', updateLatestScrollState)
})

onUnmounted(() => {
  document.body.classList.remove('island-mobile-shell')
  window.removeEventListener('resize', updateLatestScrollState)
})

watch(tracks, (nextTracks) => {
  if (currentTrackIndex.value >= nextTracks.length) currentTrackIndex.value = 0
})

watch(latestPages, () => {
  nextTick(resetLatestScroll)
})
</script>

<style lang="less" scoped src="./Mobile.less" />
