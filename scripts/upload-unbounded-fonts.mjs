import { spawnSync } from 'node:child_process'
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
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
// 全量同步会删除本地没有的远端对象；上传前保留同一份有哈希的字体文件。
const mirrorRoot =
  process.env.FONT_R2_MIRROR_ROOT || path.resolve(root, '../R2')
if (
  process.env.FONT_R2_MIRROR_ROOT ||
  existsSync(path.join(mirrorRoot, '全量同步R2.sh'))
) {
  if (!existsSync(mirrorRoot))
    throw new Error(`R2 mirror root does not exist: ${mirrorRoot}`)
  const mirrorDirectory = path.join(mirrorRoot, 'fonts/unbounded')
  mkdirSync(mirrorDirectory, { recursive: true })
  for (const file of [
    ...manifest.shards.map((shard) => shard.file),
    'OFL.txt',
  ]) {
    const source = path.join(generated, file)
    const destination = path.join(mirrorDirectory, file)
    if (existsSync(destination)) {
      if (!readFileSync(source).equals(readFileSync(destination)))
        throw new Error(
          `Refusing to overwrite a different local R2 font: ${destination}`
        )
      continue
    }
    copyFileSync(source, destination, constants.COPYFILE_EXCL)
  }
  console.log(
    `Font mirror verified: ${manifest.shards.length} shards and license (${mirrorDirectory})`
  )
}
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
  run(['scripts/check-fonts-remote.mjs'])
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
