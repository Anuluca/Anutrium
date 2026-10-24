import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route(
    /assets\.anuluca\.com.*\.(?:jpe?g|png|webp)(?:\?|$)/i,
    (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#849da5"/></svg>',
      })
  )
})

test('gallery defaults to list and previews one original with navigation and all thumbnails', async ({
  page,
}) => {
  const originals: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (
      url.pathname.includes('/Island/merch/') &&
      !url.searchParams.has('image')
    )
      originals.push(request.url())
  })
  await page.goto('/island/merch/lucarioNoArm', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: 15000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15000,
  })
  const gallery = page.locator('.media-gallery')
  const toolbar = gallery.getByRole('group', { name: '相册显示模式' })
  for (const button of await toolbar.getByRole('button').all()) {
    await expect(button).toHaveText('')
    await expect(button.locator('svg')).toHaveCount(1)
  }
  await expect(
    toolbar.getByRole('button', { name: '列表模式' })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(3)
  expect(originals).toHaveLength(0)

  await toolbar.getByRole('button', { name: '大图预览' }).click()
  const preview = gallery.locator('.inline-image-preview')
  await expect(preview).toBeVisible()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(0)
  const image = preview.locator('.inline-image-preview__open img')
  await expect(image).toHaveAttribute('src', /DSC01408\.jpg$/)
  await expect(preview.locator('.inline-image-preview__thumbnail')).toHaveCount(
    3
  )
  await expect(preview.locator('.inline-image-preview__number')).toHaveCount(0)
  const thumbnail = preview.locator('.inline-image-preview__thumbnail').first()
  await expect(thumbnail).toHaveCSS('padding', '0px')
  expect((await thumbnail.boundingBox())!.width).toBeGreaterThanOrEqual(128)
  const thumbnailLayout = await preview
    .locator('.inline-image-preview__thumbnails')
    .evaluate((strip) => {
      const bounds = strip.getBoundingClientRect()
      const first = strip.firstElementChild!.getBoundingClientRect()
      const last = strip.lastElementChild!.getBoundingClientRect()
      return {
        fits: strip.scrollWidth <= strip.clientWidth + 1,
        centerOffset:
          (first.left + last.right - bounds.left - bounds.right) / 2,
      }
    })
  if (thumbnailLayout.fits)
    expect(Math.abs(thumbnailLayout.centerOffset)).toBeLessThanOrEqual(1)
  // 页面内预览在手机上也保持 PC 端左右竖排、扫描线和文字镂空。
  const previous = preview.locator('.el-image-viewer__prev')
  const next = preview.locator('.el-image-viewer__next')
  await expect(next.locator('.safe-image-viewer__nav-label')).toHaveCSS(
    'writing-mode',
    'vertical-rl'
  )
  await expect(next.locator('.safe-image-viewer__nav-surface')).toHaveCSS(
    'mask-image',
    /url\("data:image\/png/
  )
  await expect(previous).toBeHidden()
  await expect.poll(() => originals.length).toBe(1)
  for (const thumbnail of await preview
    .locator('.inline-image-preview__thumbnail img')
    .all()) {
    await expect(thumbnail).toHaveAttribute('src', /[?&]image=card-thumb/)
  }

  await preview.getByRole('button', { name: '下一张', exact: true }).click()
  await expect(image).toHaveAttribute('src', /DSC01427\.JPG$/)
  await expect(previous).toBeVisible()
  await expect(previous.locator('.safe-image-viewer__nav-surface')).toHaveCSS(
    'mask-image',
    /url\("data:image\/png/
  )
  expect(
    Math.abs((await previous.boundingBox())!.y - (await next.boundingBox())!.y)
  ).toBeLessThanOrEqual(1)
  await preview.focus()
  await page.keyboard.press('End')
  await expect(image).toHaveAttribute('src', /IMG_3538\.jpg$/)
  await expect(next).toBeHidden()
  await preview.locator('.inline-image-preview__thumbnail').nth(1).click()
  await expect(preview.locator('[aria-current="true"]')).toHaveAttribute(
    'aria-label',
    /选择第 2 张/
  )

  await preview.locator('.inline-image-preview__open').click()
  await expect(page.locator('.el-image-viewer__img')).toHaveAttribute(
    'src',
    /DSC01427\.JPG$/
  )
  await page.locator('.el-image-viewer__wrapper .el-image-viewer__next').click()
  await expect(page.locator('.el-image-viewer__img')).toHaveAttribute(
    'src',
    /IMG_3538\.jpg$/
  )
  await expect(
    page.locator('.el-image-viewer__wrapper .el-image-viewer__next')
  ).toBeHidden()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.el-image-viewer__img')).toHaveAttribute(
    'src',
    /IMG_3538\.jpg$/
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
  await expect(image).toHaveAttribute('src', /IMG_3538\.jpg$/)
  await toolbar.getByRole('button', { name: '列表模式' }).click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(3)
  await toolbar.getByRole('button', { name: '大图预览' }).click()
  await expect(image).toHaveAttribute('src', /IMG_3538\.jpg$/)
})

test('list and inline preview hide information while fullscreen reuses current image metadata', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: 15000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15000,
  })
  const gallery = page.locator('.media-gallery').first()
  await expect(gallery.locator('.media-gallery__info')).toHaveCount(0)
  await gallery.getByRole('button', { name: '大图预览', exact: true }).click()
  await expect(gallery.locator('.inline-image-preview__info')).toHaveCount(0)
  await gallery.locator('.inline-image-preview__open').click()
  const viewer = page.locator('.el-image-viewer__wrapper')
  await expect(
    viewer.locator('.safe-image-viewer__info .photo-info__inner')
  ).toBeVisible()
  await expect
    .poll(() =>
      viewer
        .locator('.el-image-viewer__img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBeGreaterThan(0)
  const geometry = await viewer.evaluate((root) => {
    const bar = root
      .querySelector('.el-image-viewer__actions')!
      .getBoundingClientRect()
    const info = root
      .querySelector('.safe-image-viewer__info')!
      .getBoundingClientRect()
    const tools = root.querySelectorAll('.safe-image-viewer__tool')
    const first = tools[0].getBoundingClientRect()
    const last = tools[tools.length - 1].getBoundingClientRect()
    const corners = root
      .querySelector('.safe-image-viewer__corners')!
      .getBoundingClientRect()
    return {
      width: bar.width,
      decoratedWidth: corners.width,
      center: (bar.left + bar.right) / 2 - innerWidth / 2,
      gap: first.left - info.right,
      right: last.right - bar.right,
      left: info.left - bar.left,
      viewport: innerWidth,
    }
  })
  expect(
    Math.abs(
      geometry.width - (isMobile ? geometry.viewport : geometry.decoratedWidth)
    )
  ).toBeLessThanOrEqual(1)
  for (const offset of [
    geometry.center,
    geometry.gap - 8,
    geometry.left,
    geometry.right,
  ])
    expect(Math.abs(offset)).toBeLessThanOrEqual(1)
  await page.keyboard.press('Escape')
  await expect(viewer).toHaveCount(0)
})

test('preview supports mixed video galleries and returns to list', async ({
  page,
}) => {
  await page.route(/\.(?:mp4|mov)(?:\?|$)/i, (route) => route.abort())
  await page.goto('/island/image-log/covid', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: 15000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15000,
  })
  const galleries = page.locator('.media-gallery')
  const videoGalleryIndex = await galleries.evaluateAll((elements) =>
    elements.findIndex((element) => element.querySelector('video'))
  )
  expect(videoGalleryIndex).toBeGreaterThanOrEqual(0)
  const gallery = galleries.nth(videoGalleryIndex)
  await gallery.getByRole('button', { name: '大图预览', exact: true }).click()
  const preview = gallery.locator('.inline-image-preview')
  await preview
    .locator(
      '.inline-image-preview__thumbnail:has(.inline-image-preview__video-label)'
    )
    .first()
    .click()
  await expect(preview.locator('video')).toHaveCount(1)
  await expect(preview.locator('video')).toHaveAttribute('controls', '')
  await expect(preview.locator('video')).toHaveAttribute(
    'src',
    /\.(?:mp4|mov)$/i
  )
  await gallery.getByRole('button', { name: '列表模式', exact: true }).click()
  await expect(preview).toHaveCount(0)
  await expect(gallery.locator('.media-gallery__card').first()).toBeVisible()
})

test('preview thumbnails scroll locally and do not lock or widen the page', async ({
  page,
}) => {
  if (!(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)))
    await page.setViewportSize({ width: 900, height: 900 })
  await page.goto('/flanerie/nanchang', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: 15000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15000,
  })
  const gallery = page.locator('.media-gallery').first()
  await gallery.getByRole('button', { name: '大图预览', exact: true }).click()
  const preview = gallery.locator('.inline-image-preview')
  await preview.scrollIntoViewIfNeeded()
  await preview.focus()
  await page.waitForTimeout(200)
  const before = await page.evaluate(() => document.body.scrollTop)
  await page.keyboard.press('End')
  await expect(
    preview.locator('.inline-image-preview__thumbnail').last()
  ).toHaveAttribute('aria-current', 'true')
  await expect
    .poll(() =>
      preview
        .locator('.inline-image-preview__thumbnails')
        .evaluate((element) => element.scrollLeft)
    )
    .toBeGreaterThan(0)
  expect(
    Math.abs((await page.evaluate(() => document.body.scrollTop)) - before)
  ).toBeLessThanOrEqual(1)
  expect(
    await page.evaluate(
      () => document.body.scrollWidth - document.body.clientWidth
    )
  ).toBeLessThanOrEqual(1)
  await page.mouse.move(4, 200)
  await page.mouse.wheel(0, 300)
  await expect
    .poll(async () =>
      Math.abs((await page.evaluate(() => document.body.scrollTop)) - before)
    )
    .toBeGreaterThan(1)
})
