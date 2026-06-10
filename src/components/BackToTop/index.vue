<template>
  <Transition name="back-to-top">
    <button
      v-if="isVisible"
      class="back-to-top-button"
      type="button"
      aria-label="回到页面顶部"
      title="BACK TO TOP"
      @click="scrollToTop"
    >
      <span class="button-corners" aria-hidden="true" />
      <span class="button-arrow" aria-hidden="true" />
      <span class="button-label">TOP</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const SHOW_THRESHOLD = 240
const isVisible = ref(false)
let scrollRafId: number | null = null

const updateVisibility = () => {
  if (scrollRafId !== null) return

  scrollRafId = window.requestAnimationFrame(() => {
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

.back-to-top-button {
  position: fixed;
  right: 48px;
  bottom: 54px;
  z-index: 140;
  width: 52px;
  height: 52px;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(226, 52, 86, 0.48);
  color: rgba(255, 255, 255, 0.72);
  background: rgba(8, 5, 9, 0.82);
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.32), 0 0 18px rgba(226, 52, 86, 0.12);
  backdrop-filter: blur(5px);
  cursor: pointer;
  transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease,
    box-shadow 0.25s ease, transform 0.25s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0 3px,
      rgba(255, 255, 255, 0.035) 3px 4px
    );
    pointer-events: none;
  }

  &:hover,
  &:focus-visible {
    color: #080508;
    border-color: @red;
    background: @red;
    box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.42), 0 0 22px rgba(226, 52, 86, 0.52);
    transform: translateY(-4px);

    .button-arrow {
      color: #080508;
      border-color: #080508;
    }

    .button-corners {
      border-color: rgba(8, 5, 8, 0.7);
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

.button-corners {
  position: absolute;
  inset: 5px;
  border-top: 1px solid rgba(226, 52, 86, 0.3);
  border-right: 1px solid transparent;
  border-bottom: 1px solid transparent;
  border-left: 1px solid rgba(226, 52, 86, 0.3);
  pointer-events: none;
  transition: border-color 0.25s ease;

  &::after {
    content: '';
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 8px;
    height: 8px;
    border-right: 1px solid currentColor;
    border-bottom: 1px solid currentColor;
  }
}

.button-arrow {
  position: absolute;
  top: 13px;
  left: 50%;
  width: 9px;
  height: 9px;
  color: @red;
  border-top: 2px solid @red;
  border-left: 2px solid @red;
  transform: translateX(-50%) rotate(45deg);
  transition: border-color 0.25s ease, top 0.25s ease;

  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    width: 2px;
    height: 18px;
    background: currentColor;
    transform: rotate(-45deg) translate(5px, 4px);
    transform-origin: top;
  }
}

.button-label {
  position: absolute;
  right: 0;
  bottom: 8px;
  left: 0;
  font-family: 'Unbounded Sans', monospace;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.15em;
  line-height: 1;
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
  .back-to-top-button {
    right: 20px;
    bottom: 24px;
    width: 46px;
    height: 46px;
    box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.32), 0 0 14px rgba(226, 52, 86, 0.14);
  }

  .button-arrow {
    top: 11px;
  }

  .button-label {
    bottom: 7px;
    font-size: 7px;
  }
}
</style>
