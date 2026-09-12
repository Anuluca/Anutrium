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

test('message box preserves and locks the page position', async ({
  page,
}, testInfo) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('.availability-cta--resume')
  await expect(trigger).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await page.waitForTimeout(850)
  await scrollPageToRatio(page)

  const initialPosition = await readPagePosition(page, '.archives-page')
  await page.evaluate(() => {
    const animationNames: string[] = []
    const recordAnimation = () => {
      const messageBox = document.querySelector<HTMLElement>('.el-message-box')
      if (messageBox) {
        animationNames.push(getComputedStyle(messageBox).animationName)
      }
    }
    const observer = new MutationObserver(() => {
      recordAnimation()
      requestAnimationFrame(recordAnimation)
    })

    observer.observe(document.body, { childList: true, subtree: true })
    ;(
      window as typeof window & {
        __messageBoxAnimationNames?: string[]
        __messageBoxAnimationObserver?: MutationObserver
      }
    ).__messageBoxAnimationNames = animationNames
    ;(
      window as typeof window & {
        __messageBoxAnimationObserver?: MutationObserver
      }
    ).__messageBoxAnimationObserver = observer
  })
  await trigger.evaluate((element: HTMLButtonElement) => element.click())

  const messageBox = page.locator('.el-message-box')
  await expect(messageBox).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & { __messageBoxAnimationNames?: string[] }
        ).__messageBoxAnimationNames?.some((name) =>
          name.includes('anutriumCrtOn')
        )
      )
    )
    .toBe(true)
  await page.waitForTimeout(500)

  const dialogStyle = await messageBox.evaluate((element) => {
    const closeButton = element.querySelector<HTMLElement>(
      '.el-message-box__headerbtn'
    )!
    const message = element.querySelector<HTMLElement>(
      '.el-message-box__message p'
    )!
    const messageWrapper = element.querySelector<HTMLElement>(
      '.el-message-box__message'
    )!
    const content = element.querySelector<HTMLElement>(
      '.el-message-box__content'
    )!
    const confirmButton = element.querySelector<HTMLElement>(
      '.el-button--primary'
    )!
    const buttonBar = element.querySelector<HTMLElement>(
      '.el-message-box__btns'
    )!
    const buttons = Array.from(
      buttonBar.querySelectorAll<HTMLElement>('.el-button')
    )
    const buttonBarBounds = buttonBar.getBoundingClientRect()

    return {
      accent: getComputedStyle(document.documentElement)
        .getPropertyValue('--page-theme-color')
        .trim(),
      buttonBarWidth: buttonBarBounds.width,
      buttonHeight: buttons[0]?.getBoundingClientRect().height || 0,
      buttonsWidth: buttons.reduce(
        (width, button) => width + button.getBoundingClientRect().width,
        0
      ),
      confirmIconContent: getComputedStyle(confirmButton, '::before').content,
      confirmIconWidth: parseFloat(
        getComputedStyle(confirmButton, '::before').width
      ),
      confirmFontSize: parseFloat(getComputedStyle(confirmButton).fontSize),
      cornerContent: getComputedStyle(element, '::after').content,
      closeButtonDisplay: getComputedStyle(closeButton).display,
      closeButtonWidth: closeButton.getBoundingClientRect().width,
      messageFontSize: parseFloat(getComputedStyle(message).fontSize),
      messageWrapperWidth: messageWrapper.getBoundingClientRect().width,
      contentInnerWidth:
        content.getBoundingClientRect().width -
        parseFloat(getComputedStyle(content).paddingLeft) -
        parseFloat(getComputedStyle(content).paddingRight),
      messageTextAlign: getComputedStyle(message).textAlign,
      titleTextAlign: getComputedStyle(
        element.querySelector<HTMLElement>('.el-message-box__title')!
      ).textAlign,
    }
  })
  expect(dialogStyle.accent).toBe('#5ad480')
  expect(dialogStyle.cornerContent).toBe('none')
  expect(dialogStyle.confirmIconContent).not.toBe('none')
  expect(dialogStyle.confirmIconWidth).toBeGreaterThan(2)
  expect(dialogStyle.confirmFontSize).toBeGreaterThan(8)
  if (testInfo.project.name === 'mobile-chrome') {
    expect(dialogStyle.closeButtonDisplay).toBe('none')
    expect(dialogStyle.messageFontSize).toBeGreaterThan(9)
    expect(dialogStyle.messageFontSize).toBeLessThan(11)
    expect(dialogStyle.messageTextAlign).toBe('center')
    expect(dialogStyle.titleTextAlign).toBe('center')
    expect(
      Math.abs(dialogStyle.messageWrapperWidth - dialogStyle.contentInnerWidth)
    ).toBeLessThanOrEqual(1)
    expect(dialogStyle.buttonHeight).toBeGreaterThan(27)
    expect(
      Math.abs(dialogStyle.buttonsWidth - dialogStyle.buttonBarWidth)
    ).toBeLessThanOrEqual(1)
  } else {
    expect(dialogStyle.closeButtonDisplay).not.toBe('none')
    expect(dialogStyle.closeButtonWidth).toBeGreaterThan(18)
  }

  await page.evaluate(() => {
    ;(
      window as typeof window & {
        __messageBoxAnimationObserver?: MutationObserver
      }
    ).__messageBoxAnimationObserver?.disconnect()
  })

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

  if (testInfo.project.name !== 'mobile-chrome') {
    const closeButton = messageBox.locator('.el-message-box__headerbtn')
    const closeIcon = closeButton.locator('.el-message-box__close')
    await closeButton.hover()
    await expect
      .poll(() =>
        closeIcon.evaluate((element) => getComputedStyle(element).transform)
      )
      .not.toBe('none')
  }

  await page.keyboard.press('Escape')
  await expect(messageBox).toBeHidden()
  await page.waitForTimeout(250)
  expectPagePositionToMatch(
    await readPagePosition(page, '.archives-page'),
    initialPosition
  )
})
