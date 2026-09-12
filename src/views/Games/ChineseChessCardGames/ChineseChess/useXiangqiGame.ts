import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import {
  Xiangqi,
  type XiangqiColor,
  type XiangqiMove,
  type XiangqiPiece,
  type XiangqiPieceType,
} from 'xiangqi.js'

import {
  AI_TIME_LIMITS,
  isTerminalStatus,
  type XiangqiAiDepth,
} from './xiangqiConfig'

export interface XiangqiBoardCell {
  column: number
  piece: XiangqiPiece | null
  row: number
  square: string
}

export interface XiangqiAnimatedMove {
  from: string
  to: string
}

export interface XiangqiHistoryMove extends XiangqiAnimatedMove {
  captured?: XiangqiPieceType
  color: XiangqiColor
  piece: XiangqiPieceType
}

export type XiangqiGameMode = 'ai' | 'local'

export type XiangqiStatus =
  | 'blackCheck'
  | 'blackThinking'
  | 'blackTurn'
  | 'blackWins'
  | 'draw'
  | 'redCheck'
  | 'redTurn'
  | 'redWins'

const FILES = 'abcdefghi'
const HUMAN_COLOR: XiangqiColor = 'r'
const AI_COLOR: XiangqiColor = 'b'
const AI_MOVE_DELAY_MS = 180
const EMPTY_MOVES = new Map<string, XiangqiMove>()
const BOARD_POSITIONS = Array.from({ length: 90 }, (_, index) => {
  const row = Math.floor(index / 9)
  const column = index % 9

  return {
    column,
    row,
    square: `${FILES[column]}${9 - row}`,
  }
})

export const useXiangqiGame = () => {
  let engine = new Xiangqi()
  const cells = shallowRef<XiangqiBoardCell[]>([])
  const gameMode = ref<XiangqiGameMode | null>(null)
  const aiDepth = ref<XiangqiAiDepth>(3)
  const currentTurn = ref<XiangqiColor>('r')
  const selectedSquare = ref<string | null>(null)
  const legalMovesByTarget =
    shallowRef<ReadonlyMap<string, XiangqiMove>>(EMPTY_MOVES)
  const status = ref<XiangqiStatus>('redTurn')
  const isAiThinking = ref(false)
  const lastAiMove = shallowRef<XiangqiAnimatedMove | null>(null)
  const moveHistory = shallowRef<XiangqiHistoryMove[]>([])
  const resignedColor = ref<XiangqiColor | null>(null)
  let piecesBySquare = new Map<string, XiangqiPiece>()
  let generals = new Set<XiangqiColor>()
  let aiWorker: Worker | null = null
  let aiMoveTimer: number | null = null

  const canUndo = computed(() => moveHistory.value.length > 0)
  const isGameOver = computed(() => isTerminalStatus(status.value))
  const isHumanControlled = (color: XiangqiColor) =>
    gameMode.value === 'local' || color === HUMAN_COLOR

  const syncBoard = () => {
    const board = engine.board()
    const nextPiecesBySquare = new Map<string, XiangqiPiece>()
    const nextGenerals = new Set<XiangqiColor>()

    cells.value = BOARD_POSITIONS.map((position) => {
      const piece = board[position.row][position.column]
      if (piece) {
        nextPiecesBySquare.set(position.square, piece)
        if (piece.type === 'k') nextGenerals.add(piece.color)
      }

      return { ...position, piece }
    })
    piecesBySquare = nextPiecesBySquare
    generals = nextGenerals
  }

  const clearSelection = () => {
    selectedSquare.value = null
    legalMovesByTarget.value = EMPTY_MOVES
  }

  const cancelAiTurn = () => {
    if (aiMoveTimer !== null) window.clearTimeout(aiMoveTimer)
    aiMoveTimer = null
    aiWorker?.terminate()
    aiWorker = null
    isAiThinking.value = false
  }

  const selectOwnPiece = (square: string) => {
    selectedSquare.value = square
    const moves = engine.moves({ square, verbose: true }) as XiangqiMove[]
    legalMovesByTarget.value = new Map(moves.map((move) => [move.to, move]))
  }

  const evaluatePosition = () => {
    const turn = engine.turn()
    currentTurn.value = turn

    const hasRedGeneral = generals.has('r')
    const hasBlackGeneral = generals.has('b')

    if (!hasRedGeneral || !hasBlackGeneral) {
      status.value = hasRedGeneral ? 'redWins' : 'blackWins'
      return
    }

    const inCheck = engine.in_check()
    const hasLegalMove = engine.moves().length > 0

    if (!hasLegalMove) {
      status.value = inCheck ? (turn === 'r' ? 'blackWins' : 'redWins') : 'draw'
      return
    }

    if (engine.in_draw()) {
      status.value = 'draw'
      return
    }

    status.value = inCheck
      ? turn === 'r'
        ? 'redCheck'
        : 'blackCheck'
      : turn === 'r'
      ? 'redTurn'
      : 'blackTurn'
  }

  const commitMove = (from: string, to: string, animateAiMove = false) => {
    const move = engine.move({ from, to })
    if (!move) return false

    resignedColor.value = null
    moveHistory.value = [
      ...moveHistory.value,
      {
        captured: move.captured,
        color: move.color,
        from: move.from,
        piece: move.piece.toLowerCase() as XiangqiPieceType,
        to: move.to,
      },
    ]
    clearSelection()
    syncBoard()
    lastAiMove.value = animateAiMove ? { from, to } : null
    evaluatePosition()
    return true
  }

  const playFallbackAiMove = () => {
    const [move] = engine.moves({ verbose: true }) as XiangqiMove[]
    if (move) commitMove(move.from, move.to, true)
  }

  const requestAiMove = () => {
    if (
      gameMode.value !== 'ai' ||
      isGameOver.value ||
      currentTurn.value !== AI_COLOR
    )
      return

    isAiThinking.value = true
    status.value = 'blackThinking'
    aiMoveTimer = window.setTimeout(() => {
      aiMoveTimer = null
      const worker =
        aiWorker ??
        new Worker(new URL('./xiangqiAi.worker.ts', import.meta.url), {
          type: 'module',
        })
      aiWorker ??= worker

      const finish = (
        move?: Pick<XiangqiMove, 'from' | 'to'> | null,
        resetWorker = false
      ) => {
        if (aiWorker !== worker) return
        worker.onmessage = null
        worker.onerror = null
        if (resetWorker) {
          worker.terminate()
          aiWorker = null
        }
        isAiThinking.value = false

        if (move) commitMove(move.from, move.to, true)
        else playFallbackAiMove()
      }

      worker.onmessage = (
        event: MessageEvent<{
          move: Pick<XiangqiMove, 'from' | 'to'> | null
        }>
      ) => finish(event.data.move)
      worker.onerror = () => finish(null, true)
      worker.postMessage({
        fen: engine.fen(),
        maxDepth: aiDepth.value,
        timeLimitMs: AI_TIME_LIMITS[aiDepth.value],
      })
    }, AI_MOVE_DELAY_MS)
  }

  const selectSquare = (square: string) => {
    if (
      isGameOver.value ||
      isAiThinking.value ||
      !isHumanControlled(currentTurn.value)
    )
      return

    const piece = piecesBySquare.get(square)
    if (!selectedSquare.value) {
      if (piece?.color === currentTurn.value) selectOwnPiece(square)
      return
    }

    if (square === selectedSquare.value) {
      clearSelection()
      return
    }

    if (legalMovesByTarget.value.has(square)) {
      if (!commitMove(selectedSquare.value, square)) return
      requestAiMove()
      return
    }

    if (piece?.color === currentTurn.value) {
      selectOwnPiece(square)
    } else {
      clearSelection()
    }
  }

  const beginPlayerDrag = (square: string) => {
    if (
      isGameOver.value ||
      isAiThinking.value ||
      !isHumanControlled(currentTurn.value) ||
      piecesBySquare.get(square)?.color !== currentTurn.value
    )
      return false

    selectOwnPiece(square)
    return true
  }

  const dropPlayerPiece = (from: string, to: string) => {
    if (selectedSquare.value !== from || !legalMovesByTarget.value.has(to)) {
      clearSelection()
      return false
    }

    if (!commitMove(from, to)) return false
    requestAiMove()
    return true
  }

  const undoMove = () => {
    cancelAiTurn()
    let undoneMoves = 0

    // 人机模式按完整回合悔棋；本地双人模式只撤销一步。
    do {
      if (!engine.undo()) break
      undoneMoves += 1
    } while (
      gameMode.value === 'ai' &&
      engine.turn() !== HUMAN_COLOR &&
      undoneMoves < 2
    )

    if (undoneMoves === 0) return

    moveHistory.value = moveHistory.value.slice(0, -undoneMoves)
    lastAiMove.value = null
    resignedColor.value = null
    clearSelection()
    syncBoard()
    evaluatePosition()
  }

  const startGame = (mode: XiangqiGameMode, depth: XiangqiAiDepth = 3) => {
    cancelAiTurn()
    engine = new Xiangqi()
    gameMode.value = mode
    aiDepth.value = depth
    currentTurn.value = HUMAN_COLOR
    status.value = 'redTurn'
    lastAiMove.value = null
    moveHistory.value = []
    resignedColor.value = null
    clearSelection()
    syncBoard()
  }

  const resignGame = () => {
    if (isGameOver.value || !gameMode.value) return

    cancelAiTurn()
    resignedColor.value = currentTurn.value
    status.value = currentTurn.value === 'r' ? 'blackWins' : 'redWins'
    clearSelection()
  }

  const leaveGame = () => {
    cancelAiTurn()
    gameMode.value = null
    lastAiMove.value = null
    clearSelection()
  }

  syncBoard()
  onBeforeUnmount(cancelAiTurn)

  return {
    beginPlayerDrag,
    aiDepth,
    canUndo,
    cancelPlayerDrag: clearSelection,
    cells,
    currentTurn,
    dropPlayerPiece,
    gameMode,
    isHumanControlled,
    isAiThinking,
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
  }
}
