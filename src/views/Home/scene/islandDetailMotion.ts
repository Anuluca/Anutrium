import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

// 窗口保持对称加减速，模型提前提速并留出更长的收尾。
export const easeIslandDetailMotion = CustomEase.create(
  'island-detail-motion',
  '0.65,0,0.35,1'
)

export const easeIslandReturnMotion = CustomEase.create(
  'island-return-motion',
  '0.32,0,0.22,1'
)

export const easeIslandModelMotion = CustomEase.create(
  'island-model-motion',
  '0.32,0,0.18,1'
)
