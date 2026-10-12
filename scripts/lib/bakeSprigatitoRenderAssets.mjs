import { MeshoptSimplifier } from 'meshoptimizer'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync, gzipSync } from 'node:zlib'

// 只输出一份减面模型；重新采样时传入完整网格，重复压缩现有模型时不继续减面。
export async function bakeSprigatitoRenderAssets(source) {
  const directory = new URL('../../public/models/', import.meta.url)
  let metadata
  let attributes
  let indices
  let simplify = !!source
  if (source) {
    metadata = { size: source.size }
    attributes = source.attributes
    indices = source.indices
  } else {
    metadata = JSON.parse(
      await readFile(new URL('sprigatito-sleep.json', directory), 'utf8')
    )
    if (metadata.version !== 2)
      throw new Error('Unsupported baked Sprigatito geometry')
    const bytes = gunzipSync(
      await readFile(new URL('sprigatito-sleep.bin.gz', directory))
    )
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    )
    attributes = Object.fromEntries(
      ['positions', 'normals', 'raisedPositions', 'raisedNormals'].map(
        (name) => {
          const { offset, count } = metadata.attributes[name]
          return [name, new Float32Array(buffer, offset, count)]
        }
      )
    )
    const index = metadata.attributes.indices
    indices = new Uint16Array(buffer, index.offset, index.count)
    simplify = false
  }
  if (simplify) {
    await MeshoptSimplifier.ready
    const positions = attributes.positions
    const remap = MeshoptSimplifier.generatePositionRemap(positions, 3)
    const welded = Uint32Array.from(indices, (index) => remap[index])
    const scale = MeshoptSimplifier.getScale(positions, 3) || 1
    const morph = Float32Array.from(
      attributes.raisedPositions,
      (value, index) => (value - positions[index]) / scale
    )
    ;[indices] = MeshoptSimplifier.simplifyWithAttributes(
      welded,
      positions,
      3,
      morph,
      3,
      [0.5, 0.5, 0.5],
      null,
      Math.floor((welded.length * 0.4) / 3) * 3,
      0.006,
      ['LockBorder']
    )
  }
  const hash = createHash('sha256')
  // 按实际引用重排所有姿态，避免减面只缩索引却继续下载、上传废弃顶点。
  const vertices = [...new Set(indices)]
  const lookup = new Map(vertices.map((value, index) => [value, index]))
  const arrays = Object.fromEntries(
    Object.entries(attributes).map(([name, source]) => [
      name,
      Float32Array.from(
        vertices.flatMap((index) =>
          Array.from(source.subarray(index * 3, index * 3 + 3))
        )
      ),
    ])
  )
  arrays.indices = Uint16Array.from(indices, (index) => lookup.get(index))
  const output = {
    version: 2,
    size: metadata.size,
    attributes: {},
    stats: { vertices: vertices.length, faces: indices.length / 3 },
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
  await writeFile(new URL('sprigatito-sleep.bin.gz', directory), packed)
  await writeFile(new URL('sprigatito-sleep.json', directory), json)
  console.log(
    `Sprigatito: ${vertices.length} vertices, ${
      indices.length / 3
    } faces, ${offset} GPU bytes, ${packed.length} download bytes`
  )
  await writeFile(
    new URL(
      '../../src/utils/sprigatitoModelRevision.generated.json',
      import.meta.url
    ),
    JSON.stringify({ revision: hash.digest('hex').slice(0, 16) })
  )
}
