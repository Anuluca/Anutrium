import { expect, test } from '@playwright/test'

const cardThumbnailPattern = /[?&]image=card-thumb/

test('photography grids use thumbnails but the viewer keeps original URLs', async ({
  page,
}) => {
  await page.goto('/island/photography', { waitUntil: 'domcontentloaded' })

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
  await page.goto('/island/merch-photography', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.collection-card__cover').first()).toHaveAttribute(
    'src',
    cardThumbnailPattern
  )

  await page.goto('/island/merch-photography/lucarioNoArm', {
    waitUntil: 'domcontentloaded',
  })
  await expect(
    page.locator('.media-gallery__open img').first()
  ).toHaveAttribute('src', cardThumbnailPattern)
})

test('image-log cards and global pet artwork use card thumbnails', async ({
  page,
}) => {
  await page.goto('/island/image-log', { waitUntil: 'domcontentloaded' })
  await expect(
    page.locator('.image-log-album-card img').first()
  ).toHaveAttribute('src', cardThumbnailPattern)
  await expect(page.locator('.pet-teaser__cat')).toHaveAttribute(
    'src',
    cardThumbnailPattern
  )
  await expect(page.locator('.pet-teaser__ears')).toHaveAttribute(
    'src',
    cardThumbnailPattern
  )
})
