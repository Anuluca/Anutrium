import { createCachedModelLoader } from './cachedModelLoader'
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
// 同一会话只下载一次；每次进入页面创建独立 GPU 资源，离场后可以安全释放。
export const loadIslandLucarioModel = createCachedModelLoader<IslandModelAsset>(
  modelRevision.revision,
  'Lucario asset',
  async (fetchAsset) => {
    const [metadata, buffer, environment, radiance] = await Promise.all([
      fetchAsset('lucario-island.json').then(
        (response) => response.json() as Promise<IslandModelMetadata>
      ),
      fetchAsset('lucario-island.bin').then((response) =>
        response.arrayBuffer()
      ),
      fetchAsset('lucario-studio.json').then(
        (response) => response.json() as Promise<IslandEnvironment>
      ),
      fetchAsset('lucario-studio.bin.gz').then(readCompressedModelBuffer),
    ])
    if (metadata.version !== 1) throw new Error('Unsupported Lucario geometry')
    if (radiance.byteLength !== environment.width * environment.height * 8)
      throw new Error('Invalid Lucario environment')
    return { metadata, buffer, environment, radiance }
  }
)
