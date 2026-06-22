import { createI18n } from 'vue-i18n'

import source from './source'

type LocaleCode = 'zhCn' | 'en'

const localeCodes: LocaleCode[] = ['zhCn', 'en']

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const isLocalizedValue = (
  value: unknown
): value is Record<LocaleCode, unknown> => {
  if (!isRecord(value)) return false

  const keys = Object.keys(value)
  return (
    localeCodes.every((locale) =>
      Object.prototype.hasOwnProperty.call(value, locale)
    ) && keys.every((key) => localeCodes.includes(key as LocaleCode))
  )
}

const resolveLocaleValue = (value: unknown, locale: LocaleCode): unknown => {
  if (isLocalizedValue(value)) {
    return resolveLocaleValue(value[locale], locale)
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveLocaleValue(item, locale))
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveLocaleValue(item, locale),
      ])
    )
  }

  return value
}

const messages = Object.fromEntries(
  localeCodes.map((locale) => [locale, resolveLocaleValue(source, locale)])
) as Record<LocaleCode, unknown>

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'zhCn',
  messages,
})

export default i18n
