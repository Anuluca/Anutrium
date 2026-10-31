import { isNoteCategory } from '../../src/config/noteCategories'
import { MAX_NOTE_BYTES, parseNoteDocument } from '../../src/utils/noteDocument'
import { authorized } from './homeFeatures'
import { jsonResponse } from './http'

const PREFIX = 'notes/'
const ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const respond = (body: unknown, status = 200) =>
  jsonResponse(body, status, { 'Cache-Control': 'no-store' })

export async function handleNotes(request: Request, env: Env) {
  const url = new URL(request.url)
  const admin = url.pathname.startsWith('/admin/')
  const path = url.pathname.replace(/^\/admin/, '')
  const id = path === '/notes' ? null : path.slice('/notes/'.length)
  if (id !== null && !ID.test(id)) return respond({ error: 'not_found' }, 404)
  if (admin) {
    if (!env.HOME_FEATURES_TOKEN || env.HOME_FEATURES_TOKEN.length < 32)
      return respond({ error: 'notes_not_configured' }, 503)
    if (!(await authorized(request, env.HOME_FEATURES_TOKEN)))
      return respond({ error: 'unauthorized' }, 401)
  }
  if (
    request.method !== 'GET' &&
    !(admin && id && ['PUT', 'PATCH', 'DELETE'].includes(request.method))
  )
    return respond({ error: 'method_not_allowed' }, 405)
  try {
    const match = request.headers.get('If-Match')
    const conditionalWrite =
      request.method === 'PATCH' || request.method === 'DELETE'
    if (conditionalWrite && (!match || !/^"[^"\r\n]{1,128}"$/.test(match)))
      return respond({ error: 'note_version_required' }, 428)
    if (request.method === 'DELETE' && id) {
      const key = `${PREFIX}${id}.md`
      const previous = await env.FLORATRIUM_BUCKET.head(key)
      if (!previous) return respond({ error: 'not_found' }, 404)
      if (previous.customMetadata?.deleted === 'true')
        return respond({ id, deleted: true })
      if (previous.httpEtag !== match)
        return respond({ error: 'note_conflict' }, 412)
      // R2 delete 不支持条件删除。用条件写入清空正文并留下删除标记，
      // 确保并发保存不能在版本检查与删除之间写入新内容或复活旧笔记。
      const deleted = await env.FLORATRIUM_BUCKET.put(key, '', {
        onlyIf: { etagMatches: previous.etag },
        customMetadata: {
          deleted: 'true',
          deletedAt: new Date().toISOString(),
        },
        httpMetadata: {
          contentType: 'text/markdown; charset=utf-8',
          cacheControl: 'no-store',
        },
      })
      return deleted
        ? respond({ id, deleted: true })
        : respond({ error: 'note_conflict' }, 412)
    }
    if (['PUT', 'PATCH'].includes(request.method) && id) {
      if (
        request.headers.get('Content-Type')?.split(';')[0].trim() !==
        'text/markdown'
      )
        return respond({ error: 'invalid_content_type' }, 415)
      const reader = request.body?.getReader()
      if (!reader) return respond({ error: 'missing_body' }, 400)
      let source = ''
      let size = 0
      const decoder = new TextDecoder('utf-8', {
        fatal: true,
        ignoreBOM: false,
      })
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > MAX_NOTE_BYTES) {
            await reader.cancel()
            return respond({ error: 'note_too_large' }, 413)
          }
          source += decoder.decode(value, { stream: true })
        }
        source += decoder.decode()
      } catch {
        return respond({ error: 'invalid_encoding' }, 400)
      } finally {
        reader.releaseLock()
      }
      let metadata
      try {
        metadata = parseNoteDocument(source).metadata
      } catch (error) {
        return respond(
          { error: error instanceof Error ? error.message : 'invalid_note' },
          400
        )
      }
      const key = `${PREFIX}${id}.md`
      const previous = await env.FLORATRIUM_BUCKET.get(key)
      if (previous?.customMetadata?.deleted === 'true')
        return respond({ error: 'not_found' }, 404)
      if (request.method === 'PATCH') {
        if (!previous) return respond({ error: 'not_found' }, 404)
        if (previous.httpEtag !== match)
          return respond({ error: 'note_conflict' }, 412)
      } else if (previous) {
        // 创建的网络重试保持幂等，更新必须显式走 PATCH 与版本校验。
        if ((await previous.text()) === source)
          return jsonResponse(
            { id, ...metadata, etag: previous.httpEtag },
            200,
            {
              'Cache-Control': 'no-store',
              ETag: previous.httpEtag,
              'X-Note-Version': previous.httpEtag,
            }
          )
        return respond({ error: 'note_exists' }, 409)
      }
      const saved = await env.FLORATRIUM_BUCKET.put(key, source, {
        onlyIf: previous
          ? { etagMatches: previous.etag }
          : new Headers({ 'If-None-Match': '*' }),
        httpMetadata: {
          contentType: 'text/markdown; charset=utf-8',
          cacheControl: 'no-store',
        },
        customMetadata: {
          title: metadata.title,
          time: metadata.time,
          type: metadata.type,
          ...(metadata.image ? { image: metadata.image } : {}),
        },
      })
      if (!saved)
        return respond(
          { error: previous ? 'note_conflict' : 'note_exists' },
          previous ? 412 : 409
        )
      return jsonResponse(
        { id, ...metadata, etag: saved.httpEtag },
        previous ? 200 : 201,
        {
          'Cache-Control': 'no-store',
          ETag: saved.httpEtag,
          'X-Note-Version': saved.httpEtag,
        }
      )
    }
    if (id) {
      const object = await env.FLORATRIUM_BUCKET.get(`${PREFIX}${id}.md`)
      if (!object || object.customMetadata?.deleted === 'true')
        return respond({ error: 'not_found' }, 404)
      return new Response(object.body, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          ETag: object.httpEtag,
          // 独立版本头保留 R2 原始版本，避免 CDN 压缩将 ETag 弱化后阻断 If-Match。
          'X-Note-Version': object.httpEtag,
        },
      })
    }
    const cursor = url.searchParams.get('cursor') || undefined
    if (cursor && cursor.length > 2048)
      return respond({ error: 'invalid_cursor' }, 400)
    const page = await env.FLORATRIUM_BUCKET.list({
      prefix: PREFIX,
      limit: 100,
      cursor,
      include: ['customMetadata'],
    })
    const notes = page.objects.flatMap((object) => {
      const noteId = object.key.slice(PREFIX.length, -3)
      const meta = object.customMetadata
      if (
        meta?.deleted === 'true' ||
        !object.key.endsWith('.md') ||
        !ID.test(noteId) ||
        !meta?.title ||
        !meta.time ||
        !isNoteCategory(meta.type)
      )
        return []
      return [
        {
          id: noteId,
          etag: object.httpEtag,
          title: meta.title,
          time: meta.time,
          type: meta.type,
          ...(meta.image ? { image: meta.image } : {}),
          path: `/atrium/notes?note=${noteId}`,
        },
      ]
    })
    return respond({ notes, nextCursor: page.truncated ? page.cursor : null })
  } catch {
    console.error(
      JSON.stringify({ event: 'notes_failed', method: request.method })
    )
    return respond({ error: 'notes_unavailable' }, 503)
  }
}
