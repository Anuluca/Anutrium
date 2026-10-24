import { expect, test } from '@playwright/test'

import { getCreativeImageInfo } from '../src/utils/creativeMedia'

test('creative names preserve identical localized titles and reject processing metadata', () => {
  for (const title of ['Lofi', 'J-Pop', 'Dance Pop', 'All']) {
    const info = getCreativeImageInfo(
      `https://assets.anuluca.com/Creative/design/appleMusicCover/20260922_101502_${title}_${title}.webp`
    )
    expect(info).toEqual({ date: '2026-09-22', title, titleEn: title })
  }
  expect(
    getCreativeImageInfo('20260920_094232_modified_time_Drama_戏剧.webp')
  ).toEqual({ date: '2026-09-20', title: '戏剧', titleEn: 'Drama' })
  for (const filename of [
    '20260709_003441_modified_time_compressed_945b813d79d1.webp',
    '20240716_115328_modified_time_converted_no_savings_ad3f6ec1bd4b.webp',
  ]) {
    expect(getCreativeImageInfo(filename).title).toBe('')
  }
})

for (const path of ['/creative', '/floratrium']) {
  test(`${path} displays album totals alongside pagination`, async ({
    page,
    isMobile,
  }) => {
    test.setTimeout(90000)
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/__floratrium/media?**', (route) =>
      route.fulfill({
        json: {
          items: [
            {
              key: 'fixture.webp',
              url: 'https://assets.anuluca.com/Creative/illustration/20240122_215617_TWO SIDES_表里.webp',
              type: 'image',
            },
          ],
          nextCursor: path === '/floratrium' ? null : '15',
          totalPages: path === '/floratrium' ? 1 : 2,
          totalItems: path === '/floratrium' ? 1 : 30,
        },
      })
    )
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 45000 }
    )
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 30000,
    })
    const closeAlert = page.locator(
      '.mobile-experience-alert .el-alert__close-btn'
    )
    if (isMobile) {
      await expect(closeAlert).toBeVisible({ timeout: 20000 })
      await closeAlert.click()
      await expect(page.locator('.mobile-experience-alert')).toHaveCount(0)
    }
    const selectors =
      path === '/creative'
        ? ['.creative-photography', '.creative-illustration']
        : ['.flora-album-gallery']
    for (const selector of selectors) {
      const root = page.locator(selector)
      await root
        .locator(
          path === '/creative'
            ? ':scope > .creative-media__toggle:not(.creative-media__process)'
            : '.flora-album-gallery__expand'
        )
        .click()
      const total = root.locator('.flora-album-gallery__page-total')
      await expect(total).toHaveText(
        path === '/floratrium' ? '共1张图片 (1页)' : '共30张图片 (2页)'
      )
      await expect(total).toBeInViewport()
      const bounds = await root
        .locator('.flora-album-gallery__pagination')
        .evaluate((element) => {
          const box = element.getBoundingClientRect()
          const parent = element.parentElement!.getBoundingClientRect()
          return {
            left: box.left - parent.left,
            right: box.right - parent.right,
          }
        })
      expect(bounds.left).toBeGreaterThanOrEqual(-1)
      expect(bounds.right).toBeLessThanOrEqual(1)
    }
    if (path === '/floratrium') {
      await page.locator('.flora-album-gallery__expand').click()
      await expect(
        page.locator('.flora-video-gallery img').first()
      ).toHaveAttribute('src', /dc149db5fd2cfd0443b1c637b1bdcd41d637f7b1/)
      await page.locator('button[data-pet-id="xiaohei"]').click()
      await expect(
        page.locator('.flora-video-gallery img').first()
      ).toHaveAttribute('src', /d450c430b6b1850d23d08c1a1f731a8b3cbdb3dc/)
    }
    await page.screenshot({
      path: `.tmp/metadata-${path.slice(1)}-${
        isMobile ? 'mobile' : 'desktop'
      }.png`,
    })
  })
}
