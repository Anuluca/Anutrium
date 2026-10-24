import { expect, test } from '@playwright/test'

import { scrollPageToRatio } from './helpers/pagePosition'

test('inline preview scrolls the current image title within its stage', async ({
  page,
}, testInfo) => {
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await scrollPageToRatio(page)
  const gallery = page.locator('.media-gallery').first()
  await gallery.getByRole('button', { name: '大图预览', exact: true }).click()
  const preview = gallery.locator('.inline-image-preview')
  const title = preview.locator('.modal-background-title')
  await expect(title).toHaveCount(0)
  await preview.getByRole('button', { name: '下一张', exact: true }).click()
  await expect(title.locator('span').first()).toHaveText(
    'T形帛画 - 湖南省博物馆'
  )
  await expect(title).toHaveCSS('position', 'absolute')
  await expect(title).toHaveCSS('opacity', '0.2')
  await expect(title.locator('.modal-background-title__track')).toHaveCSS(
    'animation-play-state',
    'running'
  )
  await expect
    .poll(() =>
      title.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const stage = element
          .closest('.inline-image-preview__stage')!
          .getBoundingClientRect()
        return Math.max(
          Math.abs(bounds.left - stage.left),
          Math.abs(bounds.width - stage.width),
          Math.abs(
            bounds.top + bounds.height / 2 - stage.top - stage.height / 2
          )
        )
      })
    )
    .toBeLessThanOrEqual(1)
  await preview.scrollIntoViewIfNeeded()
  await page.screenshot({
    path: testInfo.outputPath('inline-background-title.png'),
  })
  await preview.locator('.inline-image-preview__thumbnail').first().click()
  await expect(title).toHaveCount(0)
})

test('fullscreen image titles scroll behind images and follow navigation', async ({
  page,
}, testInfo) => {
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await scrollPageToRatio(page)
  const triggers = page.locator('.media-gallery__open--image')
  await triggers
    .first()
    .evaluate((element: HTMLButtonElement) => element.click())

  const viewer = page.locator('.el-image-viewer__wrapper')
  const title = viewer.locator('.safe-image-viewer__background-title')
  await expect(title).toHaveCount(0)
  await viewer.locator('.el-image-viewer__next').click()
  await expect(title.locator('span').first()).toHaveText(
    'T形帛画 - 湖南省博物馆'
  )
  await expect(title).toHaveCSS('opacity', '0.2')
  await expect(title).toHaveCSS('pointer-events', 'none')
  const track = title.locator('.modal-background-title__track')
  await expect(track).toHaveCSS('animation-play-state', 'running')
  const before = await track.evaluate((el) => getComputedStyle(el).transform)
  await expect
    .poll(() => track.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before)

  // 标题在遮罩之上、图片之下，背景仍可点击关闭预览。
  await expect(viewer.locator('.el-image-viewer__canvas')).toHaveCSS(
    'z-index',
    '1'
  )
  await expect(title).toHaveCSS('z-index', '0')
  await expect(viewer.locator('.el-image-viewer__img')).toHaveCSS(
    'pointer-events',
    'auto'
  )
  await page.screenshot({ path: testInfo.outputPath('background-title.png') })

  await viewer.locator('.el-image-viewer__prev').click()
  await expect(title).toHaveCount(0)
  await page.mouse.click(8, 8)
  await expect(viewer).toHaveCount(0)
  await expect(
    page.locator('.safe-image-viewer__background-title')
  ).toHaveCount(0)
})
