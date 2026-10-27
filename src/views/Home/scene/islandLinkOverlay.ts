import type { IslandModelAnchors } from '../templeScene'

type Point = { x: number; y: number }
export const islandAnchorByItem: Record<string, keyof IslandModelAnchors> = {
  LABORATORY: 'rightBraid',
  NOTES: 'chest',
  'GAME LIBRARY': 'leftBraid',
  COLLECTIBLES: 'leftHand',
}

/** Vue 只管理节点与交互；坐标在模型绘制帧中同步写入，避免再排一个 RAF 或组件更新。 */
export function createIslandLinkOverlay() {
  const links = Object.entries(islandAnchorByItem).map(([id, anchor]) => ({
    id,
    anchor,
    group: null as SVGGElement | null,
    line: null as SVGLineElement | null,
    marker: null as SVGGElement | null,
    origin: null as Point | null,
    position: { x: 0, y: 0 },
    drawnX: NaN,
    drawnY: NaN,
    hasPosition: false,
    visible: false,
  }))
  let viewport: SVGSVGElement | null = null
  let envelope: {
    left: number
    top: number
    right: number
    bottom: number
  } | null = null
  let focusedItem: string | null = null
  // 保留 32px 运动余量；仅超出包络或布局变化时改变表面尺寸，避免逐帧布局。
  const updateViewport = (reset = false) => {
    if (!viewport) return
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity
    for (const link of links) {
      if (!link.origin || !link.hasPosition) continue
      const radius = focusedItem === link.id ? 44 : 24
      left = Math.min(left, link.origin.x, link.position.x - radius)
      top = Math.min(top, link.origin.y, link.position.y - radius)
      right = Math.max(right, link.origin.x, link.position.x + radius)
      bottom = Math.max(bottom, link.origin.y, link.position.y + radius)
    }
    if (!Number.isFinite(left)) return
    if (
      !reset &&
      envelope &&
      left >= envelope.left &&
      top >= envelope.top &&
      right <= envelope.right &&
      bottom <= envelope.bottom
    )
      return
    const next = {
      left: Math.floor(
        Math.min(left - 32, reset ? Infinity : envelope?.left ?? Infinity)
      ),
      top: Math.floor(
        Math.min(top - 32, reset ? Infinity : envelope?.top ?? Infinity)
      ),
      right: Math.ceil(
        Math.max(right + 32, reset ? -Infinity : envelope?.right ?? -Infinity)
      ),
      bottom: Math.ceil(
        Math.max(bottom + 32, reset ? -Infinity : envelope?.bottom ?? -Infinity)
      ),
    }
    if (
      envelope &&
      next.left === envelope.left &&
      next.top === envelope.top &&
      next.right === envelope.right &&
      next.bottom === envelope.bottom
    )
      return
    envelope = next
    const width = next.right - next.left
    const height = next.bottom - next.top
    // viewBox 与 CSS 原点同步，线条仍使用场景原坐标，像素与命中层不变。
    viewport.setAttribute(
      'viewBox',
      `${next.left} ${next.top} ${width} ${height}`
    )
    viewport.style.left = `${next.left}px`
    viewport.style.top = `${next.top}px`
    viewport.style.width = `${width}px`
    viewport.style.height = `${height}px`
  }
  let disposed = false
  const draw = (
    link: (typeof links)[number],
    origin: boolean,
    anchor: boolean,
    force = false
  ) => {
    if (!link.group || !link.line || !link.marker) return
    if (origin && link.origin) {
      link.line.setAttribute('x1', String(link.origin.x))
      if (!link.hasPosition) link.line.setAttribute('y1', String(link.origin.y))
    }
    if (anchor && link.hasPosition) {
      const { x, y } = link.position
      const changedX = force || x !== link.drawnX
      const changedY = force || y !== link.drawnY
      if (changedX) link.line.setAttribute('x2', String(x))
      if (changedY) {
        link.line.setAttribute('y1', String(y))
        link.line.setAttribute('y2', String(y))
      }
      if (changedX || changedY)
        link.marker.setAttribute('transform', `translate(${x} ${y})`)
      link.drawnX = x
      link.drawnY = y
    }
    const visible = !!link.origin && link.hasPosition
    if (force || visible !== link.visible)
      link.group.setAttribute('visibility', visible ? 'visible' : 'hidden')
    link.visible = visible
  }
  return {
    setFocused(id: string | null) {
      focusedItem = id
      updateViewport(true)
    },
    bindViewport(element: unknown) {
      if (disposed || viewport === element) return
      viewport = element as SVGSVGElement | null
      envelope = null
      updateViewport(true)
    },
    bind(id: string, element: unknown) {
      if (disposed) return
      const link = links.find((link) => link.id === id)
      if (!link || link.group === element) return
      link.group = element as SVGGElement | null
      link.line = link.group?.querySelector('line') ?? null
      link.marker = link.group?.querySelector('g') ?? null
      draw(link, true, true, true)
    },
    updateOrigins(origins: Record<string, Point>) {
      if (disposed) return
      let hasChanged = false
      for (const link of links) {
        const next = origins[link.id] ?? null
        const changed = next?.x !== link.origin?.x || next?.y !== link.origin?.y
        link.origin = next
        hasChanged ||= changed
        draw(link, changed, false)
      }
      if (hasChanged) updateViewport(true)
    },
    updateAnchors(anchors: IslandModelAnchors) {
      if (disposed) return
      // 与原父组件一致：任一点累计移动达到 0.25px 时，提交整组最新投影。
      let changed = false
      for (const link of links) {
        const next = anchors[link.anchor]
        if (
          !link.hasPosition ||
          Math.abs(link.position.x - next.x) >= 0.25 ||
          Math.abs(link.position.y - next.y) >= 0.25
        ) {
          changed = true
          break
        }
      }
      if (!changed) return
      for (const link of links) {
        const next = anchors[link.anchor]
        const changed =
          !link.hasPosition ||
          next.x !== link.position.x ||
          next.y !== link.position.y
        link.position.x = next.x
        link.position.y = next.y
        link.hasPosition = true
        draw(link, false, changed)
      }
      updateViewport()
    },
    dispose() {
      disposed = true
      viewport = null
      envelope = null
      for (const link of links) {
        link.group = link.line = link.marker = null
        link.origin = null
      }
    },
  }
}
