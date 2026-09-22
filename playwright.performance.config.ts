import { defineConfig, devices } from '@playwright/test'

const performancePort = 4173

export default defineConfig({
  testDir: './tests',
  testMatch: 'production-performance.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-performance-report' }],
  ],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${performancePort}`,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `yarn preview --host 127.0.0.1 --port ${performancePort} --strictPort`,
    url: `http://127.0.0.1:${performancePort}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'production-slow-4g',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
