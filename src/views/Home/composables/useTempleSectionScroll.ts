import { computed, onScopeDispose, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  isTempleRouteName,
  type TempleCategoryId,
  templeModuleAtPath,
} from '@/config/templeNavigation'
import { useCraftNavigation } from '@/stores/craftNavigation'

const normalize = (value: string) => value.trim().toLowerCase()

export const useTempleSectionScroll = (options: {
  root: () => HTMLElement | null | undefined
  category: () => TempleCategoryId
  ready: () => boolean
  resizing: () => boolean
}) => {
  const route = useRoute()
  const craftNavigation = useCraftNavigation()
  const craftReturn =
    options.category() === 'island' && craftNavigation.restoring
      ? craftNavigation.origin
      : null
  const current = computed(() => {
    const module =
      templeModuleAtPath(route.path) ||
      templeModuleAtPath(`/${String(route.query.module || '')}`)
    if (craftReturn?.path === route.fullPath) return 'craft'
    return isTempleRouteName(route.name) &&
      module === options.category() &&
      typeof route.query.current === 'string'
      ? normalize(route.query.current)
      : ''
  })
  let cancel = () => {}
  let cancelledPath = ''
  watch(
    [current, options.root, options.ready, () => route.query.isExpand],
    ([name, root, ready]) => {
      cancel()
      if (cancelledPath !== route.fullPath) cancelledPath = ''
      if (!name || !root || !ready || cancelledPath === route.fullPath) return
      const sections = [
        ...root.querySelectorAll<HTMLElement>('[data-sections-nav-item]'),
      ]
      const sectionTarget = sections.find(
        (section) => normalize(section.dataset.sectionLabel || '') === name
      )
      const returning =
        craftReturn?.path === route.fullPath ? craftReturn : null
      const target =
        (returning &&
          root.querySelector<HTMLElement>(
            `[data-craft-tool="${returning.toolId}"]`
          )) ||
        sectionTarget
      if (!target) return
      const offset =
        returning && target !== sectionTarget ? returning.offset : 0
      const reducedMotion = matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches
      let frame = 0
      let stableSince = performance.now()
      let deadline = stableSince + 10000
      let lastTop = Number.NaN
      let lastHeight = 0
      let lastPosition = root.scrollTop
      let lastMovement = performance.now()
      let stopped = false
      const stop = () => {
        stopped = true
        cancelAnimationFrame(frame)
        root.scrollTo({
          top: root.scrollTop,
          behavior: 'instant' as ScrollBehavior,
        })
        for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
          root.removeEventListener(event, interrupt)
      }
      const interrupt = () => {
        cancelledPath = route.fullPath
        stop()
      }
      cancel = stop
      for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
        root.addEventListener(event, interrupt, { passive: true })
      const align = (now: number) => {
        if (stopped) return
        if (!target.isConnected || now > deadline) return stop()
        // 带定位的入口已跳过高度展开；尺寸变化只影响后续校准，不阻塞首次滚动。
        const movingTarget = target
          .getAnimations()
          .some(
            (animation) =>
              animation.playState === 'running' &&
              (animation.effect as KeyframeEffect | null)
                ?.getKeyframes()
                .some((keyframe) => 'transform' in keyframe)
          )
        if (options.resizing() || movingTarget) deadline = now + 10000
        // 离屏卡片的动画可能暂停；先滚入视口，再等待位移稳定。
        if (
          options.resizing() ||
          movingTarget ||
          document.fonts.status === 'loading'
        )
          stableSince = now
        const transform = returning
          ? getComputedStyle(target).transform
          : 'none'
        const translateY =
          transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42
        const top = Math.max(
          0,
          Math.min(
            root.scrollHeight - root.clientHeight,
            root.scrollTop +
              target.getBoundingClientRect().top -
              root.getBoundingClientRect().top -
              translateY -
              offset
          )
        )
        const targetChanged =
          Number.isNaN(lastTop) || Math.abs(top - lastTop) > 1
        if (targetChanged || root.scrollHeight !== lastHeight) {
          stableSince = now
          lastTop = top
          lastHeight = root.scrollHeight
        }
        if (Math.abs(root.scrollTop - lastPosition) > 0.5) {
          lastPosition = root.scrollTop
          lastMovement = now
        }
        // 布局切换可能重置原生滚动；仅在停滞时重发，避免每帧重启动画。
        if (
          (targetChanged || now - lastMovement > 150) &&
          Math.abs(root.scrollTop - top) > 1
        ) {
          root.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' })
          lastMovement = now
        }
        // 到达后继续校准 content-visibility 解除占位造成的布局变化。
        if (Math.abs(root.scrollTop - top) <= 1 && now - stableSince >= 800)
          return stop()
        frame = requestAnimationFrame(align)
      }
      align(performance.now())
    },
    { flush: 'post', immediate: true }
  )
  onScopeDispose(() => cancel())
  return computed(() => Boolean(current.value))
}
