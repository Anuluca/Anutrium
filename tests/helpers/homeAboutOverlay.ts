import type { Page } from '@playwright/test'

export async function openHomeAboutOverlay(page: Page) {
  const dismissAlert = page.locator(
    '.mobile-experience-alert .el-alert__close-btn'
  )
  if (await dismissAlert.isVisible()) await dismissAlert.click()
  const toggle = page.locator('.mobile-menu-icon[aria-expanded="false"]')
  if (await toggle.isVisible()) await toggle.click()
  await page.locator('.temple-nav-action[data-temple-nav="about"]').click()
}
