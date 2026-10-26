import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync, gzipSync } from 'node:zlib'

// 直接提取高档标签的正面三角形：保留字孔、字符 ID 和原始前表面深度，不引入纹理/字体栅格化。
export async function bakeTempleFlatLabelAsset() {
  const directory = new URL('../../public/models/', import.meta.url)
  const reference = JSON.parse(
    await readFile(new URL('temple-label.json', directory), 'utf8')
  )
  const raw = gunzipSync(
    await readFile(new URL('temple-label.bin.gz', directory))
  )
  const floats = (name) =>
    new Float32Array(
      raw.buffer,
      raw.byteOffset + reference.attributes[name].offset,
      reference.attributes[name].count
    )
  const positions = floats('position'),
    normals = floats('normal'),
    characters = floats('statueLabelCharacter')
  const sourceIndices = new Uint16Array(
    raw.buffer,
    raw.byteOffset + reference.attributes.indices.offset,
    reference.attributes.indices.count
  )
  const remap = new Map(),
    position = [],
    normal = [],
    ids = [],
    indices = []
  for (let offset = 0; offset < sourceIndices.length; offset += 3) {
    const triangle = sourceIndices.subarray(offset, offset + 3)
    if (!triangle.every((index) => normals[index * 3 + 2] > 0.9999)) continue
    for (const index of triangle) {
      if (!remap.has(index)) {
        remap.set(index, remap.size)
        position.push(...positions.subarray(index * 3, index * 3 + 3))
        normal.push(0, 0, 1)
        ids.push(characters[index])
      }
      indices.push(remap.get(index))
    }
  }
  if (!indices.length) throw new Error('Temple label has no front faces')
  const metadata = {
    version: 1,
    halfHeight: reference.halfHeight,
    depth: reference.depth,
    planar: true,
    attributes: {},
    faces: indices.length / 3,
  }
  const arrays = {
    position: Float32Array.from(position),
    normal: Float32Array.from(normal),
    statueLabelCharacter: Float32Array.from(ids),
    indices: Uint16Array.from(indices),
  }
  const chunks = []
  let offset = 0
  for (const [name, array] of Object.entries(arrays)) {
    metadata.attributes[name] = { offset, count: array.length }
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength)
    chunks.push(bytes)
    offset += bytes.length
  }
  const packed = gzipSync(Buffer.concat(chunks), { level: 9 })
  await writeFile(
    new URL('temple-label-flat.json', directory),
    JSON.stringify(metadata)
  )
  await writeFile(new URL('temple-label-flat.bin.gz', directory), packed)
  console.log(
    `Temple label (flat): ${metadata.faces} faces, ${offset} geometry bytes, ${packed.length} download bytes`
  )
}
