import { expect, test } from '@playwright/test'

for (const sample of [
  { detail: '/flanerie/changsha', module: '/flanerie', selection: 'flanerie' },
  { detail: '/atrium/photography', module: '/creative', selection: 'island' },
]) {
  test(`header module title returns ${sample.detail} to ${sample.module}`, async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await page.goto(sample.detail, { waitUntil: 'domcontentloaded' })
    const link = page.locator('a.current-module-name')
    await expect(link).toHaveAttribute('href', sample.module)
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${sample.module}$`), {
      timeout: 30_000,
    })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      sample.selection,
      { timeout: 30_000 }
    )
  })
}

test('site name still returns a detail page to the homepage', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await page.locator('.site-brand').click()
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 })
})
