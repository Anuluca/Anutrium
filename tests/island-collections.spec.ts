import { expect, test } from '@playwright/test'

test('collections render inside the Island viewport and keep their cards while scrolling', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const content = page.locator('.island-collections-content')
  await expect(content).toBeVisible({ timeout: 45000 })
  const cards = content.locator('.collection-card-entry')
  const count = await cards.count()
  expect(count).toBeGreaterThan(10)
  await expect(
    content.locator('.detail-page-header, .bottom-text')
  ).toHaveCount(0)
  const viewport = page.locator('.island-detail .scroll-viewport__scroll')
  const scrollable = await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight
    return element.scrollHeight > element.clientHeight
  })
  expect(scrollable).toBe(true)
  await expect(cards).toHaveCount(count)
  expect(await page.evaluate(() => document.body.scrollTop)).toBe(0)
})

test('collection detail survives removal of the legacy collection list page', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.island-collections-content')).toBeVisible({
    timeout: 45000,
  })
  await page.locator('.collection-card-entry').first().click()
  await expect(page).toHaveURL(/\/atrium\/merch\/.+/)
  await expect(page.locator('.merch-detail-page')).toBeVisible({
    timeout: 20000,
  })
  await page.locator('.detail-page-header__back').click()
  await expect(page).toHaveURL(/\/atrium\/collections$/)
  await expect(page.locator('.island-collections-content')).toBeVisible({
    timeout: 45000,
  })
})
