import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onScopeDispose,
  ref,
  watch,
} from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

import { useFloraAlbum } from '@/views/Home/composables/useFloraAlbum'

export const useCreativeMediaPanel = (
  albumId: 'photography' | 'illustration'
) => {
  const expanded = ref(false)
  const buttonExpanded = ref(false)
  const switching = ref(false)
  const viewport = ref<HTMLElement | null>(null)
  const reducedMotion = usePreferredReducedMotion()
  let heightAnimation: Animation | undefined
  let paging = false
  let pageRevision = 0

  const finishTransition = () => {
    viewport.value?.style.removeProperty('height')
    viewport.value?.style.removeProperty('overflow')
    heightAnimation = undefined
    buttonExpanded.value = expanded.value
    switching.value = false
  }
  const holdHeight = () => {
    const element = viewport.value
    if (!element || reducedMotion.value === 'reduce') return
    const height = element.offsetHeight
    heightAnimation?.cancel()
    element.style.height = `${height}px`
    element.style.overflow = 'hidden'
  }
  const animateHeight = (panel: Element, delay = 0) => {
    const element = viewport.value
    if (!element || !(panel instanceof HTMLElement)) return
    // 使用布局高度，避免外层入场缩放影响尺寸计算。
    const fromHeight = element.offsetHeight
    const toHeight = panel.offsetHeight
    heightAnimation?.cancel()
    if (
      reducedMotion.value === 'reduce' ||
      (!switching.value && fromHeight === toHeight)
    ) {
      finishTransition()
      return
    }
    element.style.height = `${toHeight}px`
    const animation = element.animate(
      [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
      {
        duration: 1200,
        delay,
        fill: 'backwards',
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    )
    heightAnimation = animation
    animation.onfinish = () => {
      if (heightAnimation === animation && animation.playState === 'finished')
        finishTransition()
    }
  }
  const album = useFloraAlbum(() => albumId, expanded, holdHeight, {
    prefetch: true,
  })
  const page = computed(() => album.pageIndex.value + 1)
  const pageCount = computed(
    () => album.totalPages.value ?? album.pageCursors.value.length
  )
  const fullPanel = () => viewport.value?.querySelector('.creative-media__all')

  watch(
    [album.allItems, album.loading],
    () => {
      if (paging || !expanded.value || album.loading.value) return
      const panel = fullPanel()
      if (panel)
        animateHeight(
          panel,
          panel.classList.contains('creative-photo-fade-enter-active') ? 200 : 0
        )
    },
    { flush: 'post' }
  )

  const goToPage = async (target: number) => {
    if (
      !Number.isInteger(target) ||
      target < 1 ||
      target > pageCount.value ||
      target === page.value
    )
      return
    const revision = ++pageRevision
    paging = true
    try {
      if (!(await album.goToPage(target))) return
      await nextTick()
      if (revision !== pageRevision || !expanded.value) return
      const element = viewport.value
      const panel = fullPanel()
      if (!element || !panel) return
      // 切页只在这里启动一次动画，跳过数据 watcher 的重复测量。
      animateHeight(panel)
      const scrollRoot = element.closest<HTMLElement>(
        '.scroll-viewport__scroll'
      )
      scrollRoot?.scrollTo({
        top: Math.max(
          0,
          scrollRoot.scrollTop +
            element.getBoundingClientRect().top -
            scrollRoot.getBoundingClientRect().top
        ),
      })
    } finally {
      if (revision === pageRevision) paging = false
    }
  }
  watch(reducedMotion, (value) => {
    if (value !== 'reduce') return
    heightAnimation?.cancel()
    finishTransition()
  })
  onScopeDispose(() => heightAnimation?.cancel())

  return {
    expanded,
    buttonExpanded,
    switching,
    items: album.allItems,
    loading: album.loading,
    error: album.error,
    totalItems: album.totalItems,
    page,
    pageCount,
    refresh: album.refresh,
    holdHeight,
    animateHeight,
    goToPage,
    setViewport: (element: Element | ComponentPublicInstance | null) => {
      viewport.value = element as HTMLElement | null
    },
    toggle: () => {
      if (switching.value) return
      switching.value = true
      expanded.value = !expanded.value
    },
  }
}
