import {
  inject,
  type InjectionKey,
  onBeforeUnmount,
  onMounted,
  type Ref,
  ref,
  watch,
} from 'vue'
import { usePreferredReducedMotion, useResizeObserver } from '@vueuse/core'

export const sectionFadeOnlyKey: InjectionKey<Readonly<Ref<boolean>>> =
  Symbol.for('anutrium.section-fade-only')

export const useSectionBodyReveal = (
  contentRef: Ref<HTMLElement | null>,
  innerRef: Ref<HTMLElement | null>,
  options: { immediate: boolean; onComplete: () => void }
) => {
  const fadeOnly = inject(sectionFadeOnlyKey, ref(false))
  const reducedMotion = usePreferredReducedMotion()
  let animation: Animation | undefined
  let allowed = false
  let revealed = false
  let deadline = 0
  let frame = 0
  let measuredWidth = 0
  let measuredHeight = 0

  const finish = () => {
    animation = undefined
    cancelAnimationFrame(frame)
    frame = 0
    contentRef.value?.style.removeProperty('overflow')
    contentRef.value?.style.removeProperty('content-visibility')
    stopObserver()
    options.onComplete()
  }
  const start = () => {
    if (!allowed || revealed) return
    const content = contentRef.value
    const inner = innerRef.value
    if (!content || !inner) return
    if (reducedMotion.value === 'reduce' || !content.animate) {
      revealed = true
      finish()
      return
    }
    // content-visibility 的占位尺寸不能用于入场；空正文等待异步内容到达。
    content.style.setProperty('content-visibility', 'visible')
    measuredWidth = inner.offsetWidth
    measuredHeight = inner.offsetHeight
    if (!measuredHeight) {
      content.style.removeProperty('content-visibility')
      return
    }
    const height = content.offsetHeight
    revealed = true
    if (!fadeOnly.value) content.style.overflow = 'hidden'
    deadline = performance.now() + 1040
    const current = content.animate(
      fadeOnly.value
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ height: '0px' }, { height: `${height}px` }],
      {
        duration: fadeOnly.value ? 500 : 1040,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    )
    animation = current
    current.onfinish = () => {
      if (animation === current && current.playState === 'finished') finish()
    }
  }
  const retarget = () => {
    frame = 0
    const content = contentRef.value
    if (!animation || !content) return
    const effect = animation.effect as KeyframeEffect
    const currentHeight = content.offsetHeight
    // 按 auto 测量网格真实分配高度，兼容父容器 min-height 拉伸。
    effect.setKeyframes([{ height: 'auto' }, { height: 'auto' }])
    const targetHeight = content.offsetHeight
    effect.setKeyframes([
      { height: `${currentHeight}px` },
      { height: `${targetHeight}px` },
    ])
    effect.updateTiming({
      duration: Math.max(120, deadline - performance.now()),
    })
    animation.currentTime = 0
  }
  const { stop: stopObserver } = useResizeObserver(innerRef, ([entry]) => {
    if (!revealed) {
      start()
      return
    }
    if (!animation || !entry || fadeOnly.value) return
    // 忽略初次观察的相同尺寸；同一帧的多次尺寸变化只重测一次。
    const width = Math.round(entry.contentRect.width)
    const height = Math.round(entry.contentRect.height)
    if (width === measuredWidth && height === measuredHeight) return
    measuredWidth = width
    measuredHeight = height
    if (!frame) frame = requestAnimationFrame(retarget)
  })
  const reveal = () => {
    allowed = true
    start()
  }
  onMounted(() => {
    if (options.immediate) reveal()
  })
  watch(
    fadeOnly,
    (value) => {
      if (!value || !animation) return
      animation.cancel()
      cancelAnimationFrame(frame)
      frame = 0
      animation = undefined
      revealed = false
      start()
    },
    { flush: 'sync' }
  )
  watch(reducedMotion, (value) => {
    if (value !== 'reduce' || !animation) return
    animation.cancel()
    finish()
  })
  onBeforeUnmount(() => {
    animation?.cancel()
    cancelAnimationFrame(frame)
  })
  return reveal
}
