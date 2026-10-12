import { expect, test } from '@playwright/test'

import { openHomeAboutOverlay } from './helpers/homeAboutOverlay'

test('passion blank click closes an open panel before dismissing about', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 25000 }
  )
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  if (await page.locator('.mobile-menu-icon').isVisible())
    await page.locator('.mobile-menu-icon').click()
  await openHomeAboutOverlay(page)
  const overlay = page.locator('.about-overlay')
  const blank = overlay.locator('.passion-section')
  await expect(blank).toBeVisible()
  for (const target of [
    'about-changelog-panel',
    'about-roadmap-panel',
    'about-crew-content',
  ]) {
    await overlay.locator(`[aria-controls="${target}"]`).click()
    const panel = overlay.locator('.about-update-dock__panel')
    await expect(panel).toBeVisible()
    await blank.click({ position: { x: 4, y: 8 } })
    await expect(panel).toHaveCount(0)
    await expect(overlay).toBeVisible()
  }
  await blank.click({ position: { x: 4, y: 8 } })
  await expect(overlay).toHaveCount(0)
})
