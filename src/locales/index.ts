import { createI18n } from 'vue-i18n'

import en from './en'
import zhCn from './zhCn'

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'zhCn',
  messages: {
    zhCn,
    en,
  },
})

export default i18n
