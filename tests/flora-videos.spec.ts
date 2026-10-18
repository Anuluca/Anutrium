import { expect, test } from '@playwright/test'

import { petAlbums } from '../src/locales/dynamic/petAlbums'
import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'

test('featured and full pet videos use journey cards and in-page playback without pagination', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('https://player.bilibili.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body>Player fixture</body></html>',
    })
  )
  await page.route('**/__floratrium/media?**', (route) =>
    route.fulfill({
      json: {
        items: petAlbums.huahua.defaults,
        nextCursor: null,
        totalPages: 1,
      },
    })
  )
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const video = page.locator('.flora-video-gallery')
  const album = page.locator('.flora-album-gallery')
  await expect(video).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  const alertClose = page.locator(
    '.mobile-experience-alert .el-alert__close-btn'
  )
  if (info.project.name.includes('mobile')) {
    await expect(alertClose).toBeVisible({ timeout: 20000 })
    await alertClose.click()
    await expect(page.locator('.mobile-experience-alert')).toHaveCount(0)
  }
  const root = page.locator('.temple-page')
  const modal = page.locator('.video-modal')
  const initial = await readPagePosition(page, '.flora-focus-layout')
  for (const [pet, bvid] of [
    ['huahua', 'BV19bt3zgEbF'],
    ['xiaohei', 'BV1pMRKYPENz'],
  ]) {
    if (pet === 'xiaohei')
      await page.locator('button[data-pet-id="xiaohei"]').click()
    await expect(video.locator('.video-item')).toHaveCount(1)
    await expect(video.locator('.flora-album-strip')).toHaveCount(0)
    await expect(video.locator('.video-frame')).toBeVisible()
    const frame = (await video.locator('.video-frame').boundingBox())!
    const viewport = (await video
      .locator('.flora-video-gallery__viewport')
      .boundingBox())!
    expect(frame.height).toBeGreaterThan(0)
    expect(frame.y + frame.height).toBeLessThanOrEqual(
      viewport.y + viewport.height + 1
    )
    await video.locator('.video-item').click()
    await expect(modal).toBeVisible()
    const src = await modal.locator('iframe').getAttribute('src')
    expect(new URL(src!).searchParams.get('bvid')).toBe(bvid)
    expect(new URL(src!).searchParams.get('autoplay')).toBe('1')
    expectPagePositionToMatch(
      await readPagePosition(page, '.flora-focus-layout'),
      initial
    )
    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)
    await expect(root).toHaveAttribute('data-selected', 'sprigatito')
    await video.getByRole('button', { name: 'EXPAND', exact: true }).click()
    await expect(video).toHaveClass(/is-expanded/)
    await expect(album).toBeHidden()
    await expect(video.locator('.video-item')).toHaveCount(1)
    await expect(
      video.locator('nav, .flora-album-gallery__pagination')
    ).toHaveCount(0)
    if (info.project.name.includes('mobile')) {
      const bounds = (await video.boundingBox())!
      expect(bounds.y).toBeCloseTo(0, 0)
      expect(bounds.height).toBeCloseTo(page.viewportSize()!.height, 0)
    }
    await video.locator('.video-item').click()
    await expect(modal).toBeVisible()
    expect(
      new URL(
        (await modal.locator('iframe').getAttribute('src'))!
      ).searchParams.get('bvid')
    ).toBe(bvid)
    await modal.locator('.video-modal__close').click()
    await video.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
    await expect(album).toBeVisible()
    expectPagePositionToMatch(
      await readPagePosition(page, '.flora-focus-layout'),
      initial
    )
  }
  await video.getByRole('button', { name: 'EXPAND', exact: true }).click()
  if (info.project.name.includes('mobile'))
    await video.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
  else await page.mouse.click(10, 180)
  await expect(video).not.toHaveClass(/is-expanded/)
  await expect(album).toBeVisible()
})
