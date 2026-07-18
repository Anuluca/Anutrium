export interface PageScrollOptions {
  top: number
  left?: number
  behavior?: ScrollBehavior
}

const getScrollElements = () => {
  if (typeof document === 'undefined') return []

  const scrollingElement = document.scrollingElement
  const documentElement = document.documentElement
  const body = document.body
  const elements: HTMLElement[] = []

  if (scrollingElement instanceof HTMLElement) elements.push(scrollingElement)
  if (documentElement !== scrollingElement) elements.push(documentElement)
  if (body !== scrollingElement && body !== documentElement) elements.push(body)

  return elements
}

export const getPageScrollTop = () => {
  if (typeof window === 'undefined') return 0

  const scrollingElement = document.scrollingElement as HTMLElement | null
  return Math.max(
    window.scrollY,
    scrollingElement?.scrollTop || 0,
    document.documentElement.scrollTop,
    document.body?.scrollTop || 0
  )
}

export const getPageScrollHeight = () => {
  if (typeof window === 'undefined') return 0

  const scrollingElement = document.scrollingElement as HTMLElement | null
  return Math.max(
    window.innerHeight,
    scrollingElement?.scrollHeight || 0,
    document.documentElement.scrollHeight,
    document.body?.scrollHeight || 0
  )
}

export const getPageMaxScrollTop = () =>
  Math.max(0, getPageScrollHeight() - window.innerHeight)

export const scrollPageTo = ({
  top,
  left = 0,
  behavior = 'auto',
}: PageScrollOptions) => {
  if (typeof window === 'undefined') return

  const options: ScrollToOptions = { top, left, behavior }
  window.scrollTo(options)

  for (const element of getScrollElements()) {
    if (
      element !== document.scrollingElement &&
      element.scrollHeight > element.clientHeight + 1
    ) {
      element.scrollTo(options)
    }
  }
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
  window.addEventListener('scroll', dispatchPageScroll, pageScrollOptions)
  document.addEventListener('scroll', dispatchPageScroll, pageScrollOptions)
}

const detachPageScrollRuntime = () => {
  window.removeEventListener('scroll', dispatchPageScroll, true)
  document.removeEventListener('scroll', dispatchPageScroll, true)
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

  window.addEventListener('scrollend', listener, options)
  document.addEventListener('scrollend', listener, options)

  return () => {
    if (isRemoved) return
    isRemoved = true
    window.removeEventListener('scrollend', listener, true)
    document.removeEventListener('scrollend', listener, true)
  }
}
