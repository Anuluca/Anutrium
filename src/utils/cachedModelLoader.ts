type FetchModelAsset = (path: string) => Promise<Response>

// 缓存下载数据；失败时终止同批请求并清空缓存，后续进入页面可以重试。
export function createCachedModelLoader<T>(
  revision: string,
  label: string,
  load: (fetchAsset: FetchModelAsset) => Promise<T>
) {
  let cached: Promise<T> | undefined
  return () => {
    if (!cached) {
      const controller = new AbortController()
      // 超时覆盖响应体读取和解压，不只约束响应头。
      const timeout = setTimeout(() => controller.abort(), 30000)
      const fetchAsset: FetchModelAsset = async (path) => {
        const response = await fetch(`/models/${path}?v=${revision}`, {
          signal: controller.signal,
        })
        if (!response.ok)
          throw new Error(`${label} ${path}: ${response.status}`)
        return response
      }
      cached = Promise.resolve()
        .then(() => load(fetchAsset))
        .catch((error) => {
          controller.abort()
          cached = undefined
          throw error
        })
        .finally(() => clearTimeout(timeout))
    }
    return cached
  }
}
