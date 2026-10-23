import { expect, test } from '@playwright/test'

test('changelog navigation jumps within the panel without moving the page', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  if (isMobile) await page.locator('.mobile-menu-icon').click()
  await page
    .locator(
      `${
        isMobile ? '.mobile-menu-panel' : '.desktop-menu'
      } [data-temple-nav="about"]`
    )
    .click()
  const overlay = page.locator('.about-overlay')
  await overlay.locator('[aria-controls="about-changelog-panel"]').click()
  const panel = overlay.locator('.about-update-dock__panel')
  await expect(panel).toBeVisible()
  const navigation = panel.locator('.update-program__navigation')
  await expect(navigation).toContainText('MIRAGE')
  await expect(navigation).toContainText('2026-10-23')
  const initialScroll = await page.evaluate(() => window.scrollY)
  await navigation.getByRole('button', { name: /v1\.0/ }).click()
  await expect(
    navigation.getByRole('button', { name: /v1\.0/ })
  ).toHaveAttribute('aria-current', 'location')
  const geometry = await panel.evaluate((element) => {
    const content = element.querySelector('.update-program__body-content')!
    const entry = element.querySelector('[data-changelog-version="v1.0"]')!
    const nav = element.querySelector('.update-program__navigation')!
    return {
      offset:
        entry.getBoundingClientRect().top - content.getBoundingClientRect().top,
      overlap:
        content.getBoundingClientRect().right -
        nav.getBoundingClientRect().left,
    }
  })
  expect(Math.abs(geometry.offset - 18)).toBeLessThanOrEqual(1)
  expect(geometry.overlap).toBeLessThanOrEqual(1)
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - initialScroll)
  ).toBeLessThanOrEqual(1)
})
