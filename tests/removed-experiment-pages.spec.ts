import { expect, test } from '@playwright/test'

test('removed experiment and legacy pages resolve to 404 without a hidden footer entry', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })

  for (const path of [
    '/test',
    '/test2',
    '/home2',
    '/about',
    '/atrium/photography',
    '/atrium/illustration',
    '/atrium/trainer-card',
    '/atrium/image-log',
    '/atrium/image-log/covid',
    '/atrium/image-log/million',
    '/atrium/image-log/pokemonCorocoro',
    '/atrium/merch/lucarioNoArm',
    '/atrium/merch/pokemondoll',
  ]) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/404$/)
    await expect(page.locator('.not-found-page')).toBeVisible({
      timeout: 20000,
    })
    await expect(page.locator('.footer-com .language')).toBeAttached()
    await expect(
      page.getByRole('button', { name: '打开开发测试页' })
    ).toHaveCount(0)
    await expect(page.locator('.footer-test-entry')).toHaveCount(0)
  }
})

test('game library entry and both Sleeping Dogs games remain available', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 45000,
  })
  const entry = page.locator('[data-island-item="GAME LIBRARY"]')
  await expect(entry).toBeVisible({ timeout: 45000 })
  await entry.click()
  await expect(page).toHaveURL(/\/atrium\/games$/)
  await expect(page.locator('.temple-page')).toBeVisible()

  for (const path of [
    '/games/sleepingdogs/bullsAndCows',
    '/games/sleepingdogs/saftybox',
  ]) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.game-page-layout')).toBeVisible({
      timeout: 20000,
    })
    await expect(page.locator('.not-found-page')).toHaveCount(0)
  }
})
