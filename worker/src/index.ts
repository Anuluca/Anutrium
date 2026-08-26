interface Env {
  STEAM_API_KEY: string
  STEAM_ID: string
  STEAM_VANITY: string
  ALLOWED_ORIGINS: string
  CACHE_TTL_SECONDS: string
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

interface SteamSection<T = unknown> {
  data: T | null
  error: string | null
}

interface SteamApiResponse<T> {
  response?: T
}

interface SteamSummaryPayload {
  players?: Array<Record<string, unknown>>
}

interface SteamGamePayload {
  appid: number
  [key: string]: unknown
}

interface SteamGamesPayload {
  games?: SteamGamePayload[]
  [key: string]: unknown
}

interface SteamLevelPayload {
  player_level?: number
}

const STEAM_API_ORIGIN = 'https://api.steampowered.com'
const PROFILE_CACHE_VERSION = '2'
const RECENT_GAME_LIMIT = 3

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
) => {
  const controller = new AbortController() as AbortController & {
    abort(): void
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const jsonResponse = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })

const getAllowedOrigins = (env: Env) =>
  new Set(
    env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  )

const getCorsHeaders = (
  origin: string | null,
  allowedOrigins: Set<string>
): HeadersInit => {
  if (!origin || !allowedOrigins.has(origin)) return {}

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

const withCors = (
  response: Response,
  origin: string | null,
  allowedOrigins: Set<string>
) => {
  const headers = new Headers(response.headers)
  Object.entries(getCorsHeaders(origin, allowedOrigins)).forEach(
    ([key, value]) => {
      headers.set(key, String(value))
    }
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

const fetchSteam = async <T>(
  env: Env,
  interfaceName: string,
  method: string,
  version: number,
  params: Record<string, string | number | boolean> = {}
): Promise<T> => {
  const url = new URL(
    `/${interfaceName}/${method}/v${version}/`,
    STEAM_API_ORIGIN
  )

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: 'application/json',
        'x-webapi-key': env.STEAM_API_KEY,
      },
    },
    10_000
  )

  if (!response.ok) {
    throw new Error(`${interfaceName}.${method} returned ${response.status}`)
  }

  return (await response.json()) as T
}

const resolveSteamId = async (env: Env) => {
  const result = await fetchSteam<{
    response?: { success?: number; steamid?: string; message?: string }
  }>(env, 'ISteamUser', 'ResolveVanityURL', 1, {
    vanityurl: env.STEAM_VANITY,
  })

  if (result.response?.success !== 1 || !result.response.steamid) {
    throw new Error(result.response?.message || 'Steam vanity ID was not found')
  }

  return result.response.steamid
}

const captureSection = async <T>(
  promise: Promise<T>
): Promise<SteamSection<T>> => {
  try {
    return { data: await promise, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown Steam API error',
    }
  }
}

const fetchSteamProfile = async (env: Env) => {
  const steamId = env.STEAM_ID || (await resolveSteamId(env))
  const commonParams = { steamid: steamId }

  const [summary, ownedGames, recentGames, level] = await Promise.all([
    captureSection(
      fetchSteam<SteamApiResponse<SteamSummaryPayload>>(
        env,
        'ISteamUser',
        'GetPlayerSummaries',
        2,
        { steamids: steamId }
      )
    ),
    captureSection(
      fetchSteam<SteamApiResponse<SteamGamesPayload>>(
        env,
        'IPlayerService',
        'GetOwnedGames',
        1,
        {
          ...commonParams,
          include_appinfo: true,
          include_played_free_games: true,
        }
      )
    ),
    captureSection(
      fetchSteam<SteamApiResponse<SteamGamesPayload>>(
        env,
        'IPlayerService',
        'GetRecentlyPlayedGames',
        1,
        {
          ...commonParams,
          count: RECENT_GAME_LIMIT,
        }
      )
    ),
    captureSection(
      fetchSteam<SteamApiResponse<SteamLevelPayload>>(
        env,
        'IPlayerService',
        'GetSteamLevel',
        1,
        commonParams
      )
    ),
  ])

  const unavailable = {
    summary: summary.error,
    ownedGames: ownedGames.error,
    recentGames: recentGames.error,
    level: level.error,
  }

  return {
    meta: {
      steamId,
      vanity: env.STEAM_VANITY,
      profileUrl: `https://steamcommunity.com/id/${env.STEAM_VANITY}/`,
      updatedAt: new Date().toISOString(),
      unavailable,
    },
    profile: summary.data?.response?.players?.[0] ?? null,
    ownedGames: ownedGames.data?.response ?? null,
    recentGames: recentGames.data?.response ?? null,
    level: level.data?.response ?? null,
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    const allowedOrigins = getAllowedOrigins(env)

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

    if (url.pathname !== '/profile') {
      return withCors(
        jsonResponse({ error: 'Not found' }, 404),
        origin,
        allowedOrigins
      )
    }

    const cacheUrl = new URL('/profile', url.origin)
    cacheUrl.searchParams.set('v', PROFILE_CACHE_VERSION)
    const cacheKey = new Request(cacheUrl, { method: 'GET' })
    const cache = (caches as CacheStorage & { default: Cache }).default
    const cachedResponse = await cache.match(cacheKey)

    if (cachedResponse) {
      return withCors(cachedResponse, origin, allowedOrigins)
    }

    try {
      const body = await fetchSteamProfile(env)
      const cacheTtl = Math.max(
        60,
        Number.parseInt(env.CACHE_TTL_SECONDS, 10) || 900
      )
      const response = jsonResponse(body, 200, {
        'Cache-Control': `public, max-age=60, s-maxage=${cacheTtl}`,
      })

      ctx.waitUntil(cache.put(cacheKey, response.clone()))
      return withCors(response, origin, allowedOrigins)
    } catch (error) {
      return withCors(
        jsonResponse(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Steam profile request failed',
          },
          502,
          { 'Cache-Control': 'no-store' }
        ),
        origin,
        allowedOrigins
      )
    }
  },
}
