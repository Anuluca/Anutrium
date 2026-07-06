<template>
  <section
    :id="sectionAnchorId"
    ref="sectionRef"
    class="detail-section"
    data-detail-sections-nav-item="true"
    :data-section-anchor="sectionAnchorId"
    :data-section-number="formattedSectionNumber"
    :data-section-title="title"
  >
    <Teleport v-if="isClient && isNavigationHost" to="body">
      <nav
        class="detail-sections-nav"
        :aria-label="
          locale === 'en' ? 'Page section navigation' : '页面模块导航'
        "
      >
        <span class="detail-sections-nav__line" aria-hidden="true" />
        <button
          v-for="item in navigationItems"
          :key="item.anchorId"
          class="detail-sections-nav__item"
          :class="{ 'is-active': activeAnchorId === item.anchorId }"
          type="button"
          :aria-label="`${item.number} ${item.title}`"
          :aria-current="
            activeAnchorId === item.anchorId ? 'location' : undefined
          "
          :title="item.title"
          @click="scrollToSection(item)"
        >
          <span class="detail-sections-nav__marker" aria-hidden="true" />
          <span class="detail-sections-nav__copy">
            <span class="detail-sections-nav__number">{{ item.number }}</span>
            <span class="detail-sections-nav__label">{{ item.title }}</span>
          </span>
        </button>
      </nav>
    </Teleport>

    <DetailSectionHeader>
      <template #number>{{ formattedSectionNumber }}</template>
      <template #title>{{ title }}</template>
      <template v-if="itemCount !== undefined" #meta>
        <span>{{ itemCount }}</span>
        <span>{{ itemLabel }}</span>
      </template>
    </DetailSectionHeader>

    <div class="detail-section__content">
      <slot />
    </div>
  </section>
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

import DetailSectionHeader from '@/components/DetailSectionHeader/index.vue'
import {
  addPageScrollListener,
  getPageMaxScrollTop,
  getPageScrollTop,
  scrollPageTo,
} from '@/utils/pageScroll'

const props = withDefaults(
  defineProps<{
    sectionNumber: string | number
    title: string
    itemCount?: number
    itemLabel?: string
  }>(),
  {
    itemCount: undefined,
    itemLabel: 'ITEMS',
  }
)

interface NavigationItem {
  anchorId: string
  number: string
  title: string
  target: HTMLElement
  top: number
}

const NAVIGATION_REFRESH_EVENT = 'detail-sections-navigation:refresh'
const ACTIVE_UPDATE_INTERVAL = 300
const { locale } = useI18n()
const sectionRef = ref<HTMLElement | null>(null)
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

const formattedSectionNumber = computed(() =>
  String(props.sectionNumber).padStart(2, '0')
)

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
    `detail-section-${toAnchorSlug(props.sectionNumber)}-${toAnchorSlug(
      props.title
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
  let activeIndex = 0

  for (let index = 1; index < navigationItems.value.length; index += 1) {
    if (navigationItems.value[index].top > activationTop) break
    activeIndex = index
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

  if (removeScrollListener) return

  removeScrollListener = addPageScrollListener(scheduleActiveSectionUpdate)
  window.addEventListener('resize', scheduleNavigationMeasurement, {
    passive: true,
  })

  if (typeof ResizeObserver !== 'undefined') {
    navigationResizeObserver = new ResizeObserver(scheduleNavigationMeasurement)
    navigationResizeObserver.observe(root)
  }
}

const refreshNavigation = () => {
  const root = getNavigationRoot()
  if (!root || !sectionRef.value) return

  const sectionElements = Array.from(
    root.querySelectorAll<HTMLElement>('[data-detail-sections-nav-item="true"]')
  )
  isNavigationHost.value = sectionElements[0] === sectionRef.value
  navigationItems.value = sectionElements.map((element) => ({
    anchorId: element.dataset.sectionAnchor ?? '',
    number: element.dataset.sectionNumber ?? '',
    title: element.dataset.sectionTitle ?? '',
    target: element,
    top: Number.NaN,
  }))

  syncNavigationRuntime(root)
  if (isNavigationHost.value) scheduleNavigationMeasurement()
}

const announceNavigationRefresh = () => {
  window.dispatchEvent(new CustomEvent(NAVIGATION_REFRESH_EVENT))
}

const scrollToSection = (item: NavigationItem) => {
  activeAnchorId.value = item.anchorId
  const measuredTop = Number.isNaN(item.top)
    ? getPageScrollTop() + item.target.getBoundingClientRect().top
    : item.top
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  scrollPageTo({
    top: Math.max(0, measuredTop - headerOffset),
    behavior: reduceMotion ? 'auto' : 'smooth',
    duration: reduceMotion ? undefined : 260,
  })
}

const scrollIntoView = (options?: ScrollIntoViewOptions) => {
  sectionRef.value?.scrollIntoView(options)
}

defineExpose({ scrollIntoView })

watch(
  () => [props.sectionNumber, props.title, props.itemCount, locale.value],
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
.detail-section {
  scroll-margin-top: 7rem;
}

.detail-sections-nav {
  position: fixed;
  bottom: 80px;
  left: clamp(10px, 1.7vw, 28px);
  z-index: 90;
  display: flex;
  width: clamp(104px, 9vw, 148px);
  flex-direction: column;
  gap: 4px;
  padding: 10px 0;
  opacity: 0.6;
  transition: opacity 0.25s ease;

  &:hover,
  &:focus-within {
    opacity: 1;
  }

  &::before {
    position: absolute;
    top: -1rem;
    left: -2px;
    z-index: -1;
    color: rgba(226, 52, 86, 0.16);
    content: 'NAV';
    font-family: 'anton', monospace;
    font-size: 2rem;
    line-height: 1;
    pointer-events: none;
  }
}

.detail-sections-nav__line {
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
}

.detail-sections-nav__item {
  position: relative;
  display: grid;
  grid-template-columns: 13px minmax(0, 1fr);
  column-gap: 5px;
  align-items: center;
  min-height: 42px;
  padding: 5px 2px 5px 0;
  border: 0;
  color: var(--text-faint);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: color 0.2s ease;

  &:hover,
  &:focus-visible,
  &.is-active {
    color: #e23456;
  }

  &:focus-visible {
    outline: 1px solid rgba(226, 52, 86, 0.55);
    outline-offset: 3px;
  }

  &.is-active .detail-sections-nav__marker {
    border-color: #e23456;
    background: #e23456;
    box-shadow: 0 0 0 4px rgba(226, 52, 86, 0.12);
    transform: rotate(45deg) scale(1);
  }
}

.detail-sections-nav__marker {
  justify-self: center;
  width: 7px;
  height: 7px;
  border: 1px solid rgba(226, 52, 86, 0.56);
  background: var(--bg-color);
  transform: rotate(45deg) scale(0.72);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease,
    transform 0.2s ease;
}

.detail-sections-nav__copy {
  display: flex;
  min-width: 0;
  align-items: center;
}

.detail-sections-nav__number {
  width: 1.25rem;
  flex: 0 0 auto;
  color: inherit;
  font-family: 'cn-custom', monospace;
  font-size: 0.64rem;
  text-align: center;
}

.detail-sections-nav__label {
  min-width: 0;
  margin-left: 4px;
  margin-top: 2px;
  overflow: hidden;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 0.42rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 901px) {
  .detail-sections-nav {
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

      .detail-sections-nav__copy {
        max-width: 132px;
        opacity: 1;
      }
    }
  }

  .detail-sections-nav__copy {
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
  }
}

@media (max-width: 900px) {
  .detail-sections-nav {
    left: 20px;
    width: 34px;
    box-sizing: border-box;
    padding: 8px 4px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--bg-color) 12%, transparent);
    opacity: 1;
    backdrop-filter: blur(4px);
  }

  .detail-sections-nav__line {
    left: 9px;
  }

  .detail-sections-nav__item {
    grid-template-columns: 11px;
    min-height: 34px;
    padding: 3px 0;
  }

  .detail-sections-nav__marker {
    width: 6px;
    height: 6px;
  }

  .detail-sections-nav__copy {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-sections-nav,
  .detail-sections-nav__item,
  .detail-sections-nav__marker {
    transition: none;
  }
}
</style>
