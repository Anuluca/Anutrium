import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

// 参考站 PC 项目卡片的 1 秒飞行动画；分段曲线先加速，再以较长尾段减速。
export const NOTE_CARD_DURATION = 1000
const cardEase = CustomEase.create(
  'note-card-navigation',
  'M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 C0.197,0.486 0.254,0.8 0.348,0.884 C0.42,0.949 0.374,1 1,1'
)
const cardProgress = Array.from({ length: 101 }, (_, index) => ({
  offset: index / 100,
  progress: cardEase(index / 100),
}))

/** 只更新合成变换，避免逐帧改变 left/top/width/height 导致布局和重绘。 */
export const noteCardFrames = (source: DOMRect, target: DOMRect): Keyframe[] =>
  cardProgress.map(({ offset, progress }) => ({
    offset,
    transform: `translate3d(${(target.left - source.left) * progress}px, ${
      (target.top - source.top) * progress
    }px, 0) scale(${1 + (target.width / source.width - 1) * progress}, ${
      1 + (target.height / source.height - 1) * progress
    })`,
  }))
