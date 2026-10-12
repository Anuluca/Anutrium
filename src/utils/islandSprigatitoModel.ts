import { readCompressedModelBuffer } from './readCompressedModelBuffer'
import modelRevision from './sprigatitoModelRevision.generated.json'

interface SleepingModelMetadata {
  version: number
  size: number[]
  attributes: Record<
    'positions' | 'normals' | 'indices' | 'raisedPositions' | 'raisedNormals',
    { offset: number; count: number }
  >
}

interface SleepingModelAsset {
  revision: string
  metadata: SleepingModelMetadata
  buffer: ArrayBuffer
}

let cached: Promise<SleepingModelAsset> | undefined

// 缓存下载数据，场景每次挂载独立创建 GPU 资源；运行时无需 Draco 或骨骼计算。
export function loadIslandSprigatitoModel() {
  if (!cached) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const fetchAsset = async (name: string) => {
      const response = await fetch(
        `/models/sprigatito-sleep.${name}?v=${modelRevision.revision}`,
        {
          signal: controller.signal,
        }
      )
      if (!response.ok)
        throw new Error(`Sprigatito asset ${name}: ${response.status}`)
      return response
    }
    cached = Promise.all([
      fetchAsset('json').then(
        (response) => response.json() as Promise<SleepingModelMetadata>
      ),
      fetchAsset('bin.gz').then(readCompressedModelBuffer),
    ])
      .then(([metadata, buffer]) => {
        if (metadata.version !== 2)
          throw new Error('Unsupported Sprigatito geometry')
        return { metadata, buffer, revision: modelRevision.revision }
      })
      .catch((error) => {
        controller.abort()
        cached = undefined
        throw error
      })
      .finally(() => clearTimeout(timeout))
  }
  return cached
}
