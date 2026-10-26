import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync, gzipSync } from 'node:zlib'
import {
  Box3,
  BufferAttribute,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Vector3,
} from 'three'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  mergeGeometries,
  mergeVertices,
} from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export async function bakeTempleLabelAsset(
  quality = 'high',
  {
    text = 'ATRIUM',
    filename: customFilename,
    stagger = true,
    tracking = 0,
  } = {}
) {
  if (!['high', 'low'].includes(quality))
    throw new Error('Invalid label quality')
  const directory = new URL('../../public/models/', import.meta.url)
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
  const letters = [...text]
    .map((letter, index) => {
      if (letter === ' ') {
        offset += (data.glyphs[letter].ha * 0.5625) / data.resolution
        return null
      }
      const shape = new ExtrudeGeometry(font.generateShapes(letter, 0.5625), {
        depth: 0.52,
        steps: 1,
        curveSegments: quality === 'low' ? 1 : 3,
        bevelEnabled: quality !== 'low',
        bevelThickness: 0.024,
        bevelSize: 0.008,
        bevelSegments: 1,
      })
      shape.translate(offset, 0, 0)
      offset += (data.glyphs[letter].ha / data.resolution + tracking) * 0.5625
      shape.setAttribute(
        'statueLabelCharacter',
        new Float32BufferAttribute(
          new Float32Array(shape.getAttribute('position').count).fill(
            stagger ? index : 0
          ),
          1
        )
      )
      return shape
    })
    .filter(Boolean)
  const merged = mergeGeometries(letters)
  merged.deleteAttribute('uv')
  const geometry = mergeVertices(merged)
  merged.dispose()
  letters.forEach((letter) => letter.dispose())
  geometry.scale(6.2 / 1024 / (0.9 / 160), 1, 1)
  geometry.computeBoundingBox()
  if (quality === 'low') {
    // 低档只简化字形曲线和倒角，保持高档包围盒，避免位置、缩放及扫描范围跳变。
    const reference = JSON.parse(
      await readFile(new URL('temple-label.json', directory), 'utf8')
    )
    const packed = gunzipSync(
      await readFile(new URL('temple-label.bin.gz', directory))
    )
    const attribute = reference.attributes.position
    const positions = new Float32Array(
      packed.buffer,
      packed.byteOffset + attribute.offset,
      attribute.count
    )
    const referenceSize = new Box3()
      .setFromBufferAttribute(new BufferAttribute(positions, 3))
      .getSize(new Vector3())
    const size = geometry.boundingBox.getSize(new Vector3())
    geometry.scale(
      referenceSize.x / size.x,
      referenceSize.y / size.y,
      referenceSize.z / size.z
    )
    geometry.computeBoundingBox()
  }
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
  const filename =
    customFilename ?? (quality === 'low' ? 'temple-label-low' : 'temple-label')
  await writeFile(new URL(`${filename}.bin.gz`, directory), packed)
  await writeFile(
    new URL(`${filename}.json`, directory),
    JSON.stringify(metadata)
  )
  geometry.dispose()
  console.log(
    `Temple label (${quality}): ${byteOffset} GPU bytes, ${packed.length} download bytes`
  )
}
