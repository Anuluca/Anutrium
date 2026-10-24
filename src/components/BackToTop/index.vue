<template>
  <Teleport to="body">
    <Transition name="back-to-top">
      <button
        v-if="(isVisible || backToTopDock) && !suppressed"
        ref="buttonElement"
        class="back-to-top-button no-rem"
        :class="{ 'is-header-docked': !!backToTopDock }"
        :style="dockStyle"
        type="button"
        aria-label="回到页面顶部"
        title="BACK TO TOP"
        @click="scrollToTop"
      >
        <span class="button-progress" aria-hidden="true" />
        <svg
          class="button-triangle no-rem"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 5 21 20H3Z" />
        </svg>
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

import { backToTopDock } from '@/composables/useBackToTopDock'
import { flashActionButton } from '@/utils/flashActionButton'
import { scrollPageTo } from '@/utils/pageScroll'

withDefaults(
  defineProps<{
    suppressed?: boolean
  }>(),
  {
    suppressed: false,
  }
)

const SHOW_THRESHOLD = 240
const buttonElement = ref<HTMLElement | null>(null)
const isVisible = ref(false)
let latestProgress = 0
const dockStyle = computed(() => {
  const dock = backToTopDock.value
  return dock
    ? {
        top: `${dock.top}px`,
        left: `${dock.left}px`,
        width: `${dock.height}px`,
        height: `${dock.height}px`,
      }
    : undefined
})

const setScrollState = (scrollTop: number, progress: number) => {
  latestProgress = progress
  const nextVisible = scrollTop > SHOW_THRESHOLD
  if (isVisible.value !== nextVisible) {
    isVisible.value = nextVisible
    if (nextVisible) {
      void nextTick(() => {
        buttonElement.value?.style.setProperty(
          '--scroll-progress',
          `${latestProgress}%`
        )
      })
    }
  } else {
    buttonElement.value?.style.setProperty(
      '--scroll-progress',
      `${latestProgress}%`
    )
  }
}

defineExpose({ setScrollState })

let clickFlash: Animation | undefined
let returning = false
onBeforeUnmount(() => clickFlash?.cancel())

const scrollToTop = async () => {
  if (returning || !buttonElement.value) return
  const button = buttonElement.value
  const themeColor =
    getComputedStyle(button).getPropertyValue('--page-theme-color').trim() ||
    '#e23456'
  returning = true
  clickFlash = flashActionButton(button, 180, {
    accentColor: themeColor,
    restColor: themeColor,
  })
  try {
    // 闪烁完成后再滚动，避免固定页头先收起而截断两次反馈。
    await clickFlash?.finished
  } catch {
    return
  } finally {
    returning = false
    clickFlash = undefined
  }
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  scrollPageTo({
    top: 0,
    left: 0,
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
}
</script>

<style lang="less" scoped>
.back-to-top-button.no-rem {
  position: fixed;
  right: calc(1.35rem + 24px);
  bottom: 48px;
  z-index: 140;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  overflow: hidden;
  border: 0;
  color: var(--page-theme-color, #e23456);
  background: color-mix(in srgb, var(--bg-color, #000) 90%, transparent);
  box-shadow: 0 3px 14px 1px rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;

  &.is-header-docked {
    right: auto;
    bottom: auto;
  }

  &:focus-visible {
    outline: none;
    color: #000;
    background: var(--page-theme-color, #e23456);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: #000;
      background: var(--page-theme-color, #e23456);
    }
  }
}

.button-progress,
.button-progress::after {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
}

.button-progress {
  right: 0;
  background: rgba(255, 255, 255, 0.08);

  &::after {
    content: '';
    width: var(--scroll-progress, 0%);
    background: var(--page-theme-color, #e23456);
  }
}

.button-triangle.no-rem {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: opacity 0.24s ease;
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
}

@media screen and (max-aspect-ratio: 1),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .back-to-top-button.no-rem {
    right: 41px;
    bottom: 34px;
    width: 36px;
    height: 36px;

    &.is-header-docked {
      right: auto;
      bottom: auto;
    }
  }

  .button-triangle.no-rem {
    width: 16px;
    height: 16px;
  }
}
</style>
