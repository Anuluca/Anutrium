import { expect, test } from '@playwright/test'

import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'

test('reference button previews the original image and preserves page position', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ai-playground/arknightxpersona3reload', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  const button = page.getByRole('button', { name: '原参考图', exact: true })
  await expect(button).toBeVisible({ timeout: 20000 })
  if (!info.project.name.includes('mobile')) {
    const text = (await page
      .locator('.replica-credit__description')
      .boundingBox())!
    const control = (await button.boundingBox())!
    expect(control.x).toBeGreaterThanOrEqual(text.x + text.width)
  }
  const before = await readPagePosition(page, '.replica-frame')
  await button.click()
  const viewer = page.locator('.el-image-viewer__wrapper')
  await expect(viewer).toBeVisible()
  const image = viewer.locator('.el-image-viewer__img')
  await expect(image).toHaveAttribute(
    'src',
    'https://assets.anuluca.com/Island/playground/arknight-persona/reference.webp'
  )
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth)
    )
    .toBeGreaterThan(0)
  expectPagePositionToMatch(
    await readPagePosition(page, '.replica-frame'),
    before
  )
  await page.mouse.move(8, 8)
  await page.mouse.wheel(0, 500)
  expectPagePositionToMatch(
    await readPagePosition(page, '.replica-frame'),
    before
  )
  await page.keyboard.press('Escape')
  await expect(viewer).toHaveCount(0)
  expectPagePositionToMatch(
    await readPagePosition(page, '.replica-frame'),
    before
  )
})
