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
            @wheel="containGameWheel"
          >
            <div
              v-if="isEntryReady"
              :key="renderKey"
              class="game-page-render-root"
            >
              <slot name="game" />
            </div>

            <div v-if="isAnyFullscreen" class="fullscreen-exit-control">
              <button
                type="button"
                :aria-label="labels.exitFullscreen"
                @click="exitFullscreenMode"
              >
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
          <span class="game-page-panel__tab" aria-hidden="true">
            {{ labels.archiveFile }}
          </span>
          <img
            v-if="gameIcon"
            class="game-page-sidebar__logo"
            :src="gameIcon"
            alt=""
            aria-hidden="true"
            width="128"
            height="128"
            loading="eager"
            decoding="async"
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
              :aria-pressed="isPageFullscreen"
              @click="togglePageFullscreen"
            >
              <Monitor class="game-page-action__icon" aria-hidden="true" />
              <span>{{ labels.pageFullscreen }}</span>
            </button>
            <button
              type="button"
              class="game-page-action"
              :aria-pressed="isFullscreen"
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
      archiveFile: 'INFO',
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
    archiveFile: 'INFO',
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

const containGameWheel = (event: WheelEvent) => {
  const target = event.target
  const scrollable =
    target instanceof Element
      ? target.closest<HTMLElement>('[data-game-scrollable]')
      : null

  if (scrollable && gameContainer.value?.contains(scrollable)) {
    const maxScrollTop = scrollable.scrollHeight - scrollable.clientHeight
    const canScrollUp = event.deltaY < 0 && scrollable.scrollTop > 0
    const canScrollDown =
      event.deltaY > 0 && scrollable.scrollTop < maxScrollTop

    event.stopPropagation()
    if (canScrollUp || canScrollDown || event.deltaY === 0) return
  }

  event.preventDefault()
  event.stopPropagation()
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

<style src="./index.less" lang="less" scoped />
