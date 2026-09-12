let leafletLoadPromise: Promise<void> | null = null
const geoJsonBoundaryCache = new Map<string, Promise<unknown | null>>()

export const ensureLeafletStyles = () => {
  if (document.getElementById('leaflet-css')) return

  const link = document.createElement('link')
  link.id = 'leaflet-css'
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

export const loadLeaflet = () => {
  if ((window as Window & { L?: unknown }).L) return Promise.resolve()
  if (leafletLoadPromise) return leafletLoadPromise

  leafletLoadPromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      'script[data-leaflet-runtime]'
    )

    if (script?.dataset.leafletRuntimeState === 'failed') {
      script.remove()
      script = null
    }

    const handleError = () => {
      script?.remove()
      leafletLoadPromise = null
      reject(new Error('Failed to load Leaflet runtime'))
    }

    const handleLoad = () => {
      if (!(window as Window & { L?: unknown }).L) {
        handleError()
        return
      }

      if (script) script.dataset.leafletRuntimeState = 'loaded'
      resolve()
    }

    if (!script) {
      script = document.createElement('script')
      script.dataset.leafletRuntime = 'true'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    }

    script.dataset.leafletRuntimeState = 'loading'
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    if (!script.isConnected) document.head.appendChild(script)
  })

  return leafletLoadPromise
}

export const loadGeoJsonBoundary = async (url: string) => {
  const cachedBoundary = geoJsonBoundaryCache.get(url)
  if (cachedBoundary) return cachedBoundary

  const boundaryLoad = fetch(url)
    .then(async (response) => {
      if (!response.ok) return null

      const data = (await response.json()) as { type?: string }
      return data.type === 'FeatureCollection' || data.type === 'Feature'
        ? data
        : null
    })
    .catch((error) => {
      geoJsonBoundaryCache.delete(url)
      throw error
    })

  geoJsonBoundaryCache.set(url, boundaryLoad)
  return boundaryLoad
}
