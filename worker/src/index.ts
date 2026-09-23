interface Env {
  STEAM_API_KEY: string
  GITHUB_TOKEN: string
  STEAM_ID: string
  STEAM_VANITY: string
  GITHUB_USERNAME: string
  ALLOWED_ORIGINS: string
  CACHE_TTL_SECONDS: string
  GITHUB_CACHE_TTL_SECONDS: string
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
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'
const PROFILE_CACHE_VERSION = '2'
const GITHUB_CONTRIBUTIONS_CACHE_VERSION = '1'
const RECENT_GAME_LIMIT = 3

interface GitHubContributionDay {
  color: string
  contributionCount: number
  contributionLevel:
    | 'NONE'
    | 'FIRST_QUARTILE'
    | 'SECOND_QUARTILE'
    | 'THIRD_QUARTILE'
    | 'FOURTH_QUARTILE'
  date: string
  weekday: number
}

interface GitHubContributionWeek {
  contributionDays: GitHubContributionDay[]
  firstDay: string
}

interface GitHubContributionsPayload {
  data?: {
    user?: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number
          weeks: GitHubContributionWeek[]
        }
      }
      login: string
    } | null
  }
  errors?: Array<{ message?: string }>
}

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

const fetchGitHubContributions = async (env: Env) => {
  const to = new Date()
  const from = new Date(to)
  from.setUTCFullYear(from.getUTCFullYear() - 1)

  const response = await fetchWithTimeout(
    GITHUB_GRAPHQL_URL,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Anutrium-GitHub-Contributions',
      },
      body: JSON.stringify({
        query: `
          query GitHubContributionCalendar(
            $username: String!
            $from: DateTime!
            $to: DateTime!
          ) {
            user(login: $username) {
              login
              contributionsCollection(from: $from, to: $to) {
                contributionCalendar {
                  totalContributions
                  weeks {
                    firstDay
                    contributionDays {
                      color
                      contributionCount
                      contributionLevel
                      date
                      weekday
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          username: env.GITHUB_USERNAME,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
    },
    10_000
  )

  const payload = (await response.json()) as GitHubContributionsPayload
  if (!response.ok || payload.errors?.length) {
    throw new Error(
      payload.errors?.[0]?.message ||
        `GitHub GraphQL returned ${response.status}`
    )
  }

  const user = payload.data?.user
  if (!user) throw new Error('GitHub user was not found')

  const calendar = user.contributionsCollection.contributionCalendar
  return {
    username: user.login,
    from: from.toISOString(),
    to: to.toISOString(),
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks.map((week) => ({
      firstDay: week.firstDay,
      days: week.contributionDays.map((day) => ({
        contributionCount: day.contributionCount,
        contributionLevel: day.contributionLevel,
        date: day.date,
        weekday: day.weekday,
      })),
    })),
    updatedAt: new Date().toISOString(),
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

    if (
      url.pathname !== '/profile' &&
      url.pathname !== '/github/contributions'
    ) {
      return withCors(
        jsonResponse({ error: 'Not found' }, 404),
        origin,
        allowedOrigins
      )
    }

    const isGitHubContributionsRequest =
      url.pathname === '/github/contributions'
    const cacheUrl = new URL(url.pathname, url.origin)
    cacheUrl.searchParams.set(
      'v',
      isGitHubContributionsRequest
        ? GITHUB_CONTRIBUTIONS_CACHE_VERSION
        : PROFILE_CACHE_VERSION
    )
    const cacheKey = new Request(cacheUrl, { method: 'GET' })
    const cache = (caches as CacheStorage & { default: Cache }).default
    const cachedResponse = await cache.match(cacheKey)

    if (cachedResponse) {
      return withCors(cachedResponse, origin, allowedOrigins)
    }

    try {
      const body = isGitHubContributionsRequest
        ? await fetchGitHubContributions(env)
        : await fetchSteamProfile(env)
      const cacheTtl = Math.max(
        60,
        Number.parseInt(
          isGitHubContributionsRequest
            ? env.GITHUB_CACHE_TTL_SECONDS
            : env.CACHE_TTL_SECONDS,
          10
        ) || (isGitHubContributionsRequest ? 21_600 : 900)
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
                : isGitHubContributionsRequest
                ? 'GitHub contributions request failed'
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
