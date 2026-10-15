import { pageThemeColors } from '@/config/pageThemes'

import type { LocaleCode } from '../resolveLocalePair'

export interface PetProfile {
  id: string
  number: number
  birthMonth: { year: number; month: number }
  name: Record<LocaleCode, string>
  type: Record<LocaleCode, string>
  gender: 'female' | 'male'
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
