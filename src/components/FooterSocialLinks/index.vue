<template>
  <div ref="switchMenuRef" class="footer-social-links-controller">
    <FooterSocialLinkBar
      :switch-active="isSwitchPanelOpen"
      @open-steam="isSteamModalOpen = true"
      @open-weibo="isWeiboModalOpen = true"
      @toggle-switch="isSwitchPanelOpen = !isSwitchPanelOpen"
    >
      <template #switch-panel>
        <Transition name="switch-panel">
          <div
            v-if="isSwitchPanelOpen"
            class="switch-friend-panel no-rem"
            role="dialog"
            aria-label="Nintendo Switch 好友信息"
          >
            <div class="switch-friend-panel__profile">
              <img
                :src="NINTENDO_PROFILE_IMAGE_URL"
                alt="Anuluca"
                loading="lazy"
              />
              <strong>Anuluca</strong>
            </div>
            <div class="switch-friend-panel__code-row">
              <code
                ><span class="switch-friend-panel__code-label">SW code: </span
                >{{ NINTENDO_FRIEND_CODE }}</code
              >
              <button
                class="switch-friend-panel__copy"
                :class="{ 'is-copied': isSwitchCodeCopied }"
                type="button"
                :aria-label="isSwitchCodeCopied ? '好友码已复制' : '复制好友码'"
                :title="isSwitchCodeCopied ? '已复制' : '复制好友码'"
                @click.stop="copySwitchFriendCode"
              >
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
              </button>
            </div>
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
import { onUnmounted, ref } from 'vue'
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
const isSwitchCodeCopied = ref(false)
const switchMenuRef = ref<HTMLElement | null>(null)
let copyStatusTimer: number | null = null
const { t } = useI18n()

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
  isSwitchPanelOpen.value = false
})

onKeyStroke('Escape', () => {
  isSwitchPanelOpen.value = false
})

onUnmounted(() => {
  if (copyStatusTimer !== null) window.clearTimeout(copyStatusTimer)
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
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid rgba(226, 52, 86, 0.35);
  border-radius: 5px;
  color: #d4d4d4;
  background: rgba(8, 7, 10, 0.97);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
  transform: translateX(-50%);
}

.switch-friend-panel__code-row {
  display: flex;
  align-items: center;
  gap: 8px;

  code {
    flex: 1;
    font-family: 'anton', monospace;
    font-size: 14px;
    letter-spacing: 1px;
    line-height: 32px;
    text-align: left;
    white-space: nowrap;
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
  background: transparent;
  cursor: pointer;
  transition: color 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover,
  &:focus-visible,
  &.is-copied {
    color: #e23456;
  }

  &:focus-visible {
    outline: 1px solid #e23456;
    outline-offset: 2px;
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

.switch-panel-enter-active,
.switch-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.switch-panel-enter-from,
.switch-panel-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
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

  :deep(.footer-social-links__switch) {
    position: static;
  }

  .switch-friend-panel.no-rem {
    right: auto;
    left: 50%;
    width: min(300px, calc(100vw - 24px));
    padding: 16px;
    transform: translateX(-50%);
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
      font-size: 28px;
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

  .switch-panel-enter-from,
  .switch-panel-leave-to {
    transform: translate(-50%, 8px);
  }

  .footer-weibo-modal-content {
    width: 100%;
    height: 100%;
    min-height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .switch-panel-enter-active,
  .switch-panel-leave-active,
  .switch-friend-panel__copy,
  .switch-friend-panel__open {
    transition: none;
  }
}
</style>
