<template>
  <div
    class="modal-background-title"
    :class="{
      'modal-background-title--embedded': embedded,
      'modal-background-title--entered': entered,
      'modal-background-title--scrolling': scrolling,
      'modal-background-title--visible': entered && active,
    }"
    :style="{
      '--modal-background-title-color':
        color || 'var(--page-theme-color, #e23456)',
    }"
    aria-hidden="true"
  >
    <div class="modal-background-title__track">
      <div
        v-for="groupIndex in 2"
        :key="groupIndex"
        class="modal-background-title__group"
      >
        <span v-for="copyIndex in 4" :key="copyIndex">{{ title }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    active?: boolean
    color?: string
    embedded?: boolean
  }>(),
  { active: true, color: undefined, embedded: false }
)
const entered = ref(false)
const scrolling = ref(false)
let entranceTimer: ReturnType<typeof setTimeout> | undefined
let scrollTimer: ReturnType<typeof setTimeout> | undefined
const clearTimers = () => {
  clearTimeout(entranceTimer)
  clearTimeout(scrollTimer)
}
watch(
  () => props.active,
  (active) => {
    clearTimers()
    scrolling.value = false
    if (!active) return
    entered.value = false
    entranceTimer = setTimeout(() => {
      entered.value = true
      scrollTimer = setTimeout(() => {
        scrolling.value = true
      }, 2480)
    }, 500)
  },
  { immediate: true }
)
onBeforeUnmount(clearTimers)
</script>

<style lang="less" scoped>
.modal-background-title {
  position: fixed;
  top: 50%;
  left: 0;
  z-index: 0;
  width: 100vw;
  overflow: hidden;
  color: var(--modal-background-title-color);
  font-family: 'UnboundedSans', sans-serif;
  font-size: clamp(5rem, 12vw, 12rem);
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 0.9;
  white-space: nowrap;
  opacity: 0;
  transform: translate(100%, -50%);
  pointer-events: none;
  transition: opacity 0.2s ease;

  &--entered {
    transform: translate(0, -50%);
    transition: transform 2.48s cubic-bezier(0.18, 0.88, 0.78, 0.985),
      opacity 0.2s ease;
  }

  &--visible {
    opacity: 0.2;
  }

  &--scrolling {
    .modal-background-title__track {
      animation-play-state: running;
    }
  }
}

.modal-background-title__track {
  display: flex;
  width: max-content;
  animation: modalBackgroundTitleMarquee 72s linear infinite;
  animation-play-state: paused;
  will-change: transform;
}

.modal-background-title__group {
  display: flex;
  flex: none;
  gap: 0.32em;
  padding-right: 0.32em;

  span {
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke-color: var(--modal-background-title-color);
    -webkit-text-stroke-width: clamp(2px, 0.24vw, 4px);
  }
}

@keyframes modalBackgroundTitleMarquee {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-50%);
  }
}

@media (max-width: 768px) {
  .modal-background-title {
    top: 0;
    transform: translateX(100%);

    &--entered {
      transform: translateX(0);
    }
  }
}
// 页面内预览以图片舞台为定位范围，手机端也保持标题垂直居中。
.modal-background-title--embedded {
  position: absolute;
  top: 50%;
  width: 100%;
  transform: translate(100%, -50%);

  &.modal-background-title--entered {
    transform: translate(0, -50%);
  }
}
</style>
