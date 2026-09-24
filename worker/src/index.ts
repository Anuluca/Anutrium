import { fetchGitHubContributions } from './github'
import {
  getAllowedOrigins,
  getCorsHeaders,
  jsonResponse,
  withCors,
} from './http'
import { fetchSteamProfile } from './steam'

const PROFILE_CACHE_VERSION = '2'
const GITHUB_CONTRIBUTIONS_CACHE_VERSION = '1'

interface Endpoint {
  cacheVersion: string
  defaultCacheTtl: number
  load: () => Promise<unknown>
  publicError: string
}

const resolveEndpoint = (pathname: string, env: Env): Endpoint | null => {
  if (pathname === '/profile') {
    return {
      cacheVersion: PROFILE_CACHE_VERSION,
      defaultCacheTtl: 900,
      load: () => fetchSteamProfile(env),
      publicError: 'Steam profile request failed',
    }
  }

  if (pathname === '/github/contributions') {
    return {
      cacheVersion: GITHUB_CONTRIBUTIONS_CACHE_VERSION,
      defaultCacheTtl: 21_600,
      load: () => fetchGitHubContributions(env),
      publicError: 'GitHub contributions request failed',
    }
  }

  return null
}

const getCacheTtl = (pathname: string, env: Env, fallback: number) => {
  const configuredTtl =
    pathname === '/github/contributions'
      ? env.GITHUB_CACHE_TTL_SECONDS
      : env.CACHE_TTL_SECONDS

  return Math.max(60, Number.parseInt(configuredTtl, 10) || fallback)
}

const worker: ExportedHandler<Env> = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    const allowedOrigins = getAllowedOrigins(env.ALLOWED_ORIGINS)

    if (origin && !allowedOrigins.has(origin)) {
      return jsonResponse({ error: 'Origin is not allowed' }, 403)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin, allowedOrigins),
      })
    }

    if (request.method !== 'GET') {
      return withCors(
        jsonResponse({ error: 'Method not allowed' }, 405, {
          Allow: 'GET, OPTIONS',
        }),
        origin,
        allowedOrigins
      )
    }

    if (url.pathname === '/health') {
      return withCors(jsonResponse({ ok: true }), origin, allowedOrigins)
    }

    const endpoint = resolveEndpoint(url.pathname, env)
    if (!endpoint) {
      return withCors(
        jsonResponse({ error: 'Not found' }, 404),
        origin,
        allowedOrigins
      )
    }

    const cacheUrl = new URL(url.pathname, url.origin)
    cacheUrl.searchParams.set('v', endpoint.cacheVersion)
    const cacheKey = new Request(cacheUrl, { method: 'GET' })
    const cachedResponse = await caches.default.match(cacheKey)

    if (cachedResponse) {
      return withCors(cachedResponse, origin, allowedOrigins)
    }

    try {
      const body = await endpoint.load()
      const cacheTtl = getCacheTtl(url.pathname, env, endpoint.defaultCacheTtl)
      const response = jsonResponse(body, 200, {
        'Cache-Control': `public, max-age=60, s-maxage=${cacheTtl}`,
      })

      ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
      return withCors(response, origin, allowedOrigins)
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'upstream_request_failed',
          message: error instanceof Error ? error.message : String(error),
          pathname: url.pathname,
        })
      )

      return withCors(
        jsonResponse({ error: endpoint.publicError }, 502, {
          'Cache-Control': 'no-store',
        }),
        origin,
        allowedOrigins
      )
    }
  },
}

export default worker
