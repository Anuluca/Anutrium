import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root))
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const manifest = JSON.parse(read('scripts/fonts/generated/manifest.json'))
const stylesheet = read('src/assets/style/fonts/unbounded.generated.less')

assert.equal(
  sha256(read('scripts/fonts/UnboundedSans-Regular.ttf')),
  manifest.sourceSha256,
  'Source font changed: run yarn build:fonts'
)
assert.equal(sha256(stylesheet), manifest.stylesheetSha256)

const covered = new Set()
for (const shard of manifest.shards) {
  const bytes = read(`scripts/fonts/generated/${shard.file}`)
  assert.equal(bytes.subarray(0, 4).toString(), 'wOF2')
  assert.equal(sha256(bytes), shard.sha256, `Corrupt font shard: ${shard.file}`)
  assert.ok(stylesheet.includes(`url('${shard.url}')`))
  assert.ok(stylesheet.includes(`unicode-range: ${shard.unicodeRange};`))
  for (const point of shard.codepoints) {
    assert.ok(
      !covered.has(point),
      `Overlapping character U+${point.toString(16)}`
    )
    covered.add(point)
  }
}
assert.deepEqual(
  [...covered].sort((a, b) => a - b),
  manifest.sourceCodepoints
)
assert.ok(covered.has('谢'.codePointAt(0)), 'Regression: 谢 is missing')
assert.ok(read('index.html').includes(`href="${manifest.shards[0].url}"`))
console.log(
  `Font coverage verified: ${covered.size} characters, ${
    manifest.shards.length
  } shards (${fileURLToPath(root)})`
)
