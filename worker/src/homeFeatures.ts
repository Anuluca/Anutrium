import { type HomeFeatures } from '../../src/types/homeFeatures'
import { jsonResponse } from './http'

const CONFIG_KEY = 'config/home-features.json'
const headers = { 'Cache-Control': 'no-store' }
const respond = (body: unknown, status = 200) =>
  jsonResponse(body, status, headers)

interface StoredHomeFeatures {
  lucarioHeadache: boolean
  updatedAt: string | null
  headacheBaseline: number
  headacheEpisodes: { number: number; startedAt: string }[]
}

const validDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))

function parseStoredFeatures(value: unknown): {
  config: StoredHomeFeatures
  migrated: boolean
} {
  if (value === undefined)
    return {
      config: {
        lucarioHeadache: false,
        updatedAt: null,
        headacheBaseline: 10,
        headacheEpisodes: [],
      },
      migrated: true,
    }
  if (!value || typeof value !== 'object') throw new Error('invalid_config')
  const data = value as Record<string, unknown>
  if (
    typeof data.lucarioHeadache !== 'boolean' ||
    !(data.updatedAt === null || validDate(data.updatedAt))
  )
    throw new Error('invalid_config')
  const state = {
    lucarioHeadache: data.lucarioHeadache,
    updatedAt: data.updatedAt,
  }
  // 旧配置读取时兼容 10 次历史基数；首次授权保存时持久化，保留当前模式。
  if (!('headacheBaseline' in data) && !('headacheEpisodes' in data))
    return {
      config: { ...state, headacheBaseline: 10, headacheEpisodes: [] },
      migrated: true,
    }
  if (
    !Number.isSafeInteger(data.headacheBaseline) ||
    (data.headacheBaseline as number) < 0 ||
    !Array.isArray(data.headacheEpisodes)
  )
    throw new Error('invalid_history')
  const baseline = data.headacheBaseline as number
  const episodes: StoredHomeFeatures['headacheEpisodes'] = []
  for (const [index, episode] of data.headacheEpisodes.entries()) {
    if (
      !episode ||
      typeof episode !== 'object' ||
      episode.number !== baseline + index + 1 ||
      !validDate(episode.startedAt)
    )
      throw new Error('invalid_history')
    episodes.push({ number: episode.number, startedAt: episode.startedAt })
  }
  if (!Number.isSafeInteger(baseline + episodes.length + 1))
    throw new Error('invalid_count')
  return {
    config: {
      ...state,
      headacheBaseline: baseline,
      headacheEpisodes: episodes,
    },
    migrated: false,
  }
}

function publicFeatures(config: StoredHomeFeatures): HomeFeatures {
  return {
    lucarioHeadache: config.lucarioHeadache,
    headacheCount: config.headacheBaseline + config.headacheEpisodes.length,
    updatedAt: config.updatedAt,
  }
}

async function authorized(request: Request, expected: string) {
  const provided =
    request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1] ?? ''
  const encoder = new TextEncoder()
  const hashes = await Promise.all(
    [provided, expected].map((token) =>
      crypto.subtle.digest('SHA-256', encoder.encode(token))
    )
  )
  return crypto.subtle.timingSafeEqual(hashes[0], hashes[1])
}

async function readUpdate(request: Request): Promise<unknown> {
  // 对实际接收的字节设限，不能仅信任 Content-Length。
  const reader = request.body?.getReader()
  if (!reader) throw new Error('missing_body')
  let text = ''
  let size = 0
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 1024) {
        await reader.cancel()
        throw new Error('large_body')
      }
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode())
  } finally {
    reader.releaseLock()
  }
}

export async function handleHomeFeatures(request: Request, env: Env) {
  const admin = new URL(request.url).pathname === '/admin/home-features'
  if (request.method !== 'GET' && !(admin && request.method === 'PUT'))
    return jsonResponse({ error: 'method_not_allowed' }, 405, {
      ...headers,
      Allow: admin ? 'GET, PUT' : 'GET',
    })

  if (admin) {
    if (!env.HOME_FEATURES_TOKEN || env.HOME_FEATURES_TOKEN.length < 32)
      return respond({ error: 'home_features_not_configured' }, 503)
    if (!(await authorized(request, env.HOME_FEATURES_TOKEN)))
      return respond({ error: 'unauthorized' }, 401)
  }

  try {
    if (request.method === 'PUT') {
      if (
        request.headers.get('Content-Type')?.split(';')[0].trim() !==
        'application/json'
      )
        return respond({ error: 'invalid_content_type' }, 415)
      let update: unknown
      try {
        update = await readUpdate(request)
      } catch {
        return respond({ error: 'invalid_update' }, 400)
      }
      if (
        !update ||
        typeof update !== 'object' ||
        Object.keys(update).length !== 1 ||
        !('lucarioHeadache' in update) ||
        typeof update.lucarioHeadache !== 'boolean'
      )
        return respond({ error: 'invalid_update' }, 400)

      // 状态与发作记录在同一对象中提交，写入失败时不会出现只计数或只切换状态。
      for (let attempt = 0; attempt < 5; attempt++) {
        const object = await env.FLORATRIUM_BUCKET.get(CONFIG_KEY)
        const previous = parseStoredFeatures(
          object ? await object.json() : undefined
        )
        const migrated = object && previous.migrated
        if (
          object &&
          !migrated &&
          previous.config.lucarioHeadache === update.lucarioHeadache
        )
          return respond(publicFeatures(previous.config))

        const config = previous.config
        if (!config.lucarioHeadache && update.lucarioHeadache) {
          config.headacheEpisodes.push({
            number:
              config.headacheBaseline + config.headacheEpisodes.length + 1,
            startedAt: new Date().toISOString(),
          })
        }
        const changed = config.lucarioHeadache !== update.lucarioHeadache
        config.lucarioHeadache = update.lucarioHeadache
        if (changed) config.updatedAt = new Date().toISOString()
        // ETag 条件写入：冲突后重读状态，已被其他请求开启时不会再增加次数。
        const saved = await env.FLORATRIUM_BUCKET.put(
          CONFIG_KEY,
          JSON.stringify(config),
          {
            onlyIf: object
              ? { etagMatches: object.etag }
              : new Headers({ 'If-None-Match': '*' }),
            httpMetadata: {
              contentType: 'application/json',
              cacheControl: 'no-store',
            },
          }
        )
        if (saved) {
          const result = publicFeatures(config)
          console.log(
            JSON.stringify({ event: 'home_features_updated', ...result })
          )
          return respond(result)
        }
      }
      return respond({ error: 'home_features_conflict' }, 503)
    }

    const object = await env.FLORATRIUM_BUCKET.get(CONFIG_KEY)
    const { config } = parseStoredFeatures(
      object ? await object.json() : undefined
    )
    // 公开接口仅返回当前状态和总次数，不公开发作时间明细。GET 不写入存储。
    return respond(publicFeatures(config))
  } catch {
    console.error(
      JSON.stringify({ event: 'home_features_failed', method: request.method })
    )
    return respond({ error: 'home_features_unavailable' }, 503)
  }
}
