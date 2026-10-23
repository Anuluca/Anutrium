import { expect, test } from '@playwright/test'

for (const mode of ['mixed', 'square']) {
  test(`${mode} media use natural heights with the tallest image shared within each row`, async ({
    page,
  }) => {
    test.setTimeout(60000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.route(
      /assets\.anuluca\.com.*\.(?:jpe?g|png|webp)(?:\?|$)/i,
      (route) => {
        const path = new URL(route.request().url()).pathname
        const [width, height] =
          mode === 'square'
            ? [600, 600]
            : /DSC01408/i.test(path)
            ? [900, 600]
            : /DSC01427/i.test(path)
            ? [600, 900]
            : [600, 600]
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#849da5"/></svg>`,
        })
      }
    )
    await page.goto('/island/merch-photography/lucarioNoArm', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
      timeout: 30000,
    })
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 30000,
    })
    const cards = page.locator('.media-gallery__card')
    await expect(cards).toHaveCount(3)
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded()
      await expect(card.locator('.media-gallery__frame')).not.toHaveClass(
        /is-loading/
      )
    }
    const measurements = await cards.evaluateAll((cards) =>
      cards.map((card) => {
        const frame = card.querySelector<HTMLElement>('.media-gallery__frame')!
        const image = card.querySelector<HTMLImageElement>('img')!
        const bounds = frame.getBoundingClientRect()
        const cardBounds = card.getBoundingClientRect()
        return {
          cardLeft: cardBounds.left,
          cardRight: cardBounds.right,
          frameLeft: bounds.left,
          frameRight: bounds.right,
          top: card.getBoundingClientRect().top,
          height: bounds.height,
          width: bounds.width,
          ratio: image.naturalWidth / image.naturalHeight,
          limit: parseFloat(getComputedStyle(frame).maxHeight),
          infoTop: card
            .querySelector('.media-gallery__info')
            ?.getBoundingClientRect().top,
        }
      })
    )
    const rows = new Map<number, typeof measurements>()
    for (const item of measurements) {
      const key = Math.round(item.top)
      rows.set(key, [...(rows.get(key) || []), item])
    }
    for (const row of rows.values()) {
      const expected = Math.max(
        ...row.map((item) => Math.min(item.limit, item.width / item.ratio))
      )
      for (const item of row) {
        expect(item.frameLeft).toBeGreaterThanOrEqual(item.cardLeft - 1)
        expect(item.frameRight).toBeLessThanOrEqual(item.cardRight + 1)
        expect(Math.abs(item.height - expected)).toBeLessThanOrEqual(1)
        if (item.infoTop !== undefined && row[0].infoTop !== undefined)
          expect(Math.abs(item.infoTop - row[0].infoTop)).toBeLessThanOrEqual(1)
      }
    }
  })
}
