import { build } from 'esbuild'
import { Miniflare } from 'miniflare'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { test } from 'node:test'
const token = randomBytes(32).toString('hex')
const bundle = await build({ entryPoints: ['src/index.ts'], external: ['cloudflare:workers'], bundle: true, format: 'esm', platform: 'neutral', write: false })
const mf = new Miniflare({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-08-08', r2Buckets: ['FLORATRIUM_BUCKET'], ratelimits: { MONKEY_CREATE_LIMITER: { namespace_id: '7301', simple: { limit: 5, period: 60 } } }, bindings: { HOME_FEATURES_TOKEN: token, ALLOWED_ORIGINS: 'https://anuluca.com' } })
const call = (path, init) => mf.dispatchFetch(`https://worker.invalid${path}`, init)
const newId = () => `${9999999999999 - Date.now()}-${randomUUID()}`
const create = (id, ip = randomUUID(), extra = {}) => call('/monkey-articles', { method: 'POST', headers: { Origin: 'https://anuluca.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify({ id, title: 'A draft', content: 'First edited sentence.\n\n第二段。', ...extra }) })
try {
  await test('generation does not persist; saves preserve edits and retries remain idempotent', async () => {
    const generated = await call('/monkey-articles/generate', { method:'POST', headers:{Origin:'https://anuluca.com','Content-Type':'application/json'}, body:'{}' })
    assert.equal(generated.status,200)
    const draft = await generated.json()
    assert.match(draft.content, /^[A-Za-z .?!\n]+$/)
    assert.equal(draft.content.split('\n\n').length,4)
    assert.deepEqual((await (await call('/monkey-articles')).json()).articles,[])
    const id = newId()
    const attempts = await Promise.all([create(id),create(id),create(id)])
    const bodies = await Promise.all(attempts.map(response=>response.json()))
    assert.deepEqual(bodies[0],bodies[1]); assert.deepEqual(bodies[0],bodies[2])
    const article = bodies[0]
    assert.equal(article.content,'First edited sentence.\n\n第二段。')
    assert.equal(article.words,4)
    assert.equal(article.characters,article.content.length)
    assert.deepEqual(await (await call(`/monkey-articles/${id}`)).json(),article)
    assert.equal((await (await call('/monkey-articles')).json()).articles[0].id,id)
    assert.equal((await create(id,undefined,{content:'Changed body'})).status,409)
    assert.equal((await create(newId())).status,201)
  })
  await test('origins, arbitrary content, stale ids, body limits and admin authentication', async () => {
    assert.equal((await call('/admin/monkey-articles')).status, 401)
    assert.equal((await create(newId(), undefined, { content: '' })).status, 400)
    assert.equal((await create(`${9999999999999 - Date.now() + 600000}-${randomUUID()}`)).status, 400)
    assert.equal((await call('/monkey-articles', { method: 'POST', body: '{}' })).status, 403)
    assert.equal((await call('/monkey-articles', { method: 'POST', headers: { Origin: 'https://evil.invalid' }, body: '{}' })).status, 403)
    assert.equal((await call('/monkey-articles', { method: 'POST', headers: { Origin: 'https://anuluca.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'x'.repeat(2000) }) })).status, 400)
    assert.equal((await call(`/monkey-articles/${newId()}`, { method: 'DELETE' })).status, 405)
    const preflight = await call('/monkey-articles', { method: 'OPTIONS', headers: { Origin: 'https://anuluca.com' } })
    assert.match(preflight.headers.get('Access-Control-Allow-Methods'), /POST/)
  })
  await test('plain text is bounded and markup is stored literally', async () => {
    for (const extra of [{title:''},{title:'x'.repeat(121)},{content:'x'.repeat(12001)},{content:'bad\u0000text'}])
      assert.equal((await create(newId(),undefined,extra)).status,400)
    const html = '<img src=x onerror=alert(1)> & 中文 😀'
    const result = await create(newId(),undefined,{content:html})
    assert.equal(result.status,201)
    assert.equal((await result.json()).content,html)
    assert.equal((await call('/monkey-articles',{method:'POST',headers:{Origin:'https://anuluca.com','Content-Type':'application/json'},body:'x'.repeat(64001)})).status,413)
  })
  await test('rate limit is independent per IP', async () => {
    const ip = randomUUID()
    for (let i = 0; i < 5; i++) assert.equal((await create(newId(), ip)).status, 201)
    const blocked = await create(newId(), ip)
    assert.equal(blocked.status, 429); assert.equal(blocked.headers.get('Retry-After'), '60')
    assert.equal((await create(newId())).status, 201)
  })
  await test('complete ordered cursor pagination and conditional removal without resurrection', async () => {
    const bucket = await mf.getR2Bucket('FLORATRIUM_BUCKET')
    for (let i = 0; i < 25; i++) {
      const id = newId()
      const article = { id, title: `archive ${i}`, createdAt: new Date().toISOString(), words: 1, characters: 3, content: 'abc', preview: 'abc' }
      const { content, ...summary } = article
      await bucket.put(`monkey-articles/${id}.json`, JSON.stringify(article), { customMetadata: { summary: JSON.stringify(summary) } })
    }
    const found = []
    let cursor
    do {
      const list = await (await call(`/monkey-articles${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)).json()
      assert.ok(list.articles.length <= 20)
      found.push(...list.articles.map(article => article.id)); cursor = list.nextCursor
    } while (cursor)
    assert.equal(new Set(found).size, found.length); assert.equal(found.length, 34)
    assert.deepEqual([...found].sort(), found)
    const id = found[0]
    const read = await call(`/admin/monkey-articles/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(read.headers.get('X-Article-Version'), read.headers.get('ETag'))
    const headers = { Authorization: `Bearer ${token}`, 'If-Match': '"wrong"' }
    assert.equal((await call(`/admin/monkey-articles/${id}`, { method: 'DELETE', headers })).status, 412)
    headers['If-Match'] = read.headers.get('ETag')
    assert.equal((await call(`/admin/monkey-articles/${id}`, { method: 'DELETE', headers })).status, 200)
    assert.equal((await call(`/monkey-articles/${id}`)).status, 404)
    assert.equal((await create(id)).status, 410)
    assert.ok(!(await (await call('/monkey-articles')).json()).articles.some(article => article.id === id))
  })
} finally { await mf.dispose() }
