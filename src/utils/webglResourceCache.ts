interface DisposableResource<T> {
  dispose: (resource: T) => void
  idleHandle: number | null
  resource: T
  timerHandle: number | null
}

interface CachedResource<T> extends DisposableResource<T> {
  key: string
}

type IdleWindow = Window &
  typeof globalThis & {
    cancelIdleCallback?: (handle: number) => void
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number
  }

const MAX_CACHED_RESOURCES = 1
const cachedResources = new Map<string, CachedResource<unknown>>()
const pendingDisposals = new Set<DisposableResource<unknown>>()
let hasPageHideListener = false

const cancelScheduledDisposal = (entry: DisposableResource<unknown>) => {
  if (entry.timerHandle !== null) {
    window.clearTimeout(entry.timerHandle)
    entry.timerHandle = null
  }

  if (entry.idleHandle !== null) {
    ;(window as IdleWindow).cancelIdleCallback?.(entry.idleHandle)
    entry.idleHandle = null
  }
}

const disposeEntry = (entry: DisposableResource<unknown>) => {
  cancelScheduledDisposal(entry)
  pendingDisposals.delete(entry)
  entry.dispose(entry.resource)
}

const installPageHideCleanup = () => {
  if (hasPageHideListener || typeof window === 'undefined') return
  hasPageHideListener = true

  window.addEventListener('pagehide', () => {
    for (const entry of cachedResources.values()) disposeEntry(entry)
    cachedResources.clear()

    for (const entry of [...pendingDisposals]) disposeEntry(entry)
  })
}

export const deferWebGLResourceDisposal = <T>(
  resource: T,
  dispose: (resource: T) => void,
  delay = 1200,
  idleTimeout = 5000
) => {
  if (typeof window === 'undefined') {
    dispose(resource)
    return
  }

  installPageHideCleanup()
  const entry: DisposableResource<T> = {
    dispose,
    idleHandle: null,
    resource,
    timerHandle: null,
  }
  pendingDisposals.add(entry as DisposableResource<unknown>)

  entry.timerHandle = window.setTimeout(() => {
    entry.timerHandle = null
    const browserWindow = window as IdleWindow

    if (browserWindow.requestIdleCallback) {
      entry.idleHandle = browserWindow.requestIdleCallback(
        () => disposeEntry(entry as DisposableResource<unknown>),
        { timeout: idleTimeout }
      )
      return
    }

    entry.timerHandle = window.setTimeout(
      () => disposeEntry(entry as DisposableResource<unknown>),
      0
    )
  }, Math.max(0, delay))
}

export const takeCachedWebGLResource = <T>(key: string): T | null => {
  const entry = cachedResources.get(key) as CachedResource<T> | undefined
  if (!entry) return null

  cancelScheduledDisposal(entry as CachedResource<unknown>)
  cachedResources.delete(key)
  return entry.resource
}

export const cacheWebGLResource = <T>(
  key: string,
  resource: T,
  dispose: (resource: T) => void,
  ttl = 60_000
) => {
  if (typeof window === 'undefined') {
    dispose(resource)
    return
  }

  installPageHideCleanup()
  const existingEntry = cachedResources.get(key)
  if (existingEntry) {
    cachedResources.delete(key)
    deferWebGLResourceDisposal(existingEntry.resource, existingEntry.dispose, 0)
  }

  const entry: CachedResource<T> = {
    dispose,
    idleHandle: null,
    key,
    resource,
    timerHandle: null,
  }
  cachedResources.set(key, entry as CachedResource<unknown>)

  entry.timerHandle = window.setTimeout(() => {
    entry.timerHandle = null
    if (cachedResources.get(key) !== entry) return
    cachedResources.delete(key)
    deferWebGLResourceDisposal(resource, dispose, 0)
  }, Math.max(0, ttl))

  while (cachedResources.size > MAX_CACHED_RESOURCES) {
    const oldestEntry = cachedResources.entries().next().value as
      | [string, CachedResource<unknown>]
      | undefined
    if (!oldestEntry) break

    const [oldestKey, resourceEntry] = oldestEntry
    cachedResources.delete(oldestKey)
    cancelScheduledDisposal(resourceEntry)
    deferWebGLResourceDisposal(resourceEntry.resource, resourceEntry.dispose, 0)
  }
}
