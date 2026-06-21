import { type Ref, ref, unref, watch } from 'vue'
import {
  tryOnMounted,
  tryOnScopeDispose,
  usePreferredReducedMotion,
} from '@vueuse/core'

type ScrollRevealTarget =
  | HTMLElement
  | null
  | Ref<HTMLElement | null | undefined>

interface ScrollRevealOptions {
  selector?: string
  target?: ScrollRevealTarget
  revealedClass?: string
  rootMargin?: string
  threshold?: number | number[]
}

export const useScrollReveal = (options: ScrollRevealOptions = {}) => {
  const {
    selector = '.scroll-reveal-section',
    target,
    revealedClass = 'is-revealed',
    rootMargin = '0px 0px -18% 0px',
    threshold = 0.16,
  } = options
  const reducedMotion = usePreferredReducedMotion()
  const isReady = ref(false)
  let observer: IntersectionObserver | null = null
  let elements: HTMLElement[] = []

  const stop = () => {
    observer?.disconnect()
    observer = null
  }

  const revealAll = () => {
    elements.forEach((element) => element.classList.add(revealedClass))
  }

  const collectElements = () => {
    if (target !== undefined) {
      const element = unref(target)
      return element ? [element] : []
    }

    return Array.from(document.querySelectorAll<HTMLElement>(selector))
  }

  const init = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    stop()
    elements = collectElements()

    if (!elements.length) {
      isReady.value = true
      return
    }

    if (
      reducedMotion.value === 'reduce' ||
      !('IntersectionObserver' in window)
    ) {
      revealAll()
      isReady.value = true
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add(revealedClass)
          observer?.unobserve(entry.target)
        })
      },
      { rootMargin, threshold }
    )

    elements.forEach((element) => observer?.observe(element))
    isReady.value = true
  }

  watch(reducedMotion, (motion) => {
    if (motion !== 'reduce' || !isReady.value) return
    stop()
    revealAll()
  })

  tryOnMounted(init)
  tryOnScopeDispose(stop)

  return {
    isReady,
    refresh: init,
    stop,
  }
}
