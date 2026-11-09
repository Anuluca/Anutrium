import type { MonkeyArticle } from '../../src/types/monkeyArticle'
import { authorized } from './homeFeatures'
import { getAllowedOrigins, jsonResponse } from './http'

const PREFIX = 'monkey-articles/'
const ID =
  /^\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const respond = (body: unknown, status = 200) =>
  jsonResponse(body, status, { 'Cache-Control': 'no-store' })

// 拒绝取模偏差：每个字母等概率；词长、句长和标点也只由随机数决定。
export function generateMonkeyText() {
  const bytes = crypto.getRandomValues(new Uint8Array(8192))
  let offset = 0
  const pick = (size: number): number => {
    for (;;) {
      if (offset === bytes.length) {
        crypto.getRandomValues(bytes)
        offset = 0
      }
      const n = bytes[offset++]
      if (n < 256 - (256 % size)) return n % size
    }
  }
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 3 }, () => {
      const sentence = Array.from({ length: 10 + pick(11) }, () =>
        Array.from({ length: 1 + pick(10) }, () =>
          String.fromCharCode(97 + pick(26))
        ).join('')
      ).join(' ')
      return (
        sentence[0].toUpperCase() + sentence.slice(1) + ['.', '?', '!'][pick(3)]
      )
    }).join(' ')
  ).join('\n\n')
}

export async function handleMonkeyArticles(request: Request, env: Env) {
  const url = new URL(request.url)
  const admin = url.pathname.startsWith('/admin/')
  const base = admin ? '/admin/monkey-articles' : '/monkey-articles'
  const suffix = url.pathname.slice(base.length)
  const id = suffix.startsWith('/') ? suffix.slice(1) : ''
  const generating = !admin && suffix === '/generate'
  if (suffix && !generating && (!ID.test(id) || suffix !== `/${id}`))
    return respond({ error: 'not_found' }, 404)
  if (admin) {
    if (!env.HOME_FEATURES_TOKEN || env.HOME_FEATURES_TOKEN.length < 32)
      return respond({ error: 'not_configured' }, 503)
    if (!(await authorized(request, env.HOME_FEATURES_TOKEN)))
      return respond({ error: 'unauthorized' }, 401)
  }
  const allowed =
    (!generating && request.method === 'GET') ||
    (!admin && (!id || generating) && request.method === 'POST') ||
    (admin && !!id && request.method === 'DELETE')
  if (!allowed) return respond({ error: 'method_not_allowed' }, 405)
  try {
    if (request.method === 'POST') {
      const origin = request.headers.get('Origin')
      if (!origin || !getAllowedOrigins(env.ALLOWED_ORIGINS).has(origin))
        return respond({ error: 'forbidden_origin' }, 403)
      if (
        request.headers.get('Content-Type')?.split(';')[0].trim() !==
        'application/json'
      )
        return respond({ error: 'invalid_content_type' }, 415)
      // 可信边缘 IP 仅用于限流，不保存到文章或公开列表中。
      const limit = await env.MONKEY_CREATE_LIMITER.limit({
        key: request.headers.get('CF-Connecting-IP') || 'unknown',
      })
      if (!limit.success)
        return jsonResponse({ error: 'rate_limited' }, 429, {
          'Cache-Control': 'no-store',
          'Retry-After': '60',
        })
      let input: unknown
      try {
        const reader = request.body?.getReader()
        if (!reader) return respond({ error: 'invalid_body' }, 400)
        let source = ''
        let size = 0
        const decoder = new TextDecoder('utf-8', {
          fatal: true,
          ignoreBOM: false,
        })
        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > 64000) {
              await reader.cancel()
              return respond({ error: 'large_body' }, 413)
            }
            source += decoder.decode(value, { stream: true })
          }
          input = JSON.parse(source + decoder.decode())
        } finally {
          reader.releaseLock()
        }
      } catch {
        return respond({ error: 'invalid_body' }, 400)
      }
      if (generating) {
        if (
          !input ||
          typeof input !== 'object' ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          return respond({ error: 'invalid_body' }, 400)
        const content = generateMonkeyText()
        return respond({
          id: '',
          title: content.split(' ').slice(0, 3).join(' '),
          createdAt: new Date().toISOString(),
          content,
          words: content.trim().split(/\s+/).length,
          characters: content.length,
          preview: content.slice(0, 110),
        })
      }
      if (
        !input ||
        typeof input !== 'object' ||
        Object.keys(input).length !== 3 ||
        !('id' in input) ||
        typeof input.id !== 'string' ||
        !ID.test(input.id) ||
        !('title' in input) ||
        typeof input.title !== 'string' ||
        !input.title.trim() ||
        input.title.length > 120 ||
        !('content' in input) ||
        typeof input.content !== 'string' ||
        !input.content.trim() ||
        input.content.length > 12000 ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(
          input.title + input.content
        )
      )
        return respond({ error: 'invalid_body' }, 400)
      const key = `${PREFIX}${input.id}.json`
      const existing = await env.FLORATRIUM_BUCKET.get(key)
      if (existing) {
        if (existing.customMetadata?.deleted === 'true')
          return respond({ error: 'not_found' }, 410)
        const saved = await existing.json<MonkeyArticle>()
        return saved.title === input.title.trim() &&
          saved.content === input.content
          ? respond(saved)
          : respond({ error: 'request_conflict' }, 409)
      }
      // 逆时间前缀用于 R2 字典序分页；新请求时间限制在 5 分钟内，重试先查已存档对象。
      const timestamp = 9999999999999 - Number(input.id.slice(0, 13))
      if (Math.abs(Date.now() - timestamp) > 300000)
        return respond({ error: 'expired_request' }, 400)
      const content = input.content
      const article: MonkeyArticle = {
        id: input.id,
        title: input.title.trim(),
        createdAt: new Date().toISOString(),
        content,
        words: content.trim().split(/\s+/).length,
        characters: content.length,
        preview: content.slice(0, 110),
      }
      const summary = {
        id: article.id,
        title: article.title,
        createdAt: article.createdAt,
        words: article.words,
        characters: article.characters,
        preview: article.preview,
      }
      const stored = await env.FLORATRIUM_BUCKET.put(
        key,
        JSON.stringify(article),
        {
          onlyIf: new Headers({ 'If-None-Match': '*' }),
          httpMetadata: {
            contentType: 'application/json',
            cacheControl: 'no-store',
          },
          customMetadata: { summary: JSON.stringify(summary) },
        }
      )
      // 并发重试只保留第一次保存的版本，正文与列表元数据在同一对象中原子提交。
      if (!stored) {
        const winner = await env.FLORATRIUM_BUCKET.get(key)
        if (!winner) return respond({ error: 'unavailable' }, 503)
        if (winner.customMetadata?.deleted === 'true')
          return respond({ error: 'not_found' }, 410)
        const saved = await winner.json<MonkeyArticle>()
        return saved.title === article.title && saved.content === content
          ? respond(saved)
          : respond({ error: 'request_conflict' }, 409)
      }
      return respond(article, 201)
    }
    if (id) {
      const object = await env.FLORATRIUM_BUCKET.get(`${PREFIX}${id}.json`)
      if (!object || object.customMetadata?.deleted === 'true')
        return respond({ error: 'not_found' }, 404)
      if (request.method === 'DELETE') {
        // 档案不可编辑，因此版本检查后不会被另一写请求更新。
        if (request.headers.get('If-Match') !== object.httpEtag)
          return respond({ error: 'version_conflict' }, 412)
        // 条件写入删除标记，阻止超时重试使已删除档案复活。
        const removed = await env.FLORATRIUM_BUCKET.put(
          `${PREFIX}${id}.json`,
          '{}',
          {
            onlyIf: { etagMatches: object.etag },
            customMetadata: { deleted: 'true' },
            httpMetadata: {
              contentType: 'application/json',
              cacheControl: 'no-store',
            },
          }
        )
        return removed
          ? respond({ ok: true })
          : respond({ error: 'version_conflict' }, 412)
      }
      return jsonResponse(await object.json(), 200, {
        'Cache-Control': 'no-store',
        ETag: object.httpEtag,
        'X-Article-Version': object.httpEtag,
      })
    }
    const cursor = url.searchParams.get('cursor') || undefined
    if (cursor && cursor.length > 2048)
      return respond({ error: 'invalid_cursor' }, 400)
    let list: R2Objects
    try {
      list = await env.FLORATRIUM_BUCKET.list({
        prefix: PREFIX,
        limit: 20,
        cursor,
        include: ['customMetadata'],
      })
    } catch (error) {
      if (cursor) return respond({ error: 'invalid_cursor' }, 400)
      throw error
    }
    return respond({
      articles: list.objects
        .filter((object) => object.customMetadata?.deleted !== 'true')
        .map((object) => JSON.parse(object.customMetadata!.summary)),
      nextCursor: list.truncated ? list.cursor : null,
    })
  } catch {
    console.error(
      JSON.stringify({
        event: 'monkey_articles_failed',
        method: request.method,
      })
    )
    return respond({ error: 'unavailable' }, 503)
  }
}
