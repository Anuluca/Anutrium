// 模型恢复实体显示；菜单灰色状态独立保留。
export const templeWireframeModels: ReadonlySet<string> = new Set()

export const templeMutedMenuItems: ReadonlySet<string> = new Set(['pokeyard'])

export const isTempleWireframeModel = (id: string) =>
  templeWireframeModels.has(id)

export const isTempleMutedMenuItem = (id: string) =>
  templeMutedMenuItems.has(id)
