// 碑文画布、三维贴片和投射遮罩共用尺寸，避免图标改位后光源错位。
export const templeLabelLayout = {
  width: 128,
  height: 768,
  worldWidth: 0.82,
  worldHeight: 4.22,
  iconSize: 56,
  iconCenterX: 64,
  iconCenterY: 65,
  iconColor: '#b52345',
  projectionBlurRadius: 1.8,
} as const
