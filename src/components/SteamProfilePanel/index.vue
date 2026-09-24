<template>
  <section class="steam-profile-panel" aria-live="polite">
    <div v-if="isLoading" class="steam-profile-state">
      <span class="steam-profile-loader" aria-hidden="true" />
      <p>{{ t('steamProfile.loading') }}</p>
    </div>

    <div v-else-if="errorMessage" class="steam-profile-state">
      <strong>{{ t('steamProfile.loadFailed') }}</strong>
      <p>{{ errorMessage }}</p>
      <button type="button" @click="loadProfile">
        {{ t('steamProfile.retry') }}
      </button>
    </div>

    <template v-else-if="steamData">
      <header class="steam-profile-header">
        <img
          v-if="steamData.profile?.avatarfull"
          :src="steamData.profile.avatarfull"
          :alt="steamData.profile.personaname"
          width="184"
          height="184"
          loading="lazy"
          decoding="async"
        />
        <div class="steam-profile-identity">
          <h2>{{ steamData.profile?.personaname || 'Anuluca' }}</h2>
          <p v-if="steamData.profile?.realname">
            {{ steamData.profile.realname }}
          </p>
          <span class="steam-profile-status" :class="profileStatus.className">
            {{ profileStatus.label }}
          </span>
        </div>
        <div
          class="steam-profile-level"
          :aria-label="`${t('steamProfile.level')} ${steamLevel}`"
        >
          <span>{{ t('steamProfile.level') }}</span>
          <strong>{{ steamLevel }}</strong>
        </div>
      </header>

      <nav class="steam-profile-tabs" :aria-label="t('steamProfile.tabsLabel')">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="{ 'is-active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span class="steam-profile-tab-label">{{ tab.label }}</span>
          <span v-if="tab.count !== null" class="steam-profile-tab-count">
            {{ tab.count }}
          </span>
        </button>
      </nav>

      <div class="steam-profile-scroll" data-lenis-nested-scroll>
        <div v-if="activeTab === 'overview'" class="steam-profile-overview">
          <div class="steam-profile-stats">
            <article v-for="stat in overviewStats" :key="stat.label">
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </article>
          </div>

          <section v-if="recentGames.length" class="steam-profile-section">
            <div class="steam-profile-section-title">
              <h3>{{ t('steamProfile.recentGames') }}</h3>
            </div>
            <div class="steam-recent-games">
              <a
                v-for="game in recentGames"
                :key="game.appid"
                :href="getStoreUrl(game.appid)"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span
                  class="steam-recent-game-image"
                  :style="{ backgroundImage: game.backgroundImage }"
                  aria-hidden="true"
                />
                <div>
                  <strong>{{ game.name }}</strong>
                  <span>
                    {{ game.recentPlaytimeLabel }} /
                    {{ t('steamProfile.lastTwoWeeks') }}
                  </span>
                  <small>
                    {{ game.totalPlaytimeLabel }} /
                    {{ t('steamProfile.total') }}
                  </small>
                </div>
              </a>
            </div>
          </section>

          <section class="steam-profile-details steam-profile-section">
            <div class="steam-profile-section-title">
              <h3>{{ t('steamProfile.publicDetails') }}</h3>
            </div>
            <dl>
              <template v-for="detail in publicDetails" :key="detail.label">
                <dt>{{ detail.label }}</dt>
                <dd :class="{ 'is-copyable': detail.copyable }">
                  <span>{{ detail.value }}</span>
                  <button
                    v-if="detail.copyable"
                    class="steam-profile-copy"
                    type="button"
                    :aria-label="t('steamProfile.copyFriendCode')"
                    @click="copySteamFriendCode"
                  >
                    <el-icon aria-hidden="true"><CopyDocument /></el-icon>
                  </button>
                </dd>
              </template>
            </dl>
          </section>
        </div>

        <section v-else-if="activeTab === 'games'" class="steam-profile-list">
          <label class="steam-game-search">
            <el-icon aria-hidden="true"><Search /></el-icon>
            <input
              v-model="gameSearchQuery"
              type="search"
              :placeholder="t('steamProfile.searchGames')"
              autocomplete="off"
            />
            <span>{{ filteredGames.length }}</span>
          </label>
          <a
            v-for="game in visibleGames"
            :key="game.appid"
            class="steam-game-row"
            :href="getStoreUrl(game.appid)"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              v-if="game.img_icon_url"
              :src="getGameIconUrl(game)"
              :alt="game.name"
              loading="lazy"
              width="32"
              height="32"
              decoding="async"
            />
            <span class="steam-game-index">
              {{ game.indexLabel }}
            </span>
            <strong>{{ game.name }}</strong>
            <span class="steam-game-playtime">
              {{ game.playtimeLabel }}
            </span>
            <small v-if="game.lastPlayedLabel">
              {{ game.lastPlayedLabel }}
            </small>
          </a>
          <button
            v-if="visibleGames.length < filteredGames.length"
            class="steam-profile-more"
            type="button"
            @click="showMoreGames"
          >
            {{ t('steamProfile.loadMore') }}
          </button>
          <p v-if="!filteredGames.length" class="steam-profile-empty">
            {{
              gameSearchQuery
                ? t('steamProfile.noSearchResults')
                : t('steamProfile.noPublicData')
            }}
          </p>
        </section>
      </div>

      <a
        class="steam-profile-external"
        :href="steamData.meta.profileUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <el-icon aria-hidden="true"><Connection /></el-icon>
        {{ t('steamProfile.openProfile') }}
      </a>
    </template>
  </section>
</template>

<script setup lang="ts">
import { Connection, CopyDocument, Search } from '@element-plus/icons-vue'

import { useSteamProfile } from '@/composables/useSteamProfile'

import 'element-plus/es/components/message/style/css'

const {
  activeTab,
  copySteamFriendCode,
  errorMessage,
  filteredGames,
  gameSearchQuery,
  getGameIconUrl,
  getStoreUrl,
  isLoading,
  loadProfile,
  overviewStats,
  profileStatus,
  publicDetails,
  recentGames,
  showMoreGames,
  steamData,
  steamLevel,
  t,
  tabs,
  visibleGames,
} = useSteamProfile()
</script>

<style src="./index.less" lang="less" scoped />
