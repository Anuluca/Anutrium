import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'

const root = fileURLToPath(new URL('../', import.meta.url))
process.loadEnvFile(path.resolve(root, '../AnuConsole/.env.local'))
const token = process.env.HOME_FEATURES_TOKEN
assert(token?.length >= 32, '缺少管理员鉴权配置')
const origin = new URL(
  process.env.HOME_FEATURES_URL || 'https://steam-api.anuluca.com'
).origin
assert.equal(origin, 'https://steam-api.anuluca.com')
const hash = (source) => createHash('sha256').update(source).digest('hex')
const request = (route, options = {}) =>
  fetch(new URL(route, origin), {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  })
const listNotes = async () => {
  const notes = []
  const cursors = new Set()
  let cursor = null
  do {
    const response = await request(
      `/admin/notes${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`
    )
    assert(response.ok, `读取列表失败：${response.status}`)
    const page = await response.json()
    assert(Array.isArray(page.notes), '无效列表')
    notes.push(...page.notes)
    cursor = page.nextCursor
    if (cursor) {
      assert(typeof cursor === 'string' && !cursors.has(cursor), '无效分页游标')
      cursors.add(cursor)
    }
  } while (cursor)
  return notes
}
const readNote = async (id) => {
  assert.match(id, /^[0-9a-f-]{36}$/)
  const response = await request(`/admin/notes/${id}`)
  assert(response.ok, `读取 ${id} 失败：${response.status}`)
  // 使用独立版本头，拒绝 CDN 弱 ETag；原始版本用于条件更新。
  const version =
    response.headers.get('X-Note-Version') || response.headers.get('ETag')
  assert.match(version || '', /^"[^"\r\n]{1,128}"$/)
  return { source: await response.text(), version }
}
const reclassify = (source) => {
  const front = source.match(
    /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/
  )
  assert(front, '缺少 YAML 元信息')
  const parsed = parseDocument(front[1], { uniqueKeys: true })
  assert.equal(parsed.errors.length, 0, '无效 YAML')
  const category = parsed.toJS({ maxAliasCount: 0 }).category
  assert.equal(typeof category, 'string')
  assert.equal(
    (front[1].match(/^category:[^\r\n]*\r?$/gm) || []).length,
    1,
    'category 必须为单行字段'
  )
  const updatedFront = front[0].replace(
    /^category:[^\r\n]*(\r?)$/m,
    'category: test$1'
  )
  // 只替换元信息中的 category 行，正文、标题、日期与封面保持逐字节不变。
  return { category, updated: updatedFront + source.slice(front[0].length) }
}

const [mode, argument] = process.argv.slice(2)
assert(
  ['--prepare', '--apply'].includes(mode),
  '使用 --prepare 或 --apply <plan.json>'
)
if (mode === '--prepare') {
  const directory = path.join(
    root,
    '.tmp',
    `notes-test-category-${new Date().toISOString().replace(/[:.]/g, '-')}`
  )
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const plan = { origin, preparedAt: new Date().toISOString(), notes: [] }
  for (const note of await listNotes()) {
    const { source, version } = await readNote(note.id)
    const { category, updated } = reclassify(source)
    await writeFile(path.join(directory, `${note.id}.before.md`), source, {
      mode: 0o600,
    })
    await writeFile(path.join(directory, `${note.id}.after.md`), updated, {
      mode: 0o600,
    })
    plan.notes.push({
      id: note.id,
      title: note.title,
      category,
      version,
      beforeHash: hash(source),
      afterHash: hash(updated),
    })
  }
  const file = path.join(directory, 'plan.json')
  await writeFile(file, JSON.stringify(plan, null, 2) + '\n', { mode: 0o600 })
  console.log(JSON.stringify({ prepared: plan.notes.length, plan: file }))
} else {
  assert(argument, '需要迁移计划文件')
  const file = path.resolve(argument)
  const plan = JSON.parse(await readFile(file, 'utf8'))
  assert.equal(plan.origin, origin)
  const results = []
  for (const note of plan.notes) {
    const source = await readFile(
      path.join(path.dirname(file), `${note.id}.before.md`),
      'utf8'
    )
    const updated = await readFile(
      path.join(path.dirname(file), `${note.id}.after.md`),
      'utf8'
    )
    assert.equal(hash(source), note.beforeHash)
    assert.equal(hash(updated), note.afterHash)
    assert.equal(reclassify(source).updated, updated)
    const current = await readNote(note.id)
    if (hash(current.source) !== note.afterHash) {
      assert.equal(
        current.version,
        note.version,
        `${note.id} 版本已改变，停止迁移`
      )
      assert.equal(hash(current.source), note.beforeHash)
      const response = await request(`/admin/notes/${note.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'text/markdown',
          'If-Match': current.version,
        },
        body: updated,
      })
      assert(response.ok, `更新 ${note.id} 失败：${response.status}，停止迁移`)
    }
    const publicReadback = await fetch(new URL(`/notes/${note.id}`, origin), {
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    })
    assert(publicReadback.ok, `公开回读 ${note.id} 失败`)
    assert.equal(
      hash(await publicReadback.text()),
      note.afterHash,
      `${note.id} 回读内容不一致`
    )
    results.push({ id: note.id, verified: true })
    await writeFile(
      path.join(path.dirname(file), 'results.json'),
      JSON.stringify(results, null, 2) + '\n',
      { mode: 0o600 }
    )
  }
  const current = new Map((await listNotes()).map((note) => [note.id, note]))
  for (const note of plan.notes)
    assert.equal(current.get(note.id)?.type, 'test')
  console.log(
    JSON.stringify({ migratedAndVerified: results.length, total: current.size })
  )
}
