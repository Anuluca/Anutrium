import { defineStore } from 'pinia'

// 定义主题类型
export type Theme = 'light' | 'dark'
// 定义设备类型
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export default defineStore('visualState', {
  state: (): { theme: Theme; deviceType: DeviceType } => ({
    theme: 'light',
    deviceType: 'desktop', // 默认为 desktop
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

    /**
     * 设置设备类型
     * @param deviceType - 要设置的设备类型 ('mobile' | 'tablet' | 'desktop')
     */
    setDeviceType(deviceType: DeviceType): void {
      // 验证输入的设备类型值是否有效
      if (!['mobile', 'tablet', 'desktop'].includes(deviceType)) {
        console.warn(
          `Invalid deviceType value: ${deviceType}. Using 'desktop' as fallback.`
        )
        deviceType = 'desktop'
      }

      // 保存设备类型到本地存储（为了兼容之前的逻辑，也可以移除）
      localStorage.setItem('deviceType', deviceType)

      // 更新状态
      this.deviceType = deviceType
    },
  },
})
