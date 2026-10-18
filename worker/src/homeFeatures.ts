import { type HomeFeatures, isHomeFeatures } from '../../src/types/homeFeatures'
import { jsonResponse } from './http'

const CONFIG_KEY = 'config/home-features.json'
const headers = { 'Cache-Control': 'no-store' }
const respond = (body: unknown, status = 200) =>
  jsonResponse(body, status, headers)

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

      const config: HomeFeatures = {
        lucarioHeadache: update.lucarioHeadache,
        updatedAt: new Date().toISOString(),
      }
      await env.FLORATRIUM_BUCKET.put(CONFIG_KEY, JSON.stringify(config), {
        httpMetadata: {
          contentType: 'application/json',
          cacheControl: 'no-store',
        },
      })
      console.log(JSON.stringify({ event: 'home_features_updated', ...config }))
      return respond(config)
    }

    const object = await env.FLORATRIUM_BUCKET.get(CONFIG_KEY)
    if (!object) return respond({ lucarioHeadache: false, updatedAt: null })
    const config: unknown = await object.json()
    if (!isHomeFeatures(config)) throw new Error('invalid_config')
    return respond({
      lucarioHeadache: config.lucarioHeadache,
      updatedAt: config.updatedAt,
    })
  } catch {
    console.error(
      JSON.stringify({ event: 'home_features_failed', method: request.method })
    )
    return respond({ error: 'home_features_unavailable' }, 503)
  }
}
