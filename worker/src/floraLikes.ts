import { DurableObject } from 'cloudflare:workers'

import {
  type FloraLikeCounts,
  type FloraPetId,
  isFloraPetId,
  isLikeCounts,
} from '../../src/types/floraLikes'
import { quotaDate } from './floraLikeDay'
import { authorized, readUpdate } from './homeFeatures'
import { jsonResponse } from './http'

const LIMIT = 10
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const respond = (body: unknown, status = 200) =>
  jsonResponse(body, status, { 'Cache-Control': 'private, no-store' })
async function tokenKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`flora-likes:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}
const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')
async function visitor(token: string | null, key: CryptoKey) {
  if (token && token.length < 120) {
    const [id, signature] = token.split('.')
    if (
      UUID.test(id) &&
      /^[0-9a-f]{64}$/.test(signature ?? '') &&
      (await crypto.subtle.verify(
        'HMAC',
        key,
        Uint8Array.from(signature.match(/../g)!, (c) => parseInt(c, 16)),
        new TextEncoder().encode(id)
      ))
    )
      return { id, token }
  }
  return null
}
async function issue(key: CryptoKey) {
  const id = crypto.randomUUID()
  return {
    id,
    token: `${id}.${hex(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(id))
    )}`,
  }
}
function dimensions(request: Request) {
  const ua = request.headers.get('User-Agent') ?? ''
  const country = String(request.cf?.country ?? 'unknown')
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : 'unknown',
    device: /iPad|Tablet/i.test(ua)
      ? 'tablet'
      : /Mobile|iPhone|Android/i.test(ua)
      ? 'mobile'
      : 'desktop',
    browser: /Edg\//.test(ua)
      ? 'Edge'
      : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\/|CriOS\//.test(ua)
      ? 'Chrome'
      : /Safari\//.test(ua)
      ? 'Safari'
      : 'Other',
  }
}
interface Command {
  operation: 'read' | 'like' | 'admin-read' | 'admin-write'
  visitorId: string
  petId?: FloraPetId
  requestId?: string
  counts?: FloraLikeCounts
  version?: string
  dimensions: ReturnType<typeof dimensions>
}
interface DayStats {
  date: string
  counts: FloraLikeCounts
  visitors: number
  countries: Record<string, number>
  devices: Record<string, number>
  browsers: Record<string, number>
}
export class FloraLikes extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS totals (pet TEXT PRIMARY KEY, count INTEGER NOT NULL CHECK(count >= 0));
      INSERT OR IGNORE INTO totals VALUES ('huahua', 0), ('xiaohei', 0);
      CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL, updated_at TEXT);
      INSERT OR IGNORE INTO meta VALUES (1, 0, NULL);
      CREATE TABLE IF NOT EXISTS clicks (
        day TEXT NOT NULL, visitor TEXT NOT NULL, request_id TEXT NOT NULL, pet TEXT NOT NULL,
        country TEXT NOT NULL, device TEXT NOT NULL, browser TEXT NOT NULL, at TEXT NOT NULL,
        PRIMARY KEY (day, visitor, request_id)
      );
      CREATE INDEX IF NOT EXISTS clicks_day_pet ON clicks(day, pet);
      CREATE TABLE IF NOT EXISTS adjustments (id INTEGER PRIMARY KEY, at TEXT NOT NULL, before_counts TEXT NOT NULL, after_counts TEXT NOT NULL);
    `)
    ctx.blockConcurrencyWhile(async () => {
      if ((await ctx.storage.getAlarm()) === null)
        await ctx.storage.setAlarm(Date.parse(quotaDate().resetsAt))
    })
  }
  async alarm() {
    this.ctx.storage.sql.exec(
      'DELETE FROM clicks WHERE day < ?',
      quotaDate(Date.now() - 89 * 86400000).day
    )
    await this.ctx.storage.setAlarm(Date.parse(quotaDate().resetsAt))
  }

  private counts(): FloraLikeCounts {
    return Object.fromEntries(
      this.ctx.storage.sql
        .exec<{ pet: FloraPetId; count: number }>(
          'SELECT pet, count FROM totals'
        )
        .toArray()
        .map((r) => [r.pet, r.count])
    ) as FloraLikeCounts
  }
  private summary(visitorId: string) {
    const date = quotaDate()
    const requests = this.ctx.storage.sql
      .exec<{ request_id: string }>(
        'SELECT request_id FROM clicks WHERE day = ? AND visitor = ?',
        date.day,
        visitorId
      )
      .toArray()
    return {
      counts: this.counts(),
      remaining: LIMIT - requests.length,
      limit: LIMIT,
      ...date,
      acceptedRequestIds: requests.map((r) => r.request_id),
    }
  }
  private adminSummary() {
    const meta = this.ctx.storage.sql
      .exec<{ revision: number; updated_at: string | null }>(
        'SELECT revision, updated_at FROM meta WHERE id = 1'
      )
      .one()
    const cutoff = quotaDate(Date.now() - 89 * 86400000).day
    const days: DayStats[] = this.ctx.storage.sql
      .exec<{ day: string; visitors: number }>(
        'SELECT day, COUNT(DISTINCT visitor) AS visitors FROM clicks WHERE day >= ? GROUP BY day ORDER BY day DESC',
        cutoff
      )
      .toArray()
      .map((r) => ({
        date: r.day,
        visitors: r.visitors,
        counts: { huahua: 0, xiaohei: 0 },
        countries: {},
        devices: {},
        browsers: {},
      }))
    const byDate = new Map(days.map((d) => [d.date, d]))
    for (const row of this.ctx.storage.sql.exec<{
      day: string
      pet: FloraPetId
      n: number
    }>(
      'SELECT day, pet, COUNT(*) AS n FROM clicks WHERE day >= ? GROUP BY day, pet',
      cutoff
    ))
      byDate.get(row.day)!.counts[row.pet] = row.n
    for (const [column, field] of [
      ['country', 'countries'],
      ['device', 'devices'],
      ['browser', 'browsers'],
    ] as const) {
      // 列名来自固定枚举，所有外部数据均使用 SQL 参数绑定。
      for (const row of this.ctx.storage.sql.exec<{
        day: string
        label: string
        n: number
      }>(
        `SELECT day, ${column} AS label, COUNT(*) AS n FROM clicks WHERE day >= ? GROUP BY day, ${column}`,
        cutoff
      ))
        byDate.get(row.day)![field][row.label] = row.n
    }
    const adjustments = this.ctx.storage.sql
      .exec<{ at: string; before_counts: string; after_counts: string }>(
        'SELECT at, before_counts, after_counts FROM adjustments ORDER BY id DESC LIMIT 30'
      )
      .toArray()
      .map((r) => ({
        at: r.at,
        before: JSON.parse(r.before_counts),
        after: JSON.parse(r.after_counts),
      }))
    return {
      counts: this.counts(),
      version: String(meta.revision),
      updatedAt: meta.updated_at,
      limit: LIMIT,
      timezone: 'Asia/Shanghai',
      days,
      adjustments,
    }
  }
  async fetch(request: Request) {
    // 仅命名绑定可调用；公开入口已完成身份与字段校验。
    const input = await request.json<Command>()
    return this.ctx.storage.transactionSync(() => {
      const date = quotaDate()
      if (input.operation === 'read')
        return respond(this.summary(input.visitorId))
      if (input.operation === 'admin-read') return respond(this.adminSummary())
      const now = new Date().toISOString()
      if (input.operation === 'admin-write') {
        const revision = this.ctx.storage.sql
          .exec<{ revision: number }>('SELECT revision FROM meta WHERE id = 1')
          .one().revision
        if (input.version !== String(revision))
          return respond({ error: 'version_conflict' }, 409)
        const before = this.counts()
        for (const pet of ['huahua', 'xiaohei'] as const)
          this.ctx.storage.sql.exec(
            'UPDATE totals SET count = ? WHERE pet = ?',
            input.counts![pet],
            pet
          )
        this.ctx.storage.sql.exec(
          'INSERT INTO adjustments(at,before_counts,after_counts) VALUES(?,?,?)',
          now,
          JSON.stringify(before),
          JSON.stringify(input.counts)
        )
        this.ctx.storage.sql.exec(
          'DELETE FROM adjustments WHERE id NOT IN (SELECT id FROM adjustments ORDER BY id DESC LIMIT 30)'
        )
      } else {
        const prior = this.ctx.storage.sql
          .exec<{ pet: string }>(
            'SELECT pet FROM clicks WHERE day = ? AND visitor = ? AND request_id = ?',
            date.day,
            input.visitorId,
            input.requestId!
          )
          .toArray()[0]
        if (prior)
          return prior.pet === input.petId
            ? respond(this.summary(input.visitorId))
            : respond({ error: 'request_conflict' }, 409)
        const used = this.ctx.storage.sql
          .exec<{ n: number }>(
            'SELECT COUNT(*) AS n FROM clicks WHERE day = ? AND visitor = ?',
            date.day,
            input.visitorId
          )
          .one().n
        if (used >= LIMIT)
          return respond(
            { error: 'daily_limit', ...this.summary(input.visitorId) },
            429
          )
        if (this.counts()[input.petId!] >= 1_000_000_000)
          return respond({ error: 'count_limit' }, 409)
        const d = input.dimensions
        // 点击、限额和统计共用同一事务；重复请求不会再次加一。
        this.ctx.storage.sql.exec(
          'INSERT INTO clicks VALUES(?,?,?,?,?,?,?,?)',
          date.day,
          input.visitorId,
          input.requestId!,
          input.petId!,
          d.country,
          d.device,
          d.browser,
          now
        )
        this.ctx.storage.sql.exec(
          'UPDATE totals SET count = count + 1 WHERE pet = ?',
          input.petId!
        )
        this.ctx.storage.sql.exec(
          'DELETE FROM clicks WHERE day < ?',
          quotaDate(Date.now() - 89 * 86400000).day
        )
      }
      this.ctx.storage.sql.exec(
        'UPDATE meta SET revision = revision + 1, updated_at = ? WHERE id = 1',
        now
      )
      return respond(
        input.operation === 'admin-write'
          ? this.adminSummary()
          : this.summary(input.visitorId)
      )
    })
  }
}
export async function handleFloraLikes(request: Request, env: Env) {
  const admin = new URL(request.url).pathname.startsWith('/admin/')
  const method = request.method
  if (!(method === 'GET' || method === (admin ? 'PUT' : 'POST')))
    return respond({ error: 'method_not_allowed' }, 405)
  if (!env.HOME_FEATURES_TOKEN || env.HOME_FEATURES_TOKEN.length < 32)
    return respond({ error: 'likes_not_configured' }, 503)
  if (admin && !(await authorized(request, env.HOME_FEATURES_TOKEN)))
    return respond({ error: 'unauthorized' }, 401)
  let body: Record<string, unknown> = {}
  if (method !== 'GET') {
    if (
      request.headers.get('Content-Type')?.split(';')[0].trim() !==
      'application/json'
    )
      return respond({ error: 'invalid_content_type' }, 415)
    try {
      const value = await readUpdate(request)
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('invalid_body')
      body = value as Record<string, unknown>
    } catch {
      return respond({ error: 'invalid_body' }, 400)
    }
    if (
      admin
        ? !isLikeCounts(body.counts) ||
          typeof body.version !== 'string' ||
          Object.keys(body).length !== 2
        : !isFloraPetId(body.petId) ||
          typeof body.requestId !== 'string' ||
          !UUID.test(body.requestId) ||
          typeof body.visitorToken !== 'string' ||
          Object.keys(body).length !== 3
    )
      return respond({ error: 'invalid_body' }, 400)
  }
  try {
    if (!env.FLORA_LIKES) return respond({ error: 'likes_not_configured' }, 503)
    const key = await tokenKey(env.HOME_FEATURES_TOKEN)
    const identity = admin
      ? null
      : await visitor(
          method === 'GET'
            ? request.headers.get('X-Flora-Visitor')
            : (body.visitorToken as string),
          key
        )
    if (!admin && method === 'POST' && !identity)
      return respond({ error: 'invalid_visitor' }, 401)
    const who = identity ?? (!admin ? await issue(key) : null)
    const command: Command = {
      operation: admin
        ? method === 'GET'
          ? 'admin-read'
          : 'admin-write'
        : method === 'GET'
        ? 'read'
        : 'like',
      visitorId: who?.id ?? '',
      petId: body.petId as FloraPetId | undefined,
      requestId: body.requestId as string | undefined,
      counts: body.counts as FloraLikeCounts | undefined,
      version: body.version as string | undefined,
      dimensions: dimensions(request),
    }
    const response = await env.FLORA_LIKES.get(
      env.FLORA_LIKES.idFromName('floratrium')
    ).fetch('https://likes.internal', {
      method: 'POST',
      body: JSON.stringify(command),
    })
    const data = await response.json<Record<string, unknown>>()
    return respond(
      admin ? data : { ...data, visitorToken: who!.token },
      response.status
    )
  } catch {
    console.error(JSON.stringify({ event: 'flora_likes_failed', method }))
    return respond({ error: 'likes_unavailable' }, 503)
  }
}
