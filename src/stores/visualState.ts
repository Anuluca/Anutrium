import { defineStore } from 'pinia'

// 定义主题类型
export type Theme = 'light' | 'dark'

export default defineStore('visualState', {
  state: (): { theme: Theme } => ({
    theme: 'light',
  }),

  actions: {
    /**
     * 设置主题并更新本地存储和DOM
     * @param theme - 要设置的主题 ('light' | 'dark')
     */
    setTheme(theme: Theme): void {
      // 验证输入的主题值是否有效
      if (theme !== 'light' && theme !== 'dark') {
        console.warn(
          `Invalid theme value: ${theme}. Using 'light' as fallback.`
        )
        theme = 'light'
      }

      // 保存主题到本地存储
      localStorage.setItem('theme', theme)

      // 获取body元素并更新类
      const bodyElement = document.body
      if (theme === 'dark') {
        bodyElement.classList.remove('light')
      } else {
        bodyElement.classList.add('light')
      }

      // 更新状态
      this.theme = theme
    },

    /**
     * 切换主题
     */
    toggleTheme(): void {
      const newTheme: Theme = this.theme === 'light' ? 'dark' : 'light'
      this.setTheme(newTheme)
    },
  },
})
