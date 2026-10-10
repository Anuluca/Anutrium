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
    bodyYaw: number
  }
}

export interface TempleExperience {
  themeColor: string
  model: TempleModelDefinition
}

// 彩蛋入口可传入其他配置；模型选择与页面构图、主题颜色保持独立。
export const templeExperience: TempleExperience = {
  themeColor: pageThemeColors.HOME,
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
      pointerDamping: 12,
      focusYawLimit: 65,
      bodyYaw: 5,
    },
  },
}
