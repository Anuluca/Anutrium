import { expect, test } from '@playwright/test'

for (const entry of [
  { path: '/island', selection: 'statue' },
  { path: '/floratrium', selection: 'sprigatito' },
  { path: '/creative', selection: 'island' },
]) {
  test(`${entry.path} opens the correct home focus directly and after reload`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.goto(`${entry.path}/`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      entry.selection,
      { timeout: 45000 }
    )
    if (entry.selection === 'sprigatito')
      await expect(page.locator('.flora-album-gallery')).toBeVisible()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      entry.selection,
      { timeout: 45000 }
    )
    expect(new URL(page.url()).pathname.replace(/\/$/, '')).toBe(entry.path)
  })
}
