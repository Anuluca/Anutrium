import type { XiangqiColor, XiangqiPieceType } from 'xiangqi.js'

const AI_DEPTHS = [3, 5, 7, 9] as const
export type XiangqiAiDepth = (typeof AI_DEPTHS)[number]

export const AI_TIME_LIMITS: Record<XiangqiAiDepth, number> = {
  3: 800,
  5: 2_000,
  7: 5_000,
  9: 9_000,
}

export const BOARD_MARKERS = [
  { column: 1, row: 2 },
  { column: 7, row: 2 },
  { column: 0, row: 3 },
  { column: 2, row: 3 },
  { column: 4, row: 3 },
  { column: 6, row: 3 },
  { column: 8, row: 3 },
  { column: 0, row: 6 },
  { column: 2, row: 6 },
  { column: 4, row: 6 },
  { column: 6, row: 6 },
  { column: 8, row: 6 },
  { column: 1, row: 7 },
  { column: 7, row: 7 },
] as const

export const PIECE_NAMES: Record<
  XiangqiColor,
  Record<XiangqiPieceType, string>
> = {
  b: { a: '士', b: '象', c: '砲', k: '將', n: '馬', p: '卒', r: '車' },
  r: { a: '仕', b: '相', c: '炮', k: '帥', n: '傌', p: '兵', r: '俥' },
}

const EN_COPY = {
  aiLine1: 'VS',
  aiLine2: 'COMPUTER',
  aiModelPrefix: 'DECISION ALGORITHM: ALPHA-BETA DEPTH',
  back: 'BACK',
  blackCheck: 'BLACK IN CHECK',
  blackSide: 'BLACK',
  blackThinking: 'BLACK IS THINKING',
  blackTurn: 'BLACK TO MOVE',
  blackWins: 'BLACK WINS',
  boardLabel: 'Xiangqi board',
  changelogDescription1:
    'Added computer difficulty levels, local 1V1, board rotation, and victory records.',
  changelogDescription2:
    'Added drag movement, move history, undo, and animated computer moves.',
  changelogLine1: 'UPDATE',
  changelogLine2: 'LOG',
  changelogTitle: 'UPDATE LOG',
  checkmateTime: 'CHECKMATE TIME',
  confirmAccept: 'CONFIRM',
  confirmCancel: 'CANCEL',
  capturedCount: 'Captured pieces',
  draw: 'DRAW',
  easy: 'EASY',
  empty: 'Empty intersection',
  expert: 'EXPERT',
  gameName: 'XIANGQI',
  gameLabel: 'Xiangqi game against the computer',
  hard: 'HARD',
  history: 'MOVE HISTORY',
  historyEmpty: 'NO MOVES YET',
  historyGameOver: 'GAME OVER',
  historyResigned: 'RESIGNED',
  localLine1: 'LOCAL',
  localLine2: '1V1',
  medium: 'MEDIUM',
  redCheck: 'RED IN CHECK',
  redSide: 'RED',
  redTurn: 'RED TO MOVE',
  redWins: 'RED WINS',
  resign: 'RESIGN',
  resignMessage: 'Confirm resignation?',
  returnMessage: 'Exit the game?',
  rotate: 'ROTATE',
  selectDifficulty: 'SELECT DIFFICULTY',
  selectMode: 'SELECT MODE',
  undo: 'UNDO',
} as const

const ZH_COPY: Record<keyof typeof EN_COPY, string> = {
  aiLine1: '人机',
  aiLine2: '对战',
  aiModelPrefix: '决策算法：ALPHA-BETA 深度',
  back: '返回',
  blackCheck: '黑方被将',
  blackSide: '黑方',
  blackThinking: '黑方思考中',
  blackTurn: '黑方行棋',
  blackWins: '黑方胜',
  boardLabel: '中国象棋棋盘',
  changelogDescription1: '新增人机难度、本地1V1、棋盘旋转与通关时间记录。',
  changelogDescription2: '新增拖拽走棋、走棋历史、悔棋与电脑行棋动画。',
  changelogLine1: '更新',
  changelogLine2: '日志',
  changelogTitle: '更新日志',
  checkmateTime: '将死时间',
  confirmAccept: '确认',
  confirmCancel: '取消',
  capturedCount: '已吃棋子',
  draw: '和棋',
  easy: '简单',
  empty: '空位',
  expert: '专家',
  gameName: '中国象棋',
  gameLabel: '中国象棋人机对弈',
  hard: '困难',
  history: '走棋历史',
  historyEmpty: '尚未行棋',
  historyGameOver: '对局结束',
  historyResigned: '投降',
  localLine1: '本地',
  localLine2: '1V1',
  medium: '中等',
  redCheck: '红方被将',
  redSide: '红方',
  redTurn: '红方行棋',
  redWins: '红方胜',
  resign: '投降',
  resignMessage: '确认投降吗？',
  returnMessage: '确认退出游戏吗？',
  rotate: '旋转',
  selectDifficulty: '选择难度',
  selectMode: '选择模式',
  undo: '悔棋',
}

export type XiangqiCopy = typeof ZH_COPY
const DIFFICULTY_LABEL_KEYS = ['easy', 'medium', 'hard', 'expert'] as const

export const getXiangqiCopy = (locale: string): XiangqiCopy =>
  locale === 'en' ? EN_COPY : ZH_COPY

export const getXiangqiDifficulties = (copy: XiangqiCopy) =>
  AI_DEPTHS.map((depth, index) => ({
    depth,
    label: copy[DIFFICULTY_LABEL_KEYS[index]],
  }))

export const getXiangqiChangelog = (copy: XiangqiCopy) => [
  {
    date: '2026.09.08',
    description: copy.changelogDescription1,
    version: 'V1.1.0',
  },
  {
    date: '2026.09.07',
    description: copy.changelogDescription2,
    version: 'V1.0.0',
  },
]

export const isTerminalStatus = (status: string) =>
  status === 'blackWins' || status === 'draw' || status === 'redWins'
