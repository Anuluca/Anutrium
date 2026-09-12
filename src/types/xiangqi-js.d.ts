declare module 'xiangqi.js' {
  export type XiangqiColor = 'b' | 'r'
  export type XiangqiPieceType = 'a' | 'b' | 'c' | 'k' | 'n' | 'p' | 'r'

  export interface XiangqiPiece {
    color: XiangqiColor
    type: XiangqiPieceType
  }

  export interface XiangqiMove {
    captured?: XiangqiPieceType
    color: XiangqiColor
    from: string
    piece: XiangqiPieceType
    to: string
  }

  export class Xiangqi {
    constructor(fen?: string)
    board(): Array<Array<XiangqiPiece | null>>
    fen(): string
    in_check(): boolean
    in_draw(): boolean
    move(move: { from: string; to: string }): XiangqiMove | null
    moves(options?: {
      square?: string
      verbose?: boolean
    }): string[] | XiangqiMove[]
    turn(): XiangqiColor
    undo(): XiangqiMove | null
  }
}
