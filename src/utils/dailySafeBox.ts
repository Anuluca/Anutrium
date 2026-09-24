import {
  createSeededRandom,
  getLocalDateKey,
  hashSeed,
  shuffleWithRandom,
} from '@/utils/dailyRandom'

export const SAFE_BOX_DIAL_SIZE = 25
export const SAFE_BOX_COMBINATION_LENGTH = 3

export const getDailySafeCombination = (date = new Date()) => {
  const numbers = Array.from(
    { length: SAFE_BOX_DIAL_SIZE },
    (_, index) => index
  )
  const random = createSeededRandom(
    hashSeed('sleeping-dogs-safe-box', getLocalDateKey(date))
  )
  shuffleWithRandom(numbers, random)

  return numbers.slice(0, SAFE_BOX_COMBINATION_LENGTH)
}

export const getSafeDialDistance = (value: number, target: number) => {
  const directDistance = Math.abs(value - target)
  return Math.min(directDistance, SAFE_BOX_DIAL_SIZE - directDistance)
}
