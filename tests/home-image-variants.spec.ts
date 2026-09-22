import { expect, test } from '@playwright/test'

const desktopCardPattern = /[?&]image=card-thumb/
const mobileCardPattern = /[?&]image=card-mobile/

test('home hero carousel selects the card thumbnail for each viewport', async ({
  page,
}, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-slide--hero')).not.toHaveClass(
    /is-hero-initial-hidden/,
    { timeout: 20_000 }
  )

  const image = page.locator('.news-card img').first()
  await expect(image).toHaveAttribute('src', desktopCardPattern)
  await expect(page.locator('.news-card source').first()).toHaveAttribute(
    'srcset',
    mobileCardPattern
  )
  await expect
    .poll(() => image.evaluate((element) => element.currentSrc))
    .toMatch(
      testInfo.project.name.includes('mobile')
        ? mobileCardPattern
        : desktopCardPattern
    )
})

test('journey and project cards select mobile thumbnails on phones', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  const journeyImage = page.locator('.vlog-img--base').first()
  await expect(
    journeyImage.locator('xpath=preceding-sibling::source')
  ).toHaveAttribute('srcset', mobileCardPattern)
  await expect
    .poll(() => journeyImage.evaluate((element) => element.currentSrc))
    .toMatch(mobileCardPattern)

  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  const projectImage = page.locator('.work-card-image').first()
  await expect(
    projectImage.locator('xpath=preceding-sibling::source')
  ).toHaveAttribute('srcset', mobileCardPattern)
  await expect
    .poll(() => projectImage.evaluate((element) => element.currentSrc))
    .toMatch(mobileCardPattern)
})
