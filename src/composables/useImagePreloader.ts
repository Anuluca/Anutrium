import { onUnmounted } from 'vue'

type ImageFetchPriority = 'auto' | 'high' | 'low'

export const useImagePreloader = () => {
  const requestedUrls = new Set<string>()
  const pendingImages = new Map<string, HTMLImageElement>()

  const preloadImages = (
    urls: Iterable<string>,
    fetchPriority: ImageFetchPriority = 'low'
  ) => {
    for (const url of urls) {
      if (!url || requestedUrls.has(url)) continue

      const image = new Image()
      const release = (shouldRetry: boolean) => {
        image.onload = null
        image.onerror = null
        pendingImages.delete(url)
        if (shouldRetry) requestedUrls.delete(url)
      }

      requestedUrls.add(url)
      pendingImages.set(url, image)
      image.decoding = 'async'
      image.setAttribute('fetchpriority', fetchPriority)
      image.onload = () => release(false)
      image.onerror = () => release(true)
      image.src = url
    }
  }

  const cancelPendingPreloads = () => {
    pendingImages.forEach((image) => {
      image.onload = null
      image.onerror = null
      image.src = ''
    })
    pendingImages.clear()
  }

  onUnmounted(cancelPendingPreloads)

  return { cancelPendingPreloads, preloadImages }
}
