export interface HomeFeatures {
  lucarioHeadache: boolean
  headacheCount: number | null
  updatedAt: string | null
}

export type HomeSceneFeatures = Pick<
  HomeFeatures,
  'lucarioHeadache' | 'updatedAt'
>

export function isHomeSceneFeatures(
  value: unknown
): value is HomeSceneFeatures {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    typeof data.lucarioHeadache === 'boolean' &&
    (data.updatedAt === null ||
      (typeof data.updatedAt === 'string' &&
        Number.isFinite(Date.parse(data.updatedAt))))
  )
}

// 只消费场景模式，忽略接口中的额外统计字段。
export function parseHomeFeatures(value: unknown): HomeSceneFeatures | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  const config = {
    lucarioHeadache: data.lucarioHeadache,
    updatedAt: data.updatedAt,
  }
  return isHomeSceneFeatures(config) ? config : null
}
