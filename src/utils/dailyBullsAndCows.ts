export type DigitMark = 'exact' | 'misplaced' | 'absent'

export const DAILY_CODE_LENGTH = 4

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}${month}${day}`
}

const hashDate = (dateKey: string) => {
  let hash = 2166136261
  const source = `sleeping-dogs-camera:${dateKey}`

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

export const getDailyCode = (date = new Date()) => {
  const digits = Array.from({ length: 10 }, (_, index) => index)
  const random = nextRandom(hashDate(getLocalDateKey(date)))

  for (let index = digits.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[digits[index], digits[target]] = [digits[target], digits[index]]
  }

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
