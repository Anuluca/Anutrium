import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

import { bakeSprigatitoRenderAssets } from './lib/bakeSprigatitoRenderAssets.mjs'
import { bakeTempleLabelAsset } from './lib/bakeTempleLabelAsset.mjs'
import { updateTempleAssetRevision } from './lib/updateTempleAssetRevision.mjs'

await bakeSprigatitoRenderAssets()
await bakeTempleLabelAsset()
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.goto(process.env.MODEL_BUILD_URL || 'http://localhost:3000', {
    waitUntil: 'domcontentloaded',
  })
  const environment = await page.evaluate(async () => {
    const { prepareLucarioEnvironment } = await import(
      '/scripts/lib/prepareLucarioEnvironment.ts'
    )
    return prepareLucarioEnvironment()
  })
  const directory = new URL('../public/models/', import.meta.url)
  const packed = gzipSync(
    Buffer.from(new Uint16Array(environment.pixels).buffer),
    { level: 9 }
  )
  const json = JSON.stringify({
    width: environment.width,
    height: environment.height,
  })
  await writeFile(new URL('lucario-studio.bin.gz', directory), packed)
  await writeFile(new URL('lucario-studio.json', directory), json)
  await updateTempleAssetRevision()
  console.log(
    `Studio: ${packed.length} download bytes, ${
      environment.pixels.length * 2
    } texture bytes`
  )
} finally {
  await browser.close()
}
