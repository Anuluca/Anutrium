import modelRevision from './lucarioModelRevision.generated.json'
import { readCompressedModelBuffer } from './readCompressedModelBuffer'

interface LabelMetadata {
  version: number
  halfHeight: number
  depth: number
  attributes: Record<
    'position' | 'normal' | 'statueLabelCharacter' | 'indices',
    { offset: number; count: number }
  >
}

let cached:
  | Promise<{ metadata: LabelMetadata; buffer: ArrayBuffer }>
  | undefined

// 字形挤出、三角剖分和顶点去重均在构建阶段完成，重新进入首页只创建 GPU 资源。
export function loadTempleLabelModel() {
  if (!cached) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const fetchAsset = async (extension: string) => {
      const response = await fetch(
        `/models/temple-label.${extension}?v=${modelRevision.revision}`,
        { signal: controller.signal }
      )
      if (!response.ok)
        throw new Error(`Temple label ${extension}: ${response.status}`)
      return response
    }
    cached = Promise.all([
      fetchAsset('json').then(
        (response) => response.json() as Promise<LabelMetadata>
      ),
      fetchAsset('bin.gz').then(readCompressedModelBuffer),
    ])
      .then(([metadata, buffer]) => {
        if (metadata.version !== 1) throw new Error('Unsupported temple label')
        return { metadata, buffer }
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
