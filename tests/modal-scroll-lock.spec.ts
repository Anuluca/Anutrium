import { expect, test } from '@playwright/test'

import {
  expectPagePositionToMatch,
  readPagePosition,
  scrollPageToRatio,
} from './helpers/pagePosition'

const PAGE_LOAD_TIMEOUT = 20_000

test('image viewer preserves and locks the page position', async ({ page }) => {
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('.media-gallery__open').first()
  await expect(trigger).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await page.waitForTimeout(850)
  await scrollPageToRatio(page)

  const initialPosition = await readPagePosition(page, '.flr-page')
  await trigger.evaluate((element: HTMLButtonElement) => element.click())

  const viewer = page.locator('.el-image-viewer__wrapper')
  await expect(viewer).toBeVisible()
  await page.waitForTimeout(250)
  expectPagePositionToMatch(
    await readPagePosition(page, '.flr-page'),
    initialPosition
  )

  await page.mouse.move(8, 8)
  await page.mouse.wheel(0, -600)
  await page.waitForTimeout(150)
  expectPagePositionToMatch(
    await readPagePosition(page, '.flr-page'),
    initialPosition
  )

  await viewer.locator('.el-image-viewer__close').click()
  await expect(viewer).toBeHidden()
  await page.waitForTimeout(250)
  expectPagePositionToMatch(
    await readPagePosition(page, '.flr-page'),
    initialPosition
  )
})

test('journey video modal preserves and locks the page position', async ({
  page,
}) => {
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('.video-item').first()
  await expect(trigger).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await page.waitForTimeout(850)
  await scrollPageToRatio(page)

  const initialPosition = await readPagePosition(page, '.flr-page')
  await trigger.evaluate((element: HTMLButtonElement) => element.click())

  const modal = page.locator('.video-modal')
  await expect(modal).toBeVisible()
  await page.waitForTimeout(300)
  expectPagePositionToMatch(
    await readPagePosition(page, '.flr-page'),
    initialPosition
  )

  await page.mouse.move(8, 8)
  await page.mouse.wheel(0, -600)
  await page.waitForTimeout(150)
  expectPagePositionToMatch(
    await readPagePosition(page, '.flr-page'),
    initialPosition
  )

  await modal.locator('.video-modal__close').click()
  await expect(modal).toBeHidden()
  await page.waitForTimeout(100)
  expectPagePositionToMatch(
    await readPagePosition(page, '.flr-page'),
    initialPosition
  )
})

test('message box preserves and locks the page position', async ({ page }) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('.availability-cta--resume')
  await expect(trigger).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await page.waitForTimeout(850)
  await scrollPageToRatio(page)

  const initialPosition = await readPagePosition(page, '.archives-page')
  await trigger.evaluate((element: HTMLButtonElement) => element.click())

  const messageBox = page.locator('.el-message-box')
  await expect(messageBox).toBeVisible()
  await page.waitForTimeout(250)
  expectPagePositionToMatch(
    await readPagePosition(page, '.archives-page'),
    initialPosition
  )

  await page.mouse.move(8, 8)
  await page.mouse.wheel(0, -600)
  await page.waitForTimeout(150)
  expectPagePositionToMatch(
    await readPagePosition(page, '.archives-page'),
    initialPosition
  )

  await page.keyboard.press('Escape')
  await expect(messageBox).toBeHidden()
  await page.waitForTimeout(250)
  expectPagePositionToMatch(
    await readPagePosition(page, '.archives-page'),
    initialPosition
  )
})
