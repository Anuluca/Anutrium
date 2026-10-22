import { pageThemeColors } from './pageThemes'

// 页面内容按需加载；悬停、聚焦与导航共享模块主题。
export const templeCategories = [
  {
    id: 'archive',
    enabled: true,
    roman: 'I',
    title: 'ARCHIVE',
    label: '作品集',
    themeColor: pageThemeColors.ARCHIVE,
    zodiacSign: 'aquarius',
    x: -6.9,
    z: 3,
  },
  {
    id: 'flanerie',
    enabled: true,
    roman: 'II',
    title: 'FLÂNERIE',
    label: '旅程',
    themeColor: pageThemeColors.FLANERIE,
    zodiacSign: 'sagittarius',
    x: -6.6,
    z: -7.2,
  },
  {
    id: 'pokeyard',
    enabled: true,
    roman: 'III',
    title: 'POKÉYARD',
    label: '宝可后院',
    themeColor: pageThemeColors.POKEYARD,
    zodiacSign: 'leo',
    x: 6.6,
    z: -7.2,
  },
  {
    id: 'island',
    enabled: true,
    roman: 'IV',
    title: 'CREATIVE',
    label: '创作',
    themeColor: pageThemeColors.ISLAND,
    zodiacSign: 'pisces',
    x: 6.9,
    z: 3,
  },
] as const

export type TempleCategoryId = (typeof templeCategories)[number]['id']
export const templeCategoryById = new Map<
  TempleCategoryId,
  (typeof templeCategories)[number]
>(templeCategories.map((item) => [item.id, item]))

export const templeNavigation = [
  ...templeCategories,
  {
    id: 'sprigatito',
    title: 'FLORATRIUM',
    label: '花花小窝',
    enabled: true,
    themeColor: pageThemeColors.SPRIGATITO,
  },
  {
    id: 'statue',
    title: 'ISLAND',
    label: '个人海湾',
    enabled: true,
    themeColor: pageThemeColors.HOME,
  },
  { id: 'about', title: 'ABOUT', label: '关于', enabled: true },
] as const
export type TempleNavigationId = (typeof templeNavigation)[number]['id']

export const templeNavigationById = new Map<
  TempleNavigationId,
  (typeof templeNavigation)[number]
>(templeNavigation.map((item) => [item.id, item]))

const menuItemsById = (ids: readonly TempleNavigationId[]) =>
  ids.map((id) => templeNavigationById.get(id)!)

// 只定义顺序，不复制配置；页头实例及重新渲染复用同一组导航项。
export const templeMobileMenuItems = menuItemsById([
  'statue',
  'sprigatito',
  'archive',
  'flanerie',
  'pokeyard',
  'island',
  'about',
])
export const templeDesktopMenuGroups = [
  menuItemsById(['archive', 'flanerie', 'statue']),
  menuItemsById(['sprigatito', 'pokeyard', 'island', 'about']),
]

// 模块入口与子页面归属共用映射，直接访问和返回首页使用同一规则。
// 内部 island 标识属于 CREATIVE；公开 /island 入口对应中央 ISLAND 模型。
export const templeModulePaths: Record<TempleCategoryId, string> = {
  archive: '/archive',
  flanerie: '/flanerie',
  island: '/creative',
  pokeyard: '/pokeyard',
}
export type TempleEntryId = Exclude<TempleNavigationId, 'about'>
const moduleByPath = new Map<string, TempleEntryId>([
  ...templeCategories.map((item): [string, TempleEntryId] => [
    templeModulePaths[item.id],
    item.id,
  ]),
  ['/island', 'statue'],
  ['/floratrium', 'sprigatito'],
])
export const templeModuleAtPath = (path: string): TempleEntryId | null =>
  moduleByPath.get(path.replace(/\/+$/, '')) ?? null

export const templeParentModule = (path: string): TempleCategoryId | null => {
  if (path.startsWith('/flanerie/')) return 'flanerie'
  if (path.startsWith('/pokeyard/')) return 'pokeyard'
  if (
    path.startsWith('/island/') ||
    path.startsWith('/games/') ||
    path === '/test'
  )
    return 'island'
  if (
    path === '/craft' ||
    /^\/(colorPalette|easeStudio|metronome|bounceDynamics|htmlEntities|base64Codec|imageBase64|ai-playground)(\/|$)/.test(
      path
    )
  )
    return 'island'
  return null
}
