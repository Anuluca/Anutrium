import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { copyText } from '@/utils/clipboard'
import { showSuccessMessage } from '@/utils/elementMessage'

import type { SteamGame, SteamProfileResponse } from '@/types/steam'

type SteamTab = 'overview' | 'games'

interface SteamGameListItem extends SteamGame {
  indexLabel: string
  lastPlayedLabel: string
  normalizedName: string
  playtimeLabel: string
}

interface SteamRecentGameItem extends SteamGame {
  backgroundImage: string
  recentPlaytimeLabel: string
  totalPlaytimeLabel: string
}

const GAME_PAGE_SIZE = 30
const RECENT_GAME_LIMIT = 3
const STEAM_FRIEND_CODE = '326757638'
const STATUS_KEYS = [
  'offline',
  'online',
  'busy',
  'away',
  'snooze',
  'lookingToTrade',
  'lookingToPlay',
] as const

const STEAM_WORKER_URL = (
  import.meta.env.VITE_STEAM_WORKER_URL ||
  'https://anutrium-steam-api.tilucario.workers.dev'
).replace(/\/$/, '')

const getGameIconUrl = (game: SteamGame) =>
  `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`

const getGameActivityCapsuleUrl = (appId: number) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_231x87.jpg`

const getRecentGameImage = (game: SteamGame) => {
  const layers = [
    `url("${game.capsule_image || getGameActivityCapsuleUrl(game.appid)}")`,
  ]

  if (game.img_icon_url) layers.push(`url("${getGameIconUrl(game)}")`)

  return layers.join(', ')
}

const getStoreUrl = (appId: number) =>
  `https://store.steampowered.com/app/${appId}/`

export const useSteamProfile = () => {
  const { locale, t } = useI18n()
  const steamData = ref<SteamProfileResponse | null>(null)
  const isLoading = ref(true)
  const errorMessage = ref('')
  const activeTab = ref<SteamTab>('overview')
  const visibleGameCount = ref(GAME_PAGE_SIZE)
  const gameSearchQuery = ref('')
  let requestController: AbortController | null = null

  const formattingLocale = computed(() =>
    locale.value === 'en' ? 'en-US' : 'zh-CN'
  )
  const integerFormatter = computed(
    () => new Intl.NumberFormat(formattingLocale.value)
  )
  const decimalFormatter = computed(
    () =>
      new Intl.NumberFormat(formattingLocale.value, {
        maximumFractionDigits: 1,
      })
  )
  const dateFormatter = computed(
    () =>
      new Intl.DateTimeFormat(formattingLocale.value, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
  )
  const dateTimeFormatter = computed(
    () =>
      new Intl.DateTimeFormat(formattingLocale.value, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
  )

  const formatPlaytime = (minutes: number) => {
    const hours = minutes / 60
    const formatter =
      hours < 10 ? decimalFormatter.value : integerFormatter.value
    return `${formatter.format(hours)} h`
  }

  const formatDate = (unixSeconds: number) =>
    dateFormatter.value.format(new Date(unixSeconds * 1000))

  const ownedGames = computed(() => steamData.value?.ownedGames?.games ?? [])
  const sortedGames = computed(() =>
    [...ownedGames.value].sort(
      (first, second) => second.playtime_forever - first.playtime_forever
    )
  )
  const gameListItems = computed<SteamGameListItem[]>(() =>
    sortedGames.value.map((game, index) => ({
      ...game,
      indexLabel: String(index + 1).padStart(3, '0'),
      lastPlayedLabel: game.rtime_last_played
        ? formatDate(game.rtime_last_played)
        : '',
      normalizedName: game.name.toLocaleLowerCase(formattingLocale.value),
      playtimeLabel: formatPlaytime(game.playtime_forever),
    }))
  )
  const filteredGames = computed(() => {
    const query = gameSearchQuery.value
      .trim()
      .toLocaleLowerCase(formattingLocale.value)

    if (!query) return gameListItems.value
    return gameListItems.value.filter((game) =>
      game.normalizedName.includes(query)
    )
  })
  const visibleGames = computed(() =>
    filteredGames.value.slice(0, visibleGameCount.value)
  )
  const recentGames = computed<SteamRecentGameItem[]>(() =>
    (steamData.value?.recentGames?.games ?? [])
      .slice(0, RECENT_GAME_LIMIT)
      .map((game) => ({
        ...game,
        backgroundImage: getRecentGameImage(game),
        recentPlaytimeLabel: formatPlaytime(game.playtime_2weeks || 0),
        totalPlaytimeLabel: formatPlaytime(game.playtime_forever),
      }))
  )

  const profileStatus = computed(() => {
    const profile = steamData.value?.profile

    if (profile?.gameextrainfo) {
      return {
        className: 'is-playing',
        label: `${t('steamProfile.playing')} ${profile.gameextrainfo}`,
      }
    }

    const statusKey = STATUS_KEYS[profile?.personastate || 0] || 'offline'
    return {
      className: profile?.personastate ? 'is-online' : 'is-offline',
      label: t(`steamProfile.status.${statusKey}`),
    }
  })

  const totalPlaytime = computed(() =>
    ownedGames.value.reduce((total, game) => total + game.playtime_forever, 0)
  )
  const steamLevel = computed(
    () => steamData.value?.level?.player_level ?? '--'
  )
  const overviewStats = computed(() => [
    {
      label: t('steamProfile.games'),
      value: steamData.value?.ownedGames?.game_count ?? '--',
    },
    {
      label: t('steamProfile.playtime'),
      value: formatPlaytime(totalPlaytime.value),
    },
  ])
  const publicDetails = computed(() => {
    const profile = steamData.value?.profile

    return [
      {
        label: t('steamProfile.friendCode'),
        value: STEAM_FRIEND_CODE,
        copyable: true,
      },
      {
        label: t('steamProfile.createdAt'),
        value: profile?.timecreated ? formatDate(profile.timecreated) : '--',
        copyable: false,
      },
      {
        label: t('steamProfile.lastOnline'),
        value: profile?.lastlogoff ? formatDate(profile.lastlogoff) : '--',
        copyable: false,
      },
      {
        label: t('steamProfile.updatedAt'),
        value: steamData.value?.meta.updatedAt
          ? dateTimeFormatter.value.format(
              new Date(steamData.value.meta.updatedAt)
            )
          : '--',
        copyable: false,
      },
    ]
  })
  const tabs = computed(() => [
    {
      key: 'overview' as const,
      label: t('steamProfile.overview'),
      count: null,
    },
    {
      key: 'games' as const,
      label: t('steamProfile.games'),
      count: steamData.value?.ownedGames?.game_count ?? null,
    },
  ])

  const showMoreGames = () => {
    visibleGameCount.value += GAME_PAGE_SIZE
  }

  const copySteamFriendCode = async () => {
    await copyText(STEAM_FRIEND_CODE)
    showSuccessMessage(t('steamProfile.friendCodeCopySuccess'))
  }

  const loadProfile = async () => {
    requestController?.abort()
    const controller = new AbortController()
    requestController = controller
    isLoading.value = true
    errorMessage.value = ''

    try {
      const response = await fetch(`${STEAM_WORKER_URL}/profile`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      const body = (await response.json()) as SteamProfileResponse & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(body.error || `HTTP ${response.status}`)
      }

      if (requestController === controller) steamData.value = body
    } catch (error) {
      if (controller.signal.aborted) return
      errorMessage.value =
        error instanceof Error ? error.message : t('steamProfile.unknownError')
    } finally {
      if (requestController === controller) {
        requestController = null
        isLoading.value = false
      }
    }
  }

  watch(gameSearchQuery, () => {
    visibleGameCount.value = GAME_PAGE_SIZE
  })
  onMounted(loadProfile)
  onBeforeUnmount(() => {
    const controller = requestController
    requestController = null
    controller?.abort()
  })

  return {
    activeTab,
    copySteamFriendCode,
    errorMessage,
    filteredGames,
    gameSearchQuery,
    getGameIconUrl,
    getStoreUrl,
    isLoading,
    loadProfile,
    overviewStats,
    profileStatus,
    publicDetails,
    recentGames,
    showMoreGames,
    steamData,
    steamLevel,
    t,
    tabs,
    visibleGames,
  }
}
