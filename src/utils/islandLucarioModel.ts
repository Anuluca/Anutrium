import modelRevision from './lucarioModelRevision.generated.json'
import { readCompressedModelBuffer } from './readCompressedModelBuffer'

interface ModelAttribute {
  offset: number
  count: number
}
export interface IslandModelMetadata {
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
export interface IslandEnvironment {
  width: number
  height: number
}
export interface IslandModelAsset {
  metadata: IslandModelMetadata
  buffer: ArrayBuffer
  environment: IslandEnvironment
  radiance: ArrayBuffer
}
let cachedModel:
  | Promise<{
      metadata: IslandModelMetadata
      buffer: ArrayBuffer
      environment: IslandEnvironment
      radiance: ArrayBuffer
    }>
  | undefined

const fetchAsset = async (path: string, signal: AbortSignal) => {
  const response = await fetch(`/models/${path}?v=${modelRevision.revision}`, {
    signal,
  })
  if (!response.ok) throw new Error(`Lucario asset ${path}: ${response.status}`)
  return response
}

// 同一会话只下载一次；每次进入页面创建独立 GPU 资源，离场后可以安全释放。
export function loadIslandLucarioModel() {
  if (!cachedModel) {
    const controller = new AbortController()
    // 同时约束响应头和响应体读取；失败后清空缓存，返回首页时可以重试。
    const timeout = setTimeout(() => controller.abort(), 30000)
    cachedModel = Promise.all([
      fetchAsset('lucario-island.json', controller.signal).then(
        (response) => response.json() as Promise<IslandModelMetadata>
      ),
      fetchAsset('lucario-island.bin', controller.signal).then((response) =>
        response.arrayBuffer()
      ),
      fetchAsset('lucario-studio.json', controller.signal).then(
        (response) => response.json() as Promise<IslandEnvironment>
      ),
      fetchAsset('lucario-studio.bin.gz', controller.signal).then(
        readCompressedModelBuffer
      ),
    ])
      .then(([metadata, buffer, environment, radiance]) => {
        if (metadata.version !== 1)
          throw new Error('Unsupported Lucario geometry')
        if (radiance.byteLength !== environment.width * environment.height * 8)
          throw new Error('Invalid Lucario environment')
        return { metadata, buffer, environment, radiance }
      })
      .catch((error) => {
        controller.abort()
        cachedModel = undefined
        throw error
      })
      .finally(() => clearTimeout(timeout))
  }
  return cachedModel
}
