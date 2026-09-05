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

      <aside
        class="game-page-sidebar"
        :class="{ 'game-page-sidebar--ready': isEntryReady }"
        :aria-label="labels.sidebar"
      >
        <div class="game-page-panel">
          <img
            v-if="gameIcon && isEntryReady"
            class="game-page-panel__game-icon no-rem"
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
              <h2>{{ labels.designSource }}</h2>
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
    width: calc(100% + 60px);
    margin-left: -30px;
    padding-right: calc(var(--page-inline-gutter) / 2);
    padding-left: calc(var(--page-inline-gutter) / 2);
  }
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
  border-radius: 8px;
  box-sizing: border-box;
  background: #050505;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.35);

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

.game-page-sidebar {
  position: relative;
  z-index: 1;
  align-self: center;
  min-width: 0;
  width: 100%;
  height: 90%;
  min-height: 0;
  box-sizing: border-box;
  transform: translateX(-100%);
  pointer-events: none;

  &--ready {
    animation: game-sidebar-enter 680ms cubic-bezier(0.2, 0.72, 0.2, 1) both;
    pointer-events: auto;
  }
}

.game-page-panel {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto auto;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  letter-spacing: 0;
  background-color: #050305;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(110, 12, 25, 0.14) 0,
    rgba(110, 12, 25, 0.14) 1px,
    transparent 1px,
    transparent 4px
  );

  &__game-icon.no-rem {
    position: absolute;
    right: 14px;
    bottom: 104px;
    z-index: 0;
    width: 288px;
    height: 288px;
    object-fit: contain;
    object-position: center;
    opacity: 0.1;
    pointer-events: none;
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
  position: relative;
  z-index: 1;
  min-height: 0;
  padding: clamp(18px, 1.7vw, 26px);
  overflow: auto;
  box-sizing: border-box;
  color: #d7c9c9;
  background: transparent;
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
    letter-spacing: 0;
    line-height: 1;
    text-shadow: 0 0 9px rgba(216, 74, 92, 0.24);
  }

  p {
    margin: 0 0 6px;
    color: #eee5e5;
    font-size: clamp(11px, 0.9vw, 14px);
    line-height: 1.55;
  }

  small {
    display: block;
    margin-top: 7px;
    color: #806f72;
    font-size: 12px;
    letter-spacing: 0;
    line-height: 1.45;
  }
}

.game-page-compatibility.no-rem {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 34px;
  margin: 0 clamp(10px, 1vw, 15px) 18px;
  color: #806f72;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.game-page-compatibility.no-rem .game-page-compatibility__label {
  flex: 0 0 auto;
}

.game-page-compatibility.no-rem .game-page-compatibility__devices {
  display: flex;
  flex: 0 0 auto;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 9px;
}

.game-page-input-device.no-rem {
  position: relative;
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  color: #d9c7ca;
  opacity: 0.35;

  > svg {
    width: 23px;
    height: 23px;
  }

  &.game-page-input-device--supported {
    opacity: 1;
  }
}

.game-page-input-device.no-rem .game-page-input-device__check {
  position: absolute;
  right: -5px;
  bottom: -4px;
  z-index: 2;
  display: grid;
  width: 14px;
  height: 14px;
  place-items: center;
  border: 1px solid #071009;
  border-radius: 50%;
  color: #071009;
  background: #49db64;
  box-sizing: border-box;
  font-family: Arial, sans-serif;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
}

.game-page-actions {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0 clamp(10px, 1vw, 15px) clamp(10px, 1vw, 15px);
  border: 1px solid rgba(72, 11, 19, 0.68);
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
    margin: 4px 0;
  }

  .game-page-action,
  :deep(.game-page-share.share-button) {
    min-height: 50px;
  }

  .game-page-actions {
    margin: 0 6px 6px;
  }

  .game-page-compatibility.no-rem {
    min-height: 26px;
    margin: 0 6px 12px;
    font-size: 11px;
  }

  .game-page-input-device.no-rem {
    width: 21px;
    height: 21px;

    > svg {
      width: 19px;
      height: 19px;
    }
  }

  .game-page-panel__game-icon.no-rem {
    right: 8px;
    bottom: 76px;
    width: 224px;
    height: 224px;
  }

  .game-page-sidebar {
    height: 90%;
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
      font-size: 10px;
    }
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

  .game-page-sidebar {
    height: 100%;
    transform: none !important;
    animation: none !important;
  }

  .game-page-description {
    h2 {
      font-size: clamp(28px, 2.55vw, 40px);
    }

    p {
      font-size: clamp(16px, 1.35vw, 21px);
    }

    small {
      font-size: 18px;
    }
  }

  .game-page-compatibility.no-rem {
    gap: 3.5px;
    min-height: 24px;
    margin: 0 7px 12px;
    font-size: 9px;
  }

  .game-page-compatibility.no-rem .game-page-compatibility__devices {
    gap: 6px;
  }

  .game-page-input-device.no-rem {
    width: 18px;
    height: 18px;

    > svg {
      width: 16px;
      height: 16px;
    }
  }

  .game-page-input-device.no-rem .game-page-input-device__check {
    right: -3px;
    bottom: -2.5px;
    width: 10px;
    height: 10px;
    font-size: 7px;
  }

  .game-page-canvas:not(.game-page-canvas--page-fullscreen):not(:fullscreen) {
    width: 100%;
    height: 100%;
    margin: 0;
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

  .fullscreen-exit-control button {
    transition: none;
  }
}
</style>
