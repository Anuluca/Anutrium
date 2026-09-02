import { getLocalDateKey } from '@/utils/dailyBullsAndCows'

export const SAFE_BOX_DIAL_SIZE = 25
export const SAFE_BOX_COMBINATION_LENGTH = 3

const hashDate = (dateKey: string) => {
  let hash = 2166136261
  const source = `sleeping-dogs-safe-box:${dateKey}`

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

const nextRandom = (seed: number) => {
  let value = seed || 0x6d2b79f5

  return () => {
    value ^= value << 13
    value ^= value >>> 17
    value ^= value << 5
    return (value >>> 0) / 4294967296
  }
}

export const getDailySafeCombination = (date = new Date()) => {
  const numbers = Array.from(
    { length: SAFE_BOX_DIAL_SIZE },
    (_, index) => index
  )
  const random = nextRandom(hashDate(getLocalDateKey(date)))

  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[numbers[index], numbers[target]] = [numbers[target], numbers[index]]
  }

  return numbers.slice(0, SAFE_BOX_COMBINATION_LENGTH)
}

export const getSafeDialDistance = (value: number, target: number) => {
  const directDistance = Math.abs(value - target)
  return Math.min(directDistance, SAFE_BOX_DIAL_SIZE - directDistance)
}
