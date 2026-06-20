import { expect, test } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Anutrium/)
  await expect(page.locator('.home-page')).toBeVisible()
})
