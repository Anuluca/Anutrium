<template>
  <ToolPageLayout
    page-class="sleeping-dogs-game no-rem"
    :title="copy.pageTitle"
    back-label="HOME"
    back-path="/"
    :show-recommendations="false"
  >
    <div class="game-scene">
      <div class="phone" aria-label="Sleeping Dogs camera hacking game">
        <img class="phone-frame" :src="phoneFrame" alt="" draggable="false" />

        <section class="phone-screen">
          <div class="legend" aria-label="Result legend">
            <div>
              <i class="result-shape result-shape--misplaced" />
              <span>{{ copy.invalidPlacement }}</span>
            </div>
            <div>
              <i class="result-shape result-shape--absent" />
              <span>{{ copy.invalidDigit }}</span>
            </div>
          </div>

          <div class="history-title">
            <span>{{ copy.previousAttempts }}</span>
            <small>{{ attempts.length }}/{{ MAX_ATTEMPTS }}</small>
          </div>

          <div ref="attemptLog" class="attempt-log">
            <div v-if="attempts.length === 0" class="empty-history">—</div>
            <div
              v-for="(attempt, attemptIndex) in attempts"
              :key="attemptIndex"
              class="attempt-row"
            >
              <span
                v-for="(digit, digitIndex) in attempt.digits"
                :key="digitIndex"
                class="result-digit"
                :class="`result-digit--${attempt.marks[digitIndex]}`"
              >
                {{ digit }}
              </span>
            </div>
          </div>

          <div class="input-panel">
            <p class="input-prompt" aria-live="polite">
              {{ screenMessage }}
            </p>

            <div v-if="phase === 'active'" class="code-input">
              <button
                v-for="(digit, index) in inputDigits"
                :key="index"
                type="button"
                class="digit-picker"
                :class="{
                  'digit-picker--active': activeSlot === index,
                  'digit-picker--empty': digit === null,
                }"
                :aria-label="`${copy.position} ${index + 1}`"
                @click="activateSlot(index)"
              >
                <i
                  v-if="activeSlot === index"
                  class="picker-arrow picker-arrow--up"
                />
                <span>{{ digit ?? '–' }}</span>
                <i
                  v-if="activeSlot === index"
                  class="picker-arrow picker-arrow--down"
                />
              </button>
            </div>

            <div v-else class="final-code" :class="`final-code--${phase}`">
              {{
                phase === 'success'
                  ? answer.join('')
                  : copy.code(answer.join(''))
              }}
            </div>

            <div class="input-actions">
              <button
                v-if="phase === 'active'"
                type="button"
                class="adjust-button"
                :aria-label="copy.previousDigit"
                @click="adjustDigit(-1)"
              >
                −
              </button>
              <button
                type="button"
                class="enter-button"
                @click="phase === 'active' ? submitGuess() : resetGame()"
              >
                {{ phase === 'active' ? copy.enter : copy.retry }}
              </button>
              <button
                v-if="phase === 'active'"
                type="button"
                class="adjust-button"
                :aria-label="copy.nextDigit"
                @click="adjustDigit(1)"
              >
                +
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import phoneFrame from '@/assets/img/games/sleeping-dogs/phone-frame.png'
import ToolPageLayout from '@/components/ToolPageLayout/index.vue'
import {
  DAILY_CODE_LENGTH,
  type DigitMark,
  getDailyCode,
  getLocalDateKey,
  scoreGuess,
} from '@/utils/dailyBullsAndCows'

type GamePhase = 'active' | 'success' | 'failed'

interface Attempt {
  digits: number[]
  marks: DigitMark[]
}

const MAX_ATTEMPTS = 6
const STORAGE_PREFIX = 'anutrium:daily-camera-hack:'
const { locale } = useI18n()
const dateKey = ref('--------')
const answer = ref<number[]>([])
const attempts = ref<Attempt[]>([])
const inputDigits = ref<Array<number | null>>(
  Array.from({ length: DAILY_CODE_LENGTH }, () => null)
)
const activeSlot = ref(0)
const phase = ref<GamePhase>('active')
const inputError = ref('')
const attemptLog = ref<HTMLElement | null>(null)

const copy = computed(() => {
  if (locale.value === 'en') {
    return {
      pageTitle: 'Camera Access',
      invalidPlacement: 'INVALID PLACEMENT',
      invalidDigit: 'INVALID DIGIT',
      previousAttempts: 'PREVIOUS ATTEMPTS:',
      enterUnique: 'ENTER 4 UNIQUE DIGITS',
      incomplete: 'ENTER ALL 4 DIGITS',
      duplicate: 'DIGITS MUST BE UNIQUE',
      granted: 'ACCESS GRANTED',
      denied: 'ACCESS DENIED',
      enter: 'ENTER',
      retry: 'RETRY',
      position: 'Digit position',
      previousDigit: 'Previous digit',
      nextDigit: 'Next digit',
      code: (value: string) => `CODE ${value}`,
    }
  }

  return {
    pageTitle: '摄像头安全接入',
    invalidPlacement: '位置错误',
    invalidDigit: '数字无效',
    previousAttempts: '此前尝试：',
    enterUnique: '请输入 4 个不重复数字',
    incomplete: '请输入完整的 4 位数字',
    duplicate: '数字不能重复',
    granted: '接入成功',
    denied: '接入失败',
    enter: '确认',
    retry: '重试',
    position: '数字位置',
    previousDigit: '上一个数字',
    nextDigit: '下一个数字',
    code: (value: string) => `密码 ${value}`,
  }
})

const screenMessage = computed(() => {
  if (phase.value === 'success') return copy.value.granted
  if (phase.value === 'failed') return copy.value.denied
  return inputError.value || copy.value.enterUnique
})

const scrollAttemptsToBottom = async () => {
  await nextTick()
  if (attemptLog.value)
    attemptLog.value.scrollTop = attemptLog.value.scrollHeight
}

const derivePhase = () => {
  if (
    attempts.value.some((attempt) =>
      attempt.marks.every((mark) => mark === 'exact')
    )
  ) {
    phase.value = 'success'
  } else if (attempts.value.length >= MAX_ATTEMPTS) {
    phase.value = 'failed'
  } else {
    phase.value = 'active'
  }
}

const persistGame = () => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    `${STORAGE_PREFIX}${dateKey.value}`,
    JSON.stringify(attempts.value.map((attempt) => attempt.digits))
  )
}

const restoreGame = () => {
  const saved = window.localStorage.getItem(`${STORAGE_PREFIX}${dateKey.value}`)
  if (!saved) return

  try {
    const guesses = JSON.parse(saved) as unknown
    if (!Array.isArray(guesses)) return

    attempts.value = guesses
      .filter(
        (guess): guess is number[] =>
          Array.isArray(guess) &&
          guess.length === DAILY_CODE_LENGTH &&
          guess.every(
            (digit) => Number.isInteger(digit) && digit >= 0 && digit <= 9
          ) &&
          new Set(guess).size === DAILY_CODE_LENGTH
      )
      .slice(0, MAX_ATTEMPTS)
      .map((digits) => ({ digits, marks: scoreGuess(digits, answer.value) }))
    derivePhase()
    void scrollAttemptsToBottom()
  } catch {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${dateKey.value}`)
  }
}

const activateSlot = (index: number) => {
  activeSlot.value = index
  inputError.value = ''
  if (inputDigits.value[index] === null) adjustDigit(1)
}

const adjustDigit = (direction: -1 | 1) => {
  if (phase.value !== 'active') return

  const usedDigits = new Set(
    inputDigits.value.filter(
      (digit, index): digit is number =>
        digit !== null && index !== activeSlot.value
    )
  )
  const current = inputDigits.value[activeSlot.value]
  let candidate = current === null ? (direction > 0 ? 9 : 0) : current

  for (let attempt = 0; attempt < 10; attempt += 1) {
    candidate = (candidate + direction + 10) % 10
    if (!usedDigits.has(candidate)) {
      inputDigits.value[activeSlot.value] = candidate
      inputError.value = ''
      return
    }
  }
}

const setActiveDigit = (digit: number) => {
  if (phase.value !== 'active') return
  if (
    inputDigits.value.some(
      (value, index) => value === digit && index !== activeSlot.value
    )
  ) {
    inputError.value = copy.value.duplicate
    return
  }

  inputDigits.value[activeSlot.value] = digit
  inputError.value = ''
  if (activeSlot.value < DAILY_CODE_LENGTH - 1) activeSlot.value += 1
}

const submitGuess = () => {
  if (phase.value !== 'active') return
  if (inputDigits.value.some((digit) => digit === null)) {
    inputError.value = copy.value.incomplete
    return
  }

  const digits = inputDigits.value as number[]
  if (new Set(digits).size !== DAILY_CODE_LENGTH) {
    inputError.value = copy.value.duplicate
    return
  }

  attempts.value.push({
    digits: [...digits],
    marks: scoreGuess(digits, answer.value),
  })
  inputDigits.value = Array.from({ length: DAILY_CODE_LENGTH }, () => null)
  activeSlot.value = 0
  inputError.value = ''
  derivePhase()
  persistGame()
  void scrollAttemptsToBottom()
}

const clearInput = () => {
  if (phase.value !== 'active') return
  if (inputDigits.value[activeSlot.value] !== null) {
    inputDigits.value[activeSlot.value] = null
  } else if (activeSlot.value > 0) {
    activeSlot.value -= 1
    inputDigits.value[activeSlot.value] = null
  }
  inputError.value = ''
}

const resetGame = () => {
  attempts.value = []
  inputDigits.value = Array.from({ length: DAILY_CODE_LENGTH }, () => null)
  activeSlot.value = 0
  phase.value = 'active'
  inputError.value = ''
  persistGame()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (/^\d$/.test(event.key)) setActiveDigit(Number(event.key))
  if (event.key === 'ArrowUp') adjustDigit(1)
  if (event.key === 'ArrowDown') adjustDigit(-1)
  if (event.key === 'ArrowLeft')
    activeSlot.value = Math.max(0, activeSlot.value - 1)
  if (event.key === 'ArrowRight') {
    activeSlot.value = Math.min(DAILY_CODE_LENGTH - 1, activeSlot.value + 1)
  }
  if (event.key === 'Backspace' || event.key === 'Delete') clearInput()
  if (event.key === 'Enter') {
    phase.value === 'active' ? submitGuess() : resetGame()
  }
}

onMounted(() => {
  const today = new Date()
  dateKey.value = getLocalDateKey(today)
  answer.value = getDailyCode(today)
  restoreGame()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style lang="less" scoped src="./index.less" />
