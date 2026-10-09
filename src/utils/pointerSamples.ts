type PointerSubscriber = {
  callback: (event: PointerEvent) => void
  interval: number
  last: number
  pending?: PointerEvent
  timer?: ReturnType<typeof setTimeout>
}
const subscribers = new Set<PointerSubscriber>()

const cancelPendingSamples = () => {
  for (const subscriber of subscribers) {
    if (subscriber.timer !== undefined) clearTimeout(subscriber.timer)
    subscriber.timer = undefined
    subscriber.pending = undefined
  }
}

// 自定义指针与模型共用一个原生监听器；慢订阅只接收限频后的最新位置，保留尾部事件。
const dispatch = (event: PointerEvent) => {
  const now = performance.now()
  for (const subscriber of subscribers) {
    subscriber.pending = event
    if (now - subscriber.last >= subscriber.interval) {
      if (subscriber.timer !== undefined) clearTimeout(subscriber.timer)
      subscriber.timer = undefined
      subscriber.pending = undefined
      subscriber.last = now
      subscriber.callback(event)
    } else if (subscriber.timer === undefined) {
      subscriber.timer = setTimeout(() => {
        subscriber.timer = undefined
        const latest = subscriber.pending
        subscriber.pending = undefined
        if (!latest) return
        subscriber.last = performance.now()
        subscriber.callback(latest)
      }, Math.ceil(subscriber.interval - (now - subscriber.last)))
    }
  }
}

export function subscribePointerSamples(
  callback: (event: PointerEvent) => void,
  interval = 0
) {
  const subscriber: PointerSubscriber = { callback, interval, last: -Infinity }
  if (!subscribers.size) {
    window.addEventListener('pointermove', dispatch, { passive: true })
    window.addEventListener('blur', cancelPendingSamples)
    document.documentElement.addEventListener(
      'pointerleave',
      cancelPendingSamples
    )
  }
  subscribers.add(subscriber)
  return () => {
    if (subscriber.timer !== undefined) clearTimeout(subscriber.timer)
    subscriber.pending = undefined
    subscribers.delete(subscriber)
    if (!subscribers.size) {
      window.removeEventListener('pointermove', dispatch)
      window.removeEventListener('blur', cancelPendingSamples)
      document.documentElement.removeEventListener(
        'pointerleave',
        cancelPendingSamples
      )
    }
  }
}
