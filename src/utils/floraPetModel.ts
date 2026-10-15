import type { PetProfile } from '@/locales/dynamic/pets'

import {
  type BakedPetModelAsset,
  createBakedPetModelLoader,
} from './bakedPetModel'
import { loadIslandSprigatitoModel } from './islandSprigatitoModel'
import mightyenaRevision from './mightyenaModelRevision.generated.json'

export type FloraPetModelAsset = BakedPetModelAsset
const loaders: Record<PetProfile['model'], () => Promise<FloraPetModelAsset>> =
  {
    sprigatito: loadIslandSprigatitoModel,
    mightyena: createBakedPetModelLoader(
      'mightyena',
      mightyenaRevision.revision
    ),
  }

// 首次选择时下载，会话内所有页面共享同一结果；GPU 几何由各场景独立释放。
export const loadFloraPetModel = (name: PetProfile['model']) => loaders[name]()
