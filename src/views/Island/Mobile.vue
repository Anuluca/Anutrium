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
          <span>{{ index + 1 }}</span>
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
              @click="openHarborItem(item)"
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
        crossorigin="anonymous"
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
import { useRouter } from 'vue-router'

import IslandClock from '@/components/IslandClock/index.vue'

import MobileHero from './MobileHero.vue'

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
      groups?: Array<{
        photos?: Array<{ url: string }>
      }>
    }>
)
const imageLogAlbumCount = computed(() => imageLogAlbums.value.length)
const imageLogCoverUrl = computed(
  () =>
    imageLogAlbums.value[0]?.groups?.[0]?.photos?.[0]?.url ||
    developingPlaceholder
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

const audioRef = ref<HTMLAudioElement | null>(null)
const latestScrollRef = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const isLatestScrollAtStart = ref(true)
const isLatestScrollAtEnd = ref(false)
const currentTrackIndex = ref(0)
const DEFAULT_PLAYER_VOLUME = 0.12
const FADE_IN_DURATION = 900
const FADE_OUT_DURATION = 520
let volumeFadeRafId: number | null = null

const track = computed(
  () => tracks.value[currentTrackIndex.value] || fallbackTrack
)

const splitCount = (count: string) => {
  const [, value = count, unit = ''] = count.match(/^(\S+)\s*(.*)$/) || []
  return { value, unit }
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
  nextTick(() => {
    resetLatestScroll()
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
  audioRef.value?.pause()
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
