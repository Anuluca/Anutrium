<template>
  <header
    ref="headerRef"
    class="detail-page-header"
    :class="{ 'has-divider': divider }"
  >
    <button class="detail-page-header__back" type="button" @click="goBack">
      <span>{{ backLabel }}</span>
    </button>

    <div class="detail-page-header__title-block">
      <div class="detail-page-header__title-row">
        <h1>{{ title }}</h1>
        <slot name="title-extra" />
        <div
          v-if="counter || $slots.actions"
          class="detail-page-header__actions"
        >
          <span v-if="counter" class="detail-page-header__counter">
            <strong>{{ counter.value }}</strong>
            <span>{{ counter.label }}</span>
          </span>
          <slot name="actions" />
        </div>
      </div>

      <div
        v-if="subtitle || $slots['subtitle-extra']"
        class="detail-page-header__subtitle-row"
      >
        <p v-if="subtitle">{{ subtitle }}</p>
        <slot name="subtitle-extra" />
      </div>

      <slot />
    </div>
  </header>

  <Teleport v-if="isClient" to="body">
    <Transition name="detail-fixed-nav">
      <nav
        v-if="isFixedNavigationVisible"
        class="detail-fixed-navigation"
        :style="{ top: `${menuBottom}px` }"
        :aria-label="`${backLabel} / ${title}`"
      >
        <button
          class="detail-fixed-navigation__back"
          type="button"
          @click="goBack"
        >
          <span>{{ backLabel }}</span>
        </button>
        <strong class="detail-fixed-navigation__title">{{ title }}</strong>
      </nav>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { addPageScrollListener } from '@/utils/pageScroll'

export interface DetailPageHeaderCounter {
  value: number | string
  label: string
}

const props = withDefaults(
  defineProps<{
    backLabel: string
    backPath: string
    counter?: DetailPageHeaderCounter
    divider?: boolean
    subtitle?: string
    title: string
  }>(),
  {
    counter: undefined,
    divider: false,
    subtitle: '',
  }
)

const router = useRouter()
const headerRef = ref<HTMLElement | null>(null)
const isClient = ref(false)
const isFixedNavigationVisible = ref(false)
const menuBottom = ref(0)
let removeScrollListener: (() => void) | null = null
let navigationFrame = 0
let navigationResizeObserver: ResizeObserver | null = null

const updateFixedNavigation = () => {
  navigationFrame = 0

  const menu = document.querySelector<HTMLElement>('.el-menu-layout-all')
  const currentMenuBottom =
    menu && getComputedStyle(menu).display !== 'none'
      ? Math.max(0, menu.getBoundingClientRect().bottom)
      : 0

  menuBottom.value = currentMenuBottom
  isFixedNavigationVisible.value =
    Boolean(headerRef.value) &&
    headerRef.value!.getBoundingClientRect().bottom <= currentMenuBottom + 12
}

const scheduleFixedNavigationUpdate = () => {
  if (navigationFrame) return
  navigationFrame = window.requestAnimationFrame(updateFixedNavigation)
}

const goBack = () => {
  const previousPath = window.history.state?.back
  const expectedPath = router.resolve(props.backPath).fullPath

  if (
    typeof previousPath === 'string' &&
    router.resolve(previousPath).fullPath === expectedPath
  ) {
    router.back()
    return
  }

  router.push(props.backPath)
}

onMounted(async () => {
  isClient.value = true
  await nextTick()

  removeScrollListener = addPageScrollListener(scheduleFixedNavigationUpdate)
  window.addEventListener('resize', scheduleFixedNavigationUpdate, {
    passive: true,
  })

  const menu = document.querySelector<HTMLElement>('.el-menu-layout-all')
  if ('ResizeObserver' in window) {
    navigationResizeObserver = new ResizeObserver(scheduleFixedNavigationUpdate)
    if (menu) navigationResizeObserver.observe(menu)
    if (headerRef.value) navigationResizeObserver.observe(headerRef.value)
  }

  scheduleFixedNavigationUpdate()
})

onBeforeUnmount(() => {
  removeScrollListener?.()
  window.removeEventListener('resize', scheduleFixedNavigationUpdate)
  navigationResizeObserver?.disconnect()
  if (navigationFrame) window.cancelAnimationFrame(navigationFrame)
})
</script>

<style lang="less" scoped>
.detail-page-header {
  margin-bottom: 0;
  opacity: 0;
  animation: detailPageHeaderFadeIn 0.42s ease-out 0.08s both;

  &.has-divider {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
  }

  &__back {
    position: relative;
    display: inline-block;
    margin: 0 0 12px;
    padding: 0;
    border: 0;
    color: #3276fe;
    background: transparent;
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 17px;
    letter-spacing: 0.1em;
    transform: scaleX(0.9);
    transform-origin: left;
    cursor: pointer;
    transition: color 0.2s ease, margin 0.2s ease;
    user-select: none;
    animation: detailPageHeaderBackIn 0.34s ease-out 0.14s both;

    &::before {
      content: '// ';
    }

    &:hover {
      margin-left: -4px;
      color: #e8284a;

      &::before {
        color: #e8284a;
        content: '<< ';
      }
    }
  }

  &__title-block {
    padding-left: 18px;
    border-left: 8px solid #e23456;
    animation: detailPageHeaderTitleIn 0.46s cubic-bezier(0.2, 0.8, 0.2, 1)
      0.22s both;
  }

  &__title-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;

    h1 {
      min-width: 0;
      margin: 0 0 6px;
      color: var(--text-color);
      font-family: 'cn-custom', 'Courier New', monospace;
      font-size: clamp(1.35rem, 2.6vw, 2rem);
      font-weight: 900;
      line-height: 1;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }

  &__counter {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    margin-bottom: 6px;
    color: var(--text-faint);
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    white-space: nowrap;

    strong {
      color: #e23456;
      font-family: 'Anton', 'cn-custom', 'Courier New', monospace;
      font-size: 16px;
      line-height: 1;
    }
  }

  &__subtitle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    animation: detailPageHeaderMetaIn 0.34s ease-out 0.44s both;

    p {
      margin: 0;
      color: var(--text-faint);
      font-family: 'alibaba-puhuiti', sans-serif;
      font-size: 13px;
    }
  }

  &__title-block > :not(&__title-row):not(&__subtitle-row) {
    animation: detailPageHeaderMetaIn 0.34s ease-out 0.5s both;
  }
}

.detail-fixed-navigation {
  position: fixed;
  right: 0;
  left: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  backdrop-filter: blur(4px);
  box-shadow: inset 0 -1px 0 rgb(255 255 255 / 8%);
  gap: clamp(14px, 2vw, 28px);
  min-height: 28px;
  padding: 8px 8.5vw;

  &__back {
    flex: 0 0 auto;
    padding: 0;
    border: 0;
    color: #3276fe;
    background: transparent;
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 14px;
    letter-spacing: 0.08em;
    cursor: pointer;
    white-space: nowrap;

    &::before {
      content: '// ';
    }

    &:hover {
      color: #e23456;

      &::before {
        content: '<< ';
      }
    }
  }

  &__title {
    min-width: 0;
    overflow: hidden;
    color: var(--text-color);
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: clamp(15px, 1.35vw, 20px);
    font-weight: 900;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.detail-fixed-nav-enter-active,
.detail-fixed-nav-leave-active {
  transition: opacity 0.2s ease, transform 0.24s ease;
}

.detail-fixed-nav-enter-from,
.detail-fixed-nav-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes detailPageHeaderFadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes detailPageHeaderBackIn {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
  }

  to {
    opacity: 1;
    clip-path: inset(0);
  }
}

@keyframes detailPageHeaderTitleIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes detailPageHeaderMetaIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .detail-page-header__subtitle-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .detail-fixed-navigation {
    min-height: 24px;
    padding: 7px 4vw;

    &__back {
      font-size: 12px;
    }

    &__title {
      font-size: 15px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-page-header,
  .detail-page-header__back,
  .detail-page-header__title-block,
  .detail-page-header__subtitle-row,
  .detail-page-header__title-block
    > :not(.detail-page-header__title-row):not(
      .detail-page-header__subtitle-row
    ) {
    opacity: 1;
    animation: none !important;
    transform: none;
  }

  .detail-fixed-nav-enter-active,
  .detail-fixed-nav-leave-active {
    transition: none;
  }
}
</style>
