<template>
  <main
    class="island-mobile-page"
    data-route-shell="island-mobile"
    :aria-label="t('island.page.ariaLabel')"
  >
    <MobileHero />

    <section
      class="mobile-latest"
      :class="{
        'is-latest-at-start': isLatestScrollAtStart,
        'is-latest-at-end': isLatestScrollAtEnd,
      }"
    >
      <header class="section-heading">
        <span class="heading-marker" />
        <strong>{{ t('island.latest.title') }}</strong>
        <em>RECENT PAGES</em>
        <PageUpdatedStamp class="mobile-updated" />
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
          <img
            :src="page.img"
            :alt="page.title"
            loading="lazy"
            width="768"
            height="576"
            decoding="async"
          />
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
              <img
                :src="item.img"
                :alt="item.title"
                loading="lazy"
                width="768"
                height="576"
                decoding="async"
              />
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

    <section class="mobile-player" :aria-label="t('island.player.ariaLabel')">
      <a
        v-if="track.storeUrl"
        class="player-cover-btn"
        :href="track.storeUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          :src="track.cover"
          :alt="`${track.title} cover`"
          loading="lazy"
          width="512"
          height="512"
          decoding="async"
        />
        <span>ANUTRIUM</span>
      </a>
      <div v-else class="player-cover-btn">
        <img
          :src="track.cover"
          :alt="`${track.title} cover`"
          loading="lazy"
          width="512"
          height="512"
          decoding="async"
        />
        <span>ANUTRIUM</span>
      </div>
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
      <IslandClock variant="mobile" />
      <i class="player-radar" aria-hidden="true" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import IslandClock from '@/components/IslandClock/index.vue'
import PageUpdatedStamp from '@/components/PageUpdatedStamp/index.vue'
import {
  createIslandPlaceholder,
  splitHarborItemCount,
  useIslandHarborData,
} from '@/composables/useIslandHarborData'

import MobileHero from './MobileHero.vue'

const { t, tm } = useI18n()
const { harborSections, latestPages, openHarborItem } = useIslandHarborData()
const splitCount = splitHarborItemCount

interface TrackItem {
  title: string
  artist: string
  cover: string
  storeUrl?: string
}

const tracks = computed<TrackItem[]>(
  () => tm('island.player.tracks') as TrackItem[]
)

const fallbackTrack: TrackItem = {
  title: 'Harbor Light Placeholder',
  artist: 'ANUTRIUM SINGLE TRACK',
  cover: createIslandPlaceholder('ALBUM COVER', 320, 320),
}

const latestScrollRef = ref<HTMLElement | null>(null)
const isLatestScrollAtStart = ref(true)
const isLatestScrollAtEnd = ref(false)

const track = computed(() => tracks.value[0] || fallbackTrack)

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
  })
  window.addEventListener('resize', updateLatestScrollState)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateLatestScrollState)
})

watch(latestPages, () => {
  nextTick(resetLatestScroll)
})
</script>

<style lang="less" scoped src="./Mobile.less" />
