import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
})

test('home, module entries and about use the horizon intro', async ({
  page,
}) => {
  test.setTimeout(60000)
  for (const path of [
    '/',
    '/archive',
    '/flanerie',
    '/pokeyard',
    '/atrium',
    '/about',
  ]) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const overlay = page.locator('.entry-overlay-container')
    await expect(overlay, path).toHaveClass(/entry-mode--horizon/)
    await expect(overlay.locator('.loading-line'), path).toHaveCount(1)
    await expect(overlay.locator('.scene-container'), path).toHaveClass(
      /is-bottom-anchored/
    )
    await expect(overlay.locator('[role="progressbar"]'), path).toHaveText('')
  }
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`detail and tool pages use the centered percentage intro (${reducedMotion})`, async ({
    page,
  }) => {
    test.setTimeout(60000)
    await page.emulateMedia({ reducedMotion })
    await page.addInitScript(() => {
      ;(window as any).handoffCenterOffset = null
      new MutationObserver(() => {
        const logo = document.querySelector(
          '.logo-wrapper2.show:not(.is-docking)'
        )
        const canvas = document.querySelector('.entry-overlay-container canvas')
        if (!logo || !canvas || (window as any).handoffCenterOffset !== null)
          return
        const logoBounds = logo.getBoundingClientRect()
        const canvasBounds = canvas.getBoundingClientRect()
        ;(window as any).handoffCenterOffset = Math.max(
          Math.abs(logoBounds.left + logoBounds.width / 2 - innerWidth / 2),
          Math.abs(logoBounds.top + logoBounds.height / 2 - innerHeight / 2),
          Math.abs(canvasBounds.left + canvasBounds.width / 2 - innerWidth / 2),
          Math.abs(canvasBounds.top + canvasBounds.height / 2 - innerHeight / 2)
        )
      }).observe(document, { childList: true, subtree: true, attributes: true })
    })
    for (const path of ['/flanerie/nanchang', '/colorPalette']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const overlay = page.locator('.entry-overlay-container')
      await expect(overlay).toHaveClass(/entry-mode--centered/)
      await expect(overlay.locator('.loading-line')).toHaveCount(0)
      const progress = overlay.locator('[role="progressbar"]')
      await expect(progress).toHaveText(/\d+%/)
      await expect(overlay.locator('.scene-container')).not.toHaveClass(
        /is-bottom-anchored/
      )
      const bounds = await progress.boundingBox()
      expect(bounds!.y).toBeGreaterThan(page.viewportSize()!.height / 2)
      await expect
        .poll(() => page.evaluate(() => (window as any).handoffCenterOffset))
        .not.toBeNull()
      expect(
        await page.evaluate(() => (window as any).handoffCenterOffset)
      ).toBeLessThanOrEqual(1)
      await expect(overlay).toHaveCount(0, { timeout: 15000 })
      await expect(page.locator('.loading-line__projection')).toHaveCount(0)
      if (path === '/colorPalette')
        await expect(page.locator('.palette-tool')).toBeVisible()
      else await expect(page.locator('.detail-sections-nav')).toBeAttached()
    }
  })
}
