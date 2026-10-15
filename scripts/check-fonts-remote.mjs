import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(
  readFileSync(new URL('./fonts/generated/manifest.json', import.meta.url))
)
const pending = [...manifest.shards]
const failures = []

// 校验公开域名实际返回的内容和跨域许可，避免上传成功但网页仍无法使用。
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (pending.length) {
      const shard = pending.shift()
      try {
        const response = await fetch(shard.url, {
          headers: { Origin: 'https://anuluca.com' },
          signal: AbortSignal.timeout(30000),
        })
        assert.equal(response.status, 200, `HTTP ${response.status}`)
        assert.ok(
          ['*', 'https://anuluca.com'].includes(
            response.headers.get('access-control-allow-origin')
          ),
          'Missing font CORS permission'
        )
        const bytes = Buffer.from(await response.arrayBuffer())
        assert.equal(
          createHash('sha256').update(bytes).digest('hex'),
          shard.sha256,
          'Font content differs from manifest'
        )
      } catch (error) {
        failures.push(`${shard.file}: ${error.message}`)
      }
    }
  })
)
assert.equal(failures.length, 0, failures.join('\n'))
console.log(
  `Production font responses verified: ${manifest.shards.length} shards`
)
