import { createI18n } from 'vue-i18n'
import zhCn from './zhCn'
import en from './en'

// 设置当前的语言
const getCurrentLanguage = () => {
  // // 浏览器设置语言
  // const UAlang = navigator.language
  // // 判断UAlang是哪一种语言
  // const langCode = UAlang.indexOf('zh') !== -1 ? 'zhCn' : 'en'
  // // 存起来
  // localStorage.setItem('lang', langCode)
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
    en
  } // 数据源
})

export default i18n
