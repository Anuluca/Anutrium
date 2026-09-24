import { fetchWithTimeout } from './http'

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
const RECENT_GAME_LIMIT = 3

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

export const fetchSteamProfile = async (env: Env) => {
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
        { ...commonParams, count: RECENT_GAME_LIMIT }
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

  if (Object.values(unavailable).some(Boolean)) {
    console.warn(
      JSON.stringify({ event: 'steam_profile_partial_failure', unavailable })
    )
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
