import { expect, test } from '@playwright/test'

for (const theme of ['dark', 'light'] as const) {
  test(`island shares the home background in ${theme} theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(
      (value) => localStorage.setItem('theme', value),
      theme
    )
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const background = page.locator('.star-container')
    const base = page.locator('.backdrop-color-base')
    await expect(background).toHaveClass(new RegExp(`\\b${theme}\\b`))
    const homeColor = theme === 'dark' ? 'rgb(56, 14, 28)' : 'rgb(62, 16, 31)'
    await expect(base).toHaveCSS('background-color', homeColor)
    await page.goto('/island', { waitUntil: 'domcontentloaded' })
    await expect(background).not.toHaveClass(/is-deep-black/)
    await expect(base).toHaveCSS('background-color', homeColor)
    // 只调整神殿入口；已有子页面的独立背景配置仍然生效。
    await page.goto('/island/photography', { waitUntil: 'domcontentloaded' })
    await expect(background).toHaveClass(/is-deep-black/)
    await expect(base).toHaveCSS('background-color', 'rgb(3, 3, 3)')
  })
}
