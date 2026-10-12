import { readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { ExtrudeGeometry, Float32BufferAttribute } from 'three'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  mergeGeometries,
  mergeVertices,
} from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export async function bakeTempleLabelAsset() {
  const data = JSON.parse(
    await readFile(
      new URL(
        '../../src/views/Home/islandTextFont.generated.json',
        import.meta.url
      ),
      'utf8'
    )
  )
  const font = new Font(data)
  let offset = 0
  const letters = [...'ISLAND'].map((letter, index) => {
    const shape = new ExtrudeGeometry(font.generateShapes(letter, 0.5625), {
      depth: 0.52,
      steps: 1,
      curveSegments: 3,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.008,
      bevelSegments: 1,
    })
    shape.translate(offset, 0, 0)
    offset += (data.glyphs[letter].ha * 0.5625) / data.resolution
    shape.setAttribute(
      'statueLabelCharacter',
      new Float32BufferAttribute(
        new Float32Array(shape.getAttribute('position').count).fill(index),
        1
      )
    )
    return shape
  })
  const merged = mergeGeometries(letters)
  merged.deleteAttribute('uv')
  const geometry = mergeVertices(merged)
  merged.dispose()
  letters.forEach((letter) => letter.dispose())
  geometry.scale(6.2 / 1024 / (0.9 / 160), 1, 1)
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  const metadata = {
    version: 1,
    halfHeight: (max.y - min.y) / 2,
    depth: max.z - min.z,
    attributes: {},
    faces: geometry.index.count / 3,
  }
  geometry.translate(
    -(min.x + max.x) / 2,
    -(min.y + max.y) / 2,
    -(min.z + max.z) / 2
  )
  const arrays = {
    position: geometry.getAttribute('position').array,
    normal: geometry.getAttribute('normal').array,
    statueLabelCharacter: geometry.getAttribute('statueLabelCharacter').array,
    indices: new Uint16Array(geometry.index.array),
  }
  const chunks = []
  let byteOffset = 0
  for (const [name, array] of Object.entries(arrays)) {
    metadata.attributes[name] = { offset: byteOffset, count: array.length }
    const bytes = Buffer.from(array.buffer)
    chunks.push(bytes)
    byteOffset += bytes.length
  }
  const packed = gzipSync(Buffer.concat(chunks), { level: 9 })
  const directory = new URL('../../public/models/', import.meta.url)
  await writeFile(new URL('temple-label.bin.gz', directory), packed)
  await writeFile(
    new URL('temple-label.json', directory),
    JSON.stringify(metadata)
  )
  geometry.dispose()
  console.log(
    `Temple label: ${byteOffset} GPU bytes, ${packed.length} download bytes`
  )
}
