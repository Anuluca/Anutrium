import { expect, test } from '@playwright/test'

test('first journey row stays revealed after cold images finish loading', async ({
  page,
}) => {
  await page.route(
    /assets\.anuluca\.com\/Flanerie\/.*image=card-thumb/,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_200))
      await route.continue()
    }
  )

  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })

  const firstCard = page.locator('.vlog-image-reveal-entry').first()
  const firstImage = firstCard.locator('.vlog-img--base')

  await expect(firstCard).toHaveClass(/is-vlog-image-revealed/)
  await expect
    .poll(() => firstImage.evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0)
  await expect(firstCard).toHaveClass(/is-vlog-image-revealed/)
  await expect(firstCard.locator('.shared-vlog-card')).toHaveClass(
    /is-base-loaded/
  )
})
