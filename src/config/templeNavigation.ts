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
    title: 'ISLAND',
    label: '个人海湾',
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
  { id: 'about', title: 'ABOUT', label: '关于', enabled: true },
] as const
export type TempleNavigationId = TempleCategoryId | 'about'

// 模块入口与子页面归属共用映射，直接访问和返回首页使用同一规则。
export const templeModulePaths: Record<TempleCategoryId, string> = {
  archive: '/archive',
  flanerie: '/flanerie',
  island: '/island',
  pokeyard: '/pokeyard',
}
const moduleByPath = new Map(
  templeCategories.map((item) => [templeModulePaths[item.id], item.id])
)
export const templeModuleAtPath = (path: string): TempleCategoryId | null =>
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
