import { expect, test } from '@playwright/test'

for (const theme of ['dark', 'light'] as const) {
  test(`island background fades in both directions in ${theme} theme`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(
      (value) => localStorage.setItem('theme', value),
      theme
    )
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    const base = page.locator('.backdrop-color-base')
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 60000,
    })
    const homeColor = await base.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    )
    const masks = await page
      .locator('.star-container')
      .evaluate((el) =>
        ['::before', '::after'].map(
          (pseudo) => getComputedStyle(el, pseudo).backgroundImage
        )
      )
    for (const selection of ['statue', null]) {
      const colors = await page.evaluate(async (selection) => {
        const app = (document.querySelector('#app') as any).__vue_app__
        app.config.globalProperties.$pinia._s
          .get('temple-navigation')
          .request(selection)
        const colors: string[] = []
        const start = performance.now()
        await new Promise<void>((resolve) => {
          const sample = () => {
            colors.push(
              getComputedStyle(document.querySelector('.backdrop-color-base')!)
                .backgroundColor
            )
            if (performance.now() - start < 2400) requestAnimationFrame(sample)
            else resolve()
          }
          requestAnimationFrame(sample)
        })
        return colors
      }, selection)
      expect(new Set(colors).size).toBeGreaterThan(2)
      await expect(page.locator('.star-container')).not.toHaveClass(
        /is-deep-black/
      )
      expect(
        await page
          .locator('.star-container')
          .evaluate((el) =>
            ['::before', '::after'].map(
              (pseudo) => getComputedStyle(el, pseudo).backgroundImage
            )
          )
      ).toEqual(masks)
      if (selection) {
        const readRgb = () =>
          base.evaluate((el) => {
            const canvas = document.createElement('canvas')
            canvas.width = canvas.height = 1
            const context = canvas.getContext('2d')!
            context.fillStyle = getComputedStyle(el).backgroundColor
            context.fillRect(0, 0, 1, 1)
            return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
          })
        await expect.poll(readRgb, { timeout: 15000 }).toEqual([3, 2, 2])
      } else
        await expect(base).toHaveCSS('background-color', homeColor, {
          timeout: 15000,
        })
    }
  })
}
