import { defineConfig } from '@playwright/test'
import config from '../playwright.config'
export default defineConfig({ ...config, testDir: '../tests', outputDir: '../test-results', webServer: undefined, reporter: 'list', workers: 2 })
