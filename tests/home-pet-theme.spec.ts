import { pageThemeColors } from '../src/config/pageThemes'
import { expect, test } from './helpers/sceneDiagnostics'

for (const mode of ['dark', 'light'] as const) {
  test(`direct Floratrium entry restores home model colors in ${mode} mode`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.addInitScript(
      (theme) => localStorage.setItem('theme', theme),
      mode
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const stage = page.locator('.temple-stage')
    const root = page.locator('.temple-page')
    const ready = async () => {
      await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
        timeout: 60000,
      })
      await expect(stage).toHaveAttribute('data-color-mode', mode)
    }
    const colors = async () => ({
      pet: await stage.getAttribute('data-companion-color'),
      statue: await stage.getAttribute('data-statue-color'),
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await ready()
    // 以直接进入主页时的实际材质色作为基准，不能只检查页面主题状态。
    await expect(stage).toHaveAttribute('data-companion-color', /^#[\da-f]{6}$/)
    const homeColors = await colors()

    await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
    await ready()
    await expect(root).toHaveAttribute('data-selected', 'sprigatito')
    await expect(stage).toHaveAttribute(
      'data-theme-color',
      pageThemeColors.SPRIGATITO
    )
    await stage.locator('canvas').focus()
    await page.keyboard.press('Escape')
    await expect(root).toHaveAttribute('data-selected', 'none')
    await expect(root).toHaveAttribute('data-settled', 'true')
    await expect(stage).toHaveAttribute(
      'data-theme-color',
      pageThemeColors.HOME
    )
    await expect.poll(colors).toEqual(homeColors)

    // 再次进出模块，确保模型材质没有累计染色。
    await page.evaluate(() => {
      const app = (document.querySelector('#app') as any).__vue_app__
      app.config.globalProperties.$pinia._s
        .get('temple-navigation')
        .request('sprigatito')
    })
    await expect(root).toHaveAttribute('data-selected', 'sprigatito')
    await expect(root).toHaveAttribute('data-settled', 'true')
    await stage.locator('canvas').focus()
    await page.keyboard.press('Escape')
    await expect(root).toHaveAttribute('data-selected', 'none')
    await expect(root).toHaveAttribute('data-settled', 'true')
    await expect.poll(colors).toEqual(homeColors)
  })
}
