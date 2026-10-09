interface ModelAttribute {
  offset: number
  count: number
}
interface IslandModelMetadata {
  version: number
  center: number[]
  headPivot: number[]
  headNodPivot: number[]
  size: number[]
  stats: Record<string, number | boolean>
  attributes: Record<
    'positions' | 'normals' | 'weights' | 'nodWeights' | 'indices',
    ModelAttribute
  >
}
interface IslandEnvironment {
  width: number
  height: number
}
let cachedModel:
  | Promise<{
      metadata: IslandModelMetadata
      buffer: ArrayBuffer
      environment: IslandEnvironment
      radiance: ArrayBuffer
    }>
  | undefined

const fetchAsset = async (path: string) => {
  const response = await fetch(`/models/${path}`)
  if (!response.ok) throw new Error(`Lucario asset ${path}: ${response.status}`)
  return response
}

// 同一会话只下载一次；每次进入页面创建独立 GPU 资源，离场后可以安全释放。
export function loadIslandLucarioModel() {
  if (!cachedModel) {
    cachedModel = Promise.all([
      fetchAsset('lucario-island.json').then(
        (response) => response.json() as Promise<IslandModelMetadata>
      ),
      fetchAsset('lucario-island.bin').then((response) =>
        response.arrayBuffer()
      ),
      fetchAsset('lucario-studio.json').then(
        (response) => response.json() as Promise<IslandEnvironment>
      ),
      fetchAsset('lucario-studio.bin.gz').then(async (response) => {
        const compressed = await response.arrayBuffer()
        const signature = new Uint8Array(compressed, 0, 2)
        // 某些静态服务器自动设置 Content-Encoding，浏览器已经完成解压。
        if (signature[0] !== 0x1f || signature[1] !== 0x8b) return compressed
        // 静态 HDR 环境保留 HalfFloat 精度，只在首次加载时解压，不运行 PMREM 卷积。
        const stream = new Blob([compressed])
          .stream()
          .pipeThrough(new DecompressionStream('gzip'))
        return new Response(stream).arrayBuffer()
      }),
    ])
      .then(([metadata, buffer, environment, radiance]) => {
        if (metadata.version !== 1)
          throw new Error('Unsupported Lucario geometry')
        if (radiance.byteLength !== environment.width * environment.height * 8)
          throw new Error('Invalid Lucario environment')
        return { metadata, buffer, environment, radiance }
      })
      .catch((error) => {
        cachedModel = undefined
        throw error
      })
  }
  return cachedModel
}
