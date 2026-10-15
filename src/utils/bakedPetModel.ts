import { createCachedModelLoader } from './cachedModelLoader'
import { readCompressedModelBuffer } from './readCompressedModelBuffer'

interface ModelAttribute {
  offset: number
  count: number
}
export interface BakedPetModelAsset {
  revision: string
  buffer: ArrayBuffer
  metadata: {
    version: number
    size: number[]
    facingDirection?: number[]
    attributes: Record<
      | 'positions'
      | 'normals'
      | 'indices'
      | 'raisedPositions'
      | 'raisedNormals'
      | 'yawPositions'
      | 'yawNormals'
      | 'pitchPositions'
      | 'pitchNormals',
      ModelAttribute
    >
  }
}

// 所有宠物使用相同的离线格式、并发下载、解压与失败重试策略。
export const createBakedPetModelLoader = (name: string, revision: string) =>
  createCachedModelLoader<BakedPetModelAsset>(
    revision,
    `${name} pet asset`,
    async (fetchAsset) => {
      const [metadata, buffer] = await Promise.all([
        fetchAsset(`${name}-sleep.json`).then(
          (response) =>
            response.json() as Promise<BakedPetModelAsset['metadata']>
        ),
        fetchAsset(`${name}-sleep.bin.gz`).then(readCompressedModelBuffer),
      ])
      if (metadata.version !== 2)
        throw new Error(`Unsupported ${name} geometry`)
      return { metadata, buffer, revision }
    }
  )
