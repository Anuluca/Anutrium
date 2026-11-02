import { nextTick, onScopeDispose } from 'vue'

import { useFrameTask } from './useFrameTask'
import { scrollNestedTo } from './useNestedSmoothScroll'

interface HeaderScrollOptions {
  header: () => HTMLElement | null
  scroll: () => HTMLElement | null
  active: () => boolean
  compact: () => boolean
  compactHeader: () => void
  expandHeader: () => void
}

/** 首次滚动先消费标题过渡，结束后再把累计输入交还正文。 */
export function useNoteHeaderScrollGate(options: HeaderScrollOptions) {
  let blocking = false
  let pending = 0
  let revision = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let cleanupTransition: (() => void) | undefined
  let touch: { x: number; y: number; manual: boolean; target: number } | null =
    null
  let touchTarget: number | null = null

  const reduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const flushTouch = useFrameTask(() => {
    const scroll = options.scroll()
    if (!scroll || touchTarget === null || !options.active() || blocking) return
    scrollNestedTo(scroll, touchTarget, false, { smoothNative: !reduced() })
  })
  const clearTransition = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
    cleanupTransition?.()
    cleanupTransition = undefined
  }
  const reset = () => {
    const scroll = options.scroll()
    if (scroll) scrollNestedTo(scroll, scroll.scrollTop, true)
    revision++
    blocking = false
    pending = 0
    touch = null
    touchTarget = null
    flushTouch.cancel()
    clearTransition()
  }
  const finish = (version: number) => {
    if (version !== revision || !blocking) return
    blocking = false
    clearTransition()
    const scroll = options.scroll()
    if (!scroll || !options.active()) {
      pending = 0
      return
    }
    const target = Math.max(
      0,
      Math.min(
        scroll.scrollHeight - scroll.clientHeight,
        scroll.scrollTop + pending
      )
    )
    pending = 0
    if (touch?.manual) touch.target = target
    scrollNestedTo(scroll, target, false, { smoothNative: !reduced() })
  }
  const begin = async () => {
    blocking = true
    const version = ++revision
    const scroll = options.scroll()
    if (scroll) scrollNestedTo(scroll, scroll.scrollTop, true)
    options.compactHeader()
    await nextTick()
    if (version !== revision || !options.active()) return
    const header = options.header()
    if (!header) {
      finish(version)
      return
    }
    const style = getComputedStyle(header)
    const seconds = (value: string) =>
      value
        .split(',')
        .map(
          (item) => parseFloat(item) * (item.trim().endsWith('ms') ? 1 : 1000)
        )
    const duration =
      Math.max(...seconds(style.transitionDuration)) +
      Math.max(...seconds(style.transitionDelay))
    if (!duration) {
      finish(version)
      return
    }
    const end = (event: TransitionEvent) => {
      if (
        event.target === header &&
        event.propertyName === 'grid-template-rows'
      )
        finish(version)
    }
    header.addEventListener('transitionend', end)
    cleanupTransition = () => header.removeEventListener('transitionend', end)
    // 关闭、系统动画设置变化或 transitioncancel 时也不能留下输入锁。
    timer = setTimeout(() => finish(version), duration + 80)
  }

  const handlesOwnScroll = (target: EventTarget | null, delta: number) => {
    if (!(target instanceof Element)) return false
    if (target.closest('input, textarea, select, [contenteditable="true"]'))
      return true
    const scroll = options.scroll()
    for (
      let element: Element | null = target;
      element && element !== scroll;
      element = element.parentElement
    ) {
      if (
        element.hasAttribute('data-lenis-nested-scroll') &&
        element instanceof HTMLElement &&
        element.scrollHeight > element.clientHeight + 1 &&
        (delta > 0
          ? element.scrollTop < element.scrollHeight - element.clientHeight - 1
          : element.scrollTop > 0)
      )
        return true
      if (element === options.header()) break
    }
    return false
  }
  const restoreAtTop = (event: Event, delta: number) => {
    const scroll = options.scroll()
    if (!scroll || delta >= 0 || scroll.scrollTop > 4) return false
    event.preventDefault()
    flushTouch.cancel()
    touchTarget = null
    if (touch) touch.target = 0
    // 顶部下拉可能没有 scroll 事件；直接恢复，并撤销尚未交给正文的位移。
    if (blocking || options.compact()) {
      revision++
      blocking = false
      pending = 0
      clearTransition()
      scrollNestedTo(scroll, 0, true)
      options.expandHeader()
    }
    return true
  }
  const consume = (event: Event, delta: number) => {
    if (
      !delta ||
      !event.cancelable ||
      !options.active() ||
      !options.scroll() ||
      handlesOwnScroll(event.target, delta)
    )
      return false
    if (restoreAtTop(event, delta)) return true
    if (!blocking && options.compact()) return false
    event.preventDefault()
    pending += delta
    if (!blocking) void begin()
    return true
  }
  const wheel = (event: WheelEvent) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      Math.abs(event.deltaX) >= Math.abs(event.deltaY)
    )
      return
    const multiplier =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
        ? options.scroll()?.clientHeight || 1
        : 1
    consume(event, event.deltaY * multiplier)
  }
  const touchStart = (event: TouchEvent) => {
    if (touchTarget !== null) {
      flushTouch.cancel()
      touchTarget = null
      const scroll = options.scroll()
      if (scroll) scrollNestedTo(scroll, scroll.scrollTop, true)
    }
    if (event.touches.length !== 1) {
      touch = null
      return
    }
    const finger = event.touches[0]
    touch = {
      x: finger.clientX,
      y: finger.clientY,
      manual: false,
      target: options.scroll()?.scrollTop || 0,
    }
  }
  const touchMove = (event: TouchEvent) => {
    if (!touch || event.touches.length !== 1) return
    const finger = event.touches[0]
    const delta = touch.y - finger.clientY,
      horizontal = touch.x - finger.clientX
    touch.x = finger.clientX
    touch.y = finger.clientY
    if (Math.abs(horizontal) >= Math.abs(delta) || !options.active()) return
    if (!touch.manual) {
      if (consume(event, delta)) touch.manual = true
      return
    }
    // 首个 touchmove 被消费后，这次手势不能切回原生滚动；后续手势仍走原生惯性。
    if (!event.cancelable) return
    event.preventDefault()
    if (restoreAtTop(event, delta)) return
    if (blocking || !options.compact()) {
      pending += delta
      if (!blocking) void begin()
      return
    }
    const scroll = options.scroll()
    if (!scroll) return
    touch.target = Math.max(
      0,
      Math.min(scroll.scrollHeight - scroll.clientHeight, touch.target + delta)
    )
    touchTarget = touch.target
    flushTouch.schedule()
  }
  const touchEnd = () => {
    touch = null
  }
  const keydown = (event: KeyboardEvent) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.target instanceof Element &&
        event.target.closest(
          'button, a, input, textarea, select, [contenteditable="true"]'
        ))
    )
      return
    const scroll = options.scroll()
    if (!scroll) return
    const delta: Record<string, number> = {
      ArrowDown: 40,
      ArrowUp: -40,
      PageDown: scroll.clientHeight * 0.9,
      PageUp: -scroll.clientHeight * 0.9,
      ' ': scroll.clientHeight * (event.shiftKey ? -0.9 : 0.9),
      Home: -scroll.scrollHeight,
      End: scroll.scrollHeight,
    }
    if (event.key in delta) consume(event, delta[event.key])
  }
  onScopeDispose(reset)
  return {
    wheel,
    touchStart,
    touchMove,
    touchEnd,
    keydown,
    reset,
    isBlocking: () => blocking,
  }
}
