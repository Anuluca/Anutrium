import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const dir = await mkdtemp(join(tmpdir(), 'anutrium-analytics-'))
await build({
  external: ['cloudflare:workers'],
  entryPoints: ['src/analytics.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: join(dir, 'analytics.mjs'),
})
const { handleAnalytics } = await import(
  pathToFileURL(join(dir, 'analytics.mjs')).href
)
const pair = await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['sign', 'verify']
)
const privateKey = await crypto.subtle.exportKey('pkcs8', pair.privateKey)
const account = {
  client_email: 'test@example.invalid',
  private_key: `-----BEGIN PRIVATE KEY-----\n${Buffer.from(privateKey).toString(
    'base64'
  )}\n-----END PRIVATE KEY-----`,
}
const env = {
  GA4_PROPERTY_ID: '353411419',
  GA4_STREAM_ID: '4620543849',
  GA4_SERVICE_ACCOUNT_JSON: JSON.stringify(account),
}
const memory = new Map()
const pending = []
const ctx = {
  waitUntil(promise) {
    pending.push(promise)
  },
}
globalThis.caches = {
  default: {
    async match(request) {
      return memory.get(request.url)?.clone()
    },
    async put(request, response) {
      memory.set(request.url, response)
    },
  },
}
const originalFetch = globalThis.fetch
const calls = []
const batchQueries = []
let failureStatus = 0
let invalidCustom = false
let emptyCounter = false
const isCustom = (query) =>
  query.dimensions?.some(({ name }) => name.startsWith('customEvent:'))
globalThis.fetch = async (url, init) => {
  calls.push(String(url))
  if (String(url).includes('oauth2')) {
    const jwt = init.body.get('assertion').split('.')
    assert.equal(
      await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        pair.publicKey,
        Buffer.from(jwt[2], 'base64url'),
        new TextEncoder().encode(`${jwt[0]}.${jwt[1]}`)
      ),
      true
    )
    assert.equal(
      JSON.parse(Buffer.from(jwt[1], 'base64url')).scope,
      'https://www.googleapis.com/auth/analytics.readonly'
    )
    return Response.json({ access_token: 'test-token', expires_in: 3600 })
  }
  if (failureStatus)
    return Response.json(
      { error: 'PRIVATE-UPSTREAM-DIAGNOSTIC' },
      { status: failureStatus }
    )
  const body = JSON.parse(init.body)
  const realtime = String(url).endsWith(':runRealtimeReport')
  if (body.minuteRanges)
    assert.deepEqual(body.minuteRanges, [
      { startMinutesAgo: 4, endMinutesAgo: 0 },
    ])
  if (body.dateRanges?.[0].startDate === '2015-08-14') {
    const hosts = body.dimensionFilter.filter.inListFilter.values
    assert.ok(hosts.includes('www.anuluca.icu'))
    assert.ok(hosts.includes('anuluca.com'))
    assert.ok(hosts.includes('anulucas-blog.pages.dev'))
    assert.equal(hosts.includes('localhost'), false)
  }
  if (emptyCounter) return Response.json({ rows: [] })
  const report = (query) => {
    if (!realtime) assert.equal(query.dateRanges[0].endDate, 'today')
    assert.ok(
      JSON.stringify(query.dimensionFilter).includes(
        realtime ? 'streamId' : 'hostName'
      )
    )
    if (query.dimensions?.[0]?.name === 'hour') assert.equal(query.limit, 24)
    const row = {
      dimensionValues: (query.dimensions || []).map(({ name }) => ({
        value: name === 'date' ? '20261015' : 'test',
      })),
      metricValues: query.metrics.map(() => ({ value: '12' })),
    }
    const totals = query.metricAggregations?.includes('TOTAL')
    return {
      metricHeaders: query.metrics,
      rows: totals
        ? [row, { ...row, dimensionValues: [{ value: 'another-country' }] }]
        : [row],
      ...(totals ? { totals: [{ metricValues: [{ value: '12' }] }] } : {}),
      rowCount: totals ? 2 : 1,
      metadata: { timeZone: 'Asia/Shanghai', subjectToThresholding: true },
    }
  }
  if (String(url).endsWith(':batchRunReports')) {
    assert.ok(body.requests.length <= 5)
    if (invalidCustom && body.requests.some(isCustom))
      return Response.json({}, { status: 400 })
    batchQueries.push(...body.requests)
    return Response.json({ reports: body.requests.map(report) })
  }
  if (invalidCustom && isCustom(body)) return Response.json({}, { status: 400 })
  return Response.json(report(body))
}
const summaryRequest = (days) =>
  new Request(`https://worker.invalid/analytics/summary?days=${days}`)
const oauthCalls = () => calls.filter((url) => url.includes('oauth2')).length

try {
  await test('23 healthy reports use five sequential batch calls and cache the result', async () => {
    const response = await handleAnalytics(summaryRequest(30), env, ctx)
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.reports.length, 23)
    assert.equal(
      data.reports.every((r) => r.status === 'ready'),
      true
    )
    assert.equal(
      data.reports.find((r) => r.id === 'overview').rows[0].metrics.activeUsers,
      12
    )
    assert.equal(data.reports.find((r) => r.id === 'pages').thresholded, true)
    assert.equal(JSON.stringify(data).includes('test-token'), false)
    assert.equal(
      calls.filter((url) => url.endsWith(':batchRunReports')).length,
      5
    )
    assert.equal(calls.filter((url) => url.endsWith(':runReport')).length, 0)
    assert.equal(oauthCalls(), 1)
    await Promise.all(pending)
    const count = calls.length
    assert.equal(
      (
        await handleAnalytics(
          new Request(
            'https://worker.invalid/analytics/summary?days=30&ignored=123'
          ),
          env,
          ctx
        )
      ).status,
      200
    )
    assert.equal(calls.length, count)
  })
  await test('today requests the property-local current date for every report', async () => {
    const start = batchQueries.length
    const response = await handleAnalytics(summaryRequest(1), env, ctx)
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.days, 1)
    assert.equal(data.reports.length, 23)
    const queries = batchQueries.slice(start)
    assert.equal(queries.length, 23)
    for (const query of queries)
      assert.deepEqual(query.dateRanges, [
        { startDate: 'today', endDate: 'today' },
      ])
  })
  await test('invalid ranges and missing credentials never call upstream', async () => {
    const count = calls.length
    assert.equal(
      (await handleAnalytics(summaryRequest(999), env, ctx)).status,
      400
    )
    assert.equal(
      (
        await handleAnalytics(
          summaryRequest(30),
          { ...env, GA4_SERVICE_ACCOUNT_JSON: '' },
          ctx
        )
      ).status,
      503
    )
    assert.equal(calls.length, count)
  })
  await test('realtime uses two reports, deduplicated TOTAL and the existing OAuth token', async () => {
    const count = calls.length
    const response = await handleAnalytics(
      new Request('https://worker.invalid/analytics/realtime'),
      env,
      ctx
    )
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.activeUsers, 12) // 两个国家各 12 人，不应简单相加为 24。
    assert.equal(data.reports[0].rows.length, 2)
    assert.equal(data.reports.length, 2)
    assert.equal(calls.length - count, 2)
    assert.equal(oauthCalls(), 1)
  })
  await test('invalid custom dimensions trigger isolated fallback and only a short cache', async () => {
    invalidCustom = true
    const response = await handleAnalytics(summaryRequest(7), env, ctx)
    const data = await response.json()
    assert.equal(response.status, 200)
    assert.equal(data.reports.filter((r) => r.status === 'ready').length, 20)
    assert.equal(
      data.reports.find((r) => r.id === 'projects').status,
      'unavailable'
    )
    assert.equal(
      response.headers.get('cache-control'),
      'public, max-age=15, s-maxage=30'
    )
    assert.equal(calls.filter((url) => url.endsWith(':runReport')).length, 3)
    invalidCustom = false
  })
  await test('expired or rotated credentials cannot reuse an old OAuth token', async () => {
    memory.clear()
    const now = Date.now
    try {
      Date.now = () => now() + 3600000
      assert.equal(
        (await handleAnalytics(summaryRequest(30), env, ctx)).status,
        200
      )
      assert.equal(oauthCalls(), 2)
      const rotated = {
        ...env,
        GA4_SERVICE_ACCOUNT_JSON: JSON.stringify({
          ...account,
          client_email: 'rotated@example.invalid',
        }),
      }
      assert.equal(
        (await handleAnalytics(summaryRequest(90), rotated, ctx)).status,
        200
      )
      assert.equal(oauthCalls(), 3)
    } finally {
      Date.now = now
    }
  })
  await test('permissions and rate limits do not cause fallback storms or leak diagnostics', async () => {
    for (const status of [403, 429]) {
      memory.clear()
      failureStatus = status
      const count = calls.filter((url) => url.endsWith(':runReport')).length
      const batches = calls.filter((url) =>
        url.endsWith(':batchRunReports')
      ).length
      const response = await handleAnalytics(summaryRequest(7), env, ctx)
      assert.equal(response.status, 502)
      assert.deepEqual(await response.json(), {
        error: 'analytics_unavailable',
      })
      assert.equal(
        calls.filter((url) => url.endsWith(':runReport')).length,
        count
      )
      assert.equal(
        calls.filter((url) => url.endsWith(':batchRunReports')).length -
          batches,
        1
      )
    }
  })
  await test('an invalidated token is refreshed on the next request', async () => {
    memory.clear()
    failureStatus = 401
    assert.equal(
      (await handleAnalytics(summaryRequest(30), env, ctx)).status,
      502
    )
    const count = oauthCalls()
    failureStatus = 0
    assert.equal(
      (await handleAnalytics(summaryRequest(30), env, ctx)).status,
      200
    )
    assert.equal(oauthCalls(), count + 1)
  })
  await test('visitor counters use independent caches, all-time host allowlist and five-minute users', async () => {
    memory.clear()
    for (const [kind, ttl] of [
      ['views', 600],
      ['online', 60],
    ]) {
      const request = new Request(`https://worker.invalid/analytics/${kind}`)
      const response = await handleAnalytics(request, env, ctx)
      assert.equal(response.status, 200)
      assert.equal((await response.json()).count, 12)
      assert.ok(
        response.headers.get('Cache-Control').endsWith(`s-maxage=${ttl}`)
      )
      await Promise.all(pending)
      const count = calls.length
      await handleAnalytics(request, env, ctx)
      assert.equal(calls.length, count)
    }
  })
  await test('empty historical rows remain unknown while empty realtime is zero', async () => {
    memory.clear()
    emptyCounter = true
    try {
      const views = await handleAnalytics(
        new Request('https://worker.invalid/analytics/views'),
        env,
        ctx
      )
      assert.equal((await views.json()).count, null)
      assert.equal(
        views.headers.get('Cache-Control'),
        'public, max-age=15, s-maxage=30'
      )
      const online = await handleAnalytics(
        new Request('https://worker.invalid/analytics/online'),
        env,
        ctx
      )
      assert.equal((await online.json()).count, 0)
    } finally {
      emptyCounter = false
    }
  })
} finally {
  globalThis.fetch = originalFetch
  await rm(dir, { recursive: true, force: true })
}
