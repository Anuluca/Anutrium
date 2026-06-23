import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export default defineStore('visualState', {
  state: (): { theme: Theme; deviceType: DeviceType } => ({
    theme: 'dark',
    deviceType: 'desktop',
  }),

  actions: {
    /**
     * 设置主题并更新本地存储和DOM
     * @param theme - 要设置的主题 ('light' | 'dark')
     */
    setTheme(theme: Theme): void {
      if (theme !== 'light' && theme !== 'dark') {
        console.warn(`Invalid theme value: ${theme}. Using 'dark' as fallback.`)
        theme = 'dark'
      }

      localStorage.setItem('theme', theme)

      const bodyElement = document.body
      if (theme === 'dark') {
        bodyElement.classList.remove('light')
      } else {
        bodyElement.classList.add('light')
      }

      this.theme = theme
    },

    /**
     * 切换主题
     */
    toggleTheme(): void {
      const newTheme: Theme = this.theme === 'light' ? 'dark' : 'light'
      this.setTheme(newTheme)
    },

    /**
     * 设置设备类型
     * @param deviceType - 要设置的设备类型 ('mobile' | 'tablet' | 'desktop')
     */
    setDeviceType(deviceType: DeviceType): void {
      if (!['mobile', 'tablet', 'desktop'].includes(deviceType)) {
        console.warn(
          `Invalid deviceType value: ${deviceType}. Using 'desktop' as fallback.`
        )
        deviceType = 'desktop'
      }

      localStorage.setItem('deviceType', deviceType)

      this.deviceType = deviceType
    },
  },
})
