import { build } from 'esbuild'
import { Miniflare } from 'miniflare'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { test } from 'node:test'

const token = randomBytes(32).toString('hex')
const bundle = await build({
  entryPoints: ['src/index.ts'],
  external: ['cloudflare:workers'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
})
const mf = new Miniflare({
  modules: true,
  script: bundle.outputFiles[0].text,
  compatibilityDate: '2026-08-08',
  r2Buckets: ['FLORATRIUM_BUCKET'],
  bindings: {
    HOME_FEATURES_TOKEN: token,
    ALLOWED_ORIGINS: 'https://anuluca.com',
  },
})
const call = (path, init) =>
  mf.dispatchFetch(`https://worker.invalid${path}`, init)
const document =
  '---\ntitle: "在线笔记"\ndate: "2026-10-31"\ncategory: technology\n---\n\n# Hello\n\n```ts\nconst value = 1\n```\n'
const write = (id, source = document, key = token) =>
  call(`/admin/notes/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'text/markdown',
    },
    body: source,
  })
try {
  await test('public notes cannot write, admin endpoints require authentication, invalid ids cannot escape notes/', async () => {
    assert.equal((await call('/admin/notes')).status, 401)
    assert.equal((await write(randomUUID(), document, 'bad')).status, 401)
    assert.equal(
      (await call(`/notes/${randomUUID()}`, { method: 'PUT', body: document }))
        .status,
      405
    )
    assert.equal((await call('/notes/not-a-note')).status, 404)
    assert.deepEqual(await (await call('/notes')).json(), {
      notes: [],
      nextCursor: null,
    })
  })
  const id = randomUUID()
  await test('a Markdown file atomically publishes metadata and body, survives rereads, and retries are idempotent', async () => {
    assert.equal((await write(id)).status, 201)
    assert.equal((await write(id)).status, 200)
    assert.equal((await write(id, document + 'different')).status, 409)
    const response = await call(`/notes/${id}`)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.match(response.headers.get('content-type'), /text\/markdown/)
    assert.equal(await response.text(), document)
    const list = await (await call('/notes')).json()
    assert.equal(list.notes.length, 1)
    assert.deepEqual(list.notes[0], {
      id,
      etag: response.headers.get('etag'),
      title: '在线笔记',
      time: '2026-10-31',
      type: 'technology',
      path: `/atrium/notes?note=${id}`,
    })
    const bucket = await mf.getR2Bucket('FLORATRIUM_BUCKET')
    assert.equal((await bucket.list()).objects.length, 1)
    assert.equal(await (await bucket.get(`notes/${id}.md`)).text(), document)
  })
  await test('rejects missing metadata, invalid calendar dates, unknown categories, local covers, aliases and oversized UTF-8 before storage', async () => {
    const invalid = [
      '# No metadata',
      document.replace('2026-10-31', '2026-02-31'),
      document.replace('technology', 'backend'),
      document.replace(
        'category: technology',
        'category: technology\ncover: /@fs/local.jpg'
      ),
      document.replace(
        'category: technology',
        'category: technology\nsecret: bad'
      ),
      document.replace(
        'category: technology',
        'category: technology\ncategory: daily'
      ),
      document.replace('"在线笔记"', '&a [*a]'),
      document.split('---\n\n')[0] + '---\n\n',
    ]
    for (const source of invalid)
      assert.equal((await write(randomUUID(), source)).status, 400, source)
    assert.equal(
      (await write(randomUUID(), document + '中'.repeat(100000))).status,
      413
    )
    assert.equal((await call(`/notes/${randomUUID()}`)).status, 404)
    const bucket = await mf.getR2Bucket('FLORATRIUM_BUCKET')
    assert.equal((await bucket.list()).objects.length, 1)
  })
  await test('pagination follows R2 cursors and never truncates notes silently', async () => {
    const bucket = await mf.getR2Bucket('FLORATRIUM_BUCKET')
    for (let i = 0; i < 101; i++)
      await bucket.put(`notes/${randomUUID()}.md`, document, {
        customMetadata: {
          title: `note ${i}`,
          time: '2026-10-31',
          type: 'daily',
        },
      })
    const first = await (await call('/notes')).json()
    assert.equal(first.notes.length, 100)
    assert.ok(first.nextCursor)
    const second = await (
      await call(`/notes?cursor=${encodeURIComponent(first.nextCursor)}`)
    ).json()
    assert.equal(second.notes.length, 2)
    assert.equal(second.nextCursor, null)
    assert.equal(
      new Set([...first.notes, ...second.notes].map((note) => note.id)).size,
      102
    )
  })
  const editId = randomUUID()
  const mutation = (method, id, etag, source) =>
    call(`/admin/notes/${id}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(etag ? { 'If-Match': etag } : {}),
        ...(source ? { 'Content-Type': 'text/markdown' } : {}),
      },
      body: source,
    })
  await test('editing requires a current ETag, atomically updates source and metadata, and refuses stale writes', async () => {
    const created = await write(editId)
    const firstTag = created.headers.get('etag')
    assert.ok(firstTag)
    const read = await call(`/notes/${editId}`)
    assert.equal(read.headers.get('etag'), firstTag)
    assert.equal(read.headers.get('X-Note-Version'), firstTag)
    const updated = document
      .replace('在线笔记', '修改后的笔记')
      .replace('technology', 'daily')
    assert.equal((await mutation('PATCH', editId, null, updated)).status, 428)
    const saved = await mutation('PATCH', editId, firstTag, updated)
    assert.equal(saved.status, 200)
    const secondTag = saved.headers.get('etag')
    assert.equal(saved.headers.get('X-Note-Version'), secondTag)
    assert.notEqual(firstTag, secondTag)
    assert.equal(
      (await mutation('PATCH', editId, firstTag, document)).status,
      412
    )
    assert.equal(await (await call(`/notes/${editId}`)).text(), updated)
    const list = await (await call('/notes')).json()
    // R2 列表按键名分页，逐页查找测试条目。
    let found = list.notes.find((note) => note.id === editId)
    if (!found && list.nextCursor)
      found = (
        await (
          await call(`/notes?cursor=${encodeURIComponent(list.nextCursor)}`)
        ).json()
      ).notes.find((note) => note.id === editId)
    assert.equal(found.title, '修改后的笔记')
    assert.equal(found.type, 'daily')
    assert.equal(found.etag, secondTag)
    assert.equal(
      (await mutation('PATCH', randomUUID(), firstTag, document)).status,
      404
    )
    assert.equal(
      (await call(`/notes/${editId}`, { method: 'PATCH', body: updated }))
        .status,
      405
    )
  })
  await test('conditional deletion rejects stale versions, removes source and list visibility, and cannot resurrect an id', async () => {
    const current = await call(`/notes/${editId}`)
    const etag = current.headers.get('etag')
    assert.equal((await mutation('DELETE', editId)).status, 428)
    assert.equal((await mutation('DELETE', editId, '"stale"')).status, 412)
    assert.equal(
      (await call(`/notes/${editId}`, { method: 'DELETE' })).status,
      405
    )
    assert.equal(
      (
        await call(`/admin/notes/${editId}`, {
          method: 'DELETE',
          headers: { 'If-Match': etag },
        })
      ).status,
      401
    )
    assert.equal((await mutation('DELETE', editId, etag)).status, 200)
    assert.equal((await mutation('DELETE', editId, etag)).status, 200)
    assert.equal((await call(`/notes/${editId}`)).status, 404)
    assert.equal((await mutation('PATCH', editId, etag, document)).status, 404)
    assert.equal((await write(editId)).status, 404)
    const bucket = await mf.getR2Bucket('FLORATRIUM_BUCKET')
    const object = await bucket.get(`notes/${editId}.md`)
    assert.equal(await object.text(), '')
    assert.equal(object.customMetadata.deleted, 'true')
    let cursor = null
    do {
      const page = await (
        await call(
          '/notes' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : '')
        )
      ).json()
      assert.ok(!page.notes.some((note) => note.id === editId))
      cursor = page.nextCursor
    } while (cursor)
  })
  await test('two concurrent edits from one version cannot both succeed', async () => {
    const id = randomUUID()
    const created = await write(id)
    const etag = created.headers.get('etag')
    const results = await Promise.all([
      mutation('PATCH', id, etag, document + 'first'),
      mutation('PATCH', id, etag, document + 'second'),
    ])
    assert.deepEqual(
      results.map((response) => response.status).sort(),
      [200, 412]
    )
    const source = await (await call(`/notes/${id}`)).text()
    assert.ok(source === document + 'first' || source === document + 'second')
  })
  await test('all configured categories persist and deprecated frontend is rejected', async () => {
    for (const category of ['technology', 'pokemon', 'daily', 'test']) {
      const id = randomUUID()
      const source = document.replace(
        'category: technology',
        `category: ${category}`
      )
      const saved = await write(id, source)
      assert.equal(saved.status, 201)
      assert.equal((await saved.json()).type, category)
      assert.equal(await (await call(`/notes/${id}`)).text(), source)
    }
    assert.equal(
      (
        await write(
          randomUUID(),
          document.replace('category: technology', 'category: frontend')
        )
      ).status,
      400
    )
  })
} finally {
  await mf.dispose()
}
