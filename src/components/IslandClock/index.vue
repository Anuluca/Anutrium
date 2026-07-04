<template>
  <button
    class="island-clock-trigger"
    :class="`island-clock-trigger--${variant}`"
    type="button"
    aria-label="打开沉浸时间视图"
    @click="openFocusMode"
  >
    <span class="island-clock-date" :aria-label="currentDate">
      <template v-for="(part, index) in dateParts" :key="`${part}-${index}`">
        <span aria-hidden="true">{{ part }}</span>
        <i v-if="index < dateParts.length - 1" aria-hidden="true">/</i>
      </template>
    </span>
    <time :aria-label="currentTime">
      <span
        v-for="(character, index) in currentTime"
        :key="`${character}-${index}`"
        :class="{ 'island-clock-colon': character === ':' }"
        aria-hidden="true"
      >
        {{ character }}
      </span>
    </time>
  </button>

  <Teleport to="body">
    <Transition name="island-clock-focus">
      <button
        v-if="isFocusMode"
        class="island-clock-overlay"
        type="button"
        aria-label="关闭沉浸时间视图"
        @click="closeFocusMode"
      >
        <span class="island-clock-overlay__content">
          <span class="island-clock-date" :aria-label="currentDate">
            <template
              v-for="(part, index) in dateParts"
              :key="`${part}-${index}`"
            >
              <span aria-hidden="true">{{ part }}</span>
              <i v-if="index < dateParts.length - 1" aria-hidden="true">/</i>
            </template>
          </span>
          <time :aria-label="currentTime">
            <span
              v-for="(character, index) in currentTime"
              :key="`${character}-${index}`"
              :class="{ 'island-clock-colon': character === ':' }"
              aria-hidden="true"
            >
              {{ character }}
            </span>
          </time>
        </span>
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

withDefaults(
  defineProps<{
    variant?: 'desktop' | 'mobile'
  }>(),
  {
    variant: 'desktop',
  }
)

const currentDate = ref('')
const currentTime = ref('')
const dateParts = computed(() => currentDate.value.split('/'))
const isFocusMode = ref(false)
let clockTimer: number | undefined

const updateCurrentTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')

  currentDate.value = `${year}/${month}/${date}`
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const scheduleClockUpdate = () => {
  updateCurrentTime()
  const nextMinuteDelay = 60_000 - (Date.now() % 60_000)
  clockTimer = window.setTimeout(scheduleClockUpdate, nextMinuteDelay)
}

const openFocusMode = () => {
  isFocusMode.value = true
  document.body.classList.add('island-clock-focus-mode')
}

const closeFocusMode = () => {
  isFocusMode.value = false
  document.body.classList.remove('island-clock-focus-mode')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isFocusMode.value) closeFocusMode()
}

onMounted(() => {
  scheduleClockUpdate()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (clockTimer) window.clearTimeout(clockTimer)
  window.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('island-clock-focus-mode')
})
</script>

<style lang="less" scoped>
@red: #e23456;

.island-clock-trigger {
  display: grid;
  justify-items: end;
  min-width: 104px;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  text-align: right;

  .island-clock-date {
    display: flex;
    justify-content: space-between;
    width: 100%;
    color: rgba(255, 255, 255, 0.3);
    font-family: 'cn-custom', monospace;
    font-size: 0.46rem;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
    transition: color 0.24s ease, text-shadow 0.24s ease;

    i {
      font-style: normal;
    }
  }

  time {
    display: flex;
    justify-content: flex-end;
    width: 100%;
    margin-top: 5px;
    color: rgba(255, 255, 255, 0.84);
    font-family: 'cn-custom', monospace;
    font-size: clamp(1.1rem, 1.2vw, 1.5rem);
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    transition: color 0.24s ease, text-shadow 0.24s ease;
  }

  &:hover,
  &:focus-visible {
    .island-clock-date {
      color: rgba(226, 52, 86, 0.72);
      text-shadow: 0 0 10px rgba(226, 52, 86, 0.32);
    }

    time {
      color: @red;
      text-shadow: 0 0 12px rgba(226, 52, 86, 0.58);
    }
  }

  &--mobile {
    display: none;
  }
}

.island-clock-overlay {
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  padding: 0 clamp(28px, 5vw, 88px) clamp(28px, 6vh, 72px);
  border: 0;
  color: #fff;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.island-clock-overlay__content {
  display: grid;
  font-variant-numeric: tabular-nums;
  transform-origin: left bottom;

  > .island-clock-date {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: clamp(8px, 1.2vh, 16px);
    color: rgba(226, 52, 86, 0.72);
    font-family: 'cn-custom', monospace;
    font-size: clamp(0.9rem, 1.6vw, 1.8rem);
    font-weight: 700;

    i {
      font-style: normal;
    }
  }

  time {
    display: flex;
    justify-content: flex-start;
    color: rgba(255, 255, 255, 0.94);
    font-family: 'cn-custom', monospace;
    font-size: clamp(4rem, 10vw, 12rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 0.82;
    text-shadow: 0 16px 50px rgba(0, 0, 0, 0.58);
    white-space: nowrap;
  }
}

.island-clock-colon {
  animation: island-clock-colon-blink 1s steps(1, end) infinite;
}

@keyframes island-clock-colon-blink {
  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0.18;
  }
}

.island-clock-focus-enter-active,
.island-clock-focus-leave-active {
  transition: opacity 0.45s ease;

  .island-clock-overlay__content {
    transition: opacity 0.4s ease,
      transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

.island-clock-focus-enter-from,
.island-clock-focus-leave-to {
  opacity: 0;

  .island-clock-overlay__content {
    opacity: 0;
    transform: translateY(28px) scale(0.92);
  }
}

:global(body.island-pc-shell .layout-page > .el-menu-layout-all),
:global(body.island-mobile-shell .layout-page > .el-menu-layout-all),
:global(body.island-pc-shell .layout-page > .mobile-menu-icon),
:global(body.island-mobile-shell .layout-page > .mobile-menu-icon),
:global(body.island-pc-shell .footer-com),
:global(body.island-mobile-shell .footer-com),
:global(body.island-pc-shell .cursor-position),
:global(body.island-mobile-shell .cursor-position),
:global(body.island-pc-shell .harbor-side),
:global(body.island-pc-shell .harbor-board),
:global(body.island-pc-shell .harbor-player),
:global(body.island-mobile-shell .mobile-hero),
:global(body.island-mobile-shell .mobile-latest),
:global(body.island-mobile-shell .mobile-ports),
:global(body.island-mobile-shell .mobile-player) {
  transition: opacity 0.38s ease !important;
}

:global(body.island-clock-focus-mode .layout-page > .el-menu-layout-all),
:global(body.island-clock-focus-mode .layout-page > .mobile-menu-icon),
:global(body.island-clock-focus-mode .footer-com),
:global(body.island-clock-focus-mode .cursor-position),
:global(body.island-clock-focus-mode .harbor-side),
:global(body.island-clock-focus-mode .harbor-board),
:global(body.island-clock-focus-mode .harbor-player),
:global(body.island-clock-focus-mode .mobile-hero),
:global(body.island-clock-focus-mode .mobile-latest),
:global(body.island-clock-focus-mode .mobile-ports),
:global(body.island-clock-focus-mode .mobile-player) {
  opacity: 0 !important;
  pointer-events: none !important;
}

@media (min-width: 700px) {
  .island-clock-trigger--mobile {
    display: grid;

    span {
      font-size: 11px;
    }

    time {
      margin-top: 4px;
      font-size: 28px;
    }
  }
}

@media (max-width: 699px) {
  .island-clock-overlay {
    padding-right: 20px;
    padding-bottom: max(24px, env(safe-area-inset-bottom));
    padding-left: 20px;
  }

  .island-clock-overlay__content time {
    font-size: clamp(3rem, 17vw, 6rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-clock-focus-enter-active,
  .island-clock-focus-leave-active,
  .island-clock-overlay__content {
    transition-duration: 0.01ms !important;
  }

  .island-clock-colon {
    animation: none;
  }
}
</style>
