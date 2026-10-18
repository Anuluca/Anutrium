export interface PetMove {
  id: string
  name: { zhCn: string; en: string }
  pp: number
  type: keyof typeof moveTypes
}

// Bulbapedia 的属性颜色模板：https://bulbapedia.bulbagarden.net/wiki/Category:Type_color_templates
export const moveTypes = {
  normal: { name: { zhCn: '一般', en: 'Normal' }, color: '#9FA19F' },
  dark: { name: { zhCn: '恶', en: 'Dark' }, color: '#624D4E' },
  psychic: { name: { zhCn: '超能力', en: 'Psychic' }, color: '#EF4179' },
  fairy: { name: { zhCn: '妖精', en: 'Fairy' }, color: '#EF70EF' },
  bug: { name: { zhCn: '虫', en: 'Bug' }, color: '#91A119' },
}

// 使用第九世代基础 PP，不包含 PP 提升道具加成。
// 核对来源：https://pokemondb.net/move/all
const moves: Record<string, PetMove> = {
  bite: {
    id: 'bite',
    name: { zhCn: '咬住', en: 'Bite' },
    pp: 25,
    type: 'dark',
  },
  rest: {
    id: 'rest',
    name: { zhCn: '睡觉', en: 'Rest' },
    pp: 5,
    type: 'psychic',
  },
  round: {
    id: 'round',
    name: { zhCn: '轮唱', en: 'Round' },
    pp: 15,
    type: 'normal',
  },
  tailWhip: {
    id: 'tail-whip',
    name: { zhCn: '摇尾巴', en: 'Tail Whip' },
    pp: 30,
    type: 'normal',
  },
  pounce: {
    id: 'pounce',
    name: { zhCn: '扑击', en: 'Pounce' },
    pp: 20,
    type: 'bug',
  },
  furySwipes: {
    id: 'fury-swipes',
    name: { zhCn: '乱抓', en: 'Fury Swipes' },
    pp: 15,
    type: 'normal',
  },
  charm: {
    id: 'charm',
    name: { zhCn: '撒娇', en: 'Charm' },
    pp: 20,
    type: 'fairy',
  },
  roar: {
    id: 'roar',
    name: { zhCn: '吼叫', en: 'Roar' },
    pp: 20,
    type: 'normal',
  },
  calmMind: {
    id: 'calm-mind',
    name: { zhCn: '冥想', en: 'Calm Mind' },
    pp: 20,
    type: 'psychic',
  },
  crunch: {
    id: 'crunch',
    name: { zhCn: '咬碎', en: 'Crunch' },
    pp: 15,
    type: 'dark',
  },
  growl: {
    id: 'growl',
    name: { zhCn: '叫声', en: 'Growl' },
    pp: 40,
    type: 'normal',
  },
  agility: {
    id: 'agility',
    name: { zhCn: '高速移动', en: 'Agility' },
    pp: 30,
    type: 'psychic',
  },
}

export const petMoves: Record<
  string,
  { current: PetMove[]; forgotten: PetMove[] }
> = {
  huahua: {
    current: [moves.bite, moves.rest, moves.round, moves.tailWhip],
    forgotten: [moves.pounce, moves.furySwipes],
  },
  xiaohei: {
    current: [moves.charm, moves.roar, moves.calmMind, moves.tailWhip],
    forgotten: [
      moves.crunch,
      moves.growl,
      moves.furySwipes,
      moves.pounce,
      moves.agility,
    ],
  },
}
