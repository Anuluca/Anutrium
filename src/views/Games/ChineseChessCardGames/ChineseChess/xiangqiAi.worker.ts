import { Xiangqi, type XiangqiMove, type XiangqiPieceType } from 'xiangqi.js'

interface AiRequest {
  fen: string
  maxDepth: number
  timeLimitMs: number
}

interface AiResponse {
  move: Pick<XiangqiMove, 'from' | 'to'> | null
}

const AI_COLOR = 'b'
const MATE_SCORE = 1_000_000
const SEARCH_TIMEOUT = Symbol('search-timeout')
const PIECE_VALUES: Record<XiangqiPieceType, number> = {
  a: 120,
  b: 120,
  c: 350,
  k: 100_000,
  n: 300,
  p: 100,
  r: 600,
}

const orderMoves = (moves: XiangqiMove[]) =>
  moves.sort(
    (left, right) =>
      (right.captured ? PIECE_VALUES[right.captured] : 0) -
      (left.captured ? PIECE_VALUES[left.captured] : 0)
  )

const evaluateBoard = (game: Xiangqi) => {
  let score = 0
  const board = game.board()

  for (let rowIndex = 0; rowIndex < board.length; rowIndex += 1) {
    const row = board[rowIndex]
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const piece = row[columnIndex]
      if (!piece) continue

      const direction = piece.color === AI_COLOR ? 1 : -1
      const advancement = piece.color === AI_COLOR ? rowIndex : 9 - rowIndex
      const centerControl = 4 - Math.abs(4 - columnIndex)
      const positionBonus =
        piece.type === 'p'
          ? advancement * 9
          : piece.type === 'n' || piece.type === 'c'
          ? centerControl * 3
          : 0

      score += direction * (PIECE_VALUES[piece.type] + positionBonus)
    }
  }

  return score
}

const search = (
  game: Xiangqi,
  depth: number,
  alphaValue: number,
  betaValue: number,
  deadline: number,
  ply: number
): number => {
  if (performance.now() >= deadline) throw SEARCH_TIMEOUT
  if (depth === 0) return evaluateBoard(game)

  const moves = orderMoves(game.moves({ verbose: true }) as XiangqiMove[])
  if (moves.length === 0) {
    if (!game.in_check()) return 0
    return game.turn() === AI_COLOR ? -MATE_SCORE + ply : MATE_SCORE - ply
  }

  let alpha = alphaValue
  let beta = betaValue
  const maximizing = game.turn() === AI_COLOR
  let bestScore = maximizing ? -Infinity : Infinity

  for (const move of moves) {
    game.move({ from: move.from, to: move.to })
    let score: number

    // 即使时间预算在递归中耗尽，也必须恢复棋盘，保证下一轮迭代可复用。
    try {
      score = search(game, depth - 1, alpha, beta, deadline, ply + 1)
    } finally {
      game.undo()
    }

    if (maximizing) {
      bestScore = Math.max(bestScore, score)
      alpha = Math.max(alpha, bestScore)
    } else {
      bestScore = Math.min(bestScore, score)
      beta = Math.min(beta, bestScore)
    }

    if (beta <= alpha) break
  }

  return bestScore
}

const findBestMove = ({ fen, maxDepth, timeLimitMs }: AiRequest) => {
  const game = new Xiangqi(fen)
  const rootMoves = orderMoves(game.moves({ verbose: true }) as XiangqiMove[])
  if (rootMoves.length === 0) return null

  const deadline = performance.now() + timeLimitMs
  let completedBestMove = rootMoves[0]

  // 迭代加深确保低性能设备超时时仍能返回最近一次完整搜索结果。
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let iterationBestMove = completedBestMove
    let iterationBestScore = -Infinity
    let iterationAlpha = -Infinity
    const scoredMoves: Array<{ move: XiangqiMove; score: number }> = []

    try {
      for (const move of rootMoves) {
        if (performance.now() >= deadline) throw SEARCH_TIMEOUT
        game.move({ from: move.from, to: move.to })
        let score: number

        try {
          score = search(game, depth - 1, iterationAlpha, Infinity, deadline, 1)
        } finally {
          game.undo()
        }

        scoredMoves.push({ move, score })
        if (score > iterationBestScore) {
          iterationBestScore = score
          iterationBestMove = move
        }
        iterationAlpha = Math.max(iterationAlpha, score)
      }

      completedBestMove = iterationBestMove
      scoredMoves.sort((left, right) => right.score - left.score)
      rootMoves.splice(
        0,
        rootMoves.length,
        ...scoredMoves.map(({ move }) => move)
      )
    } catch (error) {
      if (error !== SEARCH_TIMEOUT) throw error
      break
    }
  }

  return { from: completedBestMove.from, to: completedBestMove.to }
}

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const response: AiResponse = { move: findBestMove(event.data) }
  self.postMessage(response)
}

export {}
