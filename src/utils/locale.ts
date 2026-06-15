export type SiteLocale = 'zhCn' | 'en'

const LANGUAGE_STORAGE_KEY = 'lang'

export const normalizeLocale = (locale?: string | null): SiteLocale | null => {
  if (locale === 'zhCn' || locale === 'en') return locale
  return null
}

export const getPreferredLocale = (): SiteLocale => {
  if (typeof window === 'undefined') return 'zhCn'

  const storedLocale = normalizeLocale(
    localStorage.getItem(LANGUAGE_STORAGE_KEY)
  )
  if (storedLocale) return storedLocale

  return navigator.language.toLowerCase().startsWith('zh') ? 'zhCn' : 'en'
}

export const persistLocale = (locale: SiteLocale) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(LANGUAGE_STORAGE_KEY, locale)
}
