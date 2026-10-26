export const islandModules = {
  LABORATORY: {
    routeName: 'ATRIUM_LABORATORY',
    englishTitle: 'LABORATORY',
    path: '/atrium/laboratory',
    group: 'ideas',
    side: 'left',
    desktopX: -0.3,
    mobileX: -0.32,
    desktopY: 0.64,
    mobileY: 0.34,
  },
  NOTES: {
    routeName: 'ATRIUM_NOTES',
    englishTitle: 'NOTES&CHATS',
    path: '/atrium/notes',
    group: 'ideas',
    side: 'left',
    desktopX: -0.3,
    mobileX: -0.1,
    desktopY: 0.49,
    mobileY: 0.22,
  },
  'GAME LIBRARY': {
    routeName: 'ATRIUM_GAMES',
    englishTitle: 'GAME LIBRARY',
    path: '/atrium/games',
    group: 'interests',
    side: 'right',
    desktopX: 0.3,
    mobileX: 0.4,
    desktopY: 0.49,
    mobileY: 0.22,
  },
  COLLECTIBLES: {
    routeName: 'ATRIUM_COLLECTIONS',
    englishTitle: 'COLLECTIONS',
    path: '/atrium/collections',
    group: 'interests',
    side: 'right',
    desktopX: 0.34,
    mobileX: 0.56,
    desktopY: 0.2,
    mobileY: 0.04,
  },
} as const

export type IslandModuleId = keyof typeof islandModules
export const islandModuleAtPath = (path: string): IslandModuleId | null =>
  (Object.keys(islandModules) as IslandModuleId[]).find(
    (id) => islandModules[id].path === path.replace(/\/+$/, '')
  ) ?? null

export const ISLAND_MODEL_DURATION = 2.2
export const ISLAND_WINDOW_DURATION = 0.8
export const ISLAND_RETURN_WINDOW_DURATION = 1.75
export const ISLAND_RESTORE_DELAY =
  ISLAND_MODEL_DURATION - ISLAND_RETURN_WINDOW_DURATION

export const islandCardOpeningDelay: Record<IslandModuleId, number> = {
  LABORATORY: 0.24,
  COLLECTIBLES: 0.4,
  'GAME LIBRARY': 0.56,
  NOTES: 0.72,
}
export const ISLAND_OPENING_DURATION = 1.18
