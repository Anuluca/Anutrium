<template>
  <Transition name="back-to-top">
    <button
      v-if="isVisible"
      class="back-to-top-button no-rem"
      type="button"
      aria-label="回到页面顶部"
      title="BACK TO TOP"
      :style="{ '--scroll-progress': `${scrollProgress}%` }"
      @click="scrollToTop"
    >
      <span class="button-progress" aria-hidden="true" />
      <span class="button-arrow no-rem" aria-hidden="true" />
      <span class="button-label no-rem">TOP</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const SHOW_THRESHOLD = 240
const isVisible = ref(false)
const scrollProgress = ref(0)
let scrollRafId: number | null = null

const updateVisibility = () => {
  if (scrollRafId !== null) return

  scrollRafId = window.requestAnimationFrame(() => {
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    )
    scrollProgress.value = Math.min(100, (window.scrollY / maxScroll) * 100)

    const nextValue =
      window.scrollY > SHOW_THRESHOLD ||
      document.documentElement.scrollTop > SHOW_THRESHOLD
    if (isVisible.value !== nextValue) {
      isVisible.value = nextValue
    }
    scrollRafId = null
  })
}

const scrollToTop = () => {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
}

onMounted(() => {
  updateVisibility()
  document.addEventListener('scroll', updateVisibility, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('scroll', updateVisibility)
  if (scrollRafId !== null) window.cancelAnimationFrame(scrollRafId)
})
</script>

<style lang="less" scoped>
@red: #e23456;
@green: #5ad480;

.back-to-top-button.no-rem {
  position: fixed;
  right: 38px;
  bottom: 42px;
  z-index: 140;
  width: 52px;
  height: 52px;
  padding: 0;
  overflow: hidden;
  border: 0;
  color: rgba(255, 255, 255, 0.76);
  background: #000;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(7px);
  cursor: pointer;
  transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease,
    box-shadow 0.25s ease, transform 0.25s ease;

  &:hover,
  &:focus-visible {
    color: #fff;
    background: rgba(7, 8, 10, 0.9);
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.34),
      0 0 18px rgba(226, 52, 86, 0.24);
    transform: translateY(-2px);

    .button-arrow.no-rem {
      border-color: #e23456;
      transform: translate(-50%, -2px) rotate(45deg);
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
    background: #e23456;
  }
}

.button-arrow.no-rem {
  position: absolute;
  top: 14px;
  left: 50%;
  width: 8px;
  height: 8px;
  color: #e23456;
  border-top: 2px solid #e23456;
  border-left: 2px solid #e23456;
  transform: translateX(-50%) rotate(45deg);
  transition: border-color 0.25s ease, transform 0.25s ease;
}

.button-label.no-rem {
  position: absolute;
  right: 0;
  bottom: 10px;
  left: 0;
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 10px;
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

@media screen and (max-aspect-ratio: 1) {
  .back-to-top-button.no-rem {
    right: 16px;
    bottom: 20px;
    width: 54px;
    height: 54px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.32);
  }

  .button-arrow.no-rem {
    top: 12px;
    width: 9px;
    height: 9px;
    border-top-width: 2.5px;
    border-left-width: 2.5px;
  }

  .button-label.no-rem {
    bottom: 10px;
    font-size: 12px;
    letter-spacing: 0.06em;
  }
}
</style>
