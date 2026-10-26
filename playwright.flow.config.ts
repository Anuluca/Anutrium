import { defineConfig, devices } from '@playwright/test'

// 复用已有服务，禁止测试自动启动或停止开发服务。
export default defineConfig({
  testDir: './tests',
  testMatch: [
    'island-wire-flow.spec.ts',
    'island-model-scan.spec.ts',
    'island-performance.spec.ts',
    'island-anchor-updates.spec.ts',
    'model-scan-composite.spec.ts',
    'island-transition-optimization.spec.ts',
    'dolly-camera.spec.ts',
  ],
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    video: process.env.ISLAND_FLOW_VIDEO === '1' ? 'on' : 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
