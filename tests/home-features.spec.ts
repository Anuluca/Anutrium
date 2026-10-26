import { expect, test } from './helpers/sceneDiagnostics'

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
          .fulfill({
            json: { lucarioHeadache: true, headacheCount: 10, updatedAt: null },
          })
          .catch(() => {})
      }
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
    await expect(stage).not.toHaveAttribute('data-headache-caption')
    await expect(stage).toHaveAttribute('data-headache-mode', 'normal')
    await expect(stage).toHaveAttribute('data-headache-redness', '0.000')
    await expect(stage).toHaveAttribute('data-headache-sticker', 'false')
  })
}

for (const enabled of [true, false]) {
  test(`statue mode ignores legacy count and renders no caption (${enabled})`, async ({
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
    await expect(stage).not.toHaveAttribute('data-headache-count')
    await expect(stage).not.toHaveAttribute('data-headache-caption')
    await expect(stage).toHaveAttribute(
      'data-headache-mode',
      enabled ? 'headache' : 'normal'
    )
    await expect(stage.locator('canvas')).not.toHaveAttribute(
      'aria-label',
      /头疼|headache/i
    )
    expect(reads).toBe(1)
    await page.screenshot({ path: testInfo.outputPath('home-mode.png') })
  })
}

for (const enabled of [true, false]) {
  test(`response without statistics preserves statue mode (${enabled})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/site/home-features', (route) =>
      route.fulfill({
        json: {
          lucarioHeadache: enabled,
          updatedAt: '2026-10-18T16:02:51.217Z',
        },
      })
    )
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 45000,
    })
    await expect(stage).toHaveAttribute(
      'data-headache-mode',
      enabled ? 'headache' : 'normal'
    )
    await expect(stage).not.toHaveAttribute('data-headache-count')
    await expect(stage).not.toHaveAttribute('data-headache-caption')
  })
}
