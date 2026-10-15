import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'

import { bakeSprigatitoRenderAssets } from './lib/bakeSprigatitoRenderAssets.mjs'

export async function buildFloraPets(assetNames = ['sprigatito', 'mightyena']) {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.goto(process.env.FLORA_BUILD_URL || 'http://localhost:3000', {
      waitUntil: 'domcontentloaded',
    })
    for (const assetName of assetNames) {
      const samples = await page.evaluate(async (name) => {
        if (name === 'sprigatito') {
          const { prepareSprigatitoGeometry: prepare } = await import(
            '/scripts/lib/prepareSprigatitoGeometry.ts'
          )
          return [
            await prepare({ headTilt: 0 }),
            await prepare({ battle: true }),
            await prepare({ battle: true, followYaw: 10 }),
            await prepare({ battle: true, followPitch: 8 }),
          ]
        }
        const { prepareMightyenaGeometry: prepare } = await import(
          '/scripts/lib/prepareMightyenaGeometry.ts'
        )
        return [
          await prepare(),
          await prepare(true),
          await prepare(true, 10),
          await prepare(true, 0, 8),
        ]
      }, assetName)
      const [base, focus, yaw, pitch] = samples
      if (
        samples.some((sample) => sample.indices.length !== base.indices.length)
      )
        throw new Error(`${assetName} pose topology differs`)
      const values = Object.fromEntries(
        [
          'positions',
          'normals',
          'raisedPositions',
          'raisedNormals',
          'yawPositions',
          'yawNormals',
          'pitchPositions',
          'pitchNormals',
          ...(base.uvs ? ['uvs'] : []),
          'indices',
        ].map((name) => [name, []])
      )
      const lookup = new Map()
      // 按三角面来源联合索引，睡姿、战斗姿与头部跟随保持顶点一一对应。
      for (let offset = 0; offset < base.indices.length; offset++) {
        const ids = samples.map((sample) => sample.indices[offset])
        const key = ids.join(':')
        if (!lookup.has(key)) {
          lookup.set(key, lookup.size)
          if (base.uvs)
            values.uvs.push(...base.uvs.slice(ids[0] * 2, ids[0] * 2 + 2))
          for (let axis = 0; axis < 3; axis++) {
            const position = (sample, index) =>
              sample.positions[ids[index] * 3 + axis] +
              (assetName === 'sprigatito'
                ? sample.origin[axis] - base.origin[axis]
                : -base.origin[axis])
            const b = position(base, 0),
              f = position(focus, 1)
            values.positions.push(b)
            values.normals.push(base.normals[ids[0] * 3 + axis])
            values.raisedPositions.push(f)
            values.raisedNormals.push(focus.normals[ids[1] * 3 + axis])
            // 附加目标只包含头部差量；不会再次叠加睡姿到战斗姿的身体变化。
            for (const [label, sample, index] of [
              ['yaw', yaw, 2],
              ['pitch', pitch, 3],
            ]) {
              values[`${label}Positions`].push(b + position(sample, index) - f)
              values[`${label}Normals`].push(
                base.normals[ids[0] * 3 + axis] +
                  sample.normals[ids[index] * 3 + axis] -
                  focus.normals[ids[1] * 3 + axis]
              )
            }
          }
        }
        values.indices.push(lookup.get(key))
      }
      await bakeSprigatitoRenderAssets(
        {
          size: base.size,
          pose: assetName === 'mightyena' ? 'sit' : 'battle-idle',
          faceEdits: base.faceEdits,
          facingDirection: focus.facingDirection,
          attributes: Object.fromEntries(
            Object.entries(values)
              .filter(([name]) => name !== 'indices')
              .map(([name, array]) => [name, Float32Array.from(array)])
          ),
          indices: Uint32Array.from(values.indices),
        },
        assetName
      )
    }
  } finally {
    await browser.close()
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await buildFloraPets()
