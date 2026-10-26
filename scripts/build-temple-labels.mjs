import { bakeTempleFlatLabelAsset } from './lib/bakeTempleFlatLabelAsset.mjs'
import { bakeTempleLabelAsset } from './lib/bakeTempleLabelAsset.mjs'
import { updateTempleAssetRevision } from './lib/updateTempleAssetRevision.mjs'

await bakeTempleLabelAsset('high', { tracking: -0.06 })
await bakeTempleLabelAsset('low', { tracking: -0.06 })
await bakeTempleFlatLabelAsset()
await bakeTempleLabelAsset('high', {
  text: 'WELCOME TO MY',
  filename: 'temple-welcome',
  stagger: false,
  tracking: -0.06,
})
await updateTempleAssetRevision()
