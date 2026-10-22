import { build } from 'esbuild'
import { Miniflare } from 'miniflare'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { test } from 'node:test'

import { quotaDate } from '../src/floraLikeDay.ts'

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
  durableObjects: { FLORA_LIKES: { className: 'FloraLikes', useSQLite: true } },
  bindings: {
    HOME_FEATURES_TOKEN: token,
    ALLOWED_ORIGINS: 'https://anuluca.com',
  },
})
const call = (path, init) =>
  mf.dispatchFetch(`https://worker.invalid${path}`, init)
const read = async (visitorToken) => {
  const r = await call('/floratrium/likes', {
    headers: visitorToken ? { 'X-Flora-Visitor': visitorToken } : {},
  })
  assert.equal(r.status, 200)
  return r.json()
}
const like = (visitorToken, petId = 'huahua', requestId = randomUUID()) =>
  call('/floratrium/likes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 iPhone Mobile Safari/605.1',
    },
    body: JSON.stringify({ visitorToken, petId, requestId }),
    cf: { country: 'CN' },
  })
const admin = () =>
  call('/admin/floratrium/likes', {
    headers: { Authorization: `Bearer ${token}` },
  })
const update = (body) =>
  call('/admin/floratrium/likes', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
try {
  await test('日额度按北京时间零点切换', () => {
    assert.equal(
      quotaDate(Date.parse('2026-10-19T15:59:59Z')).day,
      '2026-10-19'
    )
    assert.equal(
      quotaDate(Date.parse('2026-10-19T16:00:00Z')).day,
      '2026-10-20'
    )
    assert.equal(
      quotaDate(Date.parse('2026-10-19T16:00:00Z')).resetsAt,
      '2026-10-20T16:00:00.000Z'
    )
  })
  await test('身份签发、管理鉴权与 CORS', async () => {
    const value = await read()
    assert.deepEqual(value.counts, { huahua: 0, xiaohei: 0 })
    assert.equal(value.remaining, 10)
    assert.equal((await call('/admin/floratrium/likes')).status, 401)
    assert.equal((await like('forged')).status, 401)
    const preflight = await call('/floratrium/likes', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://anuluca.com',
        'Access-Control-Request-Method': 'POST',
      },
    })
    assert.equal(preflight.status, 204)
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/)
    assert.equal(
      (
        await call('/floratrium/likes', {
          method: 'POST',
          headers: { Origin: 'https://evil.invalid' },
        })
      ).status,
      403
    )
  })
  await test('重试不重复计数，同一 ID 不能跨模型重用', async () => {
    const v = await read()
    const id = randomUUID()
    assert.equal((await like(v.visitorToken, 'huahua', id)).status, 200)
    const response = await like(v.visitorToken, 'huahua', id)
    assert.equal(response.status, 200)
    assert.equal((await response.json()).counts.huahua, 1)
    assert.equal((await like(v.visitorToken, 'xiaohei', id)).status, 409)
  })
  await test('并发跨模型共享十次额度，统计和总数一致', async () => {
    const v = await read()
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        like(v.visitorToken, i % 2 ? 'huahua' : 'xiaohei')
      )
    )
    assert.equal(responses.filter((r) => r.status === 200).length, 10)
    assert.equal(responses.filter((r) => r.status === 429).length, 10)
    const state = await read(v.visitorToken)
    assert.equal(state.remaining, 0)
    assert.equal(state.counts.huahua + state.counts.xiaohei, 11)
    const report = await (await admin()).json()
    assert.equal(report.days[0].visitors, 2)
    assert.equal(
      report.days[0].counts.huahua + report.days[0].counts.xiaohei,
      11
    )
    assert.equal(report.days[0].devices.mobile, 11)
    assert.ok(!('visitorToken' in report))
    assert.ok(!('visitors' in report))
  })
  await test('后台改总数不改点击统计，版本冲突不会覆盖新点击', async () => {
    const before = await (await admin()).json()
    const saved = await update({
      counts: { huahua: 500, xiaohei: 100 },
      version: before.version,
    })
    assert.equal(saved.status, 200)
    const data = await saved.json()
    assert.deepEqual(data.counts, { huahua: 500, xiaohei: 100 })
    assert.deepEqual(data.days, before.days)
    assert.equal(data.adjustments.length, 1)
    assert.equal(
      (
        await update({
          counts: { huahua: 0, xiaohei: 0 },
          version: before.version,
        })
      ).status,
      409
    )
    const v = await read()
    assert.equal((await like(v.visitorToken)).status, 200)
    assert.equal(
      (
        await update({
          counts: { huahua: 0, xiaohei: 0 },
          version: data.version,
        })
      ).status,
      409
    )
    assert.equal(
      (
        await update({
          counts: { huahua: -1, xiaohei: 0 },
          version: data.version,
        })
      ).status,
      400
    )
    assert.equal(new Date(v.resetsAt).getUTCHours(), 16)
  })
} finally {
  await mf.dispose()
}
