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
        class="game-page-canvas"
        :class="{ 'game-page-canvas--fullscreen': isFullscreen }"
      >
        <div :key="renderKey" class="game-page-render-root">
          <slot name="game" />
        </div>
      </div>

      <aside class="game-page-sidebar" :aria-label="labels.sidebar">
        <div class="game-page-description">
          <slot name="description" />
        </div>

        <nav class="game-page-actions" :aria-label="labels.actions">
          <button
            type="button"
            class="game-page-action"
            @click="toggleFullscreen"
          >
            <span class="game-page-action__code">FULL</span>
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
          />
          <button type="button" class="game-page-action" @click="refreshGame">
            <span class="game-page-action__code">RELOAD</span>
            <span>{{ labels.refresh }}</span>
          </button>
        </nav>
      </aside>
    </section>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ShareButton from '@/components/ShareButton/index.vue'
import ToolPageLayout from '@/components/ToolPageLayout/index.vue'

withDefaults(
  defineProps<{
    backLabel?: string
    backPath?: string
    pageClass: string
    subtitle?: string
    title: string
  }>(),
  {
    backLabel: 'HOME',
    backPath: '/',
    subtitle: '',
  }
)

const { locale } = useI18n()
const gameContainer = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const renderKey = ref(0)

const labels = computed(() => {
  if (locale.value === 'en') {
    return {
      actions: 'Game actions',
      copied: 'Copied',
      exitFullscreen: 'Exit',
      fullscreen: 'Fullscreen',
      refresh: 'Refresh',
      share: 'Share',
      sidebar: 'Game description and actions',
    }
  }

  return {
    actions: '游戏操作',
    copied: '已复制',
    exitFullscreen: '退出全屏',
    fullscreen: '全屏',
    refresh: '刷新',
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
  grid-template-columns: minmax(0, 7fr) minmax(0, 3fr);
  width: 100%;
  height: clamp(480px, calc(100dvh - 190px), 760px);
  min-height: 480px;
  margin: clamp(14px, 1.5vw, 22px) 0 clamp(28px, 3vw, 48px);
  overflow: hidden;
  border: 1px solid rgba(111, 16, 27, 0.72);
  box-sizing: border-box;
  background: #050505;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.35);
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
  overflow: hidden;
  background: #050505;

  &:fullscreen {
    width: 100vw;
    height: 100vh;
    background: #050505;
  }
}

.game-page-sidebar {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid rgba(111, 16, 27, 0.78);
  background: #050305;
}

.game-page-description {
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(226, 52, 86, 0.5) transparent;
}

.game-page-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid rgba(111, 16, 27, 0.78);
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
  border-right: 1px solid rgba(111, 16, 27, 0.5);
  color: #d9c7ca;
  background: #080508;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;

  &:hover,
  &:focus-visible {
    color: #fff;
    background: #6f101b;
    outline: none;
  }

  &__code {
    color: #e23456;
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 8px;
    letter-spacing: 0.12em;
  }
}

.game-page-share {
  min-width: 0;
  border: 0;
  border-right: 1px solid rgba(111, 16, 27, 0.5);
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
  background: #080508;
  box-shadow: none;
}

:deep(.game-page-share .share-button__code) {
  color: #e23456;
  font-size: 8px;
}

:deep(.game-page-share .share-button__label) {
  font-size: 12px;
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
  .game-page-action {
    transition: none;
  }
}
</style>
