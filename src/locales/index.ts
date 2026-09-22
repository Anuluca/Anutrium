import { createI18n } from 'vue-i18n'

import { type LocaleCode, resolveLocalePair } from './resolveLocalePair'
import source from './source'

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
