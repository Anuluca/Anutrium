import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const bucket = process.argv[2]
if (!bucket || !/^[a-z0-9-]+$/.test(bucket)) {
  throw new Error('Usage: yarn upload:fonts <existing-r2-bucket>')
}
const run = (args) => {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`Upload command exited ${result.status}`)
}
run(['scripts/check-unbounded-fonts.mjs'])
const generated = path.join(root, 'scripts/fonts/generated')
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json')))
const temporary = mkdtempSync(path.join(tmpdir(), 'anutrium-fonts-'))
const wrangler = path.join(
  root,
  'worker/node_modules/wrangler/wrangler-dist/cli.js'
)
try {
  const uploadList = path.join(temporary, 'upload.json')
  writeFileSync(
    uploadList,
    JSON.stringify(
      manifest.shards.map((shard) => ({
        key: `fonts/unbounded/${shard.file}`,
        file: path.join(generated, shard.file),
      }))
    )
  )
  // Content-addressed filenames preserve older deployed pages' font URLs.
  run([
    wrangler,
    'r2',
    'bulk',
    'put',
    bucket,
    '--filename',
    uploadList,
    '--remote',
    '--force',
    '--concurrency',
    '6',
    '--content-type',
    'font/woff2',
    '--cache-control',
    'public, max-age=31536000, immutable',
  ])
  run([
    wrangler,
    'r2',
    'object',
    'put',
    `${bucket}/fonts/unbounded/OFL.txt`,
    '--file',
    path.join(generated, 'OFL.txt'),
    '--remote',
    '--content-type',
    'text/plain; charset=utf-8',
    '--cache-control',
    'public, max-age=3600',
  ])
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
