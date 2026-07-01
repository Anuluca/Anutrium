export type SiteLocale = 'zhCn' | 'en'

const LANGUAGE_STORAGE_KEY = 'lang'

export const persistLocale = (locale: SiteLocale) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(LANGUAGE_STORAGE_KEY, locale)
}
