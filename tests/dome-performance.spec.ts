import { expect, test } from '@playwright/test'

test('dome keeps rotating, dragging and opening front-facing cards', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-slide--hero')).not.toHaveClass(
    /is-hero-initial-hidden/,
    { timeout: 20_000 }
  )
  await page.locator('.scroll-down-hint').click()
  const gallery = page.locator('.dome-gallery')
  const autoRotation = page.locator('.dome-gallery__auto-rotation')
  await expect(gallery).toBeVisible()
  await expect(page.locator('.home-placeholder-slide--about')).toHaveClass(
    /swiper-slide-active/
  )
  const isCompactViewport = (page.viewportSize()?.width || 0) <= 768
  const expectedTileCount = isCompactViewport ? 84 : 119
  await expect(page.locator('.dome-gallery__tile')).toHaveCount(
    expectedTileCount
  )
  await expect(gallery).toHaveAttribute(
    'data-tile-count',
    String(expectedTileCount)
  )
  await expect(gallery).toHaveAttribute(
    'data-segment-count',
    isCompactViewport ? '28' : '34'
  )
  await page.waitForTimeout(1800)
  const transform = await autoRotation.evaluate(
    (element) => getComputedStyle(element).transform
  )
  await expect
    .poll(() =>
      autoRotation.evaluate((element) => getComputedStyle(element).transform)
    )
    .not.toBe(transform)

  // 从实际命中的卡片拖动和点击，防止背面遮挡或合层后丢失交互。
  const findCard = () =>
    page.evaluate(() => {
      for (let y = 160; y < innerHeight - 100; y += 30) {
        for (let x = 90; x < innerWidth - 90; x += 30) {
          if (document.elementFromPoint(x, y)?.closest('.dome-gallery__tile'))
            return { x, y }
        }
      }
      return null
    })
  const start = await findCard()
  expect(start).not.toBeNull()
  await page.mouse.move(start!.x, start!.y)
  await page.mouse.down()
  await page.mouse.move(start!.x + 80, start!.y, { steps: 12 })
  await page.mouse.up()
  await expect(page.locator('.dome-gallery__viewer')).toHaveCount(0)
  await page.waitForTimeout(350)

  const card = await findCard()
  expect(card).not.toBeNull()
  const initialGeometry = await gallery.evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    left: element.getBoundingClientRect().left,
    width: document.body.clientWidth,
    scrollTop: document.body.scrollTop,
  }))
  await page.mouse.click(card!.x, card!.y)
  await expect(page.locator('.dome-gallery__viewer')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.dome-gallery__viewer')).toHaveCount(0)
  const finalGeometry = await gallery.evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    left: element.getBoundingClientRect().left,
    width: document.body.clientWidth,
    scrollTop: document.body.scrollTop,
  }))
  for (const key of ['top', 'left', 'width', 'scrollTop'] as const) {
    expect(
      Math.abs(finalGeometry[key] - initialGeometry[key])
    ).toBeLessThanOrEqual(1)
  }
  const resumed = await autoRotation.evaluate(
    (element) => getComputedStyle(element).transform
  )
  await expect
    .poll(() =>
      autoRotation.evaluate((element) => getComputedStyle(element).transform)
    )
    .not.toBe(resumed)
})

test('dome requests Cloudflare thumbnails but previews the original image', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-slide--hero')).not.toHaveClass(
    /is-hero-initial-hidden/,
    { timeout: 20_000 }
  )
  await page.locator('.scroll-down-hint').click()

  const thumbnail = page.locator('.dome-gallery__tile img').first()
  await expect(thumbnail).toHaveAttribute('src', /[?&]image=home-thumb/)
  await expect(thumbnail).toHaveAttribute('loading', 'lazy')

  await page.locator('.dome-gallery__tile').first().dispatchEvent('click')
  await expect(
    page.locator('.dome-gallery__preview-image img')
  ).not.toHaveAttribute('src', /[?&]image=home-thumb/)
})

test('dome stops its frame loop while the home section is leaving', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page-slide--hero')).not.toHaveClass(
    /is-hero-initial-hidden/,
    { timeout: 20_000 }
  )
  await page.locator('.scroll-down-hint').click()

  const gallery = page.locator('.dome-gallery')
  const autoRotation = page.locator('.dome-gallery__auto-rotation')
  await expect(gallery).toHaveAttribute('data-motion-active', 'true')
  await page.waitForTimeout(100)

  await page
    .locator(
      '.home-page-indicator--left .home-page-indicator__item--archive button'
    )
    .click()
  await expect(gallery).toHaveAttribute('data-motion-active', 'false')
  await expect(autoRotation).toHaveCSS('animation-play-state', 'paused')
})
