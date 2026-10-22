export type FloraPetId = 'huahua' | 'xiaohei'
export type FloraLikeCounts = Record<FloraPetId, number>
export interface FloraLikesSnapshot {
  counts: FloraLikeCounts
  visitorToken: string
  remaining: number
  limit: number
  day: string
  resetsAt: string
  acceptedRequestIds: string[]
}
export const isFloraPetId = (id: unknown): id is FloraPetId =>
  id === 'huahua' || id === 'xiaohei'
export const isLikeCounts = (value: unknown): value is FloraLikeCounts => {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.keys(value).sort().join(',') !== 'huahua,xiaohei'
  )
    return false
  const counts = value as FloraLikeCounts
  return [counts.huahua, counts.xiaohei].every(
    (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000
  )
}
