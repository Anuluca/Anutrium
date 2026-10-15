import { createBakedPetModelLoader } from './bakedPetModel'
import modelRevision from './sprigatitoModelRevision.generated.json'

export const loadIslandSprigatitoModel = createBakedPetModelLoader(
  'sprigatito',
  modelRevision.revision
)
