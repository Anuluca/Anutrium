<template>
  <ToolPageLayout
    :page-class="`${pageClass} game-page-layout no-rem`"
    :title="title"
    :subtitle="subtitle"
    :back-label="backLabel"
    :back-path="backPath"
    :show-recommendations="false"
  >
    <section class="game-page-workspace">
      <div
        ref="gameContainer"
        class="game-page-canvas native-cursor"
        :class="{ 'game-page-canvas--fullscreen': isFullscreen }"
      >
        <div v-if="isEntryReady" :key="renderKey" class="game-page-render-root">
          <slot name="game" />
        </div>
      </div>

      <aside
        class="game-page-sidebar"
        :class="{ 'game-page-sidebar--ready': isEntryReady }"
        :aria-label="labels.sidebar"
      >
        <div class="game-page-description">
          <section class="game-page-description__section">
            <h2>{{ labels.rules }}</h2>
            <p>{{ rulesText }}</p>
            <small v-if="rulesNote">{{ rulesNote }}</small>
          </section>

          <section class="game-page-description__section">
            <h2>{{ labels.designSource }}</h2>
            <p>{{ sourceText }}</p>
            <small v-if="sourceNote">{{ sourceNote }}</small>
          </section>
        </div>

        <nav class="game-page-actions" :aria-label="labels.actions">
          <button type="button" class="game-page-action" @click="refreshGame">
            <Refresh class="game-page-action__icon" aria-hidden="true" />
            <span>{{ labels.refresh }}</span>
          </button>
          <button
            type="button"
            class="game-page-action"
            @click="toggleFullscreen"
          >
            <FullScreen class="game-page-action__icon" aria-hidden="true" />
            <span>{{
              isFullscreen ? labels.exitFullscreen : labels.fullscreen
            }}</span>
          </button>
          <ShareButton
            class="game-page-share"
            :title="title"
            :text="subtitle || title"
            target-type="game"
            :label="labels.share"
            :copied-text="labels.copied"
            :show-arrow="false"
            show-icon
          />
        </nav>
      </aside>
    </section>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  type Ref,
  ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { FullScreen, Refresh } from '@element-plus/icons-vue'

import ShareButton from '@/components/ShareButton/index.vue'
import ToolPageLayout from '@/components/ToolPageLayout/index.vue'

withDefaults(
  defineProps<{
    backLabel?: string
    backPath?: string
    pageClass: string
    rulesNote?: string
    rulesText: string
    sourceNote?: string
    sourceText: string
    subtitle?: string
    title: string
  }>(),
  {
    backLabel: 'HOME',
    backPath: '/',
    rulesNote: '',
    sourceNote: '',
    subtitle: '',
  }
)

const { locale } = useI18n()
const siteEntryActive = inject<Readonly<Ref<boolean>>>('site-entry-active')
const isEntryReady = computed(() => siteEntryActive?.value ?? true)
const gameContainer = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const renderKey = ref(0)

const labels = computed(() => {
  if (locale.value === 'en') {
    return {
      actions: 'Game actions',
      copied: 'Copied',
      designSource: 'DESIGN SOURCE',
      exitFullscreen: 'Exit',
      fullscreen: 'Fullscreen',
      refresh: 'Refresh',
      rules: 'RULES',
      share: 'Share',
      sidebar: 'Game description and actions',
    }
  }

  return {
    actions: '游戏操作',
    copied: '已复制',
    designSource: '设计来源',
    exitFullscreen: '退出全屏',
    fullscreen: '全屏',
    refresh: '刷新',
    rules: '游戏规则',
    share: '分享',
    sidebar: '游戏说明与操作',
  }
})

const syncFullscreenState = () => {
  isFullscreen.value = document.fullscreenElement === gameContainer.value
}

const toggleFullscreen = async () => {
  if (!gameContainer.value) return

  if (document.fullscreenElement === gameContainer.value) {
    await document.exitFullscreen()
    return
  }

  await gameContainer.value.requestFullscreen()
}

const refreshGame = () => {
  renderKey.value += 1
}

onMounted(() =>
  document.addEventListener('fullscreenchange', syncFullscreenState)
)
onBeforeUnmount(() =>
  document.removeEventListener('fullscreenchange', syncFullscreenState)
)
</script>

<style lang="less" scoped>
.game-page-workspace {
  display: grid;
  grid-template-columns: minmax(0, 76fr) minmax(0, 24fr);
  width: 100%;
  height: clamp(480px, calc(100dvh - 190px), 760px);
  min-height: 480px;
  margin: clamp(14px, 1.5vw, 22px) 0 clamp(28px, 3vw, 48px);
  box-sizing: border-box;
}

.game-page-canvas,
.game-page-render-root {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.game-page-canvas {
  position: relative;
  z-index: 2;
  overflow: hidden;
  border: 1px solid rgba(111, 16, 27, 0.72);
  box-sizing: border-box;
  background: #050505;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.35);

  &:fullscreen {
    width: 100vw;
    height: 100vh;
    border: 0;
    background: #050505;
    box-shadow: none;
  }
}

.game-page-sidebar {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  align-self: center;
  min-width: 0;
  width: 100%;
  height: min(90%, 640px);
  min-height: 380px;
  overflow: hidden;
  border: 1px solid rgba(72, 11, 19, 0.68);
  border-left: 0;
  box-sizing: border-box;
  background: #050305;
  transform: translateX(-100%);
  pointer-events: none;

  &--ready {
    animation: game-sidebar-enter 680ms cubic-bezier(0.2, 0.72, 0.2, 1) both;
    pointer-events: auto;
  }
}

@keyframes game-sidebar-enter {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.game-page-description {
  min-height: 0;
  padding: clamp(18px, 1.7vw, 26px);
  overflow: auto;
  box-sizing: border-box;
  color: #d7c9c9;
  background-color: #050305;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(110, 12, 25, 0.14) 0,
    rgba(110, 12, 25, 0.14) 1px,
    transparent 1px,
    transparent 4px
  );
  font-family: 'alibaba-puhuiti', sans-serif;
  scrollbar-width: thin;
  scrollbar-color: rgba(226, 52, 86, 0.5) transparent;

  &__section + &__section {
    margin-top: 22px;
    padding-top: 20px;
    border-top: 1px solid rgba(72, 11, 19, 0.58);
  }

  h2 {
    margin: 0 0 10px;
    color: #d84a5c;
    font-size: clamp(19px, 1.7vw, 27px);
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1;
    text-shadow: 0 0 9px rgba(216, 74, 92, 0.24);
  }

  p {
    margin: 0;
    color: #eee5e5;
    font-size: clamp(11px, 0.9vw, 14px);
    line-height: 1.55;
  }

  small {
    display: block;
    margin-top: 7px;
    color: #806f72;
    font-size: 10px;
    letter-spacing: 0.05em;
    line-height: 1.45;
  }
}

.game-page-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid rgba(72, 11, 19, 0.68);
}

.game-page-action {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  min-width: 0;
  min-height: 68px;
  padding: 8px 4px;
  border: 0;
  border-right: 1px solid rgba(72, 11, 19, 0.5);
  color: #d9c7ca;
  background: #080508;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(13px, 1vw, 15px);
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;

  &:hover,
  &:focus-visible {
    color: #fff;
    background: #6f101b;
    outline: none;
  }

  &__icon {
    width: 18px;
    height: 18px;
    color: #e23456;
  }
}

.game-page-share {
  min-width: 0;
  border: 0;
  border-radius: 0;
}

:deep(.game-page-share.share-button) {
  display: grid;
  grid-template-columns: 1fr;
  place-items: center;
  align-content: center;
  gap: 5px;
  min-height: 68px;
  padding: 8px 4px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  color: #d9c7ca;
  background: #080508;
  box-shadow: none;
  font-size: clamp(13px, 1vw, 15px);
  transition: color 0.2s ease, background-color 0.2s ease;

  &::before {
    display: none;
  }

  &:hover,
  &:focus-visible,
  &.share-button--copied {
    color: #fff;
    border: 0;
    background: #6f101b;
    outline: none;
  }
}

:deep(.game-page-share .share-button__code) {
  display: none;
}

:deep(.game-page-share .share-button__icon) {
  width: 18px;
  height: 18px;
  color: #e23456;
}

:deep(.game-page-share .share-button__label) {
  font-size: clamp(13px, 1vw, 15px);
  font-weight: 700;
  letter-spacing: normal;
}

@media (max-width: 960px) and (orientation: landscape) {
  .game-page-workspace {
    height: calc(100dvh - 86px);
    min-height: 280px;
    margin: 8px 0 18px;
  }

  .game-page-action,
  :deep(.game-page-share.share-button) {
    min-height: 50px;
  }

  .game-page-sidebar {
    height: calc(100% - 20px);
    min-height: 0;
  }

  .game-page-description {
    padding: 14px 16px;

    &__section + &__section {
      margin-top: 9px;
      padding-top: 8px;
    }

    h2 {
      margin-bottom: 7px;
      font-size: 18px;
    }

    p {
      font-size: 10px;
      line-height: 1.4;
    }

    small {
      font-size: 9px;
    }
  }
}

@media (max-width: 768px) and (orientation: portrait) {
  :global(.game-page-layout) {
    position: fixed !important;
    top: 0;
    left: 0;
    z-index: 1200;
    width: 100dvh !important;
    max-width: none !important;
    height: 100dvw !important;
    min-height: 0 !important;
    padding: 0 14px !important;
    overflow-y: auto;
    background: #050505;
    transform: rotate(90deg) translateY(-100%);
    transform-origin: top left;
  }

  :global(.game-page-layout .tool-page-stage) {
    flex: 0 0 auto;
    transform: none;
  }

  :global(.game-page-layout .detail-page-header) {
    width: 100%;
    min-height: 46px;
    aspect-ratio: auto;
    margin: 0;
    padding: 5px 14px;
  }

  .game-page-workspace {
    height: calc(100dvw - 60px);
    min-height: 300px;
    margin: 6px 0 16px;
  }

  .game-page-action,
  :deep(.game-page-share.share-button) {
    min-height: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .game-page-sidebar,
  .game-page-sidebar--ready {
    animation: none;
    transform: translateX(0);
  }

  .game-page-action {
    transition: none;
  }
}
</style>
