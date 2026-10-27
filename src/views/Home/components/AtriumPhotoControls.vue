<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (event: 'exit'): void
  (event: 'capture'): void
  (event: 'pose', pose: 'standing'): void
}>()
const hidden = ref(false)
</script>

<template>
  <div class="atrium-photo-controls no-rem" :class="{ 'is-hidden': hidden }">
    <aside
      class="photo-poses"
      role="listbox"
      aria-label="姿势列表"
      :inert="hidden || undefined"
    >
      <span class="photo-poses__label">POSES</span>
      <span
        class="photo-poses__item"
        role="option"
        aria-selected="true"
        tabindex="0"
        @click="emit('pose', 'standing')"
        @keydown.enter.prevent="emit('pose', 'standing')"
        @keydown.space.prevent="emit('pose', 'standing')"
      >
        STANDING
      </span>
    </aside>
    <p class="photo-hint">DRAG TO ROTATE · SCROLL TO ZOOM</p>
    <div class="photo-actions">
      <button
        class="photo-toggle"
        type="button"
        :aria-label="hidden ? '显示拍照工具' : '隐藏拍照工具'"
        :aria-pressed="hidden"
        @click="hidden = !hidden"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          <path v-if="hidden" d="m3 3 18 18" />
        </svg>
      </button>
      <button type="button" aria-label="截图并保存" @click="emit('capture')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5 9.5 3h5L16 5h5v14H3V5Z" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      </button>
      <button type="button" aria-label="退出拍照模式" @click="emit('exit')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 5 14 14M19 5 5 19" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.atrium-photo-controls.no-rem {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  color: var(--text-color, #fff);
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
    left: 24px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    text-align: left;
    font: 400 clamp(36px, 5vw, 64px) / 1 'Anton', sans-serif;
    transition: opacity 0.25s ease;
    &__label {
      font-size: 14px;
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
    bottom: 24px;
    left: 24px;
    margin: 0;
    font-size: 12px;
    opacity: 0.55;
    transition: opacity 0.25s ease;
  }
  .photo-actions {
    position: absolute;
    right: 24px;
    bottom: 24px;
    display: flex;
    gap: 8px;
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
