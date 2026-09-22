import type * as Leaflet from 'leaflet'

type LeafletRuntime = typeof Leaflet

interface GeoJsonBoundary {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties?: Record<string, unknown>
    geometry: unknown
  }>
}

let leafletLoadPromise: Promise<LeafletRuntime> | null = null
const geoJsonBoundaryCache = new Map<string, GeoJsonBoundary>()

export const loadLeaflet = () => {
  if (leafletLoadPromise) return leafletLoadPromise

  leafletLoadPromise = Promise.all([
    import('leaflet'),
    import('leaflet/dist/leaflet.css'),
  ])
    .then(([leaflet]) => leaflet)
    .catch((error) => {
      leafletLoadPromise = null
      throw error
    })

  return leafletLoadPromise
}

export const loadGeoJsonBoundary = async (
  url: string,
  signal?: AbortSignal
) => {
  const cachedBoundary = geoJsonBoundaryCache.get(url)
  if (cachedBoundary) return cachedBoundary

  const response = await fetch(url, { signal })
  if (!response.ok) return null

  const data = (await response.json()) as Partial<GeoJsonBoundary>
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    return null
  }

  const boundary = data as GeoJsonBoundary
  if (!signal?.aborted) geoJsonBoundaryCache.set(url, boundary)
  return boundary
}
