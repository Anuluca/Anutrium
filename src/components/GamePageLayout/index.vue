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
      <div class="game-page-machine">
        <Teleport to="body" :disabled="!isPageFullscreen">
          <div
            ref="gameContainer"
            class="game-page-canvas native-cursor no-rem"
            :class="{
              'game-page-canvas--page-fullscreen': isPageFullscreen,
            }"
          >
            <div
              v-if="isEntryReady"
              :key="renderKey"
              class="game-page-render-root"
            >
              <slot name="game" />
            </div>

            <div v-if="isAnyFullscreen" class="fullscreen-exit-control">
              <button type="button" @click="exitFullscreenMode">
                <CloseBold aria-hidden="true" />
                <span>{{ labels.exitFullscreen }}</span>
              </button>
            </div>

            <Transition name="fullscreen-hint">
              <div
                v-if="showFullscreenHint && isAnyFullscreen"
                class="fullscreen-hint"
                role="status"
              >
                {{ labels.fullscreenHint }}
              </div>
            </Transition>
          </div>
        </Teleport>
      </div>

      <aside
        class="game-page-sidebar"
        :class="{ 'game-page-sidebar--ready': isEntryReady }"
        :aria-label="labels.sidebar"
      >
        <div class="game-page-panel">
          <img
            v-if="gameIcon"
            class="game-page-sidebar__logo"
            :src="gameIcon"
            alt=""
            aria-hidden="true"
          />
          <div class="game-page-description">
            <section class="game-page-description__section">
              <h2>{{ labels.rules }}</h2>
              <p>{{ rulesText }}</p>
              <small v-if="rulesNote">{{ rulesNote }}</small>
            </section>

            <section class="game-page-description__section">
              <h2>
                {{ labels.designSource }}
              </h2>
              <p>{{ sourceText }}</p>
              <small v-if="sourceNote">{{ sourceNote }}</small>
            </section>
          </div>

          <div class="game-page-compatibility no-rem">
            <span class="game-page-compatibility__label">
              {{ labels.supportedInputs }}
            </span>
            <div class="game-page-compatibility__devices">
              <span
                v-for="input in inputOptions"
                :key="input.key"
                class="game-page-input-device no-rem"
                :class="{
                  'game-page-input-device--supported': isInputSupported(
                    input.key
                  ),
                }"
                :title="input.label"
                :aria-label="input.label"
              >
                <KeyboardMouseIcon
                  v-if="input.key === 'keyboardMouse'"
                  aria-hidden="true"
                />
                <GamepadIcon
                  v-else-if="input.key === 'gamepad'"
                  aria-hidden="true"
                />
                <Cellphone v-else aria-hidden="true" />
                <span
                  v-if="isInputSupported(input.key)"
                  class="game-page-input-device__check"
                  aria-hidden="true"
                >
                  ✓
                </span>
              </span>
            </div>
          </div>

          <nav class="game-page-actions" :aria-label="labels.actions">
            <button type="button" class="game-page-action" @click="refreshGame">
              <Refresh class="game-page-action__icon" aria-hidden="true" />
              <span>{{ labels.refresh }}</span>
            </button>
            <button
              type="button"
              class="game-page-action"
              @click="togglePageFullscreen"
            >
              <Monitor class="game-page-action__icon" aria-hidden="true" />
              <span>{{ labels.pageFullscreen }}</span>
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
        </div>
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
import {
  Cellphone,
  CloseBold,
  FullScreen,
  Monitor,
  Refresh,
} from '@element-plus/icons-vue'

import GamepadIcon from '@/components/GamePageLayout/GamepadIcon.vue'
import KeyboardMouseIcon from '@/components/GamePageLayout/KeyboardMouseIcon.vue'
import ShareButton from '@/components/ShareButton/index.vue'
import ToolPageLayout from '@/components/ToolPageLayout/index.vue'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'

type GameInputMethod = 'gamepad' | 'keyboardMouse' | 'mobile'

const props = withDefaults(
  defineProps<{
    backLabel?: string
    backPath?: string
    gameIcon?: string
    pageClass: string
    rulesNote?: string
    rulesText: string
    sourceNote?: string
    sourceText: string
    subtitle?: string
    supportedInputs?: GameInputMethod[]
    title: string
  }>(),
  {
    backLabel: 'HOME',
    backPath: '/',
    gameIcon: '',
    rulesNote: '',
    sourceNote: '',
    subtitle: '',
    supportedInputs: () => [],
  }
)

const { locale } = useI18n()
const siteEntryActive = inject<Readonly<Ref<boolean>>>('site-entry-active')
const isEntryReady = computed(() => siteEntryActive?.value ?? true)
const gameContainer = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const isPageFullscreen = ref(false)
const showFullscreenHint = ref(false)
const renderKey = ref(0)
const isAnyFullscreen = computed(
  () => isFullscreen.value || isPageFullscreen.value
)
const pageFullscreenScrollLockKey = 'game-page-fullscreen'
let fullscreenHintTimer: ReturnType<typeof setTimeout> | null = null

const labels = computed(() => {
  if (locale.value === 'en') {
    return {
      actions: 'Game actions',
      controller: 'CONTROLLER',
      copied: 'COPIED',
      designSource: 'DESIGN SOURCE',
      exitFullscreen: 'EXIT FULLSCREEN',
      fullscreen: 'FULLSCREEN',
      fullscreenHint:
        'Press “ESC” or move the pointer to the top to exit fullscreen',
      keyboardMouse: 'KEYBOARD & MOUSE',
      mobile: 'MOBILE',
      pageFullscreen: 'PAGE FULLSCREEN',
      refresh: 'RELOAD',
      rules: 'RULES',
      share: 'SHARE',
      sidebar: 'Game description and actions',
      supportedInputs: 'SUPPORTED:',
    }
  }

  return {
    actions: '游戏操作',
    controller: '手柄',
    copied: '已复制',
    designSource: '设计来源',
    exitFullscreen: '退出全屏',
    fullscreen: '全屏',
    fullscreenHint: '按「ESC」或者鼠标移至顶部退出全屏',
    keyboardMouse: '键鼠',
    mobile: '手机',
    pageFullscreen: '网页全屏',
    refresh: '重载',
    rules: '游戏规则',
    share: '分享',
    sidebar: '游戏说明与操作',
    supportedInputs: '适用于：',
  }
})

const inputOptions = computed<Array<{ key: GameInputMethod; label: string }>>(
  () => [
    { key: 'mobile', label: labels.value.mobile },
    { key: 'keyboardMouse', label: labels.value.keyboardMouse },
    { key: 'gamepad', label: labels.value.controller },
  ]
)

const supportedInputs = computed(() => new Set(props.supportedInputs))

const isInputSupported = (input: GameInputMethod) =>
  supportedInputs.value.has(input)

const syncFullscreenState = () => {
  isFullscreen.value = document.fullscreenElement === gameContainer.value
  if (!isAnyFullscreen.value) hideFullscreenHint()
}

const hideFullscreenHint = () => {
  showFullscreenHint.value = false
  if (fullscreenHintTimer === null) return

  clearTimeout(fullscreenHintTimer)
  fullscreenHintTimer = null
}

const showFullscreenHintMessage = () => {
  hideFullscreenHint()
  showFullscreenHint.value = true
  fullscreenHintTimer = setTimeout(() => {
    showFullscreenHint.value = false
    fullscreenHintTimer = null
  }, 3600)
}

const toggleFullscreen = async () => {
  if (!gameContainer.value) return

  if (document.fullscreenElement === gameContainer.value) {
    await document.exitFullscreen()
    return
  }

  await gameContainer.value.requestFullscreen()
  showFullscreenHintMessage()
}

const exitPageFullscreen = () => {
  isPageFullscreen.value = false
  setSmoothScrollLocked(pageFullscreenScrollLockKey, false)
  hideFullscreenHint()
}

const togglePageFullscreen = () => {
  if (isPageFullscreen.value) {
    exitPageFullscreen()
    return
  }

  isPageFullscreen.value = true
  setSmoothScrollLocked(pageFullscreenScrollLockKey, true)
  showFullscreenHintMessage()
}

const exitFullscreenMode = async () => {
  if (isPageFullscreen.value) {
    exitPageFullscreen()
    return
  }

  if (document.fullscreenElement === gameContainer.value) {
    await document.exitFullscreen()
  }
}

const handleFullscreenKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isPageFullscreen.value) return

  event.preventDefault()
  exitPageFullscreen()
}

const refreshGame = () => {
  renderKey.value += 1
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreenState)
  document.addEventListener('keydown', handleFullscreenKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
  document.removeEventListener('keydown', handleFullscreenKeydown)
  setSmoothScrollLocked(pageFullscreenScrollLockKey, false)
  hideFullscreenHint()
})
</script>

<style lang="less" scoped>
.game-page-workspace {
  display: grid;
  grid-template-columns: minmax(0, 81fr) minmax(0, 19fr);
  width: 100%;
  height: clamp(480px, calc(100dvh - 150px), 900px);
  min-height: 480px;
  margin: clamp(7px, 0.75vw, 11px) 0;
  box-sizing: border-box;
}

@media (min-width: 769px) {
  :global(.game-page-layout.main-container) {
    width: calc(100% + 20px);
    margin-left: -30px;
    padding-right: calc(var(--page-inline-gutter) / 2);
    padding-left: calc(var(--page-inline-gutter) / 2);
  }
}

.game-page-layout.no-rem .game-page-workspace {
  --file-paper: #292724;
  --file-ink: #e7e3d9;
  --file-muted: #b9b3a9;
  --file-red: #9b293c;
  --file-line: #625d55;
  gap: 10px;
  padding: 10px;
  overflow: visible;
  color: var(--file-ink);
  background: transparent;
}

.game-page-layout.no-rem .game-page-machine {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  background: var(--file-paper);
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
  border: 1px solid #34302e;
  border-radius: 0;
  box-sizing: border-box;
  background: #050505;
  box-shadow: none;

  &:fullscreen {
    width: 100vw;
    height: 100dvh;
    border: 0;
    border-radius: 0;
    background: #050505;
    box-shadow: none;
  }

  &--page-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 2000;
    width: 100vw;
    height: 100dvh;
    border: 0;
    border-radius: 0;
    background: #050505;
    box-shadow: none;
  }
}

.game-page-canvas.no-rem .fullscreen-exit-control {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 100;
  width: clamp(150px, 18vw, 220px);
  height: 16px;
  transform: translateX(-50%);

  button {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 44px;
    padding: 0 16px;
    border: 3px solid rgba(92, 16, 27, 0.86);
    border-top: 0;
    border-radius: 0;
    color: #e7dadd;
    background: rgba(8, 5, 8, 0.96);
    box-sizing: border-box;
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 13px;
    font-weight: 700;
    transform: translateY(calc(-100% + 5px));
    transition: color 0.18s ease, background-color 0.18s ease,
      transform 0.2s ease-out;
    cursor: pointer;

    svg {
      width: 15px;
      height: 15px;
      color: #e23456;
    }

    &:hover,
    &:focus-visible {
      color: #fff;
      background: #3f0b13;
      outline: none;
    }
  }

  &:hover button,
  &:focus-within button {
    transform: translateY(0);
  }
}

.game-page-canvas.no-rem .fullscreen-hint {
  position: absolute;
  bottom: clamp(22px, 4vh, 48px);
  left: 50%;
  z-index: 100;
  max-width: calc(100% - 32px);
  padding: 10px 18px;
  border: 0;
  border-radius: 0;
  color: #eee5e5;
  background: rgba(8, 5, 8, 0.9);
  box-sizing: border-box;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(15px, 1.25vw, 18px);
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  white-space: nowrap;
  transform: translateX(-50%);
  pointer-events: none;
}

.game-page-canvas.no-rem .fullscreen-hint-enter-active,
.game-page-canvas.no-rem .fullscreen-hint-leave-active {
  transition: opacity 0.16s linear, transform 0.16s linear;
}

.game-page-canvas.no-rem .fullscreen-hint-enter-from,
.game-page-canvas.no-rem .fullscreen-hint-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}

// 右侧内容与背景 Logo 分层，避免水印影响文字和按钮交互。
.game-page-layout.no-rem .game-page-sidebar {
  position: relative;
  isolation: isolate;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: visible;
  color: var(--file-ink);
  opacity: 0;
  pointer-events: none;

  &--ready {
    opacity: 1;
    pointer-events: auto;
  }

  &--ready .game-page-panel {
    animation: game-sidebar-unfold 0.52s cubic-bezier(0.2, 0.75, 0.25, 1) both;
  }
}

.game-page-layout.no-rem .game-page-sidebar__logo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 85%;
  max-height: 70%;
  object-fit: contain;
  transform: translate(-50%, -50%);
  filter: grayscale(1);
  opacity: 0.1;
  pointer-events: none;
}

.game-page-layout.no-rem .game-page-panel {
  position: relative;
  top: -5px;
  z-index: 1;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto auto;
  width: calc(100% + 22px);
  height: calc(100% + 10px);
  min-height: 0;
  padding: 12px;
  box-sizing: border-box;
  font-family: 'alibaba-puhuiti', sans-serif;
  letter-spacing: 0;
  transform: perspective(800px) rotateY(-5deg);
  transform-origin: left center;
  transform-style: preserve-3d;
}

@keyframes game-sidebar-unfold {
  0% {
    transform: perspective(800px) rotateY(-82deg) scaleX(0.3);
  }

  100% {
    transform: perspective(800px) rotateY(-5deg) scaleX(1);
  }
}

.game-page-layout.no-rem .game-page-description {
  min-height: 0;
  padding: 0 0 22px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--file-line) transparent;

  > section {
    padding: 12px;
    box-sizing: border-box;
    background: linear-gradient(
      to bottom,
      rgb(63 63 63 / 57%) 0 58px,
      transparent 58px 100%
    );
  }

  > section + section {
    margin-top: 24px;
  }

  h2 {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0 0 10px;
    color: var(--file-ink);
    font-size: 28px;
    font-weight: 800;
    line-height: 1.4;
    text-shadow: 0 3px 8px rgb(0 0 0 / 45%);
  }

  p,
  small {
    margin: 0;
    font-size: 17px;
    line-height: 1.8;
  }

  small {
    display: block;
    margin-top: 10px;
    color: var(--file-muted);
    font-size: 15px;
  }
}

.game-page-layout.no-rem .game-page-compatibility.no-rem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  margin-bottom: 7px;
  border-top: 1px solid var(--file-line);
  color: var(--file-muted);
  font-size: 13px;
  line-height: 1.3;
}

.game-page-layout.no-rem .game-page-compatibility__devices {
  display: flex;
  align-items: center;
  gap: 14px;
}

.game-page-layout.no-rem .game-page-input-device.no-rem {
  position: relative;
  display: grid;
  width: 22px;
  height: 24px;
  place-items: center;
  color: var(--file-ink);
  opacity: 0.3;

  > svg {
    width: 21px;
    height: 21px;
  }
  &.game-page-input-device--supported {
    opacity: 1;
  }
}

.game-page-layout.no-rem .game-page-input-device__check {
  position: absolute;
  right: -5px;
  bottom: -3px;
  color: var(--file-red);
  background: transparent;
  font: 900 11px/1 Arial, sans-serif;
}

.game-page-layout.no-rem .game-page-actions {
  --game-action-background: #202020;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.game-page-layout.no-rem .game-page-action,
.game-page-layout.no-rem :deep(.game-page-share.share-button) {
  display: flex;
  position: relative;
  top: 0;
  left: 0;
  z-index: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 48px;
  margin: 0;
  padding: 5px;
  border: 0;
  border-radius: 0;
  box-sizing: border-box;
  color: #e3dfd5;
  background: var(--game-action-background);
  box-shadow: 0 6px 18px rgb(0 0 0 / 18%);
  font: 700 17px/1.2 'alibaba-puhuiti', sans-serif;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease,
    box-shadow 0.15s ease, top 0.15s ease, left 0.15s ease;

  &:hover,
  &.share-button--copied {
    color: #e3dfd5;
    background: var(--game-action-background);
  }

  &:hover {
    top: -1px;
    left: -1px;
    z-index: 1;
    box-shadow: 4px 6px 16px rgb(0 0 0 / 28%);
  }

  &:focus-visible {
    outline: 2px solid var(--file-red);
    outline-offset: 2px;
  }
}

.game-page-layout.no-rem .game-page-action > span,
.game-page-layout.no-rem :deep(.game-page-share .share-button__label) {
  min-width: 0;
  overflow-wrap: anywhere;
}

.game-page-layout.no-rem .game-page-action__icon,
.game-page-layout.no-rem :deep(.game-page-share .share-button__icon) {
  flex: 0 0 27px;
  width: 27px;
  height: 27px;
  color: #ca3c4f;
}

.game-page-layout.no-rem :deep(.game-page-share.share-button::before),
.game-page-layout.no-rem :deep(.game-page-share .share-button__code) {
  display: none;
}

.game-page-layout.no-rem :deep(.game-page-share .share-button__label) {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
}

@media (max-height: 800px), (max-width: 1100px) {
  .game-page-layout.no-rem .game-page-panel {
    padding: 6px;
  }

  .game-page-layout.no-rem .game-page-description {
    padding: 0 0 16px;
    > section + section {
      margin-top: 16px;
    }
  }
}

@media (max-width: 960px) and (orientation: landscape) {
  .game-page-workspace {
    height: calc(100dvh - 86px);
    min-height: 280px;
    margin: 4px 0;
  }
}

@media (max-width: 768px) and (orientation: portrait) {
  :global(.game-page-layout) {
    --game-mobile-horizontal-gutter: max(16px, env(safe-area-inset-left));
    --game-mobile-vertical-gutter: calc(
      2.83333rem + max(0.66667rem, env(safe-area-inset-top))
    );
    position: fixed !important;
    top: 0;
    left: 0;
    z-index: 1200;
    width: 100dvh !important;
    max-width: none !important;
    height: 100dvw !important;
    min-height: 0 !important;
    padding: 0 !important;
    overflow: hidden;
    background: #050505;
    transform: rotate(90deg) translateY(-100%);
    transform-origin: top left;
  }

  :global(.game-page-layout .tool-page-stage) {
    flex: 1 1 auto !important;
    height: 100% !important;
    min-height: 0 !important;
    padding: var(--game-mobile-horizontal-gutter) 0
      var(--game-mobile-horizontal-gutter) var(--game-mobile-vertical-gutter) !important;
    box-sizing: border-box;
    transform: none !important;
  }

  :global(.game-page-layout .tool-page-content) {
    display: flex;
    flex: 1 1 0 !important;
    min-height: 0 !important;
  }

  :global(.game-page-layout .detail-page-header) {
    flex: 0 0 46px !important;
    width: 100% !important;
    height: 46px !important;
    min-height: 46px !important;
    aspect-ratio: auto !important;
    margin: 0 0 12px !important;
    padding: 0 !important;
  }

  .game-page-workspace {
    grid-template-columns: minmax(0, 76fr) minmax(172px, 24fr);
    flex: 1 1 auto;
    height: auto;
    min-height: 0;
    margin: 0;
  }

  .game-page-layout.no-rem .game-page-sidebar {
    height: 100%;
    transform: none !important;
    animation: none !important;
  }

  .game-page-canvas:not(.game-page-canvas--page-fullscreen):not(:fullscreen) {
    width: 100%;
    height: 100%;
    margin: 0;
  }
}

@media (max-width: 768px) and (orientation: portrait),
  (max-height: 540px) and (orientation: landscape) {
  .game-page-layout.no-rem .game-page-machine {
    grid-template-rows: minmax(0, 1fr);
  }

  .game-page-layout.no-rem .game-page-workspace {
    gap: 8px;
    padding: 6px;
  }

  .game-page-layout.no-rem .game-page-panel {
    padding: 6px;
  }

  .game-page-layout.no-rem .game-page-description {
    padding: 0 0 10px;
    h2 {
      margin-bottom: 5px;
      gap: 7px;
      font-size: 23px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
    }
    small {
      margin-top: 5px;
      font-size: 13px;
    }
    > section + section {
      margin-top: 12px;
    }
  }
  .game-page-layout.no-rem .game-page-compatibility.no-rem {
    min-height: 32px;
    margin-bottom: 4px;
    font-size: 12px;
  }
  .game-page-layout.no-rem .game-page-actions {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 3px;
  }
  .game-page-layout.no-rem .game-page-action,
  .game-page-layout.no-rem :deep(.game-page-share.share-button) {
    flex-direction: column;
    gap: 4px;
    min-height: 52px;
    padding: 3px 2px;
    font-size: 14px;
  }
  .game-page-layout.no-rem :deep(.game-page-share .share-button__label) {
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .game-page-layout.no-rem .game-page-sidebar,
  .game-page-layout.no-rem .game-page-sidebar--ready {
    opacity: 1;
  }

  .game-page-layout.no-rem .game-page-sidebar .game-page-panel,
  .game-page-layout.no-rem .game-page-sidebar--ready .game-page-panel {
    animation: none;
    transform: perspective(800px) rotateY(-5deg);
  }

  .game-page-layout.no-rem .game-page-action,
  .game-page-layout.no-rem :deep(.game-page-share.share-button) {
    transition: none;
  }

  .fullscreen-exit-control button {
    transition: none;
  }
}
</style>
