<template>
  <main class="island-page" :aria-label="t('island.ariaLabel')">
    <section class="harbor-stage">
      <aside class="harbor-side">
        <header class="harbor-title">
          <div class="header-bg-text">ISLAND</div>
          <div class="header-label">[Crying_Yet_Joyless]</div>
          <h1 class="page-title">
            <span class="title-en">ISLAND</span>
          </h1>
          <span class="title-cn">个人海湾</span>
          <div class="header-meta">
            <span>{{ t('island.headerMeta') }}</span>
          </div>
          <span class="corner corner-tl" />
          <span class="corner corner-tr" />
          <span class="corner corner-bl" />
          <span class="corner corner-br" />
        </header>

        <section
          class="latest-pages"
          :class="{
            'is-latest-at-top': isLatestScrollAtTop,
            'is-latest-at-bottom': isLatestScrollAtBottom,
          }"
        >
          <div class="latest-head">
            <div>
              <span>RECENT PAGES</span>
              <strong>{{ t('island.latestTitle') }}</strong>
            </div>
            <i class="latest-head-projection" aria-hidden="true" />
          </div>
          <div
            ref="latestScrollRef"
            class="latest-scroll"
            @scroll="updateLatestScrollState"
          >
            <RouterLink
              v-for="page in latestPages"
              :key="`${page.path}-${page.title}`"
              class="latest-item"
              :to="page.path"
            >
              <img :src="page.img" :alt="page.title" loading="lazy" />
              <span>
                <strong>{{ page.title }}</strong>
                <em>{{ page.module }}</em>
              </span>
            </RouterLink>
          </div>
          <div class="latest-scroll-hint" aria-hidden="true">
            <div class="scroll-line" />
          </div>
        </section>
      </aside>

      <section class="harbor-board">
        <div class="board-watermark">ANULUCA's ISLAND</div>
        <div class="port-grid">
          <article
            v-for="(section, index) in harborSections"
            :key="section.id"
            class="port-panel"
            :class="`port-panel--${section.id}`"
          >
            <div class="port-anchor">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <svg viewBox="0 0 80 72" aria-hidden="true">
                <path
                  class="anchor-body"
                  d="M40 5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 13v50M40 36H27m13 0h13"
                />
                <path
                  class="anchor-crown"
                  d="M15 45c5 16 13 23 25 23s20-7 25-23"
                />
                <path
                  class="anchor-arrow"
                  d="M15 45l16 4-11 10M65 45l-16 4 11 10"
                />
              </svg>
            </div>

            <header class="port-head">
              <h2>{{ section.title }}</h2>
              <p>{{ section.subtitle }}</p>
            </header>

            <div class="card-grid" :class="`card-grid--${section.id}`">
              <button
                v-for="item in section.items"
                :key="item.title"
                class="bay-card"
                type="button"
              >
                <span class="card-hover-shell" aria-hidden="true">
                  <i class="card-hover-corners" />
                  <i class="card-hover-rails" />
                  <i class="card-hover-wave card-hover-wave--left" />
                  <i class="card-hover-wave card-hover-wave--right" />
                </span>
                <span class="card-body">
                  <img :src="item.img" :alt="item.title" loading="lazy" />
                  <span class="card-shade" />
                  <span class="card-info">
                    <strong>{{ item.title }}</strong>
                    <em>{{ item.subtitle }}</em>
                    <b>
                      <span class="card-count-number">
                        {{ splitCount(item.count).value }}
                      </span>
                      <span class="card-count-unit">
                        {{ splitCount(item.count).unit }}
                      </span>
                    </b>
                  </span>
                </span>
              </button>
            </div>

            <footer class="port-progress">
              <span>PORT.{{ String(index + 1).padStart(2, '0') }}</span>
              <div />
            </footer>
          </article>
        </div>
      </section>

      <section class="harbor-player" :aria-label="t('island.playerAria')">
        <audio
          ref="audioRef"
          :src="track.src"
          loop
          preload="auto"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @timeupdate="syncProgress"
        />
        <img
          class="player-cover"
          :src="track.cover"
          :alt="`${track.title} cover`"
        />
        <div class="player-track">
          <div class="track-copy">
            <span class="track-title">
              <span class="track-text">
                <strong>{{ track.title }}</strong>
                <em>{{ track.artist }}</em>
              </span>
              <span class="track-controls">
                <button
                  class="track-control track-control--prev"
                  type="button"
                  :aria-label="t('island.prevTrack')"
                  @click="playPreviousTrack"
                >
                  <i />
                </button>
                <button
                  class="track-control track-control--pause"
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
                  class="track-control track-control--next"
                  type="button"
                  :aria-label="t('island.nextTrack')"
                  @click="playNextTrack"
                >
                  <i />
                </button>
              </span>
            </span>
            <span class="track-status">{{ t('island.nowPlaying') }}</span>
          </div>
          <div class="track-bar">
            <i :style="{ width: `${trackProgress}%` }" />
          </div>
        </div>
        <div class="player-seal">
          <IslandClock />
          <i />
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import IslandClock from '@/components/IslandClock/index.vue'

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

const splitCount = (count: string) => {
  const [, value = count, unit = ''] = count.match(/^(\S+)\s*(.*)$/) || []
  return { value, unit }
}

const audioRef = ref<HTMLAudioElement | null>(null)
const latestScrollRef = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const isLatestScrollAtTop = ref(true)
const isLatestScrollAtBottom = ref(false)
const trackProgress = ref(0)
const currentTrackIndex = ref(0)

const track = computed(
  () => tracks.value[currentTrackIndex.value] || fallbackTrack
)

const syncProgress = () => {
  const audio = audioRef.value
  if (!audio?.duration) return
  trackProgress.value = Math.min(
    100,
    (audio.currentTime / audio.duration) * 100
  )
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
  trackProgress.value = 0
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

  const maxScrollTop = scrollEl.scrollHeight - scrollEl.clientHeight
  isLatestScrollAtTop.value = maxScrollTop <= 2 || scrollEl.scrollTop <= 2
  isLatestScrollAtBottom.value =
    maxScrollTop <= 2 || scrollEl.scrollTop >= maxScrollTop - 2
}

onMounted(() => {
  document.body.classList.add('island-pc-shell')
  nextTick(updateLatestScrollState)
  window.addEventListener('resize', updateLatestScrollState)
})

onUnmounted(() => {
  document.body.classList.remove('island-pc-shell')
  window.removeEventListener('resize', updateLatestScrollState)
})

watch(tracks, (nextTracks) => {
  if (currentTrackIndex.value >= nextTracks.length) currentTrackIndex.value = 0
})

watch(latestPages, () => {
  nextTick(updateLatestScrollState)
})
</script>

<style lang="less" scoped src="./PC.less" />
