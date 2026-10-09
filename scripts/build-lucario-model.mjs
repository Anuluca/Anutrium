// 复用已运行的 Vite 服务编译构建辅助模块，不启动或停止开发服务。
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const baseURL = process.env.LUCARIO_BUILD_URL || 'http://localhost:3000'
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' })
  const model = await page.evaluate(async () => {
    const { prepareLucarioGeometry } = await import(
      '/scripts/lib/prepareLucarioGeometry.ts'
    )
    return prepareLucarioGeometry()
  })
  const arrays = {
    positions: new Float32Array(model.positions),
    normals: new Float32Array(model.normals),
    weights: new Float32Array(model.weights),
    nodWeights: new Float32Array(model.nodWeights),
    indices: new Uint16Array(model.indices),
  }
  const metadata = {
    version: 1,
    center: model.center,
    headPivot: model.headPivot,
    headNodPivot: model.headNodPivot,
    size: model.size,
    stats: model.stats,
    attributes: {},
  }
  let offset = 0
  const buffers = []
  for (const [name, array] of Object.entries(arrays)) {
    metadata.attributes[name] = { offset, count: array.length }
    const bytes = Buffer.from(array.buffer)
    buffers.push(bytes)
    offset += bytes.byteLength
  }
  const directory = new URL('../public/models/', import.meta.url)
  await mkdir(directory, { recursive: true })
  await writeFile(
    new URL('lucario-island.bin', directory),
    Buffer.concat(buffers)
  )
  await writeFile(
    new URL('lucario-island.json', directory),
    JSON.stringify(metadata)
  )
  const environment = await page.evaluate(async () => {
    const { prepareLucarioEnvironment } = await import(
      '/scripts/lib/prepareLucarioEnvironment.ts'
    )
    return prepareLucarioEnvironment()
  })
  const environmentData = gzipSync(
    Buffer.from(new Uint16Array(environment.pixels).buffer),
    { level: 9 }
  )
  await writeFile(new URL('lucario-studio.bin.gz', directory), environmentData)
  await writeFile(
    new URL('lucario-studio.json', directory),
    JSON.stringify({ width: environment.width, height: environment.height })
  )
  console.log(`Environment baked: ${environmentData.byteLength} bytes`)
  console.log(
    `Lucario baked: ${offset} bytes, ${model.stats.simplifiedFaces} triangles`
  )
} finally {
  await browser.close()
}
