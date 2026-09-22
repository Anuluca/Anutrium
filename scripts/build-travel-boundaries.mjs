import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const sourceDirectory = path.join(projectRoot, 'scripts/data/visited-regions')
const outputFile = path.join(projectRoot, 'public/geo/visited-regions.geojson')
const regionIds = [
  'anhui',
  'beijing',
  'chongqing',
  'fujian',
  'guangdong',
  'hubei',
  'hunan',
  'jiangsu',
  'jiangxi',
  'shanghai',
  'singapore',
]

// At the map's maximum zoom, 0.005 degrees stays near or below one screen pixel.
const simplifyTolerance = 0.005
const coordinatePrecision = 4

const squaredSegmentDistance = (point, start, end) => {
  let x = start[0]
  let y = start[1]
  let deltaX = end[0] - x
  let deltaY = end[1] - y

  if (deltaX || deltaY) {
    const ratio =
      ((point[0] - x) * deltaX + (point[1] - y) * deltaY) /
      (deltaX * deltaX + deltaY * deltaY)

    if (ratio > 1) {
      x = end[0]
      y = end[1]
    } else if (ratio > 0) {
      x += deltaX * ratio
      y += deltaY * ratio
    }
  }

  deltaX = point[0] - x
  deltaY = point[1] - y
  return deltaX * deltaX + deltaY * deltaY
}

const simplifyOpenLine = (points) => {
  if (points.length <= 2) return points

  const keep = new Uint8Array(points.length)
  const toleranceSquared = simplifyTolerance * simplifyTolerance
  const pendingRanges = [[0, points.length - 1]]
  keep[0] = 1
  keep[points.length - 1] = 1

  while (pendingRanges.length) {
    const [startIndex, endIndex] = pendingRanges.pop()
    let furthestIndex = -1
    let furthestDistance = toleranceSquared

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = squaredSegmentDistance(
        points[index],
        points[startIndex],
        points[endIndex]
      )
      if (distance > furthestDistance) {
        furthestDistance = distance
        furthestIndex = index
      }
    }

    if (furthestIndex < 0) continue
    keep[furthestIndex] = 1
    pendingRanges.push([startIndex, furthestIndex], [furthestIndex, endIndex])
  }

  return points.filter((_, index) => keep[index])
}

const simplifyRing = (ring) => {
  if (ring.length <= 5) return ring

  const points = ring.slice(0, -1)
  let pivotIndex = 1
  let pivotDistance = -1

  for (let index = 1; index < points.length; index += 1) {
    const deltaX = points[index][0] - points[0][0]
    const deltaY = points[index][1] - points[0][1]
    const distance = deltaX * deltaX + deltaY * deltaY
    if (distance > pivotDistance) {
      pivotDistance = distance
      pivotIndex = index
    }
  }

  const firstArc = simplifyOpenLine(points.slice(0, pivotIndex + 1))
  const secondArc = simplifyOpenLine([...points.slice(pivotIndex), points[0]])
  const simplified = [...firstArc.slice(0, -1), ...secondArc]
  return simplified.length >= 4 ? simplified : ring
}

const simplifyGeometry = (geometry) => ({
  type: geometry.type,
  coordinates:
    geometry.type === 'Polygon'
      ? geometry.coordinates.map(simplifyRing)
      : geometry.coordinates.map((polygon) => polygon.map(simplifyRing)),
})

const features = await Promise.all(
  regionIds.map(async (regionId) => {
    const source = JSON.parse(
      await readFile(path.join(sourceDirectory, `${regionId}.geojson`), 'utf8')
    )
    const sourceFeature = source.features[0]

    return {
      type: 'Feature',
      properties: { regionId },
      geometry: simplifyGeometry(sourceFeature.geometry),
    }
  })
)

const output = JSON.stringify(
  { type: 'FeatureCollection', features },
  (_, value) =>
    typeof value === 'number'
      ? Number(value.toFixed(coordinatePrecision))
      : value
)

await writeFile(outputFile, `${output}\n`)
console.log(
  `Generated ${path.relative(projectRoot, outputFile)} (${output.length} B)`
)
