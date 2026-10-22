<template>
  <div
    ref="anchorRef"
    class="detail-page-header-slot"
    :style="isCompact ? { height: `${anchorHeight}px` } : undefined"
  >
    <Teleport to="body" :disabled="!isCompact">
      <header
        ref="headerRef"
        class="detail-page-header"
        :class="{ 'detail-page-header--compact': isCompact }"
        :style="isCompact ? compactStyle : undefined"
      >
        <div class="detail-page-header__content">
          <button
            class="detail-page-header__back"
            type="button"
            @click="goBack"
          >
            <DecodeText :text="backLabel" />
          </button>
          <div class="detail-page-header__heading">
            <h1><DecodeText :text="title" /></h1>
            <p v-if="subtitle" class="detail-page-header__subtitle">
              <DecodeText :text="subtitle" />
            </p>
          </div>
        </div>
      </header>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import DecodeText from '@/components/DecodeText/index.vue'
import {
  addPageResizeListener,
  addPageScrollListener,
  getPageScrollTop,
} from '@/utils/pageScroll'

const props = defineProps<{
  backLabel: string
  backPath: string
  subtitle?: string
  title: string
}>()

const router = useRouter()
const anchorRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const isCompact = ref(false)
const anchorHeight = ref(0)
const compactBounds = ref({ top: 0, left: 0, width: 0 })
const compactStyle = computed(() => ({
  top: `${compactBounds.value.top}px`,
  left: `${compactBounds.value.left}px`,
  width: `${compactBounds.value.width}px`,
}))
let removeScrollListener: (() => void) | undefined
let removeResizeListener: (() => void) | undefined
let menuObserver: ResizeObserver | undefined
let leaving = false
let fadeAnimation: Animation | undefined
let transitioning = false
let desiredCompact = false
let menuElement: Element | null = null
let menuFollowFrame = 0
let menuFollowUntil = 0

const updateBounds = () => {
  if (!anchorRef.value) return
  const bounds = anchorRef.value.getBoundingClientRect()
  const next = {
    top: Math.max(0, menuElement?.getBoundingClientRect().bottom || 0),
    left: bounds.left,
    width: bounds.width,
  }
  const current = compactBounds.value
  if (
    next.top !== current.top ||
    next.left !== current.left ||
    next.width !== current.width
  )
    compactBounds.value = next
  return bounds
}

const followMenuTransition = () => {
  menuFollowUntil = performance.now() + 800
  if (menuFollowFrame) return
  const update = () => {
    menuFollowFrame = 0
    if (!isCompact.value || leaving) return
    updateBounds()
    if (performance.now() < menuFollowUntil) {
      menuFollowFrame = requestAnimationFrame(update)
    }
  }
  menuFollowFrame = requestAnimationFrame(update)
}

const fade = async (from: number, to: number, duration: number) => {
  fadeAnimation?.cancel()
  fadeAnimation = headerRef.value?.animate(
    [{ opacity: from }, { opacity: to }],
    { duration, easing: 'ease', fill: 'forwards' }
  )
  await fadeAnimation?.finished
}

const setCompact = async (compact: boolean) => {
  desiredCompact = compact
  if (leaving || transitioning || compact === isCompact.value) return
  transitioning = true
  try {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    // 在透明时切换排版；快速往返滚动始终以最新目标状态为准。
    while (!leaving && desiredCompact !== isCompact.value) {
      if (!reducedMotion) await fade(1, 0, 220)
      if (leaving) return
      if (desiredCompact && !isCompact.value) {
        anchorHeight.value =
          anchorRef.value?.getBoundingClientRect().height || 0
        updateBounds()
      }
      isCompact.value = desiredCompact
      await nextTick()
      if (isCompact.value) followMenuTransition()
      if (!reducedMotion) await fade(0, 1, 430)
      fadeAnimation?.cancel()
      fadeAnimation = undefined
    }
  } catch {
    // 离场或卸载时取消渐变会拒绝 finished Promise。
  } finally {
    transitioning = false
  }
}

const handleScroll = () => {
  const scrollTop = getPageScrollTop()
  if (leaving || !anchorRef.value) return
  const bounds = updateBounds()
  if (
    scrollTop <= 0 ||
    (bounds && bounds.bottom >= compactBounds.value.top - 1)
  ) {
    void setCompact(false)
  } else if (
    scrollTop > 80 &&
    bounds &&
    bounds.bottom < compactBounds.value.top - 24
  ) {
    void setCompact(true)
  }
  if (isCompact.value) void nextTick(followMenuTransition)
}

onMounted(() => {
  removeScrollListener = addPageScrollListener(handleScroll)
  removeResizeListener = addPageResizeListener(updateBounds)
  menuElement = document.querySelector('.el-menu-layout-all')
  if (menuElement) {
    menuObserver = new ResizeObserver(updateBounds)
    menuObserver.observe(menuElement)
  }
})

onBeforeRouteLeave(() => {
  leaving = true
  fadeAnimation?.cancel()
  // 路由离场前将固定层移回占位，避免 Teleport 内容越过路由遮罩残留。
  isCompact.value = false
})

onBeforeUnmount(() => {
  cancelAnimationFrame(menuFollowFrame)
  removeScrollListener?.()
  removeResizeListener?.()
  menuObserver?.disconnect()
  fadeAnimation?.cancel()
})

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
</script>

<style lang="less" scoped>
.detail-page-header-slot {
  display: flow-root;
}

.detail-page-header {
  position: relative;
  width: 100%;
  min-height: clamp(64px, 7vw, 108px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  justify-content: center;
  gap: 0;
  margin: 0 0 12px;
  padding: 0;
  overflow: visible;
  opacity: 1;

  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  &__back {
    position: relative;
    z-index: 6;
    display: inline-block;
    margin: 0;
    padding: 0;
    border: 0;
    color: var(--page-theme-color, #e23456);
    background: transparent;
    font-family: 'UnboundedSans', 'Courier New', monospace;
    font-size: 17px;
    letter-spacing: 0.1em;
    transform: scaleX(0.9);
    transform-origin: center;
    cursor: pointer;
    transition: color 0.2s ease;
    user-select: none;

    &::before {
      content: '// ';
    }

    &:hover {
      color: var(--page-theme-color, #e23456);
      transform: translateX(-4px) scaleX(0.9);

      &::before {
        color: var(--page-theme-color, #e23456);
        content: '<< ';
      }
    }
  }

  &__heading {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: clamp(10px, 1.4vw, 22px);
    min-width: 0;
  }

  h1 {
    margin: 0;
    color: var(--page-theme-color, #e23456);
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: clamp(1.1rem, 2.6vw, 2.3rem);
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1.05;
    overflow-wrap: anywhere;
    text-shadow: 0 0 18px
      color-mix(in srgb, var(--page-theme-color, #e23456) 20%, transparent);
    transition: text-shadow 0.25s ease;
  }

  &__subtitle {
    margin: 0;
    color: color-mix(
      in srgb,
      var(--page-theme-color, #e23456) 58%,
      transparent
    );
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: clamp(0.7rem, 1.15vw, 1rem);
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1.2;
  }

  &:hover h1 {
    text-shadow: 0 0 24px
        color-mix(in srgb, var(--page-theme-color, #e23456) 43%, transparent),
      0 0 60px
        color-mix(in srgb, var(--page-theme-color, #e23456) 36%, transparent);
  }
}

.detail-page-header--compact {
  position: fixed;
  z-index: 99;
  flex-direction: row;
  gap: clamp(12px, 2vw, 24px);
  min-height: 48px;
  aspect-ratio: auto;
  margin: 0;
  padding: 10px 12px;

  .detail-page-header__content {
    flex-direction: row;
    gap: clamp(12px, 2vw, 24px);
    padding: 4px 10px;
    background: color-mix(in srgb, var(--bg-color, #000) 90%, transparent);
  }

  .detail-page-header__back,
  h1 {
    font-size: 20px;
    line-height: 1.2;
  }

  .detail-page-header__back {
    flex: none;
    transform: none;
    letter-spacing: 0;
  }

  h1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-page-header__subtitle {
    display: none;
  }
}

@media (max-width: 768px) {
  .detail-page-header {
    aspect-ratio: 6 / 1;
    min-height: 0;
    margin: 0 0 6px;
    padding: 0;

    &__back {
      font-size: 19.5px;
    }

    h1 {
      font-size: clamp(1.65rem, 3.9vw, 3.45rem);
    }

    &__subtitle {
      font-size: clamp(13.5px, 3.75vw, 18px);
    }
  }

  .detail-page-header--compact {
    min-height: 48px;
    aspect-ratio: auto;
    margin: 0;
    padding: 10px 8px;

    .detail-page-header__back,
    h1 {
      font-size: 21px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-page-header__back,
  .detail-page-header h1 {
    transition: none;
  }
}
</style>
