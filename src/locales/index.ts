import { createI18n } from 'vue-i18n'

import en from './en'
import zhCn from './zhCn'

// 设置当前的语言
const getCurrentLanguage = () => {
  const langCode = localStorage.getItem('lang')
  return langCode
}

// 创建i8n
const i18n = createI18n({
  legacy: false, // 使用的vue3.2
  globalInjection: true, // 全局的t函数
  locale: getCurrentLanguage() || 'en', // 设置语言
  messages: {
    zhCn,
    en,
  }, // 数据源
})

export default i18n
