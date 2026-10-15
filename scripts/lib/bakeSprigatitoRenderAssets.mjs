import { MeshoptSimplifier } from 'meshoptimizer'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync, gzipSync } from 'node:zlib'

import { facetModelGeometry } from './facetModelGeometry.mjs'

// 只输出一份减面模型；重新采样时传入完整网格，重复压缩现有模型时不继续减面。
export async function bakeSprigatitoRenderAssets(
  source,
  assetName = 'sprigatito'
) {
  const directory = new URL('../../public/models/', import.meta.url)
  let metadata
  let attributes
  let indices
  let simplify = !!source
  if (source) {
    metadata = {
      size: source.size,
      pose: source.pose,
      faceEdits: source.faceEdits,
      facingDirection: source.facingDirection,
    }
    attributes = source.attributes
    indices = source.indices
  } else {
    metadata = JSON.parse(
      await readFile(new URL(`${assetName}-sleep.json`, directory), 'utf8')
    )
    if (metadata.version !== 2)
      throw new Error('Unsupported baked Sprigatito geometry')
    const bytes = gunzipSync(
      await readFile(new URL(`${assetName}-sleep.bin.gz`, directory))
    )
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    )
    attributes = Object.fromEntries(
      Object.keys(metadata.attributes)
        .filter((name) => name !== 'indices')
        .map((name) => {
          const { offset, count } = metadata.attributes[name]
          return [name, new Float32Array(buffer, offset, count)]
        })
    )
    const index = metadata.attributes.indices
    indices = new Uint16Array(buffer, index.offset, index.count)
    simplify = false
  }
  if (simplify) {
    await MeshoptSimplifier.ready
    const positions = attributes.positions
    const remap = MeshoptSimplifier.generatePositionRemap(positions, 3)
    const welded = attributes.uvs
      ? indices
      : Uint32Array.from(indices, (index) => remap[index])
    const scale = MeshoptSimplifier.getScale(positions, 3) || 1
    const morph = Float32Array.from(
      attributes.raisedPositions,
      (value, index) => (value - positions[index]) / scale
    )
    const hasUVs = !!attributes.uvs
    const channels = hasUVs ? 5 : 3
    const constraint = hasUVs
      ? new Float32Array((positions.length / 3) * channels)
      : morph
    if (hasUVs)
      for (let i = 0; i < positions.length / 3; i++) {
        constraint.set(morph.subarray(i * 3, i * 3 + 3), i * channels)
        constraint.set(
          attributes.uvs.subarray(i * 2, i * 2 + 2),
          i * channels + 3
        )
      }
    ;[indices] = MeshoptSimplifier.simplifyWithAttributes(
      welded,
      positions,
      3,
      constraint,
      channels,
      hasUVs ? [0.5, 0.5, 0.5, 2, 2] : [0.5, 0.5, 0.5],
      null,
      Math.floor((welded.length * 0.4) / 3) * 3,
      0.006,
      ['LockBorder']
    )
  }
  if (source) {
    const faceted = await facetModelGeometry(attributes, indices)
    attributes = faceted.attributes
    indices = faceted.indices
    metadata.faceting = faceted.stats
  }
  const hash = createHash('sha256')
  // 按实际引用重排所有姿态，避免减面只缩索引却继续下载、上传废弃顶点。
  const vertices = [...new Set(indices)]
  const lookup = new Map(vertices.map((value, index) => [value, index]))
  const arrays = Object.fromEntries(
    Object.entries(attributes)
      .filter(([name]) => name !== 'uvs')
      .map(([name, source]) => {
        const components = 3
        const packed = new Float32Array(vertices.length * components)
        // 直接填充最终缓冲，不创建逐顶点数组及 flatMap 的中间展开结果。
        vertices.forEach((index, output) => {
          for (let axis = 0; axis < components; axis++)
            packed[output * components + axis] =
              source[index * components + axis]
        })
        return [name, packed]
      })
  )
  arrays.indices = Uint16Array.from(indices, (index) => lookup.get(index))
  const output = {
    version: 2,
    size: metadata.size,
    ...(metadata.pose ? { pose: metadata.pose } : {}),
    ...(metadata.faceEdits ? { faceEdits: metadata.faceEdits } : {}),
    ...(metadata.facingDirection
      ? { facingDirection: metadata.facingDirection }
      : {}),
    attributes: {},
    stats: { vertices: vertices.length, faces: indices.length / 3 },
    ...(metadata.faceting ? { faceting: metadata.faceting } : {}),
  }
  let offset = 0
  const chunks = []
  for (const [name, array] of Object.entries(arrays)) {
    output.attributes[name] = { offset, count: array.length }
    const chunk = Buffer.from(array.buffer)
    chunks.push(chunk)
    offset += chunk.length
  }
  const packed = gzipSync(Buffer.concat(chunks), { level: 9 })
  const json = JSON.stringify(output)
  hash.update(packed).update(json)
  await writeFile(new URL(`${assetName}-sleep.bin.gz`, directory), packed)
  await writeFile(new URL(`${assetName}-sleep.json`, directory), json)
  console.log(
    `${assetName}: ${vertices.length} vertices, ${
      indices.length / 3
    } faces, ${offset} GPU bytes, ${packed.length} download bytes`
  )
  await writeFile(
    new URL(
      `../../src/utils/${assetName}ModelRevision.generated.json`,
      import.meta.url
    ),
    JSON.stringify({ revision: hash.digest('hex').slice(0, 16) })
  )
}
