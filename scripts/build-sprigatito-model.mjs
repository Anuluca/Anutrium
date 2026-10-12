import { chromium } from '@playwright/test'

import { bakeSprigatitoRenderAssets } from './lib/bakeSprigatitoRenderAssets.mjs'

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  // 复用现有 Vite 服务，构建期间不启动、停止用户的开发进程。
  await page.goto(process.env.SPRIGATITO_BUILD_URL || 'http://localhost:3000', {
    waitUntil: 'domcontentloaded',
  })
  const { model, raised } = await page.evaluate(async () => {
    const { prepareSprigatitoGeometry } = await import(
      '/scripts/lib/prepareSprigatitoGeometry.ts'
    )
    return {
      model: await prepareSprigatitoGeometry({ headTilt: 0, headLift: 0 }),
      raised: await prepareSprigatitoGeometry(),
    }
  })
  if (model.indices.length !== raised.indices.length)
    throw new Error('Sprigatito pose topology differs')
  // 两个姿势按同一三角面顺序对应，再联合去重；变形只更新顶点，不带动身体或重新居中。
  const values = {
    positions: [],
    normals: [],
    raisedPositions: [],
    raisedNormals: [],
    indices: [],
  }
  const vertexPairs = new Map()
  const originDelta = raised.origin.map(
    (value, axis) => value - model.origin[axis]
  )
  for (let offset = 0; offset < model.indices.length; offset++) {
    const original = model.indices[offset]
    const posed = raised.indices[offset]
    const key = `${original}:${posed}`
    if (!vertexPairs.has(key)) {
      vertexPairs.set(key, vertexPairs.size)
      for (let axis = 0; axis < 3; axis++) {
        values.positions.push(model.positions[original * 3 + axis])
        values.normals.push(model.normals[original * 3 + axis])
        values.raisedPositions.push(
          raised.positions[posed * 3 + axis] + originDelta[axis]
        )
        values.raisedNormals.push(raised.normals[posed * 3 + axis])
      }
    }
    values.indices.push(vertexPairs.get(key))
  }
  const arrays = Object.fromEntries(
    Object.entries(values).map(([name, array]) => [
      name,
      name === 'indices' ? new Uint16Array(array) : new Float32Array(array),
    ])
  )
  await bakeSprigatitoRenderAssets({
    size: model.size,
    attributes: {
      positions: arrays.positions,
      normals: arrays.normals,
      raisedPositions: arrays.raisedPositions,
      raisedNormals: arrays.raisedNormals,
    },
    indices: arrays.indices,
  })
  console.log('Neck faces:', model.stats.neckBefore, '→', model.stats.neckAfter)
} finally {
  await browser.close()
}
