export interface SteamProfile {
  steamid: string
  communityvisibilitystate: number
  profilestate?: number
  personaname: string
  profileurl: string
  avatar: string
  avatarmedium: string
  avatarfull: string
  avatarhash?: string
  personastate: number
  realname?: string
  primaryclanid?: string
  timecreated?: number
  lastlogoff?: number
  gameextrainfo?: string
  gameid?: string
}

export interface SteamGame {
  appid: number
  name: string
  capsule_image?: string
  img_icon_url?: string
  playtime_forever: number
  playtime_2weeks?: number
  rtime_last_played?: number
  playtime_windows_forever?: number
  playtime_mac_forever?: number
  playtime_linux_forever?: number
  playtime_deck_forever?: number
  has_community_visible_stats?: boolean
}

export interface SteamProfileResponse {
  meta: {
    steamId: string
    vanity: string
    profileUrl: string
    updatedAt: string
    unavailable: Record<string, string | null>
  }
  profile: SteamProfile | null
  ownedGames: {
    game_count: number
    games?: SteamGame[]
  } | null
  recentGames: {
    total_count: number
    games?: SteamGame[]
  } | null
  level: {
    player_level: number
  } | null
}
