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

type LocalePair = [zhCn: unknown, en: unknown]

const resolveLocalePair = (value: unknown): LocalePair => {
  if (isLocalizedValue(value)) {
    const zhCnValue = resolveLocalePair(value.zhCn)[0]
    const enValue = resolveLocalePair(value.en)[1]
    const resolvedEnValue =
      typeof enValue === 'string' && !enValue.trim() ? zhCnValue : enValue

    return [zhCnValue, resolvedEnValue]
  }

  if (Array.isArray(value)) {
    const zhCn: unknown[] = []
    const en: unknown[] = []

    value.forEach((item) => {
      const [zhCnItem, enItem] = resolveLocalePair(item)
      zhCn.push(zhCnItem)
      en.push(enItem)
    })

    return [zhCn, en]
  }

  if (isRecord(value)) {
    const zhCn: Record<string, unknown> = {}
    const en: Record<string, unknown> = {}

    Object.entries(value).forEach(([key, item]) => {
      const [zhCnItem, enItem] = resolveLocalePair(item)
      zhCn[key] = zhCnItem
      en[key] = enItem
    })

    return [zhCn, en]
  }

  return [value, value]
}

const [zhCnMessages, enMessages] = resolveLocalePair(source)
const messages = {
  zhCn: zhCnMessages,
  en: enMessages,
} as Record<LocaleCode, Record<string, any>>

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'zhCn',
  messages,
})

export default i18n
