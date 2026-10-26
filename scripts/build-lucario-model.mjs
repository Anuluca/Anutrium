// 复用已运行的 Vite 服务编译构建辅助模块，不启动或停止开发服务。
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import * as THREE from 'three'

import { bakeTempleFlatLabelAsset } from './lib/bakeTempleFlatLabelAsset.mjs'
import { bakeTempleLabelAsset } from './lib/bakeTempleLabelAsset.mjs'
import { facetModelGeometry } from './lib/facetModelGeometry.mjs'
import { updateTempleAssetRevision } from './lib/updateTempleAssetRevision.mjs'

const baseURL = process.env.LUCARIO_BUILD_URL || 'http://localhost:3000'
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  // 构建时屏蔽热更新，避免并行开发或资产写入中断浏览器内的烘焙。
  await page.routeWebSocket('**', (socket) => socket.close())
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' })
  const model = await page.evaluate(async () => {
    const { prepareLucarioGeometry } = await import(
      '/scripts/lib/prepareLucarioGeometry.ts'
    )
    return prepareLucarioGeometry()
  })
  const faceted = await facetModelGeometry(
    {
      positions: new Float32Array(model.positions),
      normals: new Float32Array(model.normals),
      weights: new Float32Array(model.weights),
      nodWeights: new Float32Array(model.nodWeights),
    },
    Uint32Array.from(model.indices),
    // 路卡已有较强减面，薄壳更多；保守处理以保留原开放边与头颈拓扑。
    { symmetryPlaneX: model.center[0], targetRatio: 0.9 }
  )
  // 将原骨骼的收腿位移转移到已减面的顶点，保留其余部位及网格连接关系。
  const positions = faceted.attributes.positions
  const moved = new Set()
  let oldMinY = Infinity
  let newMinY = Infinity
  for (let index = 0; index < positions.length; index += 3) {
    oldMinY = Math.min(oldMinY, positions[index + 1])
    const side = positions[index] > 0 ? -1 : 1
    const x = positions[index] * side
    let nearest,
      distance = Infinity
    for (const sample of model.legPoseSamples) {
      const squared =
        (sample[0] - x) ** 2 +
        (sample[1] - positions[index + 1]) ** 2 +
        (sample[2] - positions[index + 2]) ** 2
      if (squared < distance) {
        distance = squared
        nearest = sample
      }
    }
    if (nearest && Math.hypot(...nearest.slice(3)) > 1e-7) {
      positions[index] += nearest[3] * side
      positions[index + 1] += nearest[4]
      positions[index + 2] += nearest[5]
      moved.add(index / 3)
    }
    newMinY = Math.min(newMinY, positions[index + 1])
  }
  model.size[1] += oldMinY - newMinY
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(Array.from(faceted.indices))
  geometry.computeVertexNormals()
  const normals = geometry.getAttribute('normal')
  for (const vertex of moved)
    for (let axis = 0; axis < 3; axis++)
      faceted.attributes.normals[vertex * 3 + axis] =
        normals.array[vertex * 3 + axis]
  geometry.dispose()
  const arrays = {
    ...faceted.attributes,
    indices: Uint16Array.from(faceted.indices),
  }
  const metadata = {
    version: 1,
    center: model.center,
    headPivot: model.headPivot,
    headNodPivot: model.headNodPivot,
    size: model.size,
    stats: { ...model.stats, simplifiedFaces: faceted.indices.length / 3 },
    faceting: faceted.stats,
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
  await bakeTempleLabelAsset()
  await bakeTempleLabelAsset('low')
  await bakeTempleFlatLabelAsset()
  await updateTempleAssetRevision()
  console.log(
    `Lucario baked: ${offset} bytes, ${faceted.indices.length / 3} triangles`
  )
} finally {
  await browser.close()
}
