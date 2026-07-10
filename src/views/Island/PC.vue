<template>
  <main class="island-page" :aria-label="t('island.ariaLabel')">
    <section class="harbor-stage">
      <aside class="harbor-side">
        <header class="harbor-title">
          <div class="header-bg-icon" aria-hidden="true">
            <Ship />
          </div>
          <div class="header-label">[Crying_Yet_Joyless]</div>
          <h1 class="page-title">
            <TypedText
              class="title-en"
              text="ISLAND"
              :delay="220"
              :speed="42"
            />
          </h1>
          <span class="title-cn">个人海湾</span>
          <div class="header-meta">
            <TypedText
              class="meta-item"
              :text="t('island.headerMeta')"
              :delay="520"
              :speed="24"
            />
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
              <span>{{ index + 1 }}</span>
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
                @click="openHarborItem(item)"
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
              <span>PORT.{{ index + 1 }}</span>
              <div />
            </footer>
          </article>
        </div>
      </section>

      <section class="harbor-player" :aria-label="t('island.playerAria')">
        <audio
          ref="audioRef"
          :src="track.src"
          crossorigin="anonymous"
          loop
          preload="auto"
          @play="handleAudioPlay"
          @pause="handleAudioPause"
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
                <a
                  v-if="track.storeUrl"
                  class="track-store-link"
                  :href="track.storeUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <strong>{{ track.title }}</strong>
                </a>
                <strong v-else>{{ track.title }}</strong>
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
            <i ref="progressBarRef" />
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
import { useRouter } from 'vue-router'
import { Ship } from '@element-plus/icons-vue'

import IslandClock from '@/components/IslandClock/index.vue'
import TypedText from '@/components/TypedText/index.vue'

const { t, tm } = useI18n()
const router = useRouter()

interface HarborItem {
  title: string
  subtitle: string
  count: string
  img: string
  path?: string
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
  volume?: number
  storeUrl?: string
}

interface PhotographyGroupSummary {
  photos?: unknown[]
  photoGroups?: Array<{ photos: unknown[] }>
}

const photographyPhotoCount = computed(() => {
  const groups = tm(
    'island.dynamic.photoWorks.groups'
  ) as PhotographyGroupSummary[]

  return groups.reduce(
    (total, group) =>
      total +
      (group.photos?.length ||
        group.photoGroups?.reduce(
          (groupTotal, photoGroup) => groupTotal + photoGroup.photos.length,
          0
        ) ||
        0),
    0
  )
})

const photoWorksCoverUrl = computed(
  () => tm('island.dynamic.photoWorks.coverUrl') as unknown as string
)

const placeholder = (label: string, width = 760, height = 480) =>
  `https://placehold.co/${width}x${height}/14070c/e23456?text=${encodeURIComponent(
    label
  )}`
const developingPlaceholder = placeholder('WIP')
const merchCollections = computed(() =>
  Object.values(
    tm('island.dynamic.merchPhotos') as Record<
      string,
      Array<{
        cover?: string
        photos?: Array<{ url: string }>
      }>
    >
  ).flat()
)
const merchCollectionCount = computed(() => merchCollections.value.length)
const merchCoverUrl = computed(
  () =>
    merchCollections.value[0]?.cover ||
    merchCollections.value[0]?.photos?.[0]?.url ||
    developingPlaceholder
)
const imageLogAlbums = computed(
  () =>
    tm('island.dynamic.imageLog') as Array<{
      photos?: Array<{ url: string }>
    }>
)
const imageLogAlbumCount = computed(() => imageLogAlbums.value.length)
const imageLogCoverUrl = computed(
  () => imageLogAlbums.value[0]?.photos?.[0]?.url || developingPlaceholder
)

const openHarborItem = (item: HarborItem) => {
  router.push(item.path || '/404')
}

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
        get count() {
          return `${photographyPhotoCount.value} PICS`
        },
        get img() {
          return photoWorksCoverUrl.value
        },
        path: '/island/photography',
      },
      {
        title: '周边摄影',
        subtitle: 'MERCH PHOTOS',
        get count() {
          return `${merchCollectionCount.value} COLLECTIONS`
        },
        get img() {
          return merchCoverUrl.value
        },
        path: '/island/merch-photography',
      },
      {
        title: '图像记录',
        subtitle: 'IMAGE LOG',
        get count() {
          return `${imageLogAlbumCount.value} ALBUMS`
        },
        get img() {
          return imageLogCoverUrl.value
        },
        path: '/island/image-log',
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
        count: '0 ITEMS',
        img: developingPlaceholder,
      },
      {
        title: '训练家卡',
        subtitle: 'TRAINER CARD',
        count: '0 ITEMS',
        img: developingPlaceholder,
      },
      {
        title: '实验',
        subtitle: 'EXPERIMENTS',
        count: '0 ITEMS',
        img: developingPlaceholder,
      },
      {
        title: '设计小物',
        subtitle: 'DESIGN GOODS',
        count: '0 ITEMS',
        img: developingPlaceholder,
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
        count: '0 NOTES',
        img: developingPlaceholder,
      },
      {
        title: '文章杂谈',
        subtitle: 'ESSAYS & TALKS',
        count: '0 ARTICLES',
        img: developingPlaceholder,
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
        count: '0 GAMES',
        img: developingPlaceholder,
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
const progressBarRef = ref<HTMLElement | null>(null)
const latestScrollRef = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const isLatestScrollAtTop = ref(true)
const isLatestScrollAtBottom = ref(false)
const currentTrackIndex = ref(0)
const DEFAULT_PLAYER_VOLUME = 0.12
const FADE_IN_DURATION = 900
const FADE_OUT_DURATION = 520
let volumeFadeRafId: number | null = null
let progressRafId: number | null = null

const track = computed(
  () => tracks.value[currentTrackIndex.value] || fallbackTrack
)

const syncProgress = () => {
  const audio = audioRef.value
  if (!audio?.duration) return

  const progress = Math.min(1, audio.currentTime / audio.duration)
  if (progressBarRef.value) {
    progressBarRef.value.style.transform = `scaleX(${progress})`
  }
}

const stopProgressAnimation = () => {
  if (progressRafId === null) return
  window.cancelAnimationFrame(progressRafId)
  progressRafId = null
}

const startProgressAnimation = () => {
  stopProgressAnimation()

  const update = () => {
    const audio = audioRef.value
    if (!audio || audio.paused) {
      progressRafId = null
      return
    }

    syncProgress()
    progressRafId = window.requestAnimationFrame(update)
  }

  progressRafId = window.requestAnimationFrame(update)
}

const handleAudioPlay = () => {
  isPlaying.value = true
  startProgressAnimation()
}

const handleAudioPause = () => {
  isPlaying.value = false
  stopProgressAnimation()
  syncProgress()
}

const cancelVolumeFade = () => {
  if (volumeFadeRafId === null) return
  window.cancelAnimationFrame(volumeFadeRafId)
  volumeFadeRafId = null
}

const fadeAudioVolume = (
  audio: HTMLAudioElement,
  targetVolume: number,
  duration: number,
  onComplete?: () => void
) => {
  cancelVolumeFade()
  const initialVolume = audio.volume
  const startedAt = performance.now()

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    const easedProgress = 1 - Math.pow(1 - progress, 3)
    audio.volume =
      initialVolume + (targetVolume - initialVolume) * easedProgress

    if (progress < 1) {
      volumeFadeRafId = window.requestAnimationFrame(step)
      return
    }

    volumeFadeRafId = null
    onComplete?.()
  }

  volumeFadeRafId = window.requestAnimationFrame(step)
}

const startPlayback = async () => {
  const audio = audioRef.value
  if (!audio) return

  cancelVolumeFade()
  audio.volume = 0

  try {
    await audio.play()
    isPlaying.value = true
    fadeAudioVolume(
      audio,
      track.value.volume ?? DEFAULT_PLAYER_VOLUME,
      FADE_IN_DURATION
    )
  } catch {
    isPlaying.value = false
  }
}

const playTrackAt = async (index: number) => {
  const trackCount = tracks.value.length
  if (!trackCount) return

  const shouldResume = isPlaying.value || !audioRef.value?.paused
  currentTrackIndex.value = (index + trackCount) % trackCount
  if (progressBarRef.value) {
    progressBarRef.value.style.transform = 'scaleX(0)'
  }
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

  if (audio.paused || !isPlaying.value) {
    await startPlayback()
    return
  }

  isPlaying.value = false
  fadeAudioVolume(audio, 0, FADE_OUT_DURATION, () => audio.pause())
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
  document.body.classList.remove(
    'island-mobile-shell',
    'island-mobile-shell-leaving'
  )
  document.body.classList.add('island-pc-shell')
  nextTick(() => {
    updateLatestScrollState()
    if (audioRef.value) {
      audioRef.value.autoplay = false
      audioRef.value.pause()
      audioRef.value.volume = 0
    }
  })
  window.addEventListener('resize', updateLatestScrollState)
})

onUnmounted(() => {
  cancelVolumeFade()
  stopProgressAnimation()
  audioRef.value?.pause()
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
