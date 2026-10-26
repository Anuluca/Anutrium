import { bakeTempleFlatLabelAsset } from './lib/bakeTempleFlatLabelAsset.mjs'
import { bakeTempleLabelAsset } from './lib/bakeTempleLabelAsset.mjs'
import { updateTempleAssetRevision } from './lib/updateTempleAssetRevision.mjs'

await bakeTempleLabelAsset()
await bakeTempleLabelAsset('low')
await bakeTempleFlatLabelAsset()
await updateTempleAssetRevision()
