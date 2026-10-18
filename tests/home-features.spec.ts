import { expect, test } from '@playwright/test'

for (const failure of ['unavailable', 'invalid', 'network', 'timeout']) {
  test(`home features ${failure} falls back to the normal statue`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/site/home-features', async (route) => {
      if (failure === 'network') return route.abort()
      if (failure === 'timeout') {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        return route
          .fulfill({ json: { lucarioHeadache: true, updatedAt: null } })
          .catch(() => {})
      }
      return route.fulfill(
        failure === 'unavailable'
          ? { status: 503, json: { error: 'unavailable' } }
          : { json: { lucarioHeadache: 'true', updatedAt: null } }
      )
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('aria-busy', 'false', {
      timeout: 45000,
    })
    await expect(stage).toHaveAttribute('data-headache-mode', 'normal')
    await expect(stage).toHaveAttribute('data-headache-redness', '0.000')
    await expect(stage).toHaveAttribute('data-headache-sticker', 'false')
  })
}
