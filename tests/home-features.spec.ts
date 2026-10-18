import { expect, test } from '@playwright/test'

for (const failure of [
  'unavailable',
  'invalid',
  'network',
  'timeout',
  'missing-count',
  'invalid-count',
]) {
  test(`home features ${failure} falls back to the normal statue`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/site/home-features', async (route) => {
      if (failure === 'network') return route.abort()
      if (failure === 'timeout') {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        return route
          .fulfill({
            json: { lucarioHeadache: true, headacheCount: 10, updatedAt: null },
          })
          .catch(() => {})
      }
      if (failure === 'missing-count')
        return route.fulfill({
          json: { lucarioHeadache: true, updatedAt: null },
        })
      if (failure === 'invalid-count')
        return route.fulfill({
          json: { lucarioHeadache: true, headacheCount: -1, updatedAt: null },
        })
      return route.fulfill(
        failure === 'unavailable'
          ? { status: 503, json: { error: 'unavailable' } }
          : {
              json: {
                lucarioHeadache: 'true',
                headacheCount: 10,
                updatedAt: null,
              },
            }
      )
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('aria-busy', 'false', {
      timeout: 45000,
    })
    await expect(stage).toHaveAttribute('data-headache-caption', '')
    await expect(stage).toHaveAttribute('data-headache-mode', 'normal')
    await expect(stage).toHaveAttribute('data-headache-redness', '0.000')
    await expect(stage).toHaveAttribute('data-headache-sticker', 'false')
  })
}

for (const enabled of [true, false]) {
  test(`headache count is read from server and caption follows mode (${enabled})`, async ({
    page,
  }, testInfo) => {
    let reads = 0
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/site/home-features', (route) => {
      reads++
      expect(route.request().method()).toBe('GET')
      return route.fulfill({
        json: { lucarioHeadache: enabled, headacheCount: 17, updatedAt: null },
      })
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 45000,
    })
    await expect(stage).toHaveAttribute('data-headache-count', '17')
    await expect(stage).toHaveAttribute(
      'data-headache-caption',
      enabled ? '这是路卡的第17次头疼发作...' : ''
    )
    if (enabled)
      await expect(stage.locator('canvas')).toHaveAttribute(
        'aria-label',
        /第17次头疼发作/
      )
    expect(reads).toBe(1)
    await page.screenshot({ path: testInfo.outputPath('headache-count.png') })
  })
}
