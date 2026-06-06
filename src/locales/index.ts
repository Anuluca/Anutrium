import { createI18n } from 'vue-i18n'

import en from './en'
import zhCn from './zhCn'

const getCurrentLanguage = () => {
  const langCode = localStorage.getItem('lang')
  return langCode
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: getCurrentLanguage() || 'en',
  messages: {
    zhCn,
    en,
  },
})

export default i18n
