<template>
  <div class="xiangqi-game" :aria-label="copy.gameLabel">
    <Transition
      name="xiangqi-screen"
      mode="out-in"
      @after-enter="handleScreenEntered"
    >
      <section v-if="!gameMode" key="menu" class="xiangqi-menu">
        <svg
          v-if="menuStep !== 'changelog'"
          class="xiangqi-menu__board-background"
          viewBox="0 0 800 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="796" height="896" />
          <path
            d="M0 100H800M0 200H800M0 300H800M0 400H800M0 500H800M0 600H800M0 700H800M0 800H800"
          />
          <path
            d="M100 0V400M200 0V400M300 0V400M400 0V400M500 0V400M600 0V400M700 0V400"
          />
          <path
            d="M100 500V900M200 500V900M300 500V900M400 500V900M500 500V900M600 500V900M700 500V900"
          />
          <path
            d="M300 0L500 200M500 0L300 200M300 700L500 900M500 700L300 900"
          />
        </svg>

        <button
          v-if="menuStep !== 'changelog'"
          type="button"
          class="xiangqi-piece-button xiangqi-menu__changelog"
          @click="menuStep = 'changelog'"
        >
          <span>{{ copy.changelogLine1 }}</span>
          <span>{{ copy.changelogLine2 }}</span>
        </button>

        <div
          class="xiangqi-menu__card"
          :class="`xiangqi-menu__card--${menuStep}`"
        >
          <header v-if="menuStep !== 'changelog'" class="xiangqi-menu__brand">
            <img
              :src="gameIcon"
              alt=""
              width="128"
              height="128"
              loading="eager"
              decoding="async"
            />
            <h1>{{ copy.gameName }}</h1>
          </header>

          <Transition name="xiangqi-menu-screen" mode="out-in">
            <div :key="menuStep" class="xiangqi-menu__screen">
              <template v-if="menuStep === 'mode'">
                <h2>{{ copy.selectMode }}</h2>
                <div class="xiangqi-menu__buttons">
                  <button
                    type="button"
                    class="xiangqi-piece-button"
                    @click="menuStep = 'difficulty'"
                  >
                    <span>{{ copy.aiLine1 }}</span>
                    <span>{{ copy.aiLine2 }}</span>
                  </button>
                  <button
                    type="button"
                    class="xiangqi-piece-button"
                    @click="startLocalGame"
                  >
                    <span>{{ copy.localLine1 }}</span>
                    <span>{{ copy.localLine2 }}</span>
                  </button>
                </div>
              </template>

              <template v-else-if="menuStep === 'difficulty'">
                <h2>{{ copy.selectDifficulty }}</h2>
                <div
                  class="xiangqi-menu__buttons xiangqi-menu__buttons--difficulty"
                >
                  <div
                    v-for="difficulty in difficulties"
                    :key="difficulty.depth"
                    class="xiangqi-menu__difficulty-row"
                  >
                    <button
                      type="button"
                      class="xiangqi-piece-button xiangqi-menu__difficulty"
                      :class="{
                        'xiangqi-piece-button--cleared':
                          victoryRecords[difficulty.depth],
                      }"
                      @click="startAiGame(difficulty.depth)"
                    >
                      <span>{{ difficulty.label }}</span>
                    </button>
                    <small v-if="victoryRecords[difficulty.depth]">
                      {{ copy.checkmateTime }}：{{
                        formatVictoryTime(victoryRecords[difficulty.depth])
                      }}
                    </small>
                  </div>
                  <button
                    type="button"
                    class="xiangqi-piece-button xiangqi-piece-button--back xiangqi-menu__back"
                    @click="menuStep = 'mode'"
                  >
                    <span>{{ copy.back }}</span>
                  </button>
                </div>
              </template>

              <section v-else class="xiangqi-menu__updates">
                <h2>{{ copy.changelogTitle }}</h2>
                <div class="xiangqi-menu__updates-list" data-game-scrollable>
                  <article
                    v-for="entry in changelogEntries"
                    :key="entry.version"
                  >
                    <header>
                      <strong>{{ entry.version }}</strong>
                      <time>{{ entry.date }}</time>
                    </header>
                    <p>{{ entry.description }}</p>
                  </article>
                </div>
                <button
                  type="button"
                  class="xiangqi-piece-button xiangqi-piece-button--back xiangqi-menu__back"
                  @click="menuStep = 'mode'"
                >
                  <span>{{ copy.back }}</span>
                </button>
              </section>
            </div>
          </Transition>
        </div>
      </section>

      <div
        v-else
        key="match"
        class="xiangqi-match"
        :class="{ 'xiangqi-match--rotated': isBoardRotated }"
      >
        <div class="xiangqi-board-area">
          <div
            v-if="capturedSummary.count"
            ref="captureStackElement"
            class="xiangqi-captured-racks"
            :aria-label="`${copy.capturedCount} ${capturedSummary.count}`"
          >
            <div
              v-for="group in capturedSummary.groups"
              :key="group.captor"
              class="xiangqi-captured"
              :class="`xiangqi-captured--${group.captor}`"
            >
              <strong>{{ group.pieces.length }}</strong>
              <div class="xiangqi-captured__columns">
                <div
                  v-for="(column, columnIndex) in group.columns"
                  :key="columnIndex"
                  class="xiangqi-captured__column"
                  :style="captureColumnStyle(column.length)"
                >
                  <span
                    v-for="piece in column"
                    :key="piece.historyIndex"
                    class="xiangqi-captured__piece"
                    :class="[
                      `xiangqi-captured__piece--${piece.color}`,
                      {
                        'xiangqi-captured__piece--latest':
                          piece.historyIndex === group.latestHistoryIndex,
                      },
                    ]"
                    :data-capture-index="piece.historyIndex"
                    :style="capturePieceStyle(piece.level)"
                  >
                    <span
                      v-if="piece.historyIndex === group.latestHistoryIndex"
                    >
                      {{ pieceName(piece) }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            class="xiangqi-turn-marker"
            :class="[
              `xiangqi-turn-marker--${currentTurn}`,
              { 'xiangqi-turn-marker--rotated': isBoardRotated },
            ]"
            data-testid="xiangqi-status"
          >
            <span aria-hidden="true">{{
              currentTurn === 'r' ? '帥' : '將'
            }}</span>
            <strong>{{ statusText }}</strong>
          </div>

          <div
            class="xiangqi-board-shell"
            :class="{
              'xiangqi-board-shell--opening': isOpeningPlacement,
              'xiangqi-board-shell--rotated': isBoardRotated,
            }"
          >
            <div
              ref="boardElement"
              class="xiangqi-board"
              role="grid"
              :aria-label="copy.boardLabel"
            >
              <svg
                class="xiangqi-board__lines"
                viewBox="0 0 800 900"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="796" height="896" />
                <path
                  d="M0 100H800M0 200H800M0 300H800M0 400H800M0 500H800M0 600H800M0 700H800M0 800H800"
                />
                <path
                  d="M100 0V400M200 0V400M300 0V400M400 0V400M500 0V400M600 0V400M700 0V400"
                />
                <path
                  d="M100 500V900M200 500V900M300 500V900M400 500V900M500 500V900M600 500V900M700 500V900"
                />
                <path
                  d="M300 0L500 200M500 0L300 200M300 700L500 900M500 700L300 900"
                />
                <g class="xiangqi-board__markers">
                  <g
                    v-for="marker in boardMarkers"
                    :key="`${marker.column}-${marker.row}`"
                    :transform="`translate(${marker.column * 100} ${
                      marker.row * 100
                    })`"
                  >
                    <path
                      v-if="marker.column > 0"
                      d="M-22-8H-8V-22M-22 8H-8V22"
                    />
                    <path v-if="marker.column < 8" d="M22-8H8V-22M22 8H8V22" />
                  </g>
                </g>
              </svg>

              <div class="xiangqi-board__river" aria-hidden="true">
                <span>楚河</span>
                <span>汉界</span>
              </div>

              <button
                v-for="cell in cells"
                :key="cell.square"
                type="button"
                class="xiangqi-square"
                :class="{
                  'xiangqi-square--selected': selectedSquare === cell.square,
                  'xiangqi-square--target': legalMovesByTarget.has(cell.square),
                  'xiangqi-square--capture': Boolean(
                    legalMovesByTarget.get(cell.square)?.captured
                  ),
                }"
                :style="{
                  left: `${(cell.column / 8) * 100}%`,
                  top: `${(cell.row / 9) * 100}%`,
                }"
                role="gridcell"
                :aria-label="squareLabel(cell)"
                :data-square="cell.square"
                @click="selectSquare(cell.square)"
              >
                <span
                  v-if="cell.piece"
                  class="xiangqi-piece"
                  :class="[
                    `xiangqi-piece--${cell.piece.color}`,
                    {
                      'xiangqi-piece--draggable':
                        isHumanControlled(cell.piece.color) &&
                        currentTurn === cell.piece.color &&
                        !isAiThinking,
                      'xiangqi-piece--dragging': draggingSquare === cell.square,
                      'xiangqi-piece--highlighted':
                        highlightedSquares[cell.piece.color] === cell.square,
                      'xiangqi-piece--opening': isOpeningPlacement,
                    },
                  ]"
                  :style="pieceOpeningStyle(cell.square)"
                  :draggable="false"
                  @click.stop.prevent
                  @pointerdown.stop.prevent="startPieceDrag($event, cell)"
                  @pointermove.stop.prevent="movePieceDrag"
                  @pointerup.stop.prevent="finishPieceDrag"
                  @pointercancel.stop.prevent="cancelPieceDrag"
                >
                  <span class="xiangqi-piece__label">
                    {{ pieceName(cell.piece) }}
                  </span>
                </span>
              </button>
            </div>

            <div
              v-if="turnAnnouncement"
              class="xiangqi-turn-announcement"
              :class="`xiangqi-turn-announcement--${turnAnnouncement}`"
              role="status"
            >
              {{ turnAnnouncementText }}
            </div>
          </div>

          <p v-if="gameMode === 'ai'" class="xiangqi-game__model">
            {{ aiModelText }}
          </p>
        </div>

        <aside
          class="xiangqi-game__side"
          aria-live="polite"
          :aria-busy="isAiThinking"
        >
          <section class="xiangqi-side-card xiangqi-history">
            <h2>{{ copy.history }}</h2>
            <div
              v-if="historyEntries.length"
              ref="historyList"
              class="xiangqi-history__list"
              data-game-scrollable
            >
              <TransitionGroup
                name="xiangqi-history-item"
                tag="div"
                class="xiangqi-history__track"
              >
                <template v-for="entry in historyEntries" :key="entry.key">
                  <p
                    v-if="entry.type === 'move'"
                    :class="`xiangqi-history__item--${entry.move.color}`"
                  >
                    {{ historyLabel(entry.move) }}
                  </p>
                  <p
                    v-else
                    class="xiangqi-history__item--result"
                    :class="
                      entry.color
                        ? `xiangqi-history__item--${entry.color}`
                        : undefined
                    "
                  >
                    {{ entry.label }}
                  </p>
                </template>
              </TransitionGroup>
            </div>
            <p v-else class="xiangqi-history__empty">{{ copy.historyEmpty }}</p>
          </section>

          <section class="xiangqi-side-card xiangqi-current">
            <div class="xiangqi-game__actions">
              <button
                type="button"
                class="xiangqi-piece-button"
                :disabled="!canUndo"
                @click="undoMove"
              >
                <span>{{ copy.undo }}</span>
              </button>
              <button
                v-if="gameMode === 'local'"
                type="button"
                class="xiangqi-piece-button"
                @click="isBoardRotated = !isBoardRotated"
              >
                <span>{{ copy.rotate }}</span>
              </button>
              <button
                type="button"
                class="xiangqi-piece-button"
                :disabled="isGameFinished"
                @click="requestConfirmation('resign')"
              >
                <span>{{ copy.resign }}</span>
              </button>
              <button
                type="button"
                class="xiangqi-piece-button xiangqi-piece-button--back"
                @click="requestConfirmation('return')"
              >
                <span>{{ copy.back }}</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </Transition>

    <XiangqiConfirmDialog
      v-if="pendingConfirmation"
      :message="confirmationMessage"
      @cancel="pendingConfirmation = null"
    >
      <template #actions>
        <button
          type="button"
          class="xiangqi-piece-button xiangqi-piece-button--back"
          @click="pendingConfirmation = null"
        >
          <span>{{ copy.confirmCancel }}</span>
        </button>
        <button
          type="button"
          class="xiangqi-piece-button"
          @click="confirmPendingAction"
        >
          <span>{{ copy.confirmAccept }}</span>
        </button>
      </template>
    </XiangqiConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { XiangqiColor, XiangqiPiece, XiangqiPieceType } from 'xiangqi.js'

import {
  useXiangqiGame,
  type XiangqiBoardCell,
  type XiangqiHistoryMove,
} from './useXiangqiGame'
import {
  BOARD_MARKERS,
  getXiangqiChangelog,
  getXiangqiCopy,
  getXiangqiDifficulties,
  isTerminalStatus,
  PIECE_NAMES,
  type XiangqiAiDepth,
} from './xiangqiConfig'
import XiangqiConfirmDialog from './XiangqiConfirmDialog.vue'

defineProps<{ gameIcon: string }>()

const { locale } = useI18n()
const {
  beginPlayerDrag,
  aiDepth,
  canUndo,
  cancelPlayerDrag,
  cells,
  currentTurn,
  dropPlayerPiece,
  gameMode,
  isAiThinking,
  isHumanControlled,
  lastAiMove,
  leaveGame,
  legalMovesByTarget,
  moveHistory,
  resignedColor,
  resignGame,
  selectedSquare,
  selectSquare,
  status,
  startGame,
  undoMove,
} = useXiangqiGame()
const boardElement = ref<HTMLElement | null>(null)
const captureStackElement = ref<HTMLElement | null>(null)
const historyList = ref<HTMLElement | null>(null)
const draggingSquare = ref<string | null>(null)
const isBoardRotated = ref(false)
const isOpeningPlacement = ref(false)
const menuStep = ref<'changelog' | 'difficulty' | 'mode'>('mode')
const pendingConfirmation = ref<'resign' | 'return' | null>(null)
const turnAnnouncement = ref<XiangqiColor | null>(null)
const victoryRecords = ref<Record<number, string>>({})
const VICTORY_STORAGE_KEY = 'xiangqi-ai-victories-v1'
const PIECE_PLACEMENT_DURATION_MS = 190
const PIECE_PLACEMENT_STAGGER_MS = 45
let openingPlacementPending = false
let openingPlacementTimer: ReturnType<typeof setTimeout> | null = null
let turnAnnouncementTimer: ReturnType<typeof setTimeout> | null = null

const boardMarkers = BOARD_MARKERS

interface DragState {
  element: HTMLElement
  from: string
  pointerId: number
  startX: number
  startY: number
}

interface CapturedPiece {
  color: XiangqiColor
  historyIndex: number
  level: number
  type: XiangqiPieceType
}

type HistoryEntry =
  | {
      key: string
      move: XiangqiHistoryMove
      type: 'move'
    }
  | {
      color?: XiangqiColor
      key: string
      label: string
      type: 'result'
    }

let dragState: DragState | null = null
let pieceOpeningOrder = new Map<string, number>()

const copy = computed(() => getXiangqiCopy(locale.value))
const difficulties = computed(() => getXiangqiDifficulties(copy.value))
const aiModelText = computed(() =>
  locale.value === 'en'
    ? [copy.value.aiModelPrefix, aiDepth.value].join(' ')
    : copy.value.aiModelPrefix + aiDepth.value
)
const turnAnnouncementText = computed(() =>
  turnAnnouncement.value === 'r' ? copy.value.redTurn : copy.value.blackTurn
)
const confirmationMessage = computed(() =>
  pendingConfirmation.value === 'resign'
    ? copy.value.resignMessage
    : copy.value.returnMessage
)
const isGameFinished = computed(() => isTerminalStatus(status.value))
const changelogEntries = computed(() => getXiangqiChangelog(copy.value))

const clearOpeningPlacement = () => {
  if (openingPlacementTimer) clearTimeout(openingPlacementTimer)
  openingPlacementTimer = null
  openingPlacementPending = false
  isOpeningPlacement.value = false
}

const queueOpeningPlacement = () => {
  clearOpeningPlacement()
  const nextOrder = new Map<string, number>()
  for (const cell of cells.value) {
    if (cell.piece) nextOrder.set(cell.square, nextOrder.size)
  }
  pieceOpeningOrder = nextOrder
  openingPlacementPending = true
  turnAnnouncement.value = null
}

const handleScreenEntered = () => {
  if (!gameMode.value || !openingPlacementPending) return

  openingPlacementPending = false
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  if (reduceMotion) {
    showTurnAnnouncement()
    return
  }

  isOpeningPlacement.value = true
  const pieceCount = pieceOpeningOrder.size
  const sequenceDuration =
    Math.max(0, pieceCount - 1) * PIECE_PLACEMENT_STAGGER_MS +
    PIECE_PLACEMENT_DURATION_MS

  openingPlacementTimer = setTimeout(() => {
    openingPlacementTimer = null
    isOpeningPlacement.value = false
    showTurnAnnouncement()
  }, sequenceDuration)
}

const pieceOpeningStyle = (square: string) => ({
  '--xiangqi-piece-order': pieceOpeningOrder.get(square) ?? 0,
})

const startAiGame = (depth: XiangqiAiDepth) => {
  isBoardRotated.value = false
  startGame('ai', depth)
  queueOpeningPlacement()
}

const startLocalGame = () => {
  isBoardRotated.value = false
  startGame('local')
  queueOpeningPlacement()
}

const requestConfirmation = (action: 'resign' | 'return') => {
  pendingConfirmation.value = action
}

const returnToSelection = () => {
  const previousMode = gameMode.value
  clearOpeningPlacement()
  if (turnAnnouncementTimer) clearTimeout(turnAnnouncementTimer)
  turnAnnouncementTimer = null
  turnAnnouncement.value = null
  leaveGame()
  isBoardRotated.value = false
  menuStep.value = previousMode === 'ai' ? 'difficulty' : 'mode'
}

const confirmPendingAction = () => {
  const action = pendingConfirmation.value
  pendingConfirmation.value = null

  if (action === 'return') {
    returnToSelection()
    return
  }

  if (action === 'resign') {
    if (turnAnnouncementTimer) clearTimeout(turnAnnouncementTimer)
    turnAnnouncementTimer = null
    turnAnnouncement.value = null
    resignGame()
  }
}

const formatVictoryTime = (timestamp: string) => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp

  const twoDigits = (value: number) => String(value).padStart(2, '0')
  const datePart = [
    date.getFullYear(),
    twoDigits(date.getMonth() + 1),
    twoDigits(date.getDate()),
  ].join('-')
  const timePart = [
    twoDigits(date.getHours()),
    twoDigits(date.getMinutes()),
    twoDigits(date.getSeconds()),
  ].join(':')
  return [datePart, timePart].join(' ')
}

const statusText = computed(() => copy.value[status.value])
const historyEntries = computed<HistoryEntry[]>(() => {
  const entries: HistoryEntry[] = []
  for (let index = moveHistory.value.length - 1; index >= 0; index -= 1) {
    entries.push({
      key: `move-${index}`,
      move: moveHistory.value[index],
      type: 'move' as const,
    })
  }

  if (!isGameFinished.value) return entries

  const winner =
    status.value === 'redWins'
      ? ('r' as const)
      : status.value === 'blackWins'
      ? ('b' as const)
      : undefined
  const result = resignedColor.value
    ? `${
        resignedColor.value === 'r' ? copy.value.redSide : copy.value.blackSide
      } · ${copy.value.historyResigned} · ${copy.value[status.value]}`
    : `${copy.value.historyGameOver} · ${copy.value[status.value]}`

  entries.unshift({
    color: winner,
    key: `result-${status.value}-${resignedColor.value ?? 'natural'}`,
    label: result,
    type: 'result',
  })
  return entries
})
const capturedSummary = computed(() => {
  const piecesByCaptor: Record<XiangqiColor, CapturedPiece[]> = { b: [], r: [] }
  const counts: Record<XiangqiColor, number> = { b: 0, r: 0 }

  moveHistory.value.forEach((move, historyIndex) => {
    if (!move.captured) return
    piecesByCaptor[move.color].push({
      color: move.color === 'r' ? 'b' : 'r',
      historyIndex,
      level: counts[move.color] % 10,
      type: move.captured,
    })
    counts[move.color] += 1
  })

  const groups = (['b', 'r'] as const).flatMap((captor) => {
    const pieces = piecesByCaptor[captor]
    if (pieces.length === 0) return []

    const columns: CapturedPiece[][] = []
    pieces.forEach((piece, index) => {
      const columnIndex = Math.floor(index / 10)
      if (!columns[columnIndex]) columns[columnIndex] = []
      columns[columnIndex].push(piece)
    })

    return [
      {
        captor,
        columns,
        latestHistoryIndex: pieces[pieces.length - 1].historyIndex,
        pieces,
      },
    ]
  })

  return { count: counts.b + counts.r, groups }
})
const highlightedSquares = computed<Partial<Record<XiangqiColor, string>>>(
  () => {
    const squares: Partial<Record<XiangqiColor, string>> = {}

    for (let index = moveHistory.value.length - 1; index >= 0; index -= 1) {
      const move = moveHistory.value[index]
      if (!squares[move.color]) squares[move.color] = move.to
      if (squares.b && squares.r) break
    }
    if (selectedSquare.value) squares[currentTurn.value] = selectedSquare.value

    return squares
  }
)

const pieceName = (
  piece: Pick<XiangqiPiece, 'color' | 'type'> | CapturedPiece
) => PIECE_NAMES[piece.color][piece.type]

const captureColumnStyle = (pieceCount: number) => ({
  height: `${4.8 + Math.max(0, pieceCount - 1) * 0.72}cqh`,
})

const capturePieceStyle = (level: number) => ({
  '--xiangqi-capture-level': level,
})

const historyLabel = (move: XiangqiHistoryMove) => {
  const side = move.color === 'r' ? copy.value.redSide : copy.value.blackSide
  return `${side} · ${
    PIECE_NAMES[move.color][move.piece]
  }  ${move.from.toUpperCase()} — ${move.to.toUpperCase()}`
}

const squareLabel = (cell: XiangqiBoardCell) =>
  cell.piece
    ? `${pieceName(cell.piece)}，${cell.square}`
    : `${copy.value.empty}，${cell.square}`

const resetDraggedPiece = (element: HTMLElement) => {
  element.style.removeProperty('transform')
  element.style.removeProperty('will-change')
}

const startPieceDrag = (event: PointerEvent, cell: XiangqiBoardCell) => {
  if (!beginPlayerDrag(cell.square)) return

  const element = event.currentTarget as HTMLElement
  element.setPointerCapture(event.pointerId)
  draggingSquare.value = cell.square
  dragState = {
    element,
    from: cell.square,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
  }
}

const movePieceDrag = (event: PointerEvent) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return

  const deltaX = event.clientX - dragState.startX
  const deltaY = event.clientY - dragState.startY
  dragState.element.style.willChange = 'transform'
  dragState.element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`
}

const squareAtPointer = (clientX: number, clientY: number) => {
  const boardRect = boardElement.value?.getBoundingClientRect()
  if (!boardRect) return null
  const edgeTolerance = Math.max(
    12,
    Math.min(boardRect.width / 8, boardRect.height / 9) * 0.7
  )
  if (
    clientX < boardRect.left - edgeTolerance ||
    clientX > boardRect.right + edgeTolerance ||
    clientY < boardRect.top - edgeTolerance ||
    clientY > boardRect.bottom + edgeTolerance
  )
    return null

  let nearestSquare: string | null = null
  let nearestDistance = Infinity

  // 只测量合法落点，避免每次松手强制读取全部 90 个交叉点的布局。
  boardElement.value
    ?.querySelectorAll<HTMLElement>('.xiangqi-square--target')
    .forEach((square) => {
      const rect = square.getBoundingClientRect()
      const distance = Math.hypot(
        clientX - (rect.left + rect.width / 2),
        clientY - (rect.top + rect.height / 2)
      )
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestSquare = square.dataset.square ?? null
      }
    })

  const intersectionSpacing = Math.min(
    boardRect.width / 8,
    boardRect.height / 9
  )
  return nearestDistance <= intersectionSpacing * 0.8 ? nearestSquare : null
}

const finishPieceDrag = (event: PointerEvent) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return

  const { element, from, pointerId } = dragState
  const target = squareAtPointer(event.clientX, event.clientY)
  element.releasePointerCapture(pointerId)
  resetDraggedPiece(element)
  dragState = null
  draggingSquare.value = null

  if (target) dropPlayerPiece(from, target)
  else cancelPlayerDrag()
}

const cancelPieceDrag = (event: PointerEvent) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return

  resetDraggedPiece(dragState.element)
  dragState = null
  draggingSquare.value = null
  cancelPlayerDrag()
}

const showTurnAnnouncement = () => {
  if (isTerminalStatus(status.value)) return

  if (turnAnnouncementTimer) clearTimeout(turnAnnouncementTimer)
  turnAnnouncement.value = currentTurn.value
  turnAnnouncementTimer = setTimeout(() => {
    turnAnnouncement.value = null
    turnAnnouncementTimer = null
  }, 2_000)
}

const playElementAnimation = async (
  element: HTMLElement,
  className: string,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions
) => {
  element.classList.add(className)
  const animation = element.animate(keyframes, options)

  try {
    await animation.finished
  } catch {
    // 路由切换或系统减少动态效果时，浏览器可能主动取消动画。
  } finally {
    element.classList.remove(className)
  }
}

const animateCapturedPiece = async (
  move: XiangqiHistoryMove,
  historyIndex: number
) => {
  if (
    !move.captured ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return

  await nextTick()
  const origin = boardElement.value?.querySelector<HTMLElement>(
    `[data-square="${move.to}"]`
  )
  const capturedPiece = captureStackElement.value?.querySelector<HTMLElement>(
    `[data-capture-index="${historyIndex}"]`
  )
  if (!origin || !capturedPiece) return

  const originRect = origin.getBoundingClientRect()
  const destinationRect = capturedPiece.getBoundingClientRect()
  const deltaX =
    originRect.left +
    originRect.width / 2 -
    (destinationRect.left + destinationRect.width / 2)
  const deltaY =
    originRect.top +
    originRect.height / 2 -
    (destinationRect.top + destinationRect.height / 2)

  await playElementAnimation(
    capturedPiece,
    'xiangqi-captured__piece--flying',
    [
      { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.08)` },
      { transform: 'translate3d(0, 0, 0) scale(1)' },
    ],
    { duration: 560, easing: 'steps(7, end)' }
  )
}

watch(lastAiMove, async (move) => {
  if (!move || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return

  await nextTick()
  const origin = boardElement.value?.querySelector<HTMLElement>(
    `[data-square="${move.from}"]`
  )
  const piece = boardElement.value?.querySelector<HTMLElement>(
    `[data-square="${move.to}"] .xiangqi-piece`
  )
  if (!origin || !piece) {
    return
  }

  const originRect = origin.getBoundingClientRect()
  const destinationRect = piece.getBoundingClientRect()
  const deltaX = originRect.left - destinationRect.left
  const deltaY = originRect.top - destinationRect.top

  await playElementAnimation(
    piece,
    'xiangqi-piece--moving',
    [
      { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
      { transform: 'translate3d(0, 0, 0)' },
    ],
    {
      duration: 480,
      easing: 'cubic-bezier(0.22, 0.72, 0.28, 1)',
    }
  )
})

watch(
  () => moveHistory.value.length,
  async (length, previousLength) => {
    if (length > previousLength) {
      showTurnAnnouncement()
      const move = moveHistory.value[length - 1]
      if (move?.captured) void animateCapturedPiece(move, length - 1)
    }
    await nextTick()
    if (historyList.value) historyList.value.scrollTop = 0
  }
)

watch(status, (nextStatus) => {
  if (nextStatus !== 'redWins' || gameMode.value !== 'ai') return

  const nextRecords = {
    ...victoryRecords.value,
    [aiDepth.value]: new Date().toISOString(),
  }
  victoryRecords.value = nextRecords
  try {
    localStorage.setItem(VICTORY_STORAGE_KEY, JSON.stringify(nextRecords))
  } catch {
    // 无痕模式或存储空间不可用时仍保留本次会话内的通关状态。
  }
})

onMounted(() => {
  try {
    victoryRecords.value = JSON.parse(
      localStorage.getItem(VICTORY_STORAGE_KEY) ?? '{}'
    ) as Record<number, string>
  } catch {
    victoryRecords.value = {}
  }
})

onBeforeUnmount(() => {
  clearOpeningPlacement()
  if (turnAnnouncementTimer) clearTimeout(turnAnnouncementTimer)
})
</script>

<style lang="less" scoped src="./index.less"></style>
