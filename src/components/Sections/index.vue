<template>
  <div
    ref="sectionRef"
    class="home-section-layout scroll-reveal-section"
    :class="{ 'scroll-reveal-ready': isScrollRevealReady }"
    data-sections-nav-item="true"
    :data-section-anchor="sectionAnchorId"
    :data-section-label="railLabel"
    :data-section-number="formattedSectionNumber"
    :data-section-title="title"
  >
    <Teleport v-if="isClient && isNavigationHost" to="body">
      <nav
        class="sections-fixed-nav"
        :aria-label="
          locale === 'en' ? 'Page section navigation' : '页面模块导航'
        "
      >
        <span class="sections-fixed-nav__line" aria-hidden="true" />
        <button
          v-for="item in navigationItems"
          :key="item.anchorId"
          class="sections-fixed-nav__item"
          :class="{ 'is-active': activeAnchorId === item.anchorId }"
          type="button"
          :aria-label="`${item.number} ${item.title}`"
          :aria-current="
            activeAnchorId === item.anchorId ? 'location' : undefined
          "
          :title="item.title"
          @click="scrollToSection(item, $event)"
        >
          <span class="sections-fixed-nav__marker" aria-hidden="true" />
          <span class="sections-fixed-nav__copy">
            <span class="sections-fixed-nav__num">{{ item.number }}</span>
            <span class="sections-fixed-nav__label">{{ item.title }}</span>
          </span>
        </button>
      </nav>
    </Teleport>

    <aside class="home-section-rail scroll-reveal-title" aria-hidden="true">
      <span class="home-section-rail__num">{{ formattedSectionNumber }}</span>
      <span class="home-section-rail__label">{{ railLabel }}</span>
    </aside>

    <div class="home-section-panel">
      <div
        v-if="$slots.actions"
        class="home-section-title-row home-section-heading scroll-reveal-title"
      >
        <h2 :id="sectionAnchorId" class="home-section-title">
          <span v-if="shouldShowEnglishTitle" class="home-section-title__en">
            {{ titleEn }}
          </span>
          {{ title }}
        </h2>
        <slot name="actions" />
      </div>
      <h2
        v-else
        :id="sectionAnchorId"
        class="home-section-title home-section-heading scroll-reveal-title"
      >
        <span v-if="shouldShowEnglishTitle" class="home-section-title__en">
          {{ titleEn }}
        </span>
        {{ title }}
      </h2>

      <div class="home-section-content scroll-reveal-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'

import { useScrollReveal } from '@/composables/useScrollReveal'
import {
  addPageScrollListener,
  getPageMaxScrollTop,
  getPageScrollTop,
  scrollPageTo,
} from '@/utils/pageScroll'

const props = defineProps<{
  sectionNumber: string | number
  railLabel: string
  title: string
  titleEn?: string
}>()

const { locale } = useI18n()
const sectionRef = ref<HTMLElement | null>(null)
const { isReady: isScrollRevealReady } = useScrollReveal({
  rootMargin: '0px 0px -12% 0px',
  target: sectionRef,
  threshold: 0.04,
})

const shouldShowEnglishTitle = computed(
  () => locale.value !== 'en' && !!props.titleEn
)
const formattedSectionNumber = computed(() =>
  String(props.sectionNumber).padStart(2, '0')
)

interface NavigationItem {
  anchorId: string
  number: string
  title: string
  target: HTMLElement
  top: number
}

const NAVIGATION_REFRESH_EVENT = 'sections-navigation:refresh'
const ACTIVE_UPDATE_INTERVAL = 300
const navigationItems = shallowRef<NavigationItem[]>([])
const activeAnchorId = ref('')
const isClient = ref(false)
const isNavigationHost = ref(false)
let removeScrollListener: (() => void) | null = null
let navigationResizeObserver: ResizeObserver | null = null
let activeUpdateTimer: ReturnType<typeof window.setTimeout> | null = null
let measurementFrame = 0
let headerOffset = 72
let maxScrollTop = 0

const toAnchorSlug = (value: string | number) => {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'section'
}

const sectionAnchorId = computed(
  () =>
    `section-${toAnchorSlug(props.sectionNumber)}-${toAnchorSlug(
      props.railLabel
    )}`
)

const getNavigationRoot = () =>
  sectionRef.value?.closest<HTMLElement>('.main-container') ??
  sectionRef.value?.parentElement ??
  null

const getHeaderOffset = () => {
  const header = document.querySelector<HTMLElement>('.el-menu-layout-all')

  return Math.max(72, (header?.getBoundingClientRect().bottom ?? 0) + 14)
}

const updateActiveSection = () => {
  activeUpdateTimer = null
  if (!isNavigationHost.value || navigationItems.value.length === 0) return

  const scrollTop = getPageScrollTop()
  if (maxScrollTop > 0 && maxScrollTop - scrollTop <= 4) {
    const lastAnchorId =
      navigationItems.value[navigationItems.value.length - 1].anchorId
    if (activeAnchorId.value !== lastAnchorId) {
      activeAnchorId.value = lastAnchorId
    }
    return
  }

  const activationTop = scrollTop + headerOffset + window.innerHeight * 0.16
  let low = 0
  let high = navigationItems.value.length - 1
  let activeIndex = 0

  while (low <= high) {
    const middle = (low + high) >> 1
    if (navigationItems.value[middle].top <= activationTop) {
      activeIndex = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }

  const nextAnchorId = navigationItems.value[activeIndex].anchorId
  if (activeAnchorId.value !== nextAnchorId) {
    activeAnchorId.value = nextAnchorId
  }
}

const scheduleActiveSectionUpdate = () => {
  if (activeUpdateTimer !== null) return
  activeUpdateTimer = window.setTimeout(
    updateActiveSection,
    ACTIVE_UPDATE_INTERVAL
  )
}

const measureNavigation = () => {
  measurementFrame = 0
  if (!isNavigationHost.value) return

  const scrollTop = getPageScrollTop()
  headerOffset = getHeaderOffset()
  maxScrollTop = getPageMaxScrollTop()

  for (const item of navigationItems.value) {
    item.top = scrollTop + item.target.getBoundingClientRect().top
  }

  scheduleActiveSectionUpdate()
}

const scheduleNavigationMeasurement = () => {
  if (measurementFrame) return
  measurementFrame = window.requestAnimationFrame(measureNavigation)
}

const stopNavigationRuntime = () => {
  removeScrollListener?.()
  removeScrollListener = null
  navigationResizeObserver?.disconnect()
  navigationResizeObserver = null
  window.removeEventListener('resize', scheduleNavigationMeasurement)
}

const syncNavigationRuntime = (root: HTMLElement) => {
  if (!isNavigationHost.value) {
    stopNavigationRuntime()
    return
  }

  if (!removeScrollListener) {
    removeScrollListener = addPageScrollListener(scheduleActiveSectionUpdate)
    window.addEventListener('resize', scheduleNavigationMeasurement, {
      passive: true,
    })

    if (typeof ResizeObserver !== 'undefined') {
      navigationResizeObserver = new ResizeObserver(
        scheduleNavigationMeasurement
      )
      navigationResizeObserver.observe(root)
    }
  }
}

const refreshNavigation = () => {
  const root = getNavigationRoot()
  if (!root || !sectionRef.value) return

  const sectionElements = Array.from(
    root.querySelectorAll<HTMLElement>('[data-sections-nav-item="true"]')
  )
  isNavigationHost.value = sectionElements[0] === sectionRef.value

  navigationItems.value = sectionElements.flatMap((element) => {
    const anchorId = element.dataset.sectionAnchor
    const target = anchorId
      ? element.querySelector<HTMLElement>(`#${anchorId}`)
      : null

    if (!anchorId || !target) return []

    return [
      {
        anchorId,
        number: element.dataset.sectionNumber ?? '',
        title: element.dataset.sectionTitle ?? '',
        target,
        top: Number.NaN,
      },
    ]
  })

  syncNavigationRuntime(root)
  if (isNavigationHost.value) {
    scheduleNavigationMeasurement()
  }
}

const announceNavigationRefresh = () => {
  window.dispatchEvent(new CustomEvent(NAVIGATION_REFRESH_EVENT))
}

const scrollToSection = (item: NavigationItem, event: MouseEvent) => {
  activeAnchorId.value = item.anchorId
  const measuredTop = Number.isNaN(item.top)
    ? getPageScrollTop() + item.target.getBoundingClientRect().top
    : item.top
  const targetTop = measuredTop - headerOffset
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  scrollPageTo({
    top: Math.max(0, targetTop),
    behavior: reduceMotion ? 'auto' : 'smooth',
  })

  const trigger = event.currentTarget as HTMLButtonElement | null
  trigger?.blur()
}

watch(
  () => [
    props.railLabel,
    props.sectionNumber,
    props.title,
    props.titleEn,
    locale.value,
  ],
  () => nextTick(announceNavigationRefresh)
)

onMounted(() => {
  isClient.value = true
  window.addEventListener(NAVIGATION_REFRESH_EVENT, refreshNavigation)
  nextTick(announceNavigationRefresh)
})

onBeforeUnmount(() => {
  window.removeEventListener(NAVIGATION_REFRESH_EVENT, refreshNavigation)
  stopNavigationRuntime()
  if (activeUpdateTimer !== null) window.clearTimeout(activeUpdateTimer)
  if (measurementFrame) window.cancelAnimationFrame(measurementFrame)
  nextTick(announceNavigationRefresh)
})
</script>

<style lang="less" scoped>
.home-section-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(88px, 120px) minmax(0, 1fr);
  gap: clamp(10px, 1.5vw, 20px);
  min-height: 100%;

  &::before {
    content: '';
    position: absolute;
    top: -10px;
    bottom: -30px;
    left: clamp(42px, 4.2vw, 58px);
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(226, 52, 86, 0.82) 12%,
      rgba(226, 52, 86, 0.34) 72%,
      transparent
    );
    box-shadow: 0 0 12px rgba(226, 52, 86, 0.5);
    mask-image: linear-gradient(
      to bottom,
      #000 0,
      #000 2.08rem,
      transparent 2.3rem,
      transparent 5rem,
      #000 5.3rem
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      #000 0,
      #000 2.08rem,
      transparent 2.3rem,
      transparent 5rem,
      #000 5.3rem
    );
    pointer-events: none;
  }
}

.home-section-rail {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  justify-items: center;
  min-height: 180px;
  padding-top: 6px;
  background-image: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.42) 32%,
    rgba(255, 255, 255, 0.42) 68%,
    transparent
  );
  background-repeat: no-repeat;
  background-position: center calc(0.58rem + 7px);
  background-size: min(100%, 112px) 1px;

  &::before {
    content: '';
    position: absolute;
    top: 0.58rem;
    left: calc(50% - 1px);
    width: 14px;
    height: 14px;
    border: 1px solid rgba(226, 52, 86, 0.9);
    background: #0c0b11;
    box-shadow: 0 0 0 4px rgba(226, 52, 86, 0.1);
    transform: translateX(-50%) rotate(45deg);
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    top: calc(0.58rem + 6px);
    left: calc(50% - 1px);
    width: 4px;
    height: 4px;
    background: #e23456;
    box-shadow: 0 0 14px rgba(226, 52, 86, 0.95);
    transform: translateX(-50%);
    z-index: 2;
  }
}

.home-section-rail__num {
  position: relative;
  z-index: 1;
  margin-top: 1.3rem;
  color: transparent;
  font-family: 'anton', monospace;
  font-size: clamp(1.9rem, 4vw, 3.2rem);
  line-height: 0.9;
  -webkit-text-stroke: 1px #e23456;
  text-shadow: 0 0 10px rgba(226, 52, 87, 0.27);
}

.home-section-rail__label {
  margin-top: 24px;
  margin-right: 50px;
  color: rgba(255, 255, 255, 0.25);
  font-family: 'cn-custom', monospace;
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
}

.sections-fixed-nav {
  position: fixed;
  top: auto;
  bottom: 80px;
  left: clamp(10px, 1.7vw, 28px);
  z-index: 90;
  display: flex;
  width: clamp(104px, 9vw, 148px);
  flex-direction: column;
  gap: 4px;
  padding: 10px 0;
  opacity: 0.6;
  transform: none;
  pointer-events: auto;
  transition: opacity 0.25s ease;

  &:hover,
  &:focus-within {
    opacity: 1;
  }

  &::before {
    content: 'NAV';
    position: absolute;
    top: -1rem;
    left: -2px;
    z-index: -1;
    color: rgba(226, 52, 86, 0.06);
    font-family: 'anton', monospace;
    font-size: 2rem;
    line-height: 1;
    letter-spacing: 0.02em;
    white-space: nowrap;
    pointer-events: none;
  }
}

.sections-fixed-nav__line {
  position: absolute;
  top: 20px;
  bottom: 20px;
  left: 6px;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(226, 52, 86, 0.38) 14%,
    rgba(226, 52, 86, 0.38) 86%,
    transparent
  );
  pointer-events: none;
  transform-origin: center;
  animation: sections-fixed-nav-line-in 0.5s cubic-bezier(0.22, 1, 0.36, 1)
    0.08s both;
}

.sections-fixed-nav__item {
  position: relative;
  display: grid;
  grid-template-columns: 13px minmax(0, 1fr);
  grid-template-areas: 'marker copy';
  column-gap: 5px;
  align-items: center;
  min-height: 42px;
  padding: 5px 2px 5px 0;
  border: 0;
  color: var(--text-faint);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: color 0.25s ease, transform 0.25s ease;
  animation: sections-fixed-nav-item-in 0.48s cubic-bezier(0.22, 1, 0.36, 1)
    0.18s both;

  &:nth-of-type(2) {
    animation-delay: 0.24s;
  }

  &:nth-of-type(3) {
    animation-delay: 0.3s;
  }

  &:nth-of-type(4) {
    animation-delay: 0.36s;
  }

  &:nth-of-type(5) {
    animation-delay: 0.42s;
  }

  &:hover,
  &:focus-visible,
  &.is-active {
    color: #e23456;
  }

  &:hover:not(.is-active),
  &:focus-visible:not(.is-active) {
    .sections-fixed-nav__copy {
      transform: translateX(3px);
    }
  }

  &:focus-visible {
    outline: 1px solid rgba(226, 52, 86, 0.55);
    outline-offset: 3px;
  }

  &.is-active {
    .sections-fixed-nav__marker {
      border-color: #e23456;
      background: #e23456;
      box-shadow: 0 0 0 4px rgba(226, 52, 86, 0.12);
      transform: rotate(45deg) scale(1);
    }

    .sections-fixed-nav__num {
      -webkit-text-stroke-color: #e23456;
    }
  }
}

.sections-fixed-nav__marker {
  grid-area: marker;
  justify-self: center;
  width: 7px;
  height: 7px;
  border: 1px solid rgba(226, 52, 86, 0.56);
  background: var(--bg-color);
  transform: rotate(45deg) scale(0.72);
  transition: border-color 0.25s ease, background 0.25s ease,
    box-shadow 0.25s ease, transform 0.25s ease;
}

.sections-fixed-nav__copy {
  grid-area: copy;
  display: flex;
  align-items: center;
  height: 1.18rem;
  min-width: 0;
  transition: transform 0.25s ease;
}

.sections-fixed-nav__num {
  display: inline-flex;
  width: 1.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: transparent;
  font-family: 'anton', monospace;
  font-size: clamp(0.72rem, 1vw, 0.92rem);
  line-height: 1;
  -webkit-text-stroke: 1px var(--text-faint);
  transition: color 0.25s ease, transform 0.25s ease,
    -webkit-text-stroke-color 0.25s ease;
}

.sections-fixed-nav__label {
  min-width: 0;
  max-width: 108px;
  margin-top: 4px;
  overflow: hidden;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 0.42rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-section-panel {
  min-width: 0;
  padding-top: 10px;
}

.home-section-content {
  min-width: 0;
}

.home-section-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  scroll-margin-top: 7rem;
  margin-bottom: 20px;
  padding-bottom: 10px;
  color: #e23456;
  font-family: 'anton', 'alibaba-puhuiti';
  font-size: 1.3rem;
  font-weight: 900;
}

.home-section-title__en {
  color: rgba(255, 255, 255, 0.36);
  font-family: 'anton', monospace;
  font-size: 0.66em;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

.home-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;

  .home-section-title {
    flex: 1;
    margin-bottom: 0;
  }
}

@media screen and (min-aspect-ratio: @ratio-threshold) {
  .sections-fixed-nav {
    width: 20px;
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;

    &::before {
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    &:hover,
    &:focus-within {
      width: clamp(104px, 9vw, 148px);

      &::before {
        opacity: 1;
      }

      .sections-fixed-nav__copy {
        max-width: 132px;
        opacity: 1;
      }
    }
  }

  .sections-fixed-nav__copy {
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease,
      transform 0.25s ease;
  }
}

@media screen and (max-aspect-ratio: @ratio-threshold) {
  .home-section-layout {
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 16px;

    &::before {
      left: 22px;
      bottom: -18px;
      mask-image: linear-gradient(
        to bottom,
        #000 0,
        #000 1.65rem,
        transparent 1.65rem,
        transparent 3.35rem,
        #000 3.35rem
      );
      -webkit-mask-image: linear-gradient(
        to bottom,
        #000 0,
        #000 1.65rem,
        transparent 1.65rem,
        transparent 3.35rem,
        #000 3.35rem
      );
    }
  }

  .home-section-rail {
    min-height: 120px;
    padding-top: 2px;
    background-position: center calc(0.42rem + 5px);
    background-size: min(100%, 44px) 1px;

    &::before {
      top: 0.42rem;
      width: 10px;
      height: 10px;
    }

    &::after {
      top: calc(0.42rem + 3px);
      width: 3px;
      height: 3px;
    }
  }

  .home-section-rail__num {
    margin-top: 1.2rem;
    font-size: 1.8rem;
  }

  .home-section-rail__label {
    margin-top: 8px;
    margin-right: 16px;
    font-size: 0.48rem;
    letter-spacing: 0.12em;
  }

  .sections-fixed-nav {
    left: 20px;
    width: 84px;
    box-sizing: border-box;
    gap: 2px;
    padding: 8px 4px;
    // border: 1px solid var(--border-color);
    background: color-mix(in srgb, var(--bg-color) 12%, transparent);
    opacity: 1;
    border-radius: 10px;
  }

  .sections-fixed-nav__line {
    left: 9px;
  }

  .sections-fixed-nav__item {
    grid-template-columns: 11px auto;
    grid-template-areas: 'marker copy';
    min-height: 34px;
    padding: 3px 0;

    &:hover:not(.is-active),
    &:focus-visible:not(.is-active) {
      .sections-fixed-nav__copy {
        transform: translateX(1px);
      }
    }
  }

  .sections-fixed-nav__marker {
    width: 6px;
    height: 6px;
  }

  .sections-fixed-nav__num {
    font-size: 0.72rem;
  }

  .sections-fixed-nav__label {
    display: none;
  }

  .home-section-panel {
    padding-top: 6px;
  }

  .home-section-title-row {
    gap: 10px;
  }

  .home-section-title-row .home-section-title {
    min-width: 0;
    font-size: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sections-fixed-nav,
  .sections-fixed-nav__line,
  .sections-fixed-nav__item,
  .sections-fixed-nav__marker,
  .sections-fixed-nav__copy,
  .sections-fixed-nav__num,
  .sections-fixed-nav__label {
    transition: none;
    animation: none;
  }
}

@keyframes sections-fixed-nav-line-in {
  from {
    opacity: 0;
    transform: scaleY(0);
  }

  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes sections-fixed-nav-item-in {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
