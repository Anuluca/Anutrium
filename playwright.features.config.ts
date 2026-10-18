import { defineConfig, devices } from '@playwright/test'

// 复用用户已运行的服务，不创建或重启 Vite。
export default defineConfig({
  testDir: './tests',
  testMatch: ['home-features.spec.ts', 'lucario-headache.spec.ts'],
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
