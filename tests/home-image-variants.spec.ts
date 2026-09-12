import { expect, test } from '@playwright/test'

test('home hero carousel requests the shared card thumbnail', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-slide--hero')).not.toHaveClass(
    /is-hero-initial-hidden/,
    { timeout: 20_000 }
  )

  await expect(page.locator('.news-card img').first()).toHaveAttribute(
    'src',
    /[?&]image=card-thumb/
  )
})
