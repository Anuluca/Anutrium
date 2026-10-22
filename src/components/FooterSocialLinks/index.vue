<template>
  <div ref="switchMenuRef" class="footer-social-links-controller">
    <FooterSocialLinkBar
      :switch-active="isSwitchExpanded"
      :switch-instant="isSwitchInstant"
      @open-steam="isSteamModalOpen = true"
      @open-weibo="isWeiboModalOpen = true"
      @toggle-switch="toggleSwitchPanel"
    >
      <template #switch-panel>
        <Transition name="crt-effect" @after-leave="isSwitchExpanded = false">
          <div
            v-if="isSwitchPanelOpen"
            class="switch-friend-panel no-rem"
            role="dialog"
            aria-label="Nintendo Switch 好友信息"
          >
            <div class="switch-friend-panel__surface">
              <div class="switch-friend-panel__profile">
                <img
                  :src="NINTENDO_PROFILE_IMAGE_URL"
                  alt="Anuluca"
                  loading="lazy"
                  width="320"
                  height="320"
                  decoding="async"
                />
                <strong>Anuluca</strong>
              </div>
              <button
                class="switch-friend-panel__code-row"
                :class="{ 'is-copied': isSwitchCodeCopied }"
                type="button"
                :aria-label="isSwitchCodeCopied ? '好友码已复制' : '复制好友码'"
                :title="isSwitchCodeCopied ? '已复制' : '点击复制好友码'"
                @click.stop="copySwitchFriendCode"
              >
                <code
                  ><span class="switch-friend-panel__code-label">SW code: </span
                  >{{ NINTENDO_FRIEND_CODE }}</code
                >
                <span class="switch-friend-panel__copy" aria-hidden="true">
                  <svg
                    v-if="isSwitchCodeCopied"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    aria-hidden="true"
                  >
                    <rect x="8" y="8" width="11" height="11" rx="1" />
                    <path d="M16 6V5H5v11h1" />
                  </svg>
                </span>
              </button>
              <a
                class="switch-friend-panel__open"
                :href="NINTENDO_FRIEND_URL"
                target="_blank"
                rel="noopener noreferrer"
              >
                <el-icon
                  class="switch-friend-panel__open-icon"
                  aria-hidden="true"
                >
                  <Connection />
                </el-icon>
                跳转到 Nintendo Switch App
              </a>
            </div>
          </div>
        </Transition>
      </template>
    </FooterSocialLinkBar>
  </div>

  <ModalWrapper
    v-model="isWeiboModalOpen"
    width="420px"
    tactical-text="[WEIBO_FEED]"
    close-title="关闭微博秀 (ESC)"
  >
    <div class="footer-weibo-modal-content">
      <iframe
        v-if="isWeiboModalOpen"
        class="no-cursor"
        title="Anuluca Weibo"
        frameborder="0"
        scrolling="no"
        :src="WEIBO_WIDGET_URL"
      />
    </div>
  </ModalWrapper>

  <ModalWrapper
    v-model="isSteamModalOpen"
    width="960px"
    tactical-text="[STEAM_PROFILE]"
    :close-title="t('steamProfile.close')"
  >
    <SteamProfilePanel v-if="isSteamModalOpen" />
  </ModalWrapper>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Connection } from '@element-plus/icons-vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'

import FooterSocialLinkBar from '@/components/FooterSocialLinkBar/index.vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import SteamProfilePanel from '@/components/SteamProfilePanel/index.vue'
import {
  NINTENDO_FRIEND_CODE,
  NINTENDO_FRIEND_URL,
  NINTENDO_PROFILE_IMAGE_URL,
  WEIBO_WIDGET_URL,
} from '@/locales/modules/contactLinks'
import { copyText } from '@/utils/clipboard'
import { showSuccessMessage } from '@/utils/elementMessage'

import 'element-plus/es/components/message/style/css'

const isWeiboModalOpen = ref(false)
const isSteamModalOpen = ref(false)
const isSwitchPanelOpen = ref(false)
const isSwitchExpanded = ref(false)
const isSwitchInstant = ref(false)
const isSwitchCodeCopied = ref(false)
const switchMenuRef = ref<HTMLElement | null>(null)
let copyStatusTimer: number | null = null
let switchOpenFrame: number | null = null
const { t } = useI18n()

const clearSwitchOpenFrame = () => {
  if (switchOpenFrame === null) return
  window.cancelAnimationFrame(switchOpenFrame)
  switchOpenFrame = null
}

const closeSwitchPanel = () => {
  clearSwitchOpenFrame()
  isSwitchInstant.value = false
  if (!isSwitchPanelOpen.value) {
    isSwitchExpanded.value = false
    return
  }
  isSwitchPanelOpen.value = false
}

const toggleSwitchPanel = async () => {
  if (isSwitchExpanded.value) {
    closeSwitchPanel()
    return
  }

  isSwitchExpanded.value = true
  isSwitchInstant.value = true
  await nextTick()
  switchOpenFrame = window.requestAnimationFrame(() => {
    isSwitchPanelOpen.value = true
    switchOpenFrame = window.requestAnimationFrame(() => {
      isSwitchInstant.value = false
      switchOpenFrame = null
    })
  })
}

const copySwitchFriendCode = async () => {
  await copyText(NINTENDO_FRIEND_CODE)
  isSwitchCodeCopied.value = true
  showSuccessMessage(t('switchFriendCode.copySuccess'))

  if (copyStatusTimer !== null) window.clearTimeout(copyStatusTimer)
  copyStatusTimer = window.setTimeout(() => {
    isSwitchCodeCopied.value = false
    copyStatusTimer = null
  }, 1600)
}

onClickOutside(switchMenuRef, () => {
  closeSwitchPanel()
})

onKeyStroke('Escape', () => {
  closeSwitchPanel()
})

onUnmounted(() => {
  if (copyStatusTimer !== null) window.clearTimeout(copyStatusTimer)
  clearSwitchOpenFrame()
})
</script>

<style lang="less" scoped>
.footer-social-links-controller {
  width: 100%;
}

.switch-friend-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  left: var(--switch-icon-center);
  z-index: 20;
  width: 238px;
  transform: translateX(-50%);
}

.switch-friend-panel__surface {
  position: relative;
  box-sizing: border-box;
  padding: 10px;
  color: #d4d4d4;
  background: rgba(8, 7, 10, 0.9);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
  transform-origin: center;

  &::before,
  &::after {
    position: absolute;
    inset: -6px;
    pointer-events: none;
    content: '';
  }

  &::before {
    background: linear-gradient(
          var(--page-theme-color, #e23456),
          var(--page-theme-color, #e23456)
        )
        0 0 / 16px 2px no-repeat,
      linear-gradient(
          var(--page-theme-color, #e23456),
          var(--page-theme-color, #e23456)
        )
        0 0 / 2px 16px no-repeat,
      linear-gradient(
          var(--page-theme-color, #e23456),
          var(--page-theme-color, #e23456)
        )
        100% 100% / 16px 2px no-repeat,
      linear-gradient(
          var(--page-theme-color, #e23456),
          var(--page-theme-color, #e23456)
        )
        100% 100% / 2px 16px no-repeat;
  }

  &::after {
    background: linear-gradient(
          var(--page-theme-color, #e23456),
          var(--page-theme-color, #e23456)
        )
        100% 0 / 16px 2px no-repeat,
      linear-gradient(
          var(--page-theme-color, #e23456),
          var(--page-theme-color, #e23456)
        )
        100% 0 / 2px 16px no-repeat,
      linear-gradient(
          var(--page-theme-color, #e23456),
          var(--page-theme-color, #e23456)
        )
        0 100% / 16px 2px no-repeat,
      linear-gradient(
          var(--page-theme-color, #e23456),
          var(--page-theme-color, #e23456)
        )
        0 100% / 2px 16px no-repeat;
  }
}

.switch-friend-panel__code-row {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;

  code {
    flex: 1;
    font-family: 'Anton', monospace;
    font-size: 14px;
    letter-spacing: 1px;
    line-height: 32px;
    text-align: left;
    white-space: nowrap;
  }
  &:hover,
  &:focus-visible {
    .switch-friend-panel__copy {
      color: var(--page-theme-color, #e23456);
    }
  }

  &:focus-visible {
    outline: 1px solid var(--page-theme-color, #e23456);
    outline-offset: 2px;
  }
}

.switch-friend-panel__profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2px 0 12px;
  text-align: center;

  img {
    display: block;
    width: 74px;
    height: 74px;
    border-radius: 50%;
    object-fit: cover;
  }

  strong {
    margin-top: 9px;
    color: #fff;
    font-family: 'alibaba-puhuiti', sans-serif !important;
    font-size: 15px;
    font-weight: 900;
    line-height: 1.2;
  }
}

:global(.bottom-text:has(.switch-friend-panel)) {
  z-index: 150 !important;
  clip-path: inset(-100vh -100vw 0) !important;
}

:global(#page-footer-portal:has(.switch-friend-panel)) {
  position: relative;
  z-index: 150;
}

:global(.page-footer-sticky-clip:has(.switch-friend-panel)) {
  z-index: 3 !important;
  clip-path: inset(-100vh -100vw 0) !important;
}

.switch-friend-panel__code-label {
  margin-left: 2px;
  color: #cd2822;
}

.switch-friend-panel__copy {
  display: flex;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  color: #9a9a9a;
  transition: color 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  .switch-friend-panel__code-row.is-copied & {
    color: var(--page-theme-color, #e23456);
  }
}

.switch-friend-panel__open-icon {
  flex: 0 0 auto;
  margin-right: 6px;
  font-size: 15px;

  :deep(path) {
    stroke: currentcolor;
    stroke-width: 48px;
    stroke-linejoin: round;
    paint-order: stroke fill;
  }
}

.switch-friend-panel__open {
  display: flex;
  width: 100%;
  min-height: 34px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  padding: 7px 10px;
  border-radius: 3px;
  color: #090909;
  background: #cd2822;
  font-family: 'alibaba-puhuiti', sans-serif !important;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover,
  &:focus-visible {
    color: #fff;
  }

  &:focus-visible {
    outline: 1px solid #fff;
    outline-offset: -3px;
  }
}

:global(
    .crt-effect-enter-active.switch-friend-panel .switch-friend-panel__surface
  ) {
  animation: anutriumCrtOn 0.46s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

:global(
    .crt-effect-leave-active.switch-friend-panel .switch-friend-panel__surface
  ) {
  animation: anutriumCrtOff 0.42s cubic-bezier(0.2, 1, 0.22, 1) forwards;
}

.footer-weibo-modal-content {
  height: min(620px, calc(100dvh - 48px));
  overflow: hidden;

  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
  }
}

@media screen and (max-aspect-ratio: 1) {
  .footer-social-links-controller {
    position: relative;
  }

  .switch-friend-panel.no-rem {
    right: auto;
    left: var(--switch-icon-center);
    width: min(272px, calc(100vw - 40px));
    transform: translateX(-50%);
  }

  :deep(.footer-social-links__switch) {
    --switch-icon-center: 50%;
  }

  .switch-friend-panel__surface {
    padding: 16px;
  }

  .switch-friend-panel__profile {
    margin: 4px 0 24px;

    img {
      width: 148px;
      height: 148px;
    }

    strong {
      margin-top: 18px;
      font-size: 30px;
    }
  }

  .switch-friend-panel__code-row {
    gap: 12px;

    code {
      min-width: 0;
      font-size: 22px;
      line-height: 1.2;
    }
  }

  .switch-friend-panel__code-label {
    margin-left: 0;
  }

  .switch-friend-panel__copy {
    width: 42px;
    height: 42px;
    flex-basis: 42px;

    svg {
      width: 26px;
      height: 26px;
    }
  }

  .switch-friend-panel__open {
    min-height: 68px;
    margin-top: 16px;
    padding: 14px 20px;
    font-size: 24px;
  }

  .switch-friend-panel__open-icon {
    margin-right: 12px;
    font-size: 30px;
  }

  .footer-weibo-modal-content {
    width: 100%;
    height: 100%;
    min-height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  :global(
      .crt-effect-enter-active.switch-friend-panel .switch-friend-panel__surface
    ),
  :global(
      .crt-effect-leave-active.switch-friend-panel .switch-friend-panel__surface
    ) {
    animation: none;
  }

  .switch-friend-panel__copy,
  .switch-friend-panel__open {
    transition: none;
  }
}
</style>
