<template>
  <main
    class="island-page"
    data-route-shell="island-pc"
    :aria-label="t('island.page.ariaLabel')"
  >
    <section class="harbor-stage">
      <aside class="harbor-side">
        <section class="latest-pages">
          <div class="latest-head">
            <div>
              <span>RECENT PAGES</span>
              <strong>{{ t('island.latest.title') }}</strong>
            </div>
          </div>
          <div class="latest-scroll">
            <div class="latest-track">
              <div
                v-for="copy in 2"
                :key="copy"
                class="latest-loop"
                :aria-hidden="copy === 2 ? 'true' : undefined"
              >
                <RouterLink
                  v-for="page in latestPages"
                  :key="`${copy}-${page.path}-${page.title}`"
                  class="latest-item"
                  :to="page.path"
                  :tabindex="copy === 2 ? -1 : undefined"
                >
                  <img :src="page.img" :alt="page.title" loading="lazy" />
                  <span>
                    <strong>{{ page.title }}</strong>
                    <em>{{ page.module }}</em>
                  </span>
                </RouterLink>
              </div>
            </div>
          </div>
        </section>
      </aside>

      <section class="harbor-board">
        <div class="board-watermark" aria-hidden="true">
          <PageHeroTitle />
        </div>
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

      <section class="harbor-status">
        <PageUpdatedStamp class="harbor-updated" />
        <div class="player-seal">
          <IslandClock />
          <i />
        </div>
        <div class="harbor-social-links">
          <FooterSocialLinks />
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import FooterSocialLinks from '@/components/FooterSocialLinks/index.vue'
import IslandClock from '@/components/IslandClock/index.vue'
import PageHeroTitle from '@/components/PageHeroTitle/index.vue'
import PageUpdatedStamp from '@/components/PageUpdatedStamp/index.vue'
import {
  splitHarborItemCount,
  useIslandHarborData,
} from '@/composables/useIslandHarborData'

const { t } = useI18n()
const { harborSections, latestPages, openHarborItem } = useIslandHarborData()
const splitCount = splitHarborItemCount
</script>

<style lang="less" scoped src="./PC.less" />
