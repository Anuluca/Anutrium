import type { createHomeTemple } from './templeScene'

type TempleScene = ReturnType<typeof createHomeTemple>
interface RetainableScene {
  suspendForHost: () => boolean
  canResumeFromHost: () => boolean
  retainedBytes: () => number
  dispose: () => void
}

/** 单所有者借用，闲置时最多留一个场景；没有页面组件、纹理或路由的无界资源池。 */
export function createTempleSceneHost<T extends RetainableScene>(
  ttlMs = 90000,
  maxBytes = 256 * 1024 * 1024
) {
  let cached:
    | {
        key: string
        version: unknown
        scene: T
        expires: number
        timer: ReturnType<typeof setTimeout>
      }
    | undefined
  const clear = () => {
    const entry = cached
    cached = undefined
    if (!entry) return
    clearTimeout(entry.timer)
    if (typeof window !== 'undefined')
      window.removeEventListener('pagehide', clear)
    entry.scene.dispose()
  }
  return {
    clear,
    hasResident() {
      if (
        cached &&
        (performance.now() >= cached.expires ||
          !cached.scene.canResumeFromHost())
      )
        clear()
      return !!cached
    },
    take(key: string, version?: unknown): T | undefined {
      if (!cached) return
      if (
        cached.key !== key ||
        cached.version !== version ||
        performance.now() >= cached.expires ||
        !cached.scene.canResumeFromHost()
      ) {
        clear()
        return
      }
      const entry = cached
      cached = undefined
      clearTimeout(entry.timer)
      if (typeof window !== 'undefined')
        window.removeEventListener('pagehide', clear)
      return entry.scene
    },
    retain(key: string, scene: T, version?: unknown) {
      if (cached?.scene === scene)
        return cached.key === key && cached.version === version
      clear()
      if (!scene.suspendForHost()) {
        scene.dispose()
        return false
      }
      const bytes = scene.retainedBytes()
      if (!Number.isFinite(bytes) || bytes > maxBytes) {
        scene.dispose()
        return false
      }
      const entry = {
        key,
        version,
        scene,
        expires: performance.now() + ttlMs,
        timer: undefined as ReturnType<typeof setTimeout>,
      }
      entry.timer = setTimeout(() => {
        if (cached === entry) clear()
      }, ttlMs)
      cached = entry
      if (typeof window !== 'undefined')
        window.addEventListener('pagehide', clear)
      return true
    },
  }
}

export const templeSceneHost = createTempleSceneHost<TempleScene>()
if (import.meta.hot) import.meta.hot.dispose(() => templeSceneHost.clear())
