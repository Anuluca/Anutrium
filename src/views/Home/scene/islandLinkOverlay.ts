import type { IslandModelAnchors } from '../templeScene'

type Point = { x: number; y: number }
export const islandAnchorByItem: Record<string, keyof IslandModelAnchors> = {
  LABORATORY: 'rightBraid',
  MISCELLANY: 'chest',
  'STUDY NOTES': 'rightHand',
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
      link.line.setAttribute('y1', String(link.origin.y))
    }
    if (anchor && link.hasPosition) {
      const { x, y } = link.position
      const changedX = force || x !== link.drawnX
      const changedY = force || y !== link.drawnY
      if (changedX) link.line.setAttribute('x2', String(x))
      if (changedY) link.line.setAttribute('y2', String(y))
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
      for (const link of links) {
        const next = origins[link.id] ?? null
        const changed = next?.x !== link.origin?.x || next?.y !== link.origin?.y
        link.origin = next
        draw(link, changed, false)
      }
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
    },
    dispose() {
      disposed = true
      for (const link of links) {
        link.group = link.line = link.marker = null
        link.origin = null
      }
    },
  }
}
