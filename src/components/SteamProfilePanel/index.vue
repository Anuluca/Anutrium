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

<style lang="less" scoped>
@steam-blue: #66c0f4;
@steam-surface: #101820;
@border: rgba(255, 255, 255, 0.13);

.steam-profile-panel {
  display: flex;
  height: min(700px, calc(100dvh - 104px));
  flex-direction: column;
  overflow: hidden;
  color: #d7dce2;
  background: #080d12;
  font-family: 'alibaba-puhuiti', sans-serif;
}

.steam-profile-state {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-sizing: border-box;
  padding: 32px;
  text-align: center;

  strong {
    color: #fff;
    font-size: 18px;
  }

  p {
    max-width: 520px;
    color: #929aa5;
    font-size: 13px;
    line-height: 1.6;
  }

  button {
    padding: 8px 18px;
    border: 1px solid @steam-blue;
    color: @steam-blue;
    background: transparent;
    cursor: pointer;
  }
}

.steam-profile-loader {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(102, 192, 244, 0.2);
  border-top-color: @steam-blue;
  border-radius: 50%;
  animation: steam-loading 0.8s linear infinite;
}

.steam-profile-header {
  position: relative;
  display: grid;
  flex: none;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px;
  min-height: 108px;
  box-sizing: border-box;
  overflow: visible;
  padding: 22px 22px 18px;
  border-bottom: 1px solid @border;
  background: @steam-surface;

  &::before {
    position: absolute;
    z-index: 2;
    top: 50%;
    right: 66px;
    display: block;
    width: max-content;
    overflow: visible;
    padding-right: 0.24em;
    padding-bottom: 0.04em;
    color: transparent;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.22),
      rgba(255, 255, 255, 0.04)
    );
    background-clip: text;
    content: 'SPAAAAACE!!';
    font-family: 'anton', sans-serif;
    font-size: 56px;
    font-style: italic;
    line-height: 1;
    pointer-events: none;
    transform: translateY(-50%);
    white-space: nowrap;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  > img {
    position: relative;
    z-index: 1;
    width: 72px;
    height: 72px;
    box-sizing: border-box;
    margin-top: 8px;
    border: 1px solid rgba(255, 255, 255, 0.32);
    border-radius: 0;
    object-fit: cover;
  }
}

.steam-profile-level {
  position: relative;
  z-index: 3;
  display: flex;
  width: 54px;
  height: 54px;
  flex: none;
  background-color: #13171d;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 2px solid #496d3b;
  border-radius: 50%;

  span {
    color: #7f9b74;
    font-size: 8px;
    font-weight: 800;
    line-height: 1;
  }

  strong {
    margin-top: 3px;
    color: #fff;
    font-family: 'anton', 'alibaba-puhuiti', sans-serif;
    font-size: 18px;
    line-height: 1;
  }
}

.steam-profile-identity {
  position: relative;
  z-index: 1;
  min-width: 0;

  h2 {
    margin: 2px 0 0;
    overflow: hidden;
    color: #fff;
    font-size: 27px;
    font-weight: 900;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin-top: 3px;
    color: #8793a0;
    font-size: 12px;
  }
}

.steam-profile-status {
  display: inline-block;
  max-width: 100%;
  margin-top: 8px;
  overflow: hidden;
  color: #7e8a96;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.is-online {
    color: @steam-blue;
  }

  &.is-playing {
    color: #90ba3c;
  }
}

.steam-profile-external {
  display: flex;
  width: 100%;
  min-height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  padding: 10px 16px;
  border: 0;
  border-top: 1px solid @border;
  color: #c8d0d8;
  background: #0b1117;
  font-size: 11px;

  &:hover,
  &:focus-visible {
    color: @steam-blue;
    background: rgba(102, 192, 244, 0.08);
  }
}

.steam-profile-tabs {
  display: flex;
  flex: none;
  min-height: 42px;
  overflow-x: auto;
  border-bottom: 1px solid @border;
  background: #0b1117;

  button {
    flex: 1 0 auto;
    min-width: 108px;
    padding: 0 16px;
    border: 0;
    border-right: 1px solid @border;
    color: #7e8995;
    background: transparent;
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;

    .steam-profile-tab-count {
      margin-left: 5px;
      color: #4f5b67;
      font-size: 10px;
    }

    &.is-active {
      color: #05090c;
      background: @steam-blue;
      box-shadow: inset 0 0 14px rgba(255, 255, 255, 0.65);

      .steam-profile-tab-count {
        color: rgba(5, 9, 12, 0.55);
      }
    }
  }
}

.steam-profile-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
}

.steam-profile-overview {
  padding: 18px;
}

.steam-profile-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid @border;
  border-left: 1px solid @border;

  article {
    min-width: 0;
    padding: 13px 10px;
    border-right: 1px solid @border;
    border-bottom: 1px solid @border;
    background: rgba(255, 255, 255, 0.025);

    strong,
    span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color: #fff;
      font-family: 'anton', 'alibaba-puhuiti', sans-serif;
      font-size: 19px;
      line-height: 1.15;
    }

    span {
      margin-top: 4px;
      color: #727e89;
      font-size: 10px;
    }
  }
}

.steam-profile-section {
  margin-top: 20px;
}

.steam-profile-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 7px;
  border-bottom: 1px solid @border;

  h3 {
    color: #fff;
    font-size: 13px;
    font-weight: 900;
  }
}

.steam-recent-games {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  a {
    position: relative;
    display: flex;
    overflow: hidden;
    min-height: 116px;
    min-width: 0;
    align-items: center;
    justify-content: flex-end;
    padding: 14px;
    border: 0;
    color: #d7dce2;
    background-color: #101820;

    &::after {
      position: absolute;
      z-index: 1;
      inset: 0;
      background: linear-gradient(
        90deg,
        rgba(5, 9, 13, 0.02) 0%,
        rgba(5, 9, 13, 0.08) 24%,
        rgba(5, 9, 13, 0.2) 42%,
        rgba(5, 9, 13, 0.42) 58%,
        rgba(5, 9, 13, 0.68) 70%,
        rgba(5, 9, 13, 0.88) 80%,
        rgba(5, 9, 13, 0.97) 88%,
        rgba(5, 9, 13, 1) 100%
      );
      content: '';
      pointer-events: none;
      transform: scaleX(1);
      transform-origin: right center;
      transition: transform 260ms ease-out;
    }

    &:hover,
    &:focus-visible {
      outline: 1px solid @steam-blue;
      outline-offset: -1px;

      .steam-recent-game-image {
        transform: scale(1.04);
      }

      &::after {
        transform: scaleX(1.18);
      }

      strong {
        transform: scale(1.08);
      }
    }
  }

  .steam-recent-game-image {
    position: absolute;
    z-index: 0;
    inset: 0;
    background-position: center;
    background-size: cover;
    transform: scale(1);
    transition: transform 220ms ease-out;
  }

  a > div {
    position: relative;
    z-index: 2;
    width: 100%;
    min-width: 0;
    text-align: right;
  }

  a > div strong,
  a > div span,
  a > div small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  a > div strong {
    color: #fff;
    font-size: 16px;
    font-weight: 900;
    transform: scale(1);
    transform-origin: right center;
    transition: transform 220ms ease-out;
  }

  a > div span,
  a > div small {
    margin-top: 5px;
    color: #7d8995;
    font-size: 12px;
  }

  a > div small {
    padding-right: 4px;
    font-style: italic;
    font-weight: 900;
  }
}

.steam-profile-details dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid @border;
  border-left: 1px solid @border;
}

.steam-profile-details dt,
.steam-profile-details dd {
  display: flex;
  height: 34px;
  min-width: 0;
  align-items: center;
  box-sizing: border-box;
  margin: 0;
  padding: 0 11px;
  border-right: 1px solid @border;
  border-bottom: 1px solid @border;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.steam-profile-details dt {
  color: #697581;
  font-size: 11px;
}

.steam-profile-details dd {
  color: #d5dbe1;
  font-size: 11px;

  &.is-copyable {
    justify-content: space-between;
    gap: 8px;
  }
}

.steam-profile-copy {
  display: inline-flex;
  width: 28px;
  height: 24px;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  color: #7d8995;
  background: transparent;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: @steam-blue;
  }
}

.steam-game-search {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  box-sizing: border-box;
  padding: 7px 18px;
  border-bottom: 1px solid @border;
  color: #687581;
  background: #0b1117;

  input {
    min-width: 0;
    padding: 6px 0;
    border: 0;
    outline: 0;
    color: #e3e7eb;
    background: transparent;
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 11px;

    &::placeholder {
      color: #5d6873;
    }
  }

  > span {
    color: @steam-blue;
    font-family: 'anton', sans-serif;
    font-size: 13px;
  }
}

.steam-profile-empty {
  padding: 18px;
  color: #7d8791;
  font-size: 11px;
  line-height: 1.6;
  text-align: center;
}

.steam-profile-list {
  min-height: 100%;
}

.steam-game-row {
  display: grid;
  grid-template-columns: 34px 36px minmax(160px, 1fr) 90px 100px;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  box-sizing: border-box;
  padding: 7px 18px;
  border-bottom: 1px solid @border;
  color: #bfc7cf;

  &:hover,
  &:focus-visible {
    background: rgba(102, 192, 244, 0.07);
  }

  img {
    width: 32px;
    height: 32px;
    object-fit: cover;
  }

  strong {
    overflow: hidden;
    color: #e3e7eb;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > span,
  small {
    color: #707c87;
    font-size: 10px;
    text-align: right;
  }
}

.steam-game-index {
  font-family: 'anton', sans-serif;
  text-align: left !important;
}

.steam-game-playtime {
  font-style: italic;
  font-weight: 900;
}

.steam-profile-more {
  display: block;
  width: calc(100% - 36px);
  margin: 14px 18px;
  padding: 9px;
  border: 1px solid @border;
  color: @steam-blue;
  background: transparent;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-weight: 800;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: @steam-blue;
  }
}

@keyframes steam-loading {
  to {
    transform: rotate(360deg);
  }
}

@media screen and (max-aspect-ratio: 1) {
  .steam-profile-panel {
    width: 100%;
    height: 100%;
  }

  .steam-profile-header {
    grid-template-columns: 88px minmax(0, 1fr) 78px;
    gap: 18px;
    min-height: 168px;
    padding: 28px 22px 24px;

    &::before {
      right: 116px;
      font-size: 56px;
    }

    > img {
      width: 88px;
      height: 88px;
    }
  }

  .steam-profile-state {
    strong {
      font-size: 26px;
    }

    p,
    button {
      font-size: 18px;
    }
  }

  .steam-profile-identity {
    h2 {
      font-size: 38px;
    }

    p {
      font-size: 21px;
    }
  }

  .steam-profile-status {
    font-size: 20px;
  }

  .steam-profile-level {
    width: 78px;
    height: 78px;

    span {
      font-size: 15px;
    }

    strong {
      font-size: 36px;
    }
  }

  .steam-profile-tabs {
    min-height: 56px;
  }

  .steam-profile-tabs button {
    min-width: 92px;
    padding: 0 12px;
    font-size: 18px;

    .steam-profile-tab-count {
      font-size: 14px;
    }
  }

  .steam-profile-overview {
    padding: 12px;
  }

  .steam-profile-stats {
    article {
      display: flex;
      min-height: 124px;
      flex-direction: column;
      justify-content: center;
      box-sizing: border-box;
      padding: 20px;

      strong {
        font-size: 38px;
      }

      span {
        margin-top: 8px;
        font-size: 20px;
      }
    }
  }

  .steam-recent-games {
    grid-template-columns: 1fr;

    a {
      min-height: 220px;
      padding: 18px;
    }

    a > div strong {
      font-size: 26px;
    }

    a > div span,
    a > div small {
      margin-top: 7px;
      font-size: 19px;
    }

    a > div small {
      padding-right: 6px;
    }
  }

  .steam-profile-section-title h3 {
    font-size: 19px;
  }

  .steam-profile-details dt,
  .steam-profile-details dd {
    height: 50px;
    padding: 0 13px;
    font-size: 17px;
  }

  .steam-profile-copy {
    font-size: 20px;
  }

  .steam-game-search {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    min-height: 60px;
    font-size: 20px;

    input {
      font-size: 18px;
    }

    > span {
      font-size: 20px;
    }
  }

  .steam-profile-empty {
    font-size: 17px;
  }

  .steam-game-row {
    min-height: 68px;
    grid-template-columns: 42px 38px minmax(0, 1fr) 94px;
    gap: 9px;
    padding: 9px 12px;

    img {
      width: 42px;
      height: 42px;
    }

    strong {
      font-size: 17px;
    }

    > span {
      font-size: 15px;
    }

    small {
      display: none;
    }
  }

  .steam-profile-external {
    min-height: 58px;
    font-size: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .steam-profile-loader {
    animation: none;
  }

  .steam-recent-games a::after,
  .steam-recent-game-image,
  .steam-recent-games a > div strong {
    transition: none;
  }
}
</style>
