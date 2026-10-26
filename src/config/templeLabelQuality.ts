export type TempleLabelTier = 'high' | 'low' | 'flat'
export type TempleLabelQuality = TempleLabelTier | 'lod'

// 仅标签根据投影尺寸做 LOD；不改变像素预算、星空帧率或其它效果等级。
const configuredQuality = import.meta.env.VITE_HOME_LABEL_QUALITY
export const templeLabelQuality: TempleLabelQuality =
  configuredQuality === 'high' ||
  configuredQuality === 'low' ||
  configuredQuality === 'flat'
    ? configuredQuality
    : 'lod'
