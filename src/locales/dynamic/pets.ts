import { pageThemeColors } from '@/config/pageThemes'

import type { LocaleCode } from '../resolveLocalePair'

export const PET_STAT_MAX = 150
export type PetStatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'
export type PetStats = Record<PetStatKey, number>

// 修正方向取自官方 BDSP 培育指南；这里只标注性格效果，不重复修改展示数值。
export const petNatures = {
  naughty: {
    name: { zhCn: '顽皮', en: 'Naughty' },
    increased: 'atk',
    decreased: 'spd',
  },
  timid: {
    name: { zhCn: '胆小', en: 'Timid' },
    increased: 'spe',
    decreased: 'atk',
  },
} as const
export type PetNature = keyof typeof petNatures

export interface PetProfile {
  id: string
  number: number
  birthMonth: { year: number; month: number }
  name: Record<LocaleCode, string>
  type: Record<LocaleCode, string>
  gender: 'female' | 'male'
  stats: PetStats
  nature: PetNature
  metPlace: Record<LocaleCode, string>
  characteristic: Record<LocaleCode, string>
  model: 'sprigatito' | 'mightyena'
  themeColor: string
  ballColor?: string
  entrance: 'tilt' | 'lift'
  displayScale: number
  focusScale?: number
  focusOffsetX?: number
  pose: 'battle-idle' | 'sit'
  // 角度制；模型朝向与聚焦镜头俯仰独立配置。
  rotationY: { home: number; focus: number }
  focusPitch: number
  topLight: { widthScale: number; focusRightOffset: number }
}

// 按精灵球槽位顺序维护宠物，id 用于选中状态，编号独立于数组顺序。
export const pets: PetProfile[] = [
  {
    id: 'huahua',
    number: 1,
    birthMonth: { year: 2025, month: 4 },
    name: { zhCn: '花花', en: 'Flora' },
    type: { zhCn: '狸花猫', en: 'Chinese Li Hua' },
    gender: 'female',
    stats: { hp: 100, atk: 100, def: 50, spa: 10, spd: 100, spe: 80 },
    nature: 'naughty',
    metPlace: { zhCn: '江西省南昌市', en: 'Nanchang, Jiangxi' },
    characteristic: { zhCn: '有一点点固执。', en: "It's somewhat stubborn!" },
    model: 'sprigatito',
    themeColor: '#8a2c1b',
    entrance: 'tilt',
    displayScale: 1,
    pose: 'battle-idle',
    rotationY: { home: -35, focus: -35 },
    focusOffsetX: 0.01,
    focusPitch: -8,
    topLight: { widthScale: 1, focusRightOffset: 0 },
  },
  {
    id: 'xiaohei',
    number: 3,
    birthMonth: { year: 2020, month: 1 },
    name: { zhCn: '小黑', en: 'Hei' },
    type: { zhCn: '中华田园犬', en: 'Chinese Village Dog' },
    gender: 'male',
    stats: { hp: 150, atk: 150, def: 100, spa: 100, spd: 80, spe: 150 },
    nature: 'timid',
    metPlace: { zhCn: '安徽省池州市', en: 'Chizhou, Anhui' },
    characteristic: { zhCn: '对声音敏感。', en: "It's alert to sounds!" },
    model: 'mightyena',
    pose: 'sit',
    rotationY: { home: 45, focus: 57 },
    focusScale: 1.15,
    focusPitch: -7,
    topLight: { widthScale: 1.2, focusRightOffset: 0.15 },
    themeColor: '#454b55',
    ballColor: pageThemeColors.ARCHIVE,
    entrance: 'lift',
    displayScale: 2.6,
  },
]
