<template>
  <Teleport to="body">
    <Transition name="back-to-top">
      <button
        v-if="isVisible && !suppressed"
        ref="buttonElement"
        class="back-to-top-button no-rem"
        type="button"
        aria-label="回到页面顶部"
        title="BACK TO TOP"
        @click="scrollToTop"
      >
        <span class="button-progress" aria-hidden="true" />
        <span class="button-arrow no-rem" aria-hidden="true" />
        <span class="button-label no-rem">TOP</span>
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'

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

const scrollToTop = () => {
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
  right: 1.35rem;
  bottom: 42px;
  z-index: 140;
  width: 52px;
  height: 52px;
  padding: 0;
  overflow: hidden;
  border: 0;
  color: rgba(255, 255, 255, 0.76);
  border-top: 1px solid var(--page-theme-color, #e23456);
  border-left: 1px solid var(--page-theme-color, #e23456);
  border-right: 1px solid var(--page-theme-color, #e23456);
  background-color: rgba(0, 0, 0, 0.32);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
  cursor: pointer;
  transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease,
    box-shadow 0.25s ease, transform 0.25s ease, right 0.35s ease,
    bottom 0.25s ease;

  &:focus-visible {
    color: #fff;
    box-shadow: 0 0 18px
      color-mix(in srgb, var(--page-theme-color, #e23456) 46%, transparent);
    transform: translateY(-2px);

    .button-arrow.no-rem {
      transform: translate(-50%, -2px) rotate(45deg);
    }
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: #fff;
      box-shadow: 0 0 18px
        color-mix(in srgb, var(--page-theme-color, #e23456) 46%, transparent);
      transform: translateY(-2px);

      .button-arrow.no-rem {
        transform: translate(-50%, -2px) rotate(45deg);
      }
    }
  }

  &:active {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 1px solid #fff;
    outline-offset: 3px;
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

.button-arrow.no-rem {
  position: absolute;
  top: 10px;
  left: 50%;
  width: 8px;
  height: 8px;
  color: var(--page-theme-color, #e23456);
  border-top: 2px solid var(--page-theme-color, #e23456);
  border-left: 2px solid var(--page-theme-color, #e23456);
  transform: translateX(-50%) rotate(45deg);
  transition: border-color 0.25s ease, transform 0.25s ease;
}

.button-label.no-rem {
  position: absolute;
  right: 0;
  bottom: 10px;
  left: 0;
  font-family: 'Anton', 'alibaba-puhuiti';
  font-size: 16px;
  letter-spacing: 0.08em;
  line-height: 1;
  text-align: center;
}

.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: opacity 0.24s ease, transform 0.32s ease;
}

.back-to-top-enter-from {
  opacity: 0;
  transform: translateY(18px);
}

.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(18px);
}

@media screen and (max-aspect-ratio: 1),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .back-to-top-button.no-rem {
    right: 17px;
    bottom: 28px;
    width: 2rem;
    height: 2rem;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.32);
  }

  .button-arrow.no-rem {
    top: 4px;
    width: 7px;
    height: 7px;
    border-top-width: 1.5px;
    border-left-width: 1.5px;
  }

  .button-label.no-rem {
    bottom: 4px;
    font-size: 11px;
    letter-spacing: 0.06em;
  }
}
</style>
