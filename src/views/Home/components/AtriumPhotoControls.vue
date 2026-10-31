<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import DiamondCloseBtn from '@/components/DiamondCloseBtn/index.vue'

import AtriumPhotoToolbar from './AtriumPhotoToolbar.vue'

defineProps<{
  focalLength: number
  mobile: boolean
  ready: boolean
  capturing: boolean
}>()
const emit = defineEmits<{
  (event: 'exit'): void
  (event: 'capture'): void
  (event: 'pose', pose: 'standing'): void
  (event: 'focal-length', value: number): void
}>()
const hidden = ref(false)
const { t, locale } = useI18n()
</script>

<template>
  <div
    class="atrium-photo-controls no-rem"
    :class="{ 'is-hidden': hidden, 'is-mobile': mobile }"
  >
    <div class="photo-safe-area">
      <aside
        class="photo-poses"
        :class="{ 'is-chinese': locale === 'zhCn' }"
        role="listbox"
        :aria-label="t('island.photoMode.poseList')"
        :inert="hidden || undefined"
      >
        <span class="photo-poses__label">{{
          t('island.photoMode.poses')
        }}</span>
        <span
          class="photo-poses__item is-clickable"
          role="option"
          aria-selected="true"
          tabindex="0"
          @click="emit('pose', 'standing')"
          @keydown.enter.prevent="emit('pose', 'standing')"
          @keydown.space.prevent="emit('pose', 'standing')"
        >
          {{ t('island.photoMode.standing') }}
        </span>
      </aside>
      <AtriumPhotoToolbar
        :focal-length="focalLength"
        :hidden="hidden"
        :mobile="mobile"
        :disabled="!ready"
        @focal-length="emit('focal-length', $event)"
      />
      <p class="photo-hint">
        {{
          t(mobile ? 'island.photoMode.mobileHint' : 'island.photoMode.hint')
        }}
      </p>
      <div class="photo-actions">
        <button
          class="photo-toggle"
          type="button"
          :aria-label="
            t(
              hidden
                ? 'island.photoMode.showTools'
                : 'island.photoMode.hideTools'
            )
          "
          :aria-pressed="hidden"
          @click="hidden = !hidden"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            <path v-if="hidden" d="m3 3 18 18" />
          </svg>
        </button>
        <button
          class="photo-shutter"
          type="button"
          :aria-label="t('island.photoMode.capture')"
          :disabled="!ready || capturing"
          :aria-busy="capturing"
          @click="emit('capture')"
        >
          <span class="photo-shutter__disk" aria-hidden="true" />
        </button>
        <DiamondCloseBtn
          class="photo-close"
          type="button"
          :title="t('island.photoMode.exit')"
          :aria-label="t('island.photoMode.exit')"
          style="--diamond-close-accent: #fff"
          @click="emit('exit')"
        />
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '../styles/photoToolDesign.less';
.atrium-photo-controls.no-rem {
  .photo-tool-safe-insets();
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  color: var(--text-color, #fff);
  .photo-safe-area {
    position: absolute;
    top: var(--photo-safe-top);
    right: var(--photo-safe-right);
    bottom: var(--photo-safe-bottom);
    left: var(--photo-safe-left);
  }
  button {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    padding: 10px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    pointer-events: auto;
    transition: opacity 0.25s ease, color 0.25s ease;
    &:hover,
    &:focus-visible {
      color: #18c6a6;
    }
    svg {
      width: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
    }
  }
  .photo-poses {
    position: absolute;
    top: 30%;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    text-align: left;
    font: 400 clamp(36px, 5vw, 64px) / 1 'Anton', sans-serif;
    transition: opacity 0.25s ease;
    &.is-chinese {
      font-family: 'alibaba-puhuiti', sans-serif;
      font-weight: 900;
      letter-spacing: -0.05em;
      .photo-poses__label,
      .photo-poses__item {
        transform: scaleX(0.9);
        transform-origin: left center;
      }
    }
    &__label {
      font-size: 20px;
      opacity: 0.45;
    }
    &__item {
      cursor: pointer;
      pointer-events: auto;
      transition: color 0.25s ease;
      &:hover,
      &:focus-visible {
        color: #18c6a6;
      }
    }
  }
  .photo-hint {
    position: absolute;
    bottom: 0;
    left: 50%;
    width: max-content;
    max-width: calc(100% - 200px);
    margin: 0;
    font: 900 20px / 1.4 'alibaba-puhuiti', sans-serif;
    letter-spacing: -0.05em;
    text-align: center;
    transform: translateX(-50%) scaleX(0.9);
    opacity: 0.55;
    transition: opacity 0.25s ease;
  }
  .photo-actions {
    position: absolute;
    inset: 0;
    pointer-events: none;
    button {
      position: absolute;
      right: 0;
      box-sizing: border-box;
      width: 88px;
      height: 88px;
      svg {
        width: 48px;
        height: 48px;
      }
    }
    .photo-close {
      top: 0;
    }
    .photo-toggle {
      bottom: 0;
    }
    .photo-shutter {
      top: 50%;
      transform: translateY(-50%);
      padding: 6px;
      border: 2px solid #fff;
      border-radius: 50%;
      color: #fff;
      &:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 5px;
      }
      &:disabled {
        opacity: 0.35;
        cursor: default;
      }
      &__disk {
        display: block;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: #fff;
        transition: transform 0.12s ease, background-color 0.2s ease;
      }
      @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) .photo-shutter__disk {
          background: #d4d4d4;
        }
      }
      &:active:not(:disabled) .photo-shutter__disk {
        transform: scale(0.9);
      }
    }
  }
  &.is-mobile {
    .photo-poses {
      top: calc(var(--photo-toolbar-height) + var(--photo-control-gap));
    }
    .photo-hint {
      bottom: calc(var(--photo-mobile-action-size) + var(--photo-control-gap));
      max-width: 100%;
      font-size: 16px;
    }
    .photo-actions {
      inset: auto 0 0;
      height: var(--photo-mobile-action-size);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      button {
        position: relative;
        inset: auto;
        flex: none;
        width: var(--photo-mobile-action-size);
        height: var(--photo-mobile-action-size);
        transform: none;
      }
      .photo-shutter__disk {
        width: 100%;
        height: 100%;
      }
    }
  }
  &.is-hidden {
    .photo-poses,
    .photo-hint,
    .photo-actions button {
      opacity: 0;
    }
    .photo-poses__item,
    .photo-actions button:not(.photo-toggle) {
      pointer-events: none;
    }
    .photo-toggle:hover,
    .photo-toggle:focus-visible {
      opacity: 1;
    }
  }
}
</style>
