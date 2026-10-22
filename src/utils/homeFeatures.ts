import { type HomeSceneFeatures, parseHomeFeatures } from '@/types/homeFeatures'

const endpoint =
  import.meta.env.VITE_HOME_FEATURES_URL ||
  (import.meta.env.DEV
    ? 'https://steam-api.anuluca.com/site/home-features'
    : '/api/site/home-features')

export async function readHomeFeatures(
  signal?: AbortSignal
): Promise<HomeSceneFeatures | null> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 2500)
  try {
    if (signal?.aborted) return null
    const response = await fetch(endpoint, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
    if (!response.ok) return null
    const config: unknown = await response.json()
    return parseHomeFeatures(config)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
