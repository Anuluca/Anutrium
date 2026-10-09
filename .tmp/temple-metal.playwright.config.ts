import { defineConfig } from '@playwright/test'
import config from './temple.playwright.config'
export default defineConfig({ ...config, use: { ...config.use, launchOptions: { args: ['--use-angle=metal'] } }, workers: 1 })
