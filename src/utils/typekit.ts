const TYPEKIT_ID = 'vjg4wuk'
const TYPEKIT_SCRIPT_ID = 'anutrium-typekit'
const TYPEKIT_IDLE_TIMEOUT = 1000

type TypekitWindow = Window & {
  Typekit?: {
    load: (config: {
      async: boolean
      kitId: string
      scriptTimeout: number
    }) => void
  }
}

let typekitLoadPromise: Promise<boolean> | null = null

const loadTypekit = () => {
  if (typekitLoadPromise) return typekitLoadPromise

  typekitLoadPromise = new Promise<boolean>((resolve) => {
    const browserWindow = window as TypekitWindow
    const existingScript = document.getElementById(
      TYPEKIT_SCRIPT_ID
    ) as HTMLScriptElement | null

    if (browserWindow.Typekit) {
      browserWindow.Typekit.load({
        async: true,
        kitId: TYPEKIT_ID,
        scriptTimeout: 3000,
      })
      resolve(true)
      return
    }

    const script = existingScript || document.createElement('script')
    script.id = TYPEKIT_SCRIPT_ID
    script.async = true
    script.src = `https://use.typekit.net/${TYPEKIT_ID}.js`
    script.addEventListener(
      'load',
      () => {
        try {
          browserWindow.Typekit?.load({
            async: true,
            kitId: TYPEKIT_ID,
            scriptTimeout: 3000,
          })
          resolve(true)
        } catch {
          resolve(false)
        }
      },
      { once: true }
    )
    script.addEventListener('error', () => resolve(false), { once: true })

    if (!script.isConnected) document.head.appendChild(script)
  })

  return typekitLoadPromise
}

export const scheduleTypekitLoad = () => {
  if (typeof window === 'undefined') return () => undefined

  const browserWindow = window as TypekitWindow
  let cancelled = false
  let idleHandle: number | null = null
  let fallbackTimer: number | null = null

  const loadWhenIdle = () => {
    if (cancelled) return

    if (browserWindow.requestIdleCallback) {
      idleHandle = browserWindow.requestIdleCallback(
        () => {
          idleHandle = null
          if (!cancelled) void loadTypekit()
        },
        { timeout: TYPEKIT_IDLE_TIMEOUT }
      )
      return
    }

    fallbackTimer = window.setTimeout(() => {
      fallbackTimer = null
      if (!cancelled) void loadTypekit()
    }, 0)
  }

  if (document.readyState === 'complete') loadWhenIdle()
  else window.addEventListener('load', loadWhenIdle, { once: true })

  return () => {
    cancelled = true
    window.removeEventListener('load', loadWhenIdle)
    if (idleHandle !== null) browserWindow.cancelIdleCallback?.(idleHandle)
    if (fallbackTimer !== null) window.clearTimeout(fallbackTimer)
  }
}
