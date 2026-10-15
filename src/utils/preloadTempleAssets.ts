import { loadIslandLucarioModel } from './islandLucarioModel'
import { loadIslandSprigatitoModel } from './islandSprigatitoModel'
import { loadTempleLabelModel } from './templeLabelModel'

// 在路由确认时并行下载数据和页面代码；复用模型缓存，不提前创建 WebGL 资源。
export function preloadTempleAssets(
  loadModel = loadIslandLucarioModel,
  loadCompanion = loadIslandSprigatitoModel
) {
  return Promise.all([loadModel(), loadCompanion(), loadTempleLabelModel()])
}
