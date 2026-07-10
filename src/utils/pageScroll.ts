export interface PageScrollOptions {
  top: number
  left?: number
  behavior?: ScrollBehavior
}

const getScrollElements = () => {
  if (typeof document === 'undefined') return []

  return Array.from(
    new Set(
      [
        document.scrollingElement,
        document.documentElement,
        document.body,
      ].filter(
        (element): element is HTMLElement => element instanceof HTMLElement
      )
    )
  )
}

export const getPageScrollTop = () => {
  if (typeof window === 'undefined') return 0

  return Math.max(
    window.scrollY,
    ...getScrollElements().map((element) => element.scrollTop)
  )
}

export const getPageScrollHeight = () => {
  if (typeof window === 'undefined') return 0

  return Math.max(
    window.innerHeight,
    ...getScrollElements().map((element) => element.scrollHeight)
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

export const addPageScrollListener = (listener: EventListener) => {
  const options: AddEventListenerOptions = {
    passive: true,
    capture: true,
  }
  let frameId: number | null = null

  const scheduleListener = (event: Event) => {
    if (frameId !== null) return

    frameId = window.requestAnimationFrame(() => {
      frameId = null
      listener(event)
    })
  }

  window.addEventListener('scroll', scheduleListener, options)
  document.addEventListener('scroll', scheduleListener, options)

  return () => {
    if (frameId !== null) window.cancelAnimationFrame(frameId)
    window.removeEventListener('scroll', scheduleListener, true)
    document.removeEventListener('scroll', scheduleListener, true)
  }
}
