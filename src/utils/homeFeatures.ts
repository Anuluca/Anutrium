import { isHomeFeatures } from '@/types/homeFeatures'

const endpoint =
  import.meta.env.VITE_HOME_FEATURES_URL ||
  (import.meta.env.DEV
    ? 'https://steam-api.anuluca.com/site/home-features'
    : '/api/site/home-features')

export async function readLucarioHeadache(
  signal?: AbortSignal
): Promise<boolean> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 2500)
  try {
    if (signal?.aborted) return false
    const response = await fetch(endpoint, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
    if (!response.ok) return false
    const config: unknown = await response.json()
    return isHomeFeatures(config) ? config.lucarioHeadache : false
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
