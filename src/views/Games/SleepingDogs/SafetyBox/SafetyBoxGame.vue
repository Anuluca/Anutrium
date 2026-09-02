<template>
  <GameStage
    class="safety-box-stage"
    :class="{ 'safety-box-stage--open': phase === 'open' }"
    :content-aspect-ratio="16 / 9"
    :background-image="safeBoxScene"
    overlay-color="linear-gradient(90deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.12))"
  >
    <div class="safe-workspace" :aria-label="copy.gameLabel">
      <section
        class="safe-dial"
        :class="{ 'safe-dial--confirmed': confirmedIndex !== null }"
        :aria-label="activeDialLabel"
      >
        <div class="safe-dial__pointer" aria-hidden="true" />
        <div
          class="safe-dial__face"
          :style="{ transform: `rotate(${wheelRotation}deg)` }"
          aria-hidden="true"
        >
          <span
            v-for="number in dialNumbers"
            :key="number"
            class="safe-dial__number"
            :style="{ '--dial-number-angle': `${number * DIAL_STEP}deg` }"
          >
            {{ number }}
          </span>
        </div>
        <div class="safe-dial__tumblers" aria-hidden="true">
          <i
            v-for="(_, index) in combination"
            :key="index"
            :class="{
              'is-active': index === activeIndex,
              'is-solved': index < activeIndex,
            }"
            :style="{
              transform: `rotate(${-positions[index] * DIAL_STEP}deg)`,
            }"
          />
        </div>
        <div class="safe-dial__hub">
          <Check
            v-if="confirmedIndex !== null"
            class="safe-dial__confirmed-icon"
            aria-hidden="true"
          />
          <span v-else>{{ currentValue }}</span>
          <small>{{ copy.dial }}</small>
        </div>
      </section>

      <section class="safe-monitor" :aria-label="copy.monitorLabel">
        <header class="safe-monitor__header">
          <div class="combination-slots" :aria-label="copy.progressLabel">
            <span
              v-for="(_, index) in combination"
              :key="index"
              data-testid="safe-combination-slot"
              :class="{
                'is-active': index === activeIndex,
                'is-confirmed': index === confirmedIndex,
                'is-solved': index < activeIndex || phase === 'open',
              }"
            >
              {{
                index < activeIndex || phase === 'open'
                  ? combination[index]
                  : index === activeIndex
                  ? positions[index]
                  : ''
              }}
            </span>
          </div>
          <p aria-live="polite">{{ instruction }}</p>
        </header>

        <div class="signal-chart" aria-hidden="true">
          <svg viewBox="0 0 300 104" preserveAspectRatio="none">
            <g class="signal-chart__grid">
              <path d="M0 20H300M0 40H300M0 60H300M0 80H300" />
              <path d="M50 0V104M100 0V104M150 0V104M200 0V104M250 0V104" />
            </g>
            <polyline class="signal-chart__base" :points="baseSignalPoints" />
            <polyline class="signal-chart__trace" :points="signalPoints" />
            <line
              class="signal-chart__cursor"
              :x1="signalCursorX"
              :x2="signalCursorX"
              y1="0"
              y2="104"
            />
          </svg>
          <div class="signal-chart__scale">
            <span>7.0</span><span>5.0</span><span>3.0</span><span>1.0</span>
          </div>
          <small>dB</small>
        </div>

        <footer class="safe-monitor__footer">
          <span data-testid="safe-current-value"
            >{{ copy.current }}
            {{ currentValue.toString().padStart(2, '0') }}</span
          >
          <span>{{ copy.signal }} {{ Math.round(signalStrength * 100) }}%</span>
          <span>{{ dateKey }}</span>
        </footer>
      </section>

      <div class="safe-controls" :aria-label="copy.controlsLabel">
        <button
          type="button"
          class="safe-controls__rotate"
          :aria-label="copy.counterClockwise"
          @pointerdown="startPointerRotation(-1)"
          @pointerup="stopPointerRotation"
          @pointercancel="stopPointerRotation"
          @pointerleave="stopPointerRotation"
        >
          <ArrowLeftBold aria-hidden="true" />
        </button>
        <button
          v-if="phase === 'open'"
          type="button"
          class="safe-controls__reset"
          :aria-label="copy.retry"
          @click="resetGame"
        >
          <RefreshRight aria-hidden="true" />
        </button>
        <button
          type="button"
          class="safe-controls__rotate"
          :aria-label="copy.clockwise"
          @pointerdown="startPointerRotation(1)"
          @pointerup="stopPointerRotation"
          @pointercancel="stopPointerRotation"
          @pointerleave="stopPointerRotation"
        >
          <ArrowRightBold aria-hidden="true" />
        </button>
      </div>

      <Transition name="safe-open">
        <div v-if="phase === 'open'" class="safe-open-message" role="status">
          <strong>{{ copy.open }}</strong>
          <span>{{ combination.map(formatNumber).join(' · ') }}</span>
        </div>
      </Transition>
    </div>
  </GameStage>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeftBold,
  ArrowRightBold,
  Check,
  RefreshRight,
} from '@element-plus/icons-vue'

import safeBoxScene from '@/assets/img/games/sleeping-dogs/safe-box-scene.png'
import GameStage from '@/components/GameStage/index.vue'
import { getLocalDateKey } from '@/utils/dailyBullsAndCows'
import {
  getDailySafeCombination,
  getSafeDialDistance,
  SAFE_BOX_COMBINATION_LENGTH,
  SAFE_BOX_DIAL_SIZE,
} from '@/utils/dailySafeBox'

type Direction = -1 | 1
type GamePhase = 'cracking' | 'open'

interface SavedSafeState {
  activeIndex: number
  positions: number[]
}

const DIAL_STEP = 360 / SAFE_BOX_DIAL_SIZE
const GAMEPAD_DEAD_ZONE = 0.56
const GAMEPAD_STEP_INTERVAL = 82
const POINTER_STEP_INTERVAL = 96
const STORAGE_PREFIX = 'anutrium:daily-safe-box:'
const dialNumbers = Array.from(
  { length: SAFE_BOX_DIAL_SIZE },
  (_, index) => index
)
const requiredDirections: Direction[] = [-1, 1, -1]

const { locale } = useI18n()
const dateKey = ref('--------')
const combination = ref<number[]>([])
const positions = ref<number[]>(
  Array.from({ length: SAFE_BOX_COMBINATION_LENGTH }, () => 0)
)
const activeIndex = ref(0)
const phase = ref<GamePhase>('cracking')
const directionWarning = ref(false)
const confirmedIndex = ref<number | null>(null)
let warningTimer: number | null = null
let confirmationTimer: number | null = null
let pointerTimer: number | null = null
let gamepadFrame: number | null = null
let lastGamepadStep = 0

const copy = computed(() => {
  if (locale.value === 'en') {
    return {
      clockwise: 'CLOCKWISE',
      controlsLabel: 'Safe dial controls',
      counterClockwise: 'COUNTER-CLOCKWISE',
      current: 'DIAL',
      dial: 'LOCK',
      gameLabel: 'Sleeping Dogs safety box game',
      numberConfirmed: 'NUMBER CONFIRMED',
      monitorLabel: 'Lock signal monitor',
      open: 'SAFETY BOX OPEN',
      progressLabel: 'Solved combination numbers',
      retry: 'REPLAY',
      signal: 'SIGNAL',
      turn: (direction: string) => `TURN THE LOCK ${direction}`,
      wrongDirection: 'REVERSE DIRECTION',
    }
  }

  return {
    clockwise: '顺时针',
    controlsLabel: '保险箱旋钮控制',
    counterClockwise: '逆时针',
    current: '刻度',
    dial: '旋钮',
    gameLabel: '热血无赖开保险箱游戏',
    numberConfirmed: '数字确认',
    monitorLabel: '锁具信号监视器',
    open: '保险箱已打开',
    progressLabel: '已破解的密码数字',
    retry: '再玩一次',
    signal: '信号',
    turn: (direction: string) => `请${direction}旋转锁具`,
    wrongDirection: '请反向旋转',
  }
})

const currentValue = computed(() => {
  const index = Math.min(activeIndex.value, SAFE_BOX_COMBINATION_LENGTH - 1)
  return positions.value[index] ?? 0
})

const currentTarget = computed(
  () => combination.value[activeIndex.value] ?? currentValue.value
)

const requiredDirection = computed(
  () => requiredDirections[activeIndex.value] ?? 1
)

const wheelRotation = computed(() => -currentValue.value * DIAL_STEP)

const signalStrength = computed(() => {
  if (phase.value === 'open') return 1
  const distance = getSafeDialDistance(currentValue.value, currentTarget.value)
  return Math.max(0.08, 1 - distance / (SAFE_BOX_DIAL_SIZE / 2))
})

const signalCursorX = computed(
  () => (currentValue.value / (SAFE_BOX_DIAL_SIZE - 1)) * 300
)

const signalPoints = computed(() =>
  dialNumbers
    .map((number) => {
      const distance = getSafeDialDistance(number, currentTarget.value)
      const strength = Math.max(0.08, 1 - distance / 6.8)
      const noise = Math.sin((number + activeIndex.value * 7) * 2.17) * 11
      const y = Math.max(5, Math.min(99, 94 - strength * 82 + noise))
      return `${(number / (SAFE_BOX_DIAL_SIZE - 1)) * 300},${y}`
    })
    .join(' ')
)

const baseSignalPoints = computed(() =>
  dialNumbers
    .map((number) => {
      const y = 92 + Math.sin((number + activeIndex.value) * 1.79) * 4
      return `${(number / (SAFE_BOX_DIAL_SIZE - 1)) * 300},${y}`
    })
    .join(' ')
)

const instruction = computed(() => {
  if (phase.value === 'open') return copy.value.open
  if (confirmedIndex.value !== null) return copy.value.numberConfirmed
  if (directionWarning.value) return copy.value.wrongDirection
  return copy.value.turn(
    requiredDirection.value === 1
      ? copy.value.clockwise
      : copy.value.counterClockwise
  )
})

const activeDialLabel = computed(() =>
  locale.value === 'en'
    ? `Tumbler ${Math.min(activeIndex.value + 1, 3)}, current number ${
        currentValue.value
      }`
    : `第 ${Math.min(activeIndex.value + 1, 3)} 个旋钮，当前数字 ${
        currentValue.value
      }`
)

const formatNumber = (value: number) => value.toString().padStart(2, '0')

const isValidSavedState = (value: unknown): value is SavedSafeState => {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<SavedSafeState>

  return (
    Number.isInteger(state.activeIndex) &&
    Number(state.activeIndex) >= 0 &&
    Number(state.activeIndex) <= SAFE_BOX_COMBINATION_LENGTH &&
    Array.isArray(state.positions) &&
    state.positions.length === SAFE_BOX_COMBINATION_LENGTH &&
    state.positions.every(
      (position) =>
        Number.isInteger(position) &&
        position >= 0 &&
        position < SAFE_BOX_DIAL_SIZE
    )
  )
}

const persistGame = () => {
  window.localStorage.setItem(
    `${STORAGE_PREFIX}${dateKey.value}`,
    JSON.stringify({
      activeIndex: activeIndex.value,
      positions: positions.value,
    } as SavedSafeState)
  )
}

const restoreGame = () => {
  const storageKey = `${STORAGE_PREFIX}${dateKey.value}`
  const saved = window.localStorage.getItem(storageKey)
  if (!saved) return

  try {
    const state = JSON.parse(saved) as unknown
    if (!isValidSavedState(state)) throw new Error('Invalid safe box state')
    positions.value = [...state.positions]
    activeIndex.value = state.activeIndex
    phase.value =
      activeIndex.value >= SAFE_BOX_COMBINATION_LENGTH ? 'open' : 'cracking'
  } catch {
    window.localStorage.removeItem(storageKey)
  }
}

const showDirectionWarning = () => {
  directionWarning.value = true
  if (warningTimer !== null) window.clearTimeout(warningTimer)
  warningTimer = window.setTimeout(() => {
    directionWarning.value = false
    warningTimer = null
  }, 560)
}

const advanceToNextTumbler = () => {
  activeIndex.value += 1
  confirmedIndex.value = null
  directionWarning.value = false

  if (activeIndex.value >= SAFE_BOX_COMBINATION_LENGTH) {
    phase.value = 'open'
    stopPointerRotation()
  } else {
    positions.value[activeIndex.value] = positions.value[activeIndex.value - 1]
  }

  persistGame()
}

const confirmCurrentTumbler = () => {
  if (confirmedIndex.value !== null) return

  confirmedIndex.value = activeIndex.value
  directionWarning.value = false
  navigator.vibrate?.(70)
  persistGame()

  confirmationTimer = window.setTimeout(() => {
    advanceToNextTumbler()
    confirmationTimer = null
  }, 520)
}

const rotateDial = (direction: Direction) => {
  if (
    phase.value === 'open' ||
    combination.value.length === 0 ||
    confirmedIndex.value !== null
  ) {
    return
  }

  const index = activeIndex.value
  if (direction !== requiredDirection.value) {
    showDirectionWarning()
    return
  }

  positions.value[index] =
    (positions.value[index] + direction + SAFE_BOX_DIAL_SIZE) %
    SAFE_BOX_DIAL_SIZE
  directionWarning.value = false
  if (positions.value[index] === combination.value[index]) {
    confirmCurrentTumbler()
    return
  }

  persistGame()
}

const directionFromKey = (key: string): Direction | null => {
  if (key === 'd' || key === 'D' || key === 'ArrowRight') return 1
  if (key === 'a' || key === 'A' || key === 'ArrowLeft') return -1
  return null
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const direction = directionFromKey(event.key)
  if (direction === null) return

  event.preventDefault()
  rotateDial(direction)
}

const stopPointerRotation = () => {
  if (pointerTimer === null) return
  window.clearInterval(pointerTimer)
  pointerTimer = null
}

const startPointerRotation = (direction: Direction) => {
  stopPointerRotation()
  rotateDial(direction)
  pointerTimer = window.setInterval(
    () => rotateDial(direction),
    POINTER_STEP_INTERVAL
  )
}

const pollGamepad = (timestamp: number) => {
  const gamepads = navigator.getGamepads?.() ?? []
  const activeGamepad = Array.from(gamepads).find(Boolean)
  const rightStickX = activeGamepad?.axes[2] ?? 0

  if (
    Math.abs(rightStickX) >= GAMEPAD_DEAD_ZONE &&
    timestamp - lastGamepadStep >= GAMEPAD_STEP_INTERVAL
  ) {
    rotateDial(rightStickX > 0 ? 1 : -1)
    lastGamepadStep = timestamp
  }

  gamepadFrame = window.requestAnimationFrame(pollGamepad)
}

const resetGame = () => {
  activeIndex.value = 0
  positions.value = Array.from({ length: SAFE_BOX_COMBINATION_LENGTH }, () => 0)
  phase.value = 'cracking'
  directionWarning.value = false
  confirmedIndex.value = null
  if (confirmationTimer !== null) {
    window.clearTimeout(confirmationTimer)
    confirmationTimer = null
  }
  persistGame()
}

onMounted(() => {
  const today = new Date()
  dateKey.value = getLocalDateKey(today)
  combination.value = getDailySafeCombination(today)
  restoreGame()
  window.addEventListener('keydown', handleKeydown)
  gamepadFrame = window.requestAnimationFrame(pollGamepad)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  stopPointerRotation()
  if (warningTimer !== null) window.clearTimeout(warningTimer)
  if (confirmationTimer !== null) window.clearTimeout(confirmationTimer)
  if (gamepadFrame !== null) window.cancelAnimationFrame(gamepadFrame)
})
</script>

<style lang="less" scoped src="./index.less" />
