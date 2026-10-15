import { nextTick } from 'vue'

import { useSiteLoading } from '@/stores/siteLoading'

import { setSmoothScrollLocked } from './smoothScroll'

interface RouteCurtain {
  target: string
  element: HTMLElement
  panel: HTMLElement
  animation?: Animation
  timeout: number
}

let active: RouteCurtain | undefined
const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const coveredTransform = 'translateX(0%) skewX(12deg)'

export const cancelRouteCurtain = (target?: string) => {
  if (!active || (target && active.target !== target)) return
  const curtain = active
  active = undefined
  window.clearTimeout(curtain.timeout)
  curtain.animation?.cancel()
  curtain.element.remove()
  setSmoothScrollLocked('route-curtain', false)
}

const animate = async (curtain: RouteCurtain, from: string, to: string) => {
  curtain.panel.style.transform = to
  curtain.animation = curtain.panel.animate(
    [{ transform: from }, { transform: to }],
    { duration: 420, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' }
  )
  // 取消导航、快速再次导航或兜底清理都可能中断动画，不能产生未处理的拒绝。
  await curtain.animation.finished.catch(() => undefined)
}

export const coverRouteCurtain = async (target: string) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (active) {
    active.target = target
    active.animation?.cancel()
    active.panel.style.transform = coveredTransform
    active.element.dataset.phase = 'covered'
    return
  }
  const element = document.createElement('div')
  element.className = 'route-curtain'
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('popover', 'manual')
  element.dataset.effect = 'wipe'
  element.dataset.phase = 'cover'
  Object.assign(element.style, {
    position: 'fixed',
    inset: '0',
    margin: '0',
    padding: '0',
    border: '0',
    width: '100vw',
    height: '100dvh',
    maxWidth: 'none',
    maxHeight: 'none',
    zIndex: '10001',
    pointerEvents: 'auto',
    overflow: 'hidden',
    background: 'transparent',
  })
  const panel = document.createElement('div')
  panel.className = 'route-curtain-panel'
  // 斜边在视口外预留半个高度对应的倾斜宽度，确保完全遮盖四个角。
  // 面板从左向右覆盖，换页后继续向右离场；页面本身保持原有几何位置。
  const overhang =
    Math.ceil((innerHeight * Math.tan((12 * Math.PI) / 180)) / 2) + 2
  Object.assign(panel.style, {
    position: 'absolute',
    top: '0',
    bottom: '0',
    left: `${-overhang}px`,
    width: `calc(100% + ${overhang * 2}px)`,
    transform: 'translateX(-100%) skewX(12deg)',
    willChange: 'transform',
    backgroundColor:
      getComputedStyle(document.documentElement)
        .getPropertyValue('--page-theme-color')
        .trim() || '#e23456',
  })
  element.appendChild(panel)
  document.body.appendChild(element)
  // 原生顶层（Top Layer）避免被全屏页、弹窗或页面层叠上下文遮住。
  const popover = element as HTMLElement & { showPopover?: () => void }
  popover.showPopover?.()
  const curtain: RouteCurtain = {
    target,
    element,
    panel,
    timeout: window.setTimeout(() => cancelRouteCurtain(), 12000),
  }
  active = curtain
  setSmoothScrollLocked('route-curtain', true)
  await animate(curtain, panel.style.transform, coveredTransform)
  if (active === curtain) element.dataset.phase = 'covered'
}

export const revealRouteCurtain = async (target: string) => {
  const curtain = active
  if (!curtain || curtain.target !== target) return
  await nextTick()
  // out-in 离场、挂载新页面以及滚动恢复均需完成后，再开放新视图。
  for (let i = 0; i < 4; i++) await frame()
  const loading = useSiteLoading()
  const deadline = performance.now() + 8000
  while (
    active === curtain &&
    curtain.target === target &&
    loading.pending &&
    performance.now() < deadline
  )
    await frame()
  if (active !== curtain || curtain.target !== target) return
  curtain.element.dataset.phase = 'reveal'
  await animate(curtain, coveredTransform, 'translateX(100%) skewX(12deg)')
  if (active === curtain && curtain.target === target)
    cancelRouteCurtain(target)
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cancelRouteCurtain()
  })
