import { expect, test } from '@playwright/test'

test('merchandise cards use viewport-appropriate thumbnails', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(90000)
  await page.goto('/atrium/collections', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.island-collections-content')).toBeVisible({
    timeout: 45000,
  })
  await expect(page.locator('.collection-card__cover').first()).toHaveAttribute(
    'src',
    isMobile ? /[?&]image=card-mobile/ : /[?&]image=card-thumb/
  )
})
