import type LenisInstance from 'lenis'

import { getPageMaxScrollTop, setSmoothPageScrollHandler } from './pageScroll'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DEFAULT_SCROLL_DURATION = 800
const FIXED_SCROLL_EASING = (progress: number) =>
  progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2

let lenis: LenisInstance | null = null
let reducedMotionQuery: MediaQueryList | null = null
let shouldRun = false
let setupVersion = 0
let contentResizeObserver: ResizeObserver | null = null
let pendingRestoreFrame: number | null = null
let pendingImmediateScroll:
  | {
      top: number
      expiresAt: number
    }
  | undefined
const scrollLocks = new Set<string>()
const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
])

interface PageScrollSnapshot {
  elements: Array<{
    element: HTMLElement
    left: number
    top: number
  }>
  windowX: number
  windowY: number
}

let pageScrollSnapshot: PageScrollSnapshot | null = null
let pageScrollRestoreFrame: number | null = null

const isNestedScrollTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest('[data-lenis-nested-scroll]'))

const preventLockedPageScroll = (event: Event) => {
  if (!isNestedScrollTarget(event.target)) event.preventDefault()
}

const preventLockedPageScrollKeys = (event: KeyboardEvent) => {
  if (!SCROLL_KEYS.has(event.key) || isNestedScrollTarget(event.target)) return

  const target = event.target
  if (
    target instanceof HTMLElement &&
    (target.matches('input, textarea, select') || target.isContentEditable)
  ) {
    return
  }

  event.preventDefault()
}

const restorePageScroll = (snapshot: PageScrollSnapshot) => {
  if (
    window.scrollX !== snapshot.windowX ||
    window.scrollY !== snapshot.windowY
  ) {
    window.scrollTo(snapshot.windowX, snapshot.windowY)
  }
  for (const { element, left, top } of snapshot.elements) {
    if (element.scrollLeft !== left) element.scrollLeft = left
    if (element.scrollTop !== top) element.scrollTop = top
  }
}

const cancelPageScrollRestore = () => {
  if (pageScrollRestoreFrame === null) return
  window.cancelAnimationFrame(pageScrollRestoreFrame)
  pageScrollRestoreFrame = null
}

const scheduleLockedPageScrollRestore = () => {
  if (pageScrollRestoreFrame !== null || !pageScrollSnapshot) return

  pageScrollRestoreFrame = window.requestAnimationFrame(() => {
    pageScrollRestoreFrame = null
    if (pageScrollSnapshot) restorePageScroll(pageScrollSnapshot)
  })
}

const handleLockedPageScroll = (event: Event) => {
  if (!isNestedScrollTarget(event.target)) scheduleLockedPageScrollRestore()
}

const lockPageScrollPosition = () => {
  if (typeof window === 'undefined' || pageScrollSnapshot) return

  cancelPageScrollRestore()

  const elements = [
    document.scrollingElement,
    document.documentElement,
    document.body,
  ].filter(
    (element, index, list): element is HTMLElement =>
      element instanceof HTMLElement && list.indexOf(element) === index
  )

  pageScrollSnapshot = {
    elements: elements.map((element) => ({
      element,
      left: element.scrollLeft,
      top: element.scrollTop,
    })),
    windowX: window.scrollX,
    windowY: window.scrollY,
  }

  document.addEventListener('wheel', preventLockedPageScroll, {
    capture: true,
    passive: false,
  })
  document.addEventListener('touchmove', preventLockedPageScroll, {
    capture: true,
    passive: false,
  })
  document.addEventListener('keydown', preventLockedPageScrollKeys, true)
  document.addEventListener('scroll', handleLockedPageScroll, true)
  scheduleLockedPageScrollRestore()
}

const unlockPageScrollPosition = () => {
  if (!pageScrollSnapshot) return

  const snapshot = pageScrollSnapshot
  cancelPageScrollRestore()
  document.removeEventListener('wheel', preventLockedPageScroll, true)
  document.removeEventListener('touchmove', preventLockedPageScroll, true)
  document.removeEventListener('keydown', preventLockedPageScrollKeys, true)
  document.removeEventListener('scroll', handleLockedPageScroll, true)
  restorePageScroll(snapshot)
  pageScrollSnapshot = null
  pageScrollRestoreFrame = window.requestAnimationFrame(() => {
    pageScrollRestoreFrame = null
    if (scrollLocks.size === 0 && !pageScrollSnapshot) {
      restorePageScroll(snapshot)
    }
  })
}

const syncScrollLock = () => {
  if (!lenis) return

  if (scrollLocks.size > 0) {
    lenis.stop()
  } else {
    lenis.start()
  }
}

const removeLenis = () => {
  setSmoothPageScrollHandler(null)
  contentResizeObserver?.disconnect()
  contentResizeObserver = null
  if (pendingRestoreFrame !== null) {
    window.cancelAnimationFrame(pendingRestoreFrame)
    pendingRestoreFrame = null
  }
  pendingImmediateScroll = undefined
  lenis?.destroy()
  lenis = null
}

const restorePendingImmediateScroll = () => {
  pendingRestoreFrame = null
  if (!lenis || !pendingImmediateScroll) return

  if (Date.now() > pendingImmediateScroll.expiresAt) {
    pendingImmediateScroll = undefined
    return
  }

  lenis.resize()
  const maxScrollTop = getPageMaxScrollTop()
  lenis.scrollTo(Math.min(pendingImmediateScroll.top, maxScrollTop), {
    immediate: true,
    force: true,
  })

  if (maxScrollTop >= pendingImmediateScroll.top - 1) {
    pendingImmediateScroll = undefined
  }
}

const createLenis = async () => {
  const version = ++setupVersion
  if (
    !shouldRun ||
    lenis ||
    reducedMotionQuery?.matches ||
    typeof window === 'undefined'
  ) {
    return
  }

  const { default: Lenis } = await import('lenis')
  if (version !== setupVersion || !shouldRun || reducedMotionQuery?.matches) {
    return
  }

  const content = document.getElementById('app')
  if (!content) return

  lenis = new Lenis({
    wrapper: document.body,
    content,
    autoRaf: true,
    autoToggle: false,
    smoothWheel: true,
    syncTouch: false,
    lerp: 0.16,
    wheelMultiplier: 1,
    prevent: (node) =>
      node.hasAttribute('data-lenis-nested-scroll') &&
      node.scrollHeight > node.clientHeight,
    anchors: true,
    stopInertiaOnNavigate: true,
    virtualScroll: ({ event }) => {
      pendingImmediateScroll = undefined
      return (
        !event.defaultPrevented &&
        !(event instanceof WheelEvent && event.ctrlKey)
      )
    },
  })

  setSmoothPageScrollHandler(
    ({ top, left, behavior, duration, fixedDuration, onComplete }) => {
      if (!lenis) return

      pendingImmediateScroll = undefined
      if (left !== document.body.scrollLeft) document.body.scrollLeft = left

      if (behavior !== 'smooth') {
        lenis.resize()
        if (top > lenis.limit) {
          pendingImmediateScroll = {
            top,
            expiresAt: Date.now() + 1500,
          }
        }
      }

      const shouldUseFixedDuration = behavior === 'smooth' && fixedDuration

      lenis.scrollTo(top, {
        immediate: behavior !== 'smooth',
        force: true,
        duration: shouldUseFixedDuration ? duration / 1000 : undefined,
        easing: shouldUseFixedDuration ? FIXED_SCROLL_EASING : undefined,
        lerp:
          behavior === 'smooth' && !shouldUseFixedDuration
            ? Math.min(
                0.24,
                Math.max(0.14, DEFAULT_SCROLL_DURATION / duration / 8)
              )
            : undefined,
        onComplete,
      })
    }
  )

  contentResizeObserver = new ResizeObserver(() => {
    if (!pendingImmediateScroll || pendingRestoreFrame !== null) return
    pendingRestoreFrame = window.requestAnimationFrame(
      restorePendingImmediateScroll
    )
  })
  contentResizeObserver.observe(content)
  syncScrollLock()
}

const handleReducedMotionChange = () => {
  ++setupVersion
  removeLenis()
  if (!reducedMotionQuery?.matches) void createLenis()
}

export const startSmoothScroll = () => {
  if (typeof window === 'undefined' || shouldRun) return

  shouldRun = true
  reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
  void createLenis()
}

export const stopSmoothScroll = () => {
  shouldRun = false
  ++setupVersion
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
  reducedMotionQuery = null
  removeLenis()
}

export const setSmoothScrollLocked = (key: string, locked: boolean) => {
  const wasLocked = scrollLocks.size > 0

  if (locked) {
    scrollLocks.add(key)
  } else {
    scrollLocks.delete(key)
  }

  const isLocked = scrollLocks.size > 0
  if (!wasLocked && isLocked) lockPageScrollPosition()
  if (wasLocked && !isLocked) unlockPageScrollPosition()

  syncScrollLock()
}
