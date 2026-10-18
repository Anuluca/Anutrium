import { build } from 'esbuild'
import { Miniflare } from 'miniflare'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { test } from 'node:test'

const token = randomBytes(32).toString('hex')
const bundle = await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
})
const options = {
  // 仓库已安装的 Miniflare 支持至 08-08；不修改生产 Worker 的 08-10 日期。
  modules: true,
  script: bundle.outputFiles[0].text,
  compatibilityDate: '2026-08-08',
  r2Buckets: ['FLORATRIUM_BUCKET'],
  bindings: {
    HOME_FEATURES_TOKEN: token,
    ALLOWED_ORIGINS: 'https://anuluca.com',
  },
}
const mf = new Miniflare(options)
const call = (path, init) =>
  mf.dispatchFetch(`https://worker.invalid${path}`, init)
const write = (value, key = token, path = '/admin/home-features') =>
  call(path, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  })

try {
  await test('missing config is normal, public reads cannot write and admin reads require a token', async () => {
    const response = await call('/site/home-features')
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), {
      lucarioHeadache: false,
      headacheCount: 10,
      updatedAt: null,
    })
    assert.equal((await call('/admin/home-features')).status, 401)
    assert.equal((await write({ lucarioHeadache: true }, 'wrong')).status, 401)
    assert.equal(
      (await write({ lucarioHeadache: true }, token, '/site/home-features'))
        .status,
      405
    )
    assert.equal((await call('/profile', { method: 'PUT' })).status, 405)
  })
  await test('authorized updates persist immediately and both reads see the saved state', async () => {
    for (const lucarioHeadache of [true, false]) {
      const response = await write({ lucarioHeadache })
      assert.equal(response.status, 200)
      const saved = await response.json()
      assert.equal(saved.lucarioHeadache, lucarioHeadache)
      assert.ok(Number.isFinite(Date.parse(saved.updatedAt)))
      for (const path of ['/site/home-features', '/admin/home-features']) {
        const read = await call(path, {
          headers: { Authorization: `Bearer ${token}` },
        })
        assert.equal(read.status, 200)
        assert.deepEqual(await read.json(), saved)
      }
    }
  })
  await test('only off-to-on transitions count, public reads never add records', async () => {
    const bucket = await mf.getR2Bucket('FLORATRIUM_BUCKET')
    const key = 'config/home-features.json'
    await bucket.delete(key)
    await call('/site/home-features')
    assert.equal(
      await bucket.get(key),
      null,
      'public reads do not initialize storage'
    )
    assert.equal(
      (await (await write({ lucarioHeadache: false })).json()).headacheCount,
      10
    )
    assert.equal(
      (await (await write({ lucarioHeadache: true })).json()).headacheCount,
      11
    )
    const first = await (await bucket.get(key)).text()
    for (let index = 0; index < 3; index++) {
      assert.equal(
        (await (await write({ lucarioHeadache: true })).json()).headacheCount,
        11
      )
      assert.equal(
        (await (await call('/site/home-features')).json()).headacheCount,
        11
      )
    }
    assert.equal(
      await (await bucket.get(key)).text(),
      first,
      'no-op saves preserve timestamps and history'
    )
    assert.equal(
      (await (await write({ lucarioHeadache: false })).json()).headacheCount,
      11
    )
    assert.equal(
      (await (await write({ lucarioHeadache: true })).json()).headacheCount,
      12
    )
    const stored = await (await bucket.get(key)).json()
    assert.equal(stored.headacheBaseline, 10)
    assert.deepEqual(
      stored.headacheEpisodes.map((item) => item.number),
      [11, 12]
    )
    for (const episode of stored.headacheEpisodes)
      assert.ok(Number.isFinite(Date.parse(episode.startedAt)))
    const publicState = await (await call('/site/home-features')).json()
    assert.equal('headacheEpisodes' in publicState, false)
    await write({ lucarioHeadache: false })
  })
  await test('concurrent first enables commit exactly one episode', async () => {
    const bucket = await mf.getR2Bucket('FLORATRIUM_BUCKET')
    const key = 'config/home-features.json'
    for (const initial of [
      undefined,
      { lucarioHeadache: false, updatedAt: null },
    ]) {
      if (initial) await bucket.put(key, JSON.stringify(initial))
      else await bucket.delete(key)
      const responses = await Promise.all(
        Array.from({ length: 8 }, () => write({ lucarioHeadache: true }))
      )
      for (const response of responses) {
        assert.equal(response.status, 200)
        assert.equal((await response.json()).headacheCount, 11)
      }
      const stored = await (await bucket.get(key)).json()
      assert.equal(stored.headacheEpisodes.length, 1)
      assert.equal(stored.headacheEpisodes[0].number, 11)
    }
    await write({ lucarioHeadache: false })
  })
  await test('legacy active config stays at ten during migration, which only happens once', async () => {
    const bucket = await mf.getR2Bucket('FLORATRIUM_BUCKET')
    const key = 'config/home-features.json'
    const updatedAt = '2026-10-18T06:00:00.000Z'
    await bucket.put(key, JSON.stringify({ lucarioHeadache: true, updatedAt }))
    assert.deepEqual(await (await call('/site/home-features')).json(), {
      lucarioHeadache: true,
      headacheCount: 10,
      updatedAt,
    })
    assert.equal(
      (await (await write({ lucarioHeadache: true })).json()).headacheCount,
      10
    )
    const migrated = await (await bucket.get(key)).text()
    await write({ lucarioHeadache: true })
    assert.equal(await (await bucket.get(key)).text(), migrated)
    await write({ lucarioHeadache: false })
    assert.equal(
      (await (await write({ lucarioHeadache: true })).json()).headacheCount,
      11
    )
    await write({ lucarioHeadache: false })
  })
  await test('invalid JSON, oversized bodies and unknown fields cannot mutate saved config', async () => {
    for (const value of [
      null,
      {},
      { lucarioHeadache: 'true' },
      { lucarioHeadache: true, other: false },
      { lucarioHeadache: true, headacheCount: 999 },
      { lucarioHeadache: 'a'.repeat(1100) },
    ])
      assert.equal((await write(value)).status, 400)
    assert.equal(
      (
        await call('/admin/home-features', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: '{',
        })
      ).status,
      400
    )
    assert.equal(
      (
        await call('/admin/home-features', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'text/plain',
          },
          body: '{}',
        })
      ).status,
      415
    )
    assert.equal(
      (await (await call('/site/home-features')).json()).lucarioHeadache,
      false
    )
    const blocked = await call('/admin/home-features', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: 'https://untrusted.invalid',
      },
    })
    assert.equal(blocked.status, 403)
  })
  await test('corrupt storage is reported as failure, and missing credentials fail closed', async () => {
    const bucket = await mf.getR2Bucket('FLORATRIUM_BUCKET')
    for (const corrupt of [
      '{"lucarioHeadache":"true"}',
      'null',
      '{',
      JSON.stringify({
        lucarioHeadache: false,
        updatedAt: null,
        headacheBaseline: 10,
      }),
      JSON.stringify({
        lucarioHeadache: false,
        updatedAt: null,
        headacheBaseline: 10,
        headacheEpisodes: [{ number: 12, startedAt: 'invalid' }],
      }),
    ]) {
      await bucket.put('config/home-features.json', corrupt)
      assert.equal((await call('/site/home-features')).status, 503)
      assert.equal((await write({ lucarioHeadache: true })).status, 503)
      assert.equal(
        await (await bucket.get('config/home-features.json')).text(),
        corrupt
      )
    }
    await mf.setOptions({
      ...options,
      bindings: { ALLOWED_ORIGINS: 'https://anuluca.com' },
    })
    assert.equal((await write({ lucarioHeadache: true })).status, 503)
  })
} finally {
  await mf.dispose()
}
