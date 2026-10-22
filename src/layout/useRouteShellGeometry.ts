import { onMounted, onUnmounted, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const ISLAND_ROUTE_NAME = 'TEST'
const ISLAND_GEOMETRY_UNLOCK_DELAY = 260
const islandShellClasses = ['island-pc-shell', 'island-mobile-shell'] as const
const islandLeavingClasses = [
  'island-pc-shell-leaving',
  'island-mobile-shell-leaving',
] as const
const routeShellClasses = [
  ...islandShellClasses,
  ...islandLeavingClasses,
] as const
const islandLeavingClassByRouteShell = {
  'island-pc': 'island-pc-shell-leaving',
  'island-mobile': 'island-mobile-shell-leaving',
} as const

/** 全屏路由的离场几何、Shell 类和超时兜底共用同一清理入口。 */
export function useRouteShellGeometry(
  routerContainer: Ref<HTMLElement | null>,
  onUnlocked: () => void
) {
  const route = useRoute()
  const router = useRouter()
  let removeGuard: (() => void) | undefined
  let islandGeometryUnlockTimer: number | null = null
  type GeometryStyle = Pick<
    CSSStyleDeclaration,
    'position' | 'top' | 'left' | 'width' | 'height' | 'margin'
  >
  interface LockedGeometry {
    element: HTMLElement
    style: GeometryStyle
    bounds: DOMRect
  }
  let lockedIslandRouteGeometry: LockedGeometry | null = null
  let lockedRouterContainerGeometry: LockedGeometry | null = null
  const captureGeometry = (element: HTMLElement): LockedGeometry => ({
    element,
    bounds: element.getBoundingClientRect(),
    style: {
      position: element.style.position,
      top: element.style.top,
      left: element.style.left,
      width: element.style.width,
      height: element.style.height,
      margin: element.style.margin,
    },
  })
  const freezeGeometry = ({ element, bounds }: LockedGeometry) => {
    Object.assign(element.style, {
      position: 'fixed',
      top: `${bounds.top}px`,
      left: `${bounds.left}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      margin: '0',
    })
  }
  const clearIslandGeometryUnlockTimer = () => {
    if (islandGeometryUnlockTimer === null) return

    window.clearTimeout(islandGeometryUnlockTimer)
    islandGeometryUnlockTimer = null
  }

  const hasIslandShellClass = () =>
    routeShellClasses.some((className) =>
      document.body.classList.contains(className)
    )

  const markIslandRouteLeaving = (leavingElement: Element) => {
    const routeShell = leavingElement.getAttribute('data-route-shell')
    const leavingClass =
      islandLeavingClassByRouteShell[
        routeShell as keyof typeof islandLeavingClassByRouteShell
      ]

    if (!leavingClass) return false

    document.body.classList.add(leavingClass)
    return true
  }

  const restoreIslandRouteGeometry = () => {
    for (const snapshot of [
      lockedIslandRouteGeometry,
      lockedRouterContainerGeometry,
    ]) {
      if (snapshot) Object.assign(snapshot.element.style, snapshot.style)
    }
    lockedIslandRouteGeometry = null
    lockedRouterContainerGeometry = null
  }

  const lockIslandRouteGeometry = (leavingElement: Element) => {
    if (lockedIslandRouteGeometry?.element === leavingElement) return

    clearIslandGeometryUnlockTimer()
    restoreIslandRouteGeometry()
    const isIslandRoute = markIslandRouteLeaving(leavingElement)
    const shouldLockGeometry =
      isIslandRoute || leavingElement.classList.contains('game-page-layout')
    if (!shouldLockGeometry) return

    if (leavingElement instanceof HTMLElement) {
      // 先读完父子边界，再统一写入，避免固定父容器后立即强制重排测量子页面。
      lockedIslandRouteGeometry = captureGeometry(leavingElement)
      if (routerContainer.value)
        lockedRouterContainerGeometry = captureGeometry(routerContainer.value)
      if (lockedRouterContainerGeometry)
        freezeGeometry(lockedRouterContainerGeometry)
      freezeGeometry(lockedIslandRouteGeometry)
    }

    scheduleIslandGeometryUnlock()
  }

  const unlockIslandRouteGeometry = () => {
    clearIslandGeometryUnlockTimer()
    restoreIslandRouteGeometry()
    document.body.classList.remove(...islandLeavingClasses)

    if (route.name !== ISLAND_ROUTE_NAME && route.name !== 'HOME') {
      document.body.classList.remove(...islandShellClasses)
    }

    onUnlocked()
  }

  const scheduleIslandGeometryUnlock = () => {
    if (
      route.name === ISLAND_ROUTE_NAME ||
      route.name === 'HOME' ||
      !hasIslandShellClass() ||
      islandGeometryUnlockTimer !== null
    ) {
      return
    }

    const leavingElement = lockedIslandRouteGeometry?.element
    let fallbackDelay = ISLAND_GEOMETRY_UNLOCK_DELAY
    if (leavingElement) {
      const style = getComputedStyle(leavingElement)
      const milliseconds = (value: string) =>
        parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)
      const delays = style.transitionDelay.split(',').map(milliseconds)
      const durations = style.transitionDuration.split(',').map(milliseconds)
      // 超时兜底须晚于真实 CSS 离场；固定 260ms 会在慢过渡中提前恢复盒模型。
      fallbackDelay = Math.max(
        fallbackDelay,
        ...durations.map(
          (duration, index) => duration + delays[index % delays.length] + 100
        )
      )
    }
    islandGeometryUnlockTimer = window.setTimeout(
      unlockIslandRouteGeometry,
      fallbackDelay
    )
  }

  onMounted(() => {
    removeGuard = router.beforeEach((to, from) => {
      if (to.fullPath === from.fullPath || to.name === from.name) return true
      const leavingElement = routerContainer.value?.firstElementChild
      if (leavingElement) lockIslandRouteGeometry(leavingElement)
      return true
    })
  })
  onUnmounted(() => {
    clearIslandGeometryUnlockTimer()
    restoreIslandRouteGeometry()
    document.body.classList.remove(
      ...islandShellClasses,
      ...islandLeavingClasses
    )
    removeGuard?.()
  })
  return {
    lockIslandRouteGeometry,
    unlockIslandRouteGeometry,
    scheduleIslandGeometryUnlock,
  }
}
