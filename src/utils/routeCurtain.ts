import { h, nextTick, render } from 'vue'

import Logo from '@/components/Logo/index.vue'
import { useSiteLoading } from '@/stores/siteLoading'

import { setSmoothScrollLocked } from './smoothScroll'

interface RouteCurtain {
  target: string
  revision: number
  element: HTMLElement
  panel: HTMLElement
  logo: HTMLElement
  animation?: Animation
  logoAnimations: Animation[]
  logoFade?: Animation
  logoBreath?: Animation
  covered?: Promise<void>
  logoReady?: Promise<void>
}

let active: RouteCurtain | undefined
const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const coveredTransform = 'translateX(0%) skewX(12deg)'
// 描边使用真实线长，避免固定 600 单位的虚线提前画完后继续空转。
const logoDrawDuration = 700
const renderLogo = (element: HTMLElement, animated: boolean) => {
  render(
    h(Logo, {
      id: 'route-curtain',
      active: animated,
      style: { width: '100%', height: '100%' },
    }),
    element
  )
  if (!animated)
    element.querySelectorAll<SVGElement>('.main-color').forEach((stroke) => {
      stroke.style.removeProperty('stroke-dasharray')
      stroke.style.removeProperty('stroke-dashoffset')
    })
}

export const cancelRouteCurtain = (target?: string) => {
  if (!active || (target && active.target !== target)) return
  const curtain = active
  active = undefined
  curtain.animation?.cancel()
  curtain.logoFade?.cancel()
  curtain.logoBreath?.cancel()
  curtain.logoAnimations.forEach((animation) => animation.cancel())
  render(null, curtain.logo)
  curtain.element.remove()
  setSmoothScrollLocked('route-curtain', false)
}

const animate = async (
  curtain: RouteCurtain,
  from: string,
  to: string,
  property: 'transform' | 'clipPath' = 'transform'
) => {
  const surface = property === 'clipPath' ? curtain.element : curtain.panel
  surface.style[property] = to
  const animation = surface.animate(
    [{ [property]: from }, { [property]: to }],
    { duration: 420, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' }
  )
  curtain.animation = animation
  // 取消导航、快速再次导航都可能中断动画，不能产生未处理的拒绝。
  await animation.finished.catch(() => undefined)
}

const prepareLogo = (curtain: RouteCurtain) => {
  if (curtain.logo.querySelector('.draw-animation')) {
    renderLogo(curtain.logo, false)
    // 连续导航取消动画后，先提交 class 清理，再创建新的 CSS 描边动画。
    curtain.logo.getAnimations({ subtree: true })
  }
  renderLogo(curtain.logo, true)
  curtain.logo.style.opacity = '0'
  // 复用组件描边动画，按实际线长校准起终点，消除无可见变化的空转时间。
  const animations = curtain.logo.getAnimations({ subtree: true })
  // 先集中读取几何，再统一写入样式，避免每条描边都触发一次样式刷新。
  const strokes = animations.flatMap((animation) => {
    const effect = animation.effect as KeyframeEffect
    const stroke = effect.target
    return stroke instanceof SVGGeometryElement
      ? [{ effect, stroke, length: stroke.getTotalLength() }]
      : []
  })
  for (const { effect, stroke, length } of strokes) {
    stroke.style.strokeDasharray = String(length)
    stroke.style.strokeDashoffset = String(length)
    effect.setKeyframes(
      effect.getKeyframes().map((keyframe) => ({
        ...keyframe,
        strokeDashoffset: String(length * (1 - keyframe.computedOffset)),
      }))
    )
    effect.updateTiming({
      duration: logoDrawDuration,
      easing: 'linear',
      delay: stroke.classList.contains('delay-1-6') ? 100 : 0,
    })
  }
  curtain.logoAnimations = animations
  curtain.element.dataset.logoPhase = 'waiting'
  for (const animation of animations) {
    animation.pause()
    animation.currentTime = 0
    animation.playbackRate = 1
  }
}

const animateLogo = async (curtain: RouteCurtain) => {
  const animations = curtain.logoAnimations
  curtain.element.dataset.logoPhase = 'enter'
  curtain.logo.style.opacity = '1'
  const fade = curtain.logo.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 350,
    easing: 'ease-out',
  })
  curtain.logoFade = fade
  for (const animation of animations) animation.play()
  await Promise.all(
    [...animations, fade].map((animation) =>
      animation.finished.catch(() => undefined)
    )
  )
  if (active === curtain && curtain.logoAnimations === animations) {
    // 仅呼吸透明度，描边只播放一次；循环由浏览器合成层驱动，不添加逐帧 JS。
    curtain.logoBreath = curtain.logo.animate(
      [
        { opacity: 1, easing: 'ease-in-out' },
        { opacity: 0.25, easing: 'ease-in-out' },
        { opacity: 1 },
      ],
      { duration: 1600, iterations: Infinity }
    )
    curtain.element.dataset.logoPhase = 'breathing'
  }
}

export const coverRouteCurtain = async (target: string) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (active) {
    // beforeEach 提前启动，beforeResolve 只等待同一次覆盖，不重播动画。
    if (active.target === target) return active.covered
    active.target = target
    active.revision++
    active.animation?.cancel()
    active.logoFade?.cancel()
    active.logoFade = undefined
    active.logoBreath?.cancel()
    active.logoBreath = undefined
    active.logoAnimations.forEach((animation) => animation.cancel())
    active.logoAnimations = []
    prepareLogo(active)
    active.element.style.clipPath = 'none'
    active.panel.style.transform = coveredTransform
    active.element.dataset.phase = 'covered'
    active.logoReady = animateLogo(active)
    active.covered = active.logoReady
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
    willChange: 'clip-path',
  })
  const panel = document.createElement('div')
  panel.className = 'route-curtain-panel'
  // 斜边预留视口外空间；覆盖时只移动背景，揭幕时裁切整个遮罩，Logo 始终原位。
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
  const logo = document.createElement('div')
  logo.className = 'route-curtain-logo'
  const logoHeight =
    innerWidth < 768 ? 'min(215px, 57.5vw)' : 'min(300px, 57.5vw)'
  Object.assign(logo.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `calc(${logoHeight} * 0.8)`,
    height: logoHeight,
    transform: 'translate(-50%, -50%)',
    contain: 'layout paint style',
    willChange: 'transform, opacity',
    color: '#fffff4',
    opacity: '0',
    pointerEvents: 'none',
  })
  renderLogo(logo, false)
  element.append(panel, logo)
  document.body.appendChild(element)
  // 原生顶层避免被全屏页、弹窗或页面层叠上下文遮住。
  const popover = element as HTMLElement & { showPopover?: () => void }
  popover.showPopover?.()
  const curtain: RouteCurtain = {
    target,
    revision: 0,
    element,
    panel,
    logo,
    logoAnimations: [],
  }
  active = curtain
  setSmoothScrollLocked('route-curtain', true)
  curtain.covered = (async () => {
    await animate(curtain, panel.style.transform, coveredTransform)
    if (active !== curtain || curtain.revision !== 0) return
    element.dataset.phase = 'covered'
    // 不等待路由代码或页面资源，覆盖后立即渐显、描边并进入呼吸；新页挂载留到描边之后。
    prepareLogo(curtain)
    curtain.logoReady = animateLogo(curtain)
    await curtain.logoReady
  })()
  return curtain.covered
}

export const revealRouteCurtain = async (target: string) => {
  const curtain = active
  if (!curtain || curtain.target !== target) return
  const revision = curtain.revision
  const current = () => active === curtain && curtain.revision === revision
  await curtain.covered
  await nextTick()
  // out-in 离场、挂载新页面以及滚动恢复完成后，等待新页登记的关键资源任务。
  for (let i = 0; i < 4 && current(); i++) await frame()
  const loading = useSiteLoading()
  // 慢网下始终保留遮罩和 Logo；资源失败由任务和 router.onError 处理，不能超时揭开半成品页面。
  let readyFrames = 0
  while (current() && readyFrames < 2) {
    readyFrames =
      loading.pending || !loading.presentationReady ? 0 : readyFrames + 1
    await frame()
  }
  if (!current()) return
  // 保持呼吸当前透明度，避免加载完成时亮度跳变；无需等待呼吸周期结束即可擦除。
  curtain.logoBreath?.pause()
  curtain.element.dataset.logoPhase = 'ready'
  curtain.element.dataset.phase = 'reveal'
  const slant = Math.ceil(innerHeight * Math.tan((12 * Math.PI) / 180))
  await animate(
    curtain,
    `polygon(-${slant}px 0, 100% 0, 100% 100%, 0 100%)`,
    `polygon(100% 0, 100% 0, 100% 100%, calc(100% + ${slant}px) 100%)`,
    'clipPath'
  )
  if (current()) cancelRouteCurtain(target)
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cancelRouteCurtain()
  })
