import { expect, test } from '@playwright/test'

test('cover fuzz draws only during desktop hover and respects reduced motion', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (this.canvas.classList.contains('video-fuzzy')) {
        document.documentElement.dataset.fuzzyDraws = String(
          Number(document.documentElement.dataset.fuzzyDraws || 0) + 1
        )
      }
      return original.apply(this, args as Parameters<typeof original>)
    } as typeof original
  })
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const cover = page.locator('.video-frame').first()
  await expect(cover).toBeVisible()
  await expect
    .poll(() => cover.locator('img').evaluate((image) => image.naturalWidth), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0)
  const readDraws = () =>
    page.evaluate(() =>
      Number(document.documentElement.dataset.fuzzyDraws || 0)
    )
  expect(await readDraws()).toBe(0)
  await cover.dispatchEvent('pointerover', { pointerType: 'mouse' })
  if (isMobile) {
    await expect(page.locator('.video-fuzzy')).toHaveCount(0)
    expect(await readDraws()).toBe(0)
    return
  }

  await expect(page.locator('.video-fuzzy')).toHaveCount(1)
  await expect.poll(readDraws).toBeGreaterThan(0)
  await cover.dispatchEvent('pointerout', { pointerType: 'mouse' })
  await expect(page.locator('.video-fuzzy')).toHaveCount(0)
  const stoppedAt = await readDraws()
  await page.waitForTimeout(100)
  expect(await readDraws()).toBe(stoppedAt)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await cover.dispatchEvent('pointerover', { pointerType: 'mouse' })
  await expect(page.locator('.video-fuzzy')).toHaveCount(0)
  expect(await readDraws()).toBe(stoppedAt)
})
