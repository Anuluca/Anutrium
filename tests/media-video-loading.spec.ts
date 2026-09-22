import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 240 } })

test('gallery videos load near the viewport and pause after leaving it', async ({
  page,
}) => {
  const videoRequests: string[] = []
  await page.route(/\.mp4(?:\?|$)/i, async (route) => {
    videoRequests.push(route.request().url())
    await route.abort()
  })

  await page.goto('/island/image-log/covid', {
    waitUntil: 'domcontentloaded',
  })

  const video = page.locator('.media-gallery video').first()
  await expect(video).toBeAttached()
  await expect(video).toHaveAttribute('preload', 'none')
  await expect(video).not.toHaveAttribute('autoplay', '')
  await expect(video).not.toHaveAttribute('src', /.+/)
  expect(videoRequests).toHaveLength(0)

  await video.scrollIntoViewIfNeeded()
  await expect(video).toHaveAttribute('src', /\.mp4$/i)

  await page.evaluate(() => window.scrollTo(0, 0))
  await expect
    .poll(() => video.evaluate((element) => element.paused))
    .toBe(true)
})
