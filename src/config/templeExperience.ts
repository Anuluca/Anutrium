import {
  type IslandModelAsset,
  loadIslandLucarioModel,
} from '@/utils/islandLucarioModel'

import { pageThemeColors } from './pageThemes'

export interface TempleModelDefinition {
  id: string
  label: string
  // 替换模型时提供同一缓冲区格式；无头部绑定的模型将两组权重设为 0。
  load: () => Promise<IslandModelAsset>
  displayHeight: number
  cropY: number
  rig: {
    enabled: boolean
    neckExtension: number
    restPitch: number
    entranceNod: number
    pointerPitch: number
    pointerYaw: number
    pointerDamping: number
    focusYawLimit: number
    focusYawScale: number
    bodyYaw: number
  }
}

export interface TempleExperience {
  themeColor: string
  model: TempleModelDefinition
  headache?: {
    mode: 'normal' | 'headache'
    bodyTwist: number
    upperArmTwist: number
    forearmTwist: number
    headLeanBack: number
    headTilt: number
  }
}

// 彩蛋入口可传入其他配置；模型选择与页面构图、主题颜色保持独立。
export const templeExperience: TempleExperience = {
  themeColor: pageThemeColors.HOME,
  // 首页从运行时配置读取模式；未读取到配置时使用普通模式。角度单位为度。
  headache: {
    mode: 'normal',
    bodyTwist: 0,
    upperArmTwist: 12,
    forearmTwist: -22,
    headLeanBack: 29,
    headTilt: 7,
  },
  model: {
    id: 'lucario',
    label: '路卡利欧',
    load: loadIslandLucarioModel,
    displayHeight: 6.7 * 1.76,
    cropY: 1.2,
    rig: {
      enabled: true,
      neckExtension: 0.035,
      restPitch: 7,
      entranceNod: 10,
      pointerPitch: 14,
      pointerYaw: 28,
      // 原站模型姿态层：1 - (1 - 0.06) ** (elapsed * 120)。
      pointerDamping: -120 * Math.log1p(-0.06),
      focusYawLimit: 65,
      focusYawScale: 0.65,
      bodyYaw: 5,
    },
  },
}
