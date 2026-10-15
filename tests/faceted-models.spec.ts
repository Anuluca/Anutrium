import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'

// 三者的实体、线框与动作共用同一拓扑，检查真实打包输出，避免只验证材质开关。
for (const name of ['lucario-island', 'sprigatito-sleep', 'mightyena-sleep']) {
  test(`${name} has compact faceted topology and complete deformation data`, async () => {
    const metadata = JSON.parse(
      await readFile(`public/models/${name}.json`, 'utf8')
    )
    const compressed = name !== 'lucario-island'
    const bytes = await readFile(
      `public/models/${name}.${compressed ? 'bin.gz' : 'bin'}`
    )
    const decoded = compressed ? gunzipSync(bytes) : bytes
    const buffer = decoded.buffer.slice(
      decoded.byteOffset,
      decoded.byteOffset + decoded.byteLength
    )
    const position = metadata.attributes.positions
    const count = position.count / 3
    const index = metadata.attributes.indices
    const indices = new Uint16Array(buffer, index.offset, index.count)
    expect(metadata.faceting.style).toBe('faceted')
    expect(metadata.faceting.faces).toBe(indices.length / 3)
    expect(metadata.faceting.faces).toBeLessThan(
      metadata.faceting.inputFaces * (name === 'lucario-island' ? 0.95 : 0.7)
    )
    expect(metadata.faceting.smoothedVertices).toBeGreaterThan(0)
    expect(metadata.faceting.simplificationError).toBeLessThanOrEqual(0.014)
    expect(new Set(indices).size).toBe(count)
    expect(Math.max(...indices)).toBeLessThan(count)
    for (const [name, attribute] of Object.entries(metadata.attributes) as [
      string,
      { offset: number; count: number }
    ][]) {
      if (name === 'indices') continue
      const size = name === 'weights' || name === 'nodWeights' ? 1 : 3
      expect(attribute.count).toBe(count * size)
      const values = new Float32Array(buffer, attribute.offset, attribute.count)
      expect(values.every(Number.isFinite)).toBe(true)
      if (size === 1)
        expect(values.every((value) => value >= 0 && value <= 1)).toBe(true)
    }
    expect(decoded.byteLength).toBe(index.offset + index.count * 2)
  })
}
