export interface PageScrollOptions {
  top: number
  left?: number
  behavior?: ScrollBehavior
  duration?: number
  fixedDuration?: boolean
  onComplete?: () => void
}

type SmoothPageScrollHandler = (options: Required<PageScrollOptions>) => void

let smoothPageScrollHandler: SmoothPageScrollHandler | null = null

export const setSmoothPageScrollHandler = (
  handler: SmoothPageScrollHandler | null
) => {
  smoothPageScrollHandler = handler
}

/**
 * 本站把 body 作为唯一页面滚动容器。所有滚动工具和观察器都通过这里取值，
 * 避免 window、html、body 同时读写导致一次滚动触发多套计算。
 */
export const getPageScrollElement = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null
  return document.body
}

export const getPageScrollTop = () => {
  return getPageScrollElement()?.scrollTop || 0
}

export const getPageScrollHeight = () => {
  if (typeof window === 'undefined') return 0
  return Math.max(window.innerHeight, getPageScrollElement()?.scrollHeight || 0)
}

export const getPageMaxScrollTop = () =>
  Math.max(0, getPageScrollHeight() - window.innerHeight)

export const PAGE_END_VISIBILITY_THRESHOLD = 80

export const isPageAtEnd = (
  scrollTop: number,
  maxScrollTop: number,
  threshold = PAGE_END_VISIBILITY_THRESHOLD
) => maxScrollTop > 0 && maxScrollTop - scrollTop <= threshold

export const scrollPageTo = ({
  top,
  left = 0,
  behavior = 'auto',
  duration = 800,
  fixedDuration = false,
  onComplete = () => undefined,
}: PageScrollOptions) => {
  if (typeof window === 'undefined') return

  if (smoothPageScrollHandler) {
    smoothPageScrollHandler({
      top,
      left,
      behavior,
      duration,
      fixedDuration,
      onComplete,
    })
    return
  }

  const options: ScrollToOptions = { top, left, behavior }
  getPageScrollElement()?.scrollTo(options)

  if (behavior !== 'smooth') onComplete()
}

const pageScrollListeners = new Map<EventListener, number>()
const pageScrollOptions: AddEventListenerOptions = {
  passive: true,
  capture: true,
}
let pageScrollFrameId: number | null = null
let latestPageScrollEvent: Event | null = null

const dispatchPageScroll = (event: Event) => {
  latestPageScrollEvent = event
  if (pageScrollFrameId !== null) return

  pageScrollFrameId = window.requestAnimationFrame(() => {
    pageScrollFrameId = null
    const scrollEvent = latestPageScrollEvent
    latestPageScrollEvent = null
    if (!scrollEvent) return

    for (const listener of pageScrollListeners.keys()) listener(scrollEvent)
  })
}

const attachPageScrollRuntime = () => {
  getPageScrollElement()?.addEventListener(
    'scroll',
    dispatchPageScroll,
    pageScrollOptions
  )
}

const detachPageScrollRuntime = () => {
  getPageScrollElement()?.removeEventListener(
    'scroll',
    dispatchPageScroll,
    true
  )
  latestPageScrollEvent = null
  if (pageScrollFrameId === null) return
  window.cancelAnimationFrame(pageScrollFrameId)
  pageScrollFrameId = null
}

export const addPageScrollListener = (listener: EventListener) => {
  if (pageScrollListeners.size === 0) attachPageScrollRuntime()
  pageScrollListeners.set(
    listener,
    (pageScrollListeners.get(listener) || 0) + 1
  )
  let isRemoved = false

  return () => {
    if (isRemoved) return
    isRemoved = true

    const subscriptionCount = pageScrollListeners.get(listener) || 0
    if (subscriptionCount > 1) {
      pageScrollListeners.set(listener, subscriptionCount - 1)
    } else {
      pageScrollListeners.delete(listener)
    }
    if (pageScrollListeners.size === 0) detachPageScrollRuntime()
  }
}

const pageResizeListeners = new Map<EventListener, number>()
let pageResizeFrameId: number | null = null
let latestPageResizeEvent: Event | null = null

const dispatchPageResize = (event: Event) => {
  latestPageResizeEvent = event
  if (pageResizeFrameId !== null) return

  pageResizeFrameId = window.requestAnimationFrame(() => {
    pageResizeFrameId = null
    const resizeEvent = latestPageResizeEvent
    latestPageResizeEvent = null
    if (!resizeEvent) return

    for (const listener of pageResizeListeners.keys()) listener(resizeEvent)
  })
}

const attachPageResizeRuntime = () => {
  window.addEventListener('resize', dispatchPageResize, { passive: true })
}

const detachPageResizeRuntime = () => {
  window.removeEventListener('resize', dispatchPageResize)
  latestPageResizeEvent = null
  if (pageResizeFrameId === null) return
  window.cancelAnimationFrame(pageResizeFrameId)
  pageResizeFrameId = null
}

export const addPageResizeListener = (listener: EventListener) => {
  if (pageResizeListeners.size === 0) attachPageResizeRuntime()
  pageResizeListeners.set(
    listener,
    (pageResizeListeners.get(listener) || 0) + 1
  )
  let isRemoved = false

  return () => {
    if (isRemoved) return
    isRemoved = true

    const subscriptionCount = pageResizeListeners.get(listener) || 0
    if (subscriptionCount > 1) {
      pageResizeListeners.set(listener, subscriptionCount - 1)
    } else {
      pageResizeListeners.delete(listener)
    }
    if (pageResizeListeners.size === 0) detachPageResizeRuntime()
  }
}

export const supportsPageScrollEnd = () =>
  typeof window !== 'undefined' &&
  ('onscrollend' in window || 'onscrollend' in document)

export const addPageScrollEndListener = (listener: EventListener) => {
  if (!supportsPageScrollEnd()) return () => undefined

  const options: AddEventListenerOptions = {
    passive: true,
    capture: true,
  }
  let isRemoved = false

  const scrollElement = getPageScrollElement()
  scrollElement?.addEventListener('scrollend', listener, options)

  return () => {
    if (isRemoved) return
    isRemoved = true
    scrollElement?.removeEventListener('scrollend', listener, true)
  }
}
