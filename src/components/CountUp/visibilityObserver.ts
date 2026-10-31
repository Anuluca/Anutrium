const callbacks = new Map<Element, () => void>()
let observer: IntersectionObserver | undefined

// 计数器共用同一个观察器；首次进入视口后即停止观察。
export function observeCountVisibility(element: Element, callback: () => void) {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const onVisible = callbacks.get(entry.target)
          if (!onVisible) continue
          unobserve(entry.target)
          onVisible()
        }
      },
      { threshold: 0.2 }
    )
  }
  callbacks.set(element, callback)
  observer.observe(element)
  return () => unobserve(element)
}

function unobserve(element: Element) {
  if (!callbacks.delete(element)) return
  observer?.unobserve(element)
  if (!callbacks.size) {
    observer?.disconnect()
    observer = undefined
  }
}
