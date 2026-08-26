import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  type Ref,
  ref,
  shallowRef,
} from 'vue'

import {
  addPageScrollListener,
  getPageMaxScrollTop,
  getPageScrollTop,
  isPageAtEnd,
  scrollPageTo,
} from '@/utils/pageScroll'

export interface SectionNavigationItem {
  anchorId: string
  number: string
  title: string
  target: HTMLElement
  top: number
}

interface SectionNavigationOptions {
  eventName: string
  itemSelector: string
  sectionRef: Ref<HTMLElement | null>
  resolveTarget?: (element: HTMLElement, anchorId: string) => HTMLElement | null
  scrollDuration?: number
}

const ACTIVE_UPDATE_INTERVAL = 300
const pendingRefreshFrames = new Map<string, number>()

const scheduleRefreshEvent = (eventName: string) => {
  if (typeof window === 'undefined' || pendingRefreshFrames.has(eventName)) {
    return
  }

  const frame = window.requestAnimationFrame(() => {
    pendingRefreshFrames.delete(eventName)
    window.dispatchEvent(new CustomEvent(eventName))
  })
  pendingRefreshFrames.set(eventName, frame)
}

export const toSectionAnchorSlug = (value: string | number) => {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'section'
}

export const useSectionNavigation = ({
  eventName,
  itemSelector,
  sectionRef,
  resolveTarget = (element) => element,
  scrollDuration,
}: SectionNavigationOptions) => {
  const navigationItems = shallowRef<SectionNavigationItem[]>([])
  const activeAnchorId = ref('')
  const isNavigationAtPageEnd = ref(false)
  const isClient = ref(false)
  const isNavigationHost = ref(false)
  let removeScrollListener: (() => void) | null = null
  let navigationResizeObserver: ResizeObserver | null = null
  let activeUpdateTimer: number | null = null
  let measurementFrame = 0
  let headerOffset = 72

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
    const maxScrollTop = getPageMaxScrollTop()
    const isAtPageEnd = isPageAtEnd(scrollTop, maxScrollTop)
    isNavigationAtPageEnd.value = isAtPageEnd

    if (isAtPageEnd) {
      const lastItem = navigationItems.value[navigationItems.value.length - 1]
      if (activeAnchorId.value !== lastItem.anchorId) {
        activeAnchorId.value = lastItem.anchorId
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
    isNavigationAtPageEnd.value = false
    removeScrollListener?.()
    removeScrollListener = null
    navigationResizeObserver?.disconnect()
    navigationResizeObserver = null
    window.removeEventListener('resize', scheduleNavigationMeasurement)

    if (activeUpdateTimer !== null) {
      window.clearTimeout(activeUpdateTimer)
      activeUpdateTimer = null
    }
    if (measurementFrame) {
      window.cancelAnimationFrame(measurementFrame)
      measurementFrame = 0
    }
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
      navigationResizeObserver = new ResizeObserver(
        scheduleNavigationMeasurement
      )
      navigationResizeObserver.observe(root)
    }
  }

  const refreshNavigation = () => {
    const root = getNavigationRoot()
    if (!root || !sectionRef.value) return

    const host = root.querySelector<HTMLElement>(itemSelector)
    isNavigationHost.value = host === sectionRef.value

    if (!isNavigationHost.value) {
      navigationItems.value = []
      stopNavigationRuntime()
      return
    }

    navigationItems.value = Array.from(
      root.querySelectorAll<HTMLElement>(itemSelector)
    ).flatMap((element) => {
      const anchorId = element.dataset.sectionAnchor
      const target = anchorId ? resolveTarget(element, anchorId) : null

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
    scheduleNavigationMeasurement()
  }

  const announceNavigationRefresh = () => scheduleRefreshEvent(eventName)

  const scrollToSection = (item: SectionNavigationItem, event: MouseEvent) => {
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
      duration: reduceMotion ? undefined : scrollDuration,
    })

    const trigger = event.currentTarget as HTMLButtonElement | null
    trigger?.blur()
  }

  onMounted(() => {
    isClient.value = true
    window.addEventListener(eventName, refreshNavigation)
    nextTick(announceNavigationRefresh)
  })

  onBeforeUnmount(() => {
    window.removeEventListener(eventName, refreshNavigation)
    stopNavigationRuntime()
    nextTick(announceNavigationRefresh)
  })

  return {
    activeAnchorId,
    announceNavigationRefresh,
    isClient,
    isNavigationAtPageEnd,
    isNavigationHost,
    navigationItems,
    scrollToSection,
  }
}
