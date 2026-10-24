import { shallowRef } from 'vue'

interface BackToTopDock {
  owner: HTMLElement
  top: number
  left: number
  height: number
}

export const backToTopDock = shallowRef<BackToTopDock | null>(null)
export const BACK_TO_TOP_DOCK_GAP = 6

export const clearBackToTopDock = (owner: HTMLElement | null) => {
  if (backToTopDock.value?.owner === owner) backToTopDock.value = null
}

// 只共享几何位置，回顶按钮仍独立挂载到 body。
export const updateBackToTopDock = (owner: HTMLElement) => {
  const bounds = owner.getBoundingClientRect()
  const next = {
    owner,
    top: bounds.top,
    left: bounds.right + BACK_TO_TOP_DOCK_GAP,
    height: bounds.height,
  }
  const current = backToTopDock.value
  if (
    current?.owner === owner &&
    current.top === next.top &&
    current.left === next.left &&
    current.height === next.height
  )
    return
  backToTopDock.value = next
}
