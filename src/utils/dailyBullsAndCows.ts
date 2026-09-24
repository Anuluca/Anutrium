import {
  createSeededRandom,
  getLocalDateKey,
  hashSeed,
  shuffleWithRandom,
} from '@/utils/dailyRandom'

export type DigitMark = 'exact' | 'misplaced' | 'absent'

export const DAILY_CODE_LENGTH = 4

export { getLocalDateKey } from '@/utils/dailyRandom'

export const getDailyCode = (date = new Date()) => {
  const digits = Array.from({ length: 10 }, (_, index) => index)
  const random = createSeededRandom(
    hashSeed('sleeping-dogs-camera', getLocalDateKey(date))
  )
  shuffleWithRandom(digits, random)

  return digits.slice(0, DAILY_CODE_LENGTH)
}

export const scoreGuess = (
  guess: readonly number[],
  answer: readonly number[],
  answerDigits = new Set(answer)
): DigitMark[] =>
  guess.map((digit, index) => {
    if (digit === answer[index]) return 'exact'
    return answerDigits.has(digit) ? 'misplaced' : 'absent'
  })
