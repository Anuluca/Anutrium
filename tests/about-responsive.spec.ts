import { expect, test } from '@playwright/test'
import path from 'node:path'

import { openHomeAboutOverlay } from './helpers/homeAboutOverlay'

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
  { width: 393, height: 852 },
]) {
  test(`about first screen fits ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(60000)
    await page.route('https://assets.anuluca.com/fonts/unbounded/**', (route) =>
      route.fulfill({
        path: path.resolve(
          'scripts/fonts/generated',
          path.basename(new URL(route.request().url()).pathname)
        ),
        contentType: 'font/woff2',
        headers: { 'access-control-allow-origin': '*' },
      })
    )
    await page.setViewportSize(viewport)
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
    const hero = page.locator('.about-overlay .about-hero-section')
    await expect(hero).toBeVisible()
    await page.evaluate(() =>
      Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ])
    )
    const bounds = await page.evaluate(() => {
      const rect = (selector: string) => {
        const { top, bottom, left, right, height } = document
          .querySelector(selector)!
          .getBoundingClientRect()
        return { top, bottom, left, right, height }
      }
      return {
        viewport: rect('.about-overlay__content'),
        hero: rect('.about-hero-section'),
        passion: rect('.passion-section'),
        brand: rect('.passion-color-code'),
        meta: rect('.passion-field-meta'),
        triggers: rect('.about-update-dock__triggers'),
      }
    })
    expect(
      Math.abs(bounds.hero.height - bounds.viewport.height)
    ).toBeLessThanOrEqual(1)
    expect(Math.abs(bounds.hero.top - bounds.viewport.top)).toBeLessThanOrEqual(
      1
    )
    expect(bounds.passion.bottom).toBeLessThanOrEqual(
      bounds.viewport.bottom + 1
    )
    expect(bounds.meta.bottom).toBeLessThanOrEqual(bounds.triggers.top - 4)
    expect(
      Math.abs(bounds.triggers.bottom - (bounds.passion.bottom - 8))
    ).toBeLessThanOrEqual(1)
    for (const item of [bounds.brand, bounds.meta]) {
      expect(item.left).toBeGreaterThanOrEqual(bounds.passion.left - 1)
      expect(item.right).toBeLessThanOrEqual(bounds.passion.right + 1)
      expect(item.bottom).toBeLessThanOrEqual(bounds.passion.bottom + 1)
    }
    await page.screenshot({
      path: `/tmp/about-responsive-${viewport.width}.png`,
    })
  })
}
