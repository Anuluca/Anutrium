import { expect, test } from '@playwright/test'

test('journey cards prioritize the first row and defer hover images', async ({
  page,
}) => {
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })

  const cards = page.locator('.shared-vlog-card')
  await expect(cards.first().locator('.vlog-img--base')).toHaveAttribute(
    'loading',
    'eager'
  )
  await expect(cards.nth(3).locator('.vlog-img--base')).toHaveAttribute(
    'loading',
    'lazy'
  )
  await expect(page.locator('.vlog-img--hover')).toHaveCount(0)
})

test('first journey row stays revealed after cold images finish loading', async ({
  page,
}) => {
  await page.route(
    /assets\.anuluca\.com\/Flanerie\/cities\/changsha\/01\.jpg\?image=(?:card-thumb|card-mobile)/,
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
    .poll(() => firstImage.evaluate((image) => image.naturalWidth), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0)
  await expect(firstCard).toHaveClass(/is-vlog-image-revealed/)
  await expect(firstCard.locator('.shared-vlog-card')).toHaveClass(
    /is-base-loaded/
  )
})
