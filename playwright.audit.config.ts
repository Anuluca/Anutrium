import { defineConfig, devices } from '@playwright/test'

// 审查只连接常驻服务，不自动启动或重启开发服务。
export default defineConfig({
  testDir: './tests',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
})
