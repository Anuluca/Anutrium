import {
  type TempleLabelQuality,
  templeLabelQuality,
  type TempleLabelTier,
} from '@/config/templeLabelQuality'

import { createCachedModelLoader } from './cachedModelLoader'
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

// 字形挤出、三角剖分和顶点去重均在构建阶段完成，重新进入首页只创建 GPU 资源。
const createLabelLoader = (quality: TempleLabelTier) =>
  createCachedModelLoader(
    modelRevision.revision,
    'Temple label',
    async (fetchAsset) => {
      const filename =
        quality === 'high' ? 'temple-label' : `temple-label-${quality}`
      const [metadata, buffer] = await Promise.all([
        fetchAsset(`${filename}.json`).then(
          (response) => response.json() as Promise<LabelMetadata>
        ),
        fetchAsset(`${filename}.bin.gz`).then(readCompressedModelBuffer),
      ])
      if (metadata.version !== 1) throw new Error('Unsupported temple label')
      return { metadata, buffer, quality }
    }
  )

const loaders = {
  high: createLabelLoader('high'),
  low: createLabelLoader('low'),
  flat: createLabelLoader('flat'),
}
export function loadTempleLabelModel(
  quality: TempleLabelQuality = templeLabelQuality
) {
  return loaders[quality === 'lod' ? 'high' : quality]()
}

export type TempleLabelAsset = Awaited<ReturnType<typeof loadTempleLabelModel>>
