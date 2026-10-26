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

  await page.goto('/atrium/image-log/covid', {
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

test('gallery frames share a height and align information below mixed media', async ({
  page,
}, info) => {
  await page.setViewportSize(
    info.project.name.includes('mobile')
      ? { width: 390, height: 844 }
      : { width: 1280, height: 900 }
  )
  await page.route(/\.(?:webp|jpe?g|png)(?:\?|$)/i, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="800"><rect width="200" height="800" fill="gray"/></svg>',
    })
  )
  await page.route(/\.mp4(?:\?|$)/i, (route) => route.abort())
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: 20000,
  })
  const cards = page.locator('.media-gallery__card')
  await expect(page.locator('.media-gallery__info').first()).toBeAttached()
  const portrait = page
    .locator('.media-gallery__card:has(.media-gallery__info)')
    .first()
  await portrait.scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      portrait.evaluate((element) => {
        const image = element.querySelector('img')!
        if (!image.naturalHeight) return false
        const frame = element
          .querySelector('.media-gallery__frame')!
          .getBoundingClientRect()
        const info = element
          .querySelector('.media-gallery__info')!
          .getBoundingClientRect()
        return (
          Math.abs(
            info.width -
              (frame.height * image.naturalWidth) / image.naturalHeight
          ) <= 1
        )
      })
    )
    .toBe(true)

  await expect
    .poll(() =>
      cards.evaluateAll((elements) => {
        const geometry = elements.map((element) => {
          const frame = element
            .querySelector('.media-gallery__frame')!
            .getBoundingClientRect()
          const info = element
            .querySelector('.media-gallery__info')
            ?.getBoundingClientRect()
          return {
            height: frame.height,
            offset: info
              ? info.top - element.getBoundingClientRect().top
              : null,
            gap: info ? info.top - frame.bottom : null,
          }
        })
        const offsets = geometry.flatMap((item) =>
          item.offset === null ? [] : [item.offset]
        )
        return (
          Math.max(...geometry.map((item) => item.height)) -
            Math.min(...geometry.map((item) => item.height)) <=
            1 &&
          Math.max(...offsets) - Math.min(...offsets) <= 1 &&
          geometry.every((item) => item.gap === null || item.gap >= 0)
        )
      })
    )
    .toBe(true)
})
