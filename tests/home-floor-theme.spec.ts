import { expect, test } from '@playwright/test'

for (const initialMode of ['dark', 'light'] as const) {
  test(`${initialMode} floor follows module colors and survives theme switching`, async ({
    page,
  }, info) => {
    test.setTimeout(120000)
    await page.addInitScript(
      (mode) => localStorage.setItem('theme', mode),
      initialMode
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 60000,
    })
    await expect(stage).toHaveAttribute('data-color-mode', initialMode)
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 20000,
    })
    const canvas = await stage.locator('canvas').elementHandle()
    const palette = () => stage.getAttribute('data-floor-colors')
    const homePalette = await palette()
    expect(homePalette).toMatch(/^#[\da-f]{6},#[\da-f]{6},#[\da-f]{6}$/)
    const select = async (id: string | null) => {
      await page.evaluate((selection) => {
        const app = (document.querySelector('#app') as any).__vue_app__
        app.config.globalProperties.$pinia._s
          .get('temple-navigation')
          .request(selection)
      }, id)
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-selected',
        id || 'none'
      )
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-settled',
        'true'
      )
    }
    const setMode = async (mode: 'light' | 'dark') => {
      await page.evaluate((theme) => {
        const app = (document.querySelector('#app') as any).__vue_app__
        app.config.globalProperties.$pinia._s.get('visualState').setTheme(theme)
      }, mode)
      await expect(stage).toHaveAttribute('data-color-mode', mode)
    }
    for (const [module, channel] of [
      ['archive', 'blue'],
      ['flanerie', 'red'],
    ] as const) {
      await select(module)
      for (const mode of [
        initialMode,
        initialMode === 'dark' ? 'light' : 'dark',
        initialMode,
      ] as const) {
        await setMode(mode)
        // 读取实际传入地面着色器的颜色，防止仅主题状态变化、材质仍停留在固定色。
        await expect
          .poll(async () => {
            const far = (await palette())!.split(',')[1].slice(1)
            const red = parseInt(far.slice(0, 2), 16)
            const blue = parseInt(far.slice(4, 6), 16)
            return {
              hue: channel === 'blue' ? blue > red : red > blue,
              brightness:
                mode === 'light'
                  ? Math.min(red, blue) > 180
                  : Math.max(red, blue) < 80,
            }
          })
          .toEqual({ hue: true, brightness: true })
      }
      expect(await palette()).not.toBe(homePalette)
      expect(
        await canvas!.evaluate(
          (node) => node === document.querySelector('.temple-stage canvas')
        )
      ).toBe(true)
      await page.screenshot({
        path: info.outputPath(`${initialMode}-${module}.png`),
      })
    }
    await select(null)
    await expect.poll(palette).toBe(homePalette)
  })
}
