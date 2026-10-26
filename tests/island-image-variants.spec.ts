import { expect, test } from '@playwright/test'

const cardThumbnailPattern = /[?&]image=card-thumb/

test('photography grids use thumbnails but the viewer keeps original URLs', async ({
  page,
}) => {
  await page.goto('/atrium/photography', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('.collection-tab').first()).toHaveAttribute(
    'style',
    cardThumbnailPattern
  )
  await page.locator('.collection-tab').nth(1).click()
  await expect(
    page.locator('.filter-rail__avatar img').first()
  ).toHaveAttribute('src', cardThumbnailPattern)

  const thumbnail = page.locator('.media-gallery__open img').first()
  await expect(thumbnail).toHaveAttribute('src', cardThumbnailPattern)
  await thumbnail.locator('..').dispatchEvent('click')
  await expect(page.locator('.el-image-viewer__img')).not.toHaveAttribute(
    'src',
    cardThumbnailPattern
  )
})

test('merchandise cards and galleries use card thumbnails', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.goto('/atrium/collections', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.island-collections-content')).toBeVisible({
    timeout: 45000,
  })
  await expect(page.locator('.collection-card__cover').first()).toHaveAttribute(
    'src',
    cardThumbnailPattern
  )

  await page.goto('/atrium/merch/lucarioNoArm', {
    waitUntil: 'domcontentloaded',
  })
  await expect(
    page.locator('.media-gallery__open img').first()
  ).toHaveAttribute('src', cardThumbnailPattern)
})

test('image-log cards use card thumbnails', async ({ page }) => {
  await page.goto('/atrium/image-log', { waitUntil: 'domcontentloaded' })
  await expect(
    page.locator('.image-log-album-card img').first()
  ).toHaveAttribute('src', cardThumbnailPattern)
})
