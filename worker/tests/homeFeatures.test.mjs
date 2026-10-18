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
  await test('invalid JSON, oversized bodies and unknown fields cannot mutate saved config', async () => {
    for (const value of [
      null,
      {},
      { lucarioHeadache: 'true' },
      { lucarioHeadache: true, other: false },
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
    await bucket.put('config/home-features.json', '{"lucarioHeadache":"true"}')
    assert.equal((await call('/site/home-features')).status, 503)
    await mf.setOptions({
      ...options,
      bindings: { ALLOWED_ORIGINS: 'https://anuluca.com' },
    })
    assert.equal((await write({ lucarioHeadache: true })).status, 503)
  })
} finally {
  await mf.dispose()
}
