import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

// 固定上游版本与校验值，更新词表时须显式审阅来源变化。
const revision = '71d7dd07676edb60ade43552e10b41314b7e9287'
const base = `https://raw.githubusercontent.com/en-wl/wordlist-diff/${revision}/`
const hashes = {
  'en_US.txt':
    '4ff7e0b6d86763e1e042ffd746e94cdf4432618702deac303a1669e2a838db04',
  Copyright: '090575a131b4260926c7a6b30a90aca0f5db5fbb5c46778e0c5855227bf6ebc3',
}
async function download(name) {
  const response = await fetch(base + name, {
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (createHash('sha256').update(bytes).digest('hex') !== hashes[name])
    throw new Error(`${name}: upstream checksum mismatch`)
  return bytes.toString('utf8')
}
const [source, license] = await Promise.all([
  download('en_US.txt'),
  download('Copyright'),
])
// 保留上游小写完整词形，不把专有名词转成小写混入词表。
const words = [
  ...new Set(source.split(/\r?\n/).filter((word) => /^[a-z]{3,}$/.test(word))),
].sort()
const notice = license.split('\n===')[0].trim()
const header = `ESDB 2026.02.25 / en_US (size 60)\nSource: ${base}en_US.txt\n\n${notice}`
const output =
  header
    .split('\n')
    .map((line) => `# ${line}`)
    .join('\n') +
  '\n' +
  words.join('\n') +
  '\n'
const directory = fileURLToPath(
  new URL('../src/assets/wordlists/', import.meta.url)
)
await mkdir(directory, { recursive: true })
await writeFile(directory + 'english-words.txt', output)
await writeFile(directory + 'LICENSE.txt', license)
await writeFile(
  directory + 'README.md',
  `# English analysis wordlist\n\n- Source: ${base}en_US.txt\n- Release: ESDB 2026.02.25, en_US standard / size 60.\n- Filter: unique existing lowercase ASCII words, at least three letters. This does not imply semantic meaning or everyday usage.\n- Entries: ${
    words.length
  }.\n- Raw bytes: ${Buffer.byteLength(output)}; gzip level 9: ${
    gzipSync(output, { level: 9 }).length
  } bytes.\n- Rebuild: \`node scripts/build-english-wordlist.mjs\`. No network access is needed during normal application builds.\n- Copyright and permission are embedded in the served wordlist; full upstream notices are retained in LICENSE.txt.\n`
)
console.log(
  `Built ${words.length} words, ${Buffer.byteLength(output)} bytes (${
    gzipSync(output, { level: 9 }).length
  } gzip bytes).`
)
