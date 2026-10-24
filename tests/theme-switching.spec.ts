import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/colorPalette', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.palette-tool')).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 45000,
  })
})

test('desktop and mobile controls keep the last choice while light styles load once', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let requests = 0
  await page.route('**/src/assets/style/light-theme.less*', async (route) => {
    requests++
    await gate
    await route.continue()
  })
  const toggle = info.project.name.includes('mobile')
    ? page.locator('.mobile-menu-theme')
    : page.locator('.bb8-toggle__checkbox')
  const clickToggle = async () => {
    // 移动菜单的操作按钮会关闭菜单，后续切换按真实操作重新打开。
    if (info.project.name.includes('mobile')) {
      const menu = page.locator('.mobile-menu-icon')
      if ((await menu.getAttribute('aria-expanded')) !== 'true')
        await menu.click()
      await expect(page.locator('.mobile-menu-panel')).toHaveClass(/\bactive\b/)
    }
    await toggle.click()
  }
  await clickToggle()
  await expect.poll(() => requests).toBe(1)
  await expect(page.locator('body')).toHaveClass(/\bdark\b/)
  await clickToggle()
  release()
  await page.evaluate(async () => {
    const loader = await import('/src/utils/themeStyles.ts')
    await loader.ensureLightThemeStyles()
  })
  await expect(page.locator('body')).toHaveClass(/\bdark\b/)
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark')
  await clickToggle()
  await expect(page.locator('body')).toHaveClass(/\blight\b/)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light')
  expect(requests).toBe(1)
})

test('failed stylesheet loading preserves applied theme and clears the pending request', async ({
  page,
}) => {
  await page.route('**/src/assets/style/light-theme.less*', (route) =>
    route.abort()
  )
  const result = await page.evaluate(async () => {
    const app = (document.querySelector('#app') as any).__vue_app__
    const store = app.config.globalProperties.$pinia._s.get('visualState')
    const applied = await store.setTheme('light')
    return {
      applied,
      theme: store.theme,
      pending: store.pendingTheme,
      saved: localStorage.getItem('theme'),
    }
  })
  expect(result).toEqual({
    applied: false,
    theme: 'dark',
    pending: null,
    saved: 'dark',
  })
  await expect(page.locator('body')).toHaveClass(/\bdark\b/)
})

test('scene tint registry deduplicates shared colors and resumes interrupted interpolation', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createThemeTint } = await import(
      '/src/views/Home/scene/themeTint.ts'
    )
    const tint = createThemeTint('#e23456')
    const surface = tint.color.clone()
    tint.track(surface)
    tint.track(surface)
    tint.prepare('#3276fe', undefined, () => {})
    const target = tint.targets[0].target.clone()
    tint.apply(0.5)
    const middle = surface.clone()
    tint.prepare('#c44129', undefined, () => {})
    tint.apply(0)
    return {
      count: tint.targets.length,
      indexes: tint.byColor.size,
      interpolated: !middle.equals(target) && !middle.equals(tint.color),
      continuous: surface.equals(middle),
    }
  })
  expect(result).toEqual({
    count: 1,
    indexes: 1,
    interpolated: true,
    continuous: true,
  })
})
