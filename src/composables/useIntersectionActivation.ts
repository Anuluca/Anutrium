import { onMounted, onUnmounted, type Ref, unref } from 'vue'

type ActivationTarget =
  | HTMLElement
  | null
  | readonly HTMLElement[]
  | NodeListOf<HTMLElement>
type ActivationTargetSource = Ref<HTMLElement | null> | (() => ActivationTarget)

interface IntersectionActivationOptions
  extends Omit<IntersectionObserverInit, 'root'> {
  root?:
    | IntersectionObserverInit['root']
    | (() => IntersectionObserverInit['root'])
  enabled?: () => boolean
  autoStart?: boolean
  onUnsupported?: () => void
}

export const useIntersectionActivation = (
  target: ActivationTargetSource,
  callback: IntersectionObserverCallback,
  options: IntersectionActivationOptions = {}
) => {
  let observer: IntersectionObserver | null = null

  const stop = () => {
    observer?.disconnect()
    observer = null
  }

  const resolveTargets = () => {
    const resolved = typeof target === 'function' ? target() : unref(target)
    if (!resolved) return []
    if (resolved instanceof HTMLElement) return [resolved]
    return Array.from(resolved)
  }

  const start = () => {
    stop()
    if (options.enabled && !options.enabled()) return

    const elements = resolveTargets()
    if (!elements.length) return

    if (!('IntersectionObserver' in window)) {
      options.onUnsupported?.()
      return
    }

    const root =
      typeof options.root === 'function' ? options.root() : options.root
    observer = new IntersectionObserver(callback, {
      root,
      rootMargin: options.rootMargin,
      threshold: options.threshold,
    })
    elements.forEach((element) => observer?.observe(element))
  }

  if (options.autoStart !== false) onMounted(start)
  onUnmounted(stop)

  return {
    refresh: start,
    stop,
  }
}
