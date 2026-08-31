<template>
  <GameStage
    class="bulls-cows-stage"
    :background-image="stageBackground"
    overlay-color="linear-gradient(90deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.38))"
  >
    <div class="stage-layout">
      <div
        class="phone"
        :class="`phone--${introPhase}`"
        :aria-label="copy.gameLabel"
      >
        <img
          class="phone-source"
          :src="referenceScene"
          alt=""
          draggable="false"
        />

        <section class="phone-screen">
          <div
            v-if="introPhase === 'loading'"
            class="screen-loading"
            role="status"
            :aria-label="copy.loading"
          >
            <div class="screen-loading__track" aria-hidden="true">
              <span />
            </div>
          </div>

          <div v-if="introPhase === 'ready'" class="screen-interface">
            <div class="screen-watermark" aria-hidden="true">
              <img :src="referenceScene" alt="" draggable="false" />
            </div>

            <div class="legend" :aria-label="copy.resultLegend">
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
                <div
                  v-for="(digit, index) in inputDigits"
                  :key="index"
                  class="digit-control"
                  :class="{ 'digit-control--active': activeSlot === index }"
                >
                  <button
                    type="button"
                    class="digit-step digit-step--up"
                    :aria-label="`${copy.increaseDigit} ${index + 1}`"
                    @click="adjustDigit(1, index)"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    class="digit-value"
                    :class="{ 'digit-value--empty': digit === null }"
                    :aria-label="`${copy.position} ${index + 1}`"
                    @click="activateSlot(index)"
                  >
                    {{ digit ?? '–' }}
                  </button>
                  <button
                    type="button"
                    class="digit-step digit-step--down"
                    :aria-label="`${copy.decreaseDigit} ${index + 1}`"
                    @click="adjustDigit(-1, index)"
                  >
                    ▼
                  </button>
                </div>
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
                  type="button"
                  class="enter-button"
                  @click="phase === 'active' ? submitGuess() : resetGame()"
                >
                  {{ phase === 'active' ? 'ENTER' : copy.retry }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </GameStage>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import referenceScene from '@/assets/img/games/sleeping-dogs/game-reference.png'
import stageBackground from '@/assets/img/games/sleeping-dogs/game-stage-background.png'
import GameStage from '@/components/GameStage/index.vue'
import {
  DAILY_CODE_LENGTH,
  type DigitMark,
  getDailyCode,
  getLocalDateKey,
  scoreGuess,
} from '@/utils/dailyBullsAndCows'

type GamePhase = 'active' | 'success' | 'failed'
type IntroPhase = 'entering' | 'loading' | 'ready'

interface Attempt {
  digits: number[]
  marks: DigitMark[]
}

const MAX_ATTEMPTS = 6
const PHONE_ENTRY_DURATION = 900
const SCREEN_LOADING_DURATION = 1000
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
const introPhase = ref<IntroPhase>('entering')
const inputError = ref('')
const attemptLog = ref<HTMLElement | null>(null)
let phoneEntryTimer: number | null = null
let screenLoadingTimer: number | null = null

const copy = computed(() => {
  if (locale.value === 'en') {
    return {
      invalidPlacement: 'INVALID PLACEMENT',
      invalidDigit: 'INVALID DIGIT',
      previousAttempts: 'PREVIOUS ATTEMPTS:',
      enterUnique: 'ENTER 4 UNIQUE DIGITS',
      incomplete: 'ENTER ALL 4 DIGITS',
      duplicate: 'DIGITS MUST BE UNIQUE',
      granted: 'ACCESS GRANTED',
      denied: 'ACCESS DENIED',
      retry: 'RETRY',
      position: 'Digit position',
      increaseDigit: 'Increase digit',
      decreaseDigit: 'Decrease digit',
      gameLabel: 'Sleeping Dogs number guessing game',
      loading: 'Loading game interface',
      resultLegend: 'Result legend',
      code: (value: string) => `CODE ${value}`,
    }
  }

  return {
    invalidPlacement: '位置错误',
    invalidDigit: '数字无效',
    previousAttempts: '此前尝试：',
    enterUnique: '请输入 4 个不重复数字',
    incomplete: '请输入完整的 4 位数字',
    duplicate: '数字不能重复',
    granted: '接入成功',
    denied: '接入失败',
    retry: '重试',
    position: '数字位置',
    increaseDigit: '增加数字',
    decreaseDigit: '减少数字',
    gameLabel: '热血无赖猜数字游戏',
    loading: '正在载入游戏界面',
    resultLegend: '结果图例',
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

const adjustDigit = (direction: -1 | 1, index = activeSlot.value) => {
  if (phase.value !== 'active') return
  activeSlot.value = index
  const current = inputDigits.value[index]
  const initialValue = direction > 0 ? 0 : 9

  inputDigits.value[index] =
    current === null ? initialValue : (current + direction + 10) % 10
  inputError.value = ''
}

const activateSlot = (index: number) => {
  activeSlot.value = index
  inputError.value = ''
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
  if (introPhase.value !== 'ready') return
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

const startIntro = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    introPhase.value = 'ready'
    return
  }

  phoneEntryTimer = window.setTimeout(() => {
    introPhase.value = 'loading'
    screenLoadingTimer = window.setTimeout(() => {
      introPhase.value = 'ready'
      void scrollAttemptsToBottom()
      screenLoadingTimer = null
    }, SCREEN_LOADING_DURATION)
    phoneEntryTimer = null
  }, PHONE_ENTRY_DURATION)
}

onMounted(() => {
  const today = new Date()
  dateKey.value = getLocalDateKey(today)
  answer.value = getDailyCode(today)
  restoreGame()
  startIntro()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (phoneEntryTimer !== null) window.clearTimeout(phoneEntryTimer)
  if (screenLoadingTimer !== null) window.clearTimeout(screenLoadingTimer)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="less" scoped src="./index.less" />
