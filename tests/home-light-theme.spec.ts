import { expect, test } from '@playwright/test'

for (const path of ['/', '/floratrium', '/archive']) {
  test(`light theme renders ${path} and switches the existing scene in place`, async ({
    page,
  }, info) => {
    test.setTimeout(90000)
    await page.addInitScript(() => localStorage.setItem('theme', 'light'))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 60000,
    })
    await expect(stage).toHaveAttribute('data-color-mode', 'light')
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 20000,
    })
    const alert = page.locator('.mobile-experience-alert')
    if (await alert.isVisible()) await alert.click()
    const canvas = await stage.locator('canvas').elementHandle()
    const initialColor = await stage.getAttribute('data-theme-color')
    const colors = await page.evaluate(() => {
      const style = (selector: string) =>
        getComputedStyle(document.querySelector(selector)!)
      return {
        backdrop: getComputedStyle(
          document.querySelector('.star-container')!,
          '::before'
        ).backgroundImage,
        page: style('.temple-page').color,
        footer: style('.page-footer-home').color,
        stroke: style('.recommend-title').webkitTextStrokeWidth,
      }
    })
    expect(colors.backdrop).toBe('none')
    expect(colors.page).toBe('rgb(31, 31, 31)')
    expect(colors.footer).toBe(colors.page)
    expect(colors.stroke).toBe('0px')
    if (info.project.name.includes('mobile') && path === '/floratrium')
      expect(
        await stage.evaluate(
          (node) => getComputedStyle(node, '::after').backgroundImage
        )
      ).toContain('rgb(255, 255, 255)')
    if (path === '/floratrium') {
      await expect(page.locator('.flora-pet-memo')).toHaveCSS(
        'color',
        colors.page
      )
      await expect(page.locator('.flora-stats-chart__value').first()).toHaveCSS(
        'fill',
        colors.page
      )
      await expect(page.locator('.flora-move-card__pp').first()).toHaveCSS(
        'color',
        'rgb(255, 255, 244)'
      )
    }
    await page.screenshot({ path: info.outputPath('light.png') })
    // 连续切换必须复用画布和选中模块，避免重新加载模型或丢失聚焦状态。
    for (const mode of ['dark', 'light'] as const) {
      await page.evaluate((theme) => {
        const app = (document.querySelector('#app') as any).__vue_app__
        app.config.globalProperties.$pinia._s.get('visualState').setTheme(theme)
      }, mode)
      await expect(stage).toHaveAttribute('data-color-mode', mode)
      expect(await stage.getAttribute('data-theme-color')).toBe(initialColor)
      expect(
        await canvas!.evaluate(
          (node) => node === document.querySelector('.temple-stage canvas')
        )
      ).toBe(true)
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-selected',
        path === '/' ? 'none' : path === '/archive' ? 'archive' : 'sprigatito'
      )
    }
  })
}
