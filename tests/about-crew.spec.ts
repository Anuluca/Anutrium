import { expect, test } from '@playwright/test'

import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'

test('crew panel preserves page position, fits its container and restores the brand presentation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('[aria-controls="about-crew-content"]')
  await expect(trigger).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(2500)
  await trigger.scrollIntoViewIfNeeded()
  const initial = await readPagePosition(page, '.about-page')
  const brand = page.locator('.passion-color-field')
  const crystal = page.locator('.passion-logo-bg')
  const brandBefore = (await brand.boundingBox())!
  const crystalBefore = (await crystal.boundingBox())!

  await trigger.click()
  const panel = page.locator('.is-crew-panel .about-update-dock__panel')
  await expect(panel).toBeVisible()
  await page.waitForTimeout(600)
  const container = (await page.locator('.passion-section').boundingBox())!
  const triggerBounds = (await trigger.boundingBox())!
  const bounds = (await panel.boundingBox())!
  expect(Math.abs(bounds.width - container.width / 3)).toBeLessThanOrEqual(1)
  expect(Math.abs(bounds.y - container.y + 56)).toBeLessThanOrEqual(1)
  expect(
    Math.abs(bounds.y + bounds.height - triggerBounds.y)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(bounds.x + bounds.width - triggerBounds.x - triggerBounds.width)
  ).toBeLessThanOrEqual(1)
  await expect(panel.locator('.update-program__path')).toHaveText('C:\\CREDITS')
  await expect(panel.locator('#about-crew-content')).toContainText(
    'STAFF & CREDITS'
  )
  await expect(panel.locator('.staff-credits__role')).toHaveCount(8)
  expect((await brand.boundingBox())!.x).toBeLessThan(brandBefore.x - 10)
  expect((await crystal.boundingBox())!.x).toBeLessThan(crystalBefore.x - 10)
  expectPagePositionToMatch(
    await readPagePosition(page, '.about-page'),
    initial
  )

  await panel.locator('.update-program__collapse').click()
  await expect(panel).toBeHidden()
  await page.waitForTimeout(500)
  expect(
    Math.abs((await brand.boundingBox())!.x - brandBefore.x)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs((await crystal.boundingBox())!.x - crystalBefore.x)
  ).toBeLessThanOrEqual(1)
  expectPagePositionToMatch(
    await readPagePosition(page, '.about-page'),
    initial
  )
})

test('switching windows immediately hides the old window and opens once from the clicked button', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const left = page.locator('[aria-controls="about-changelog-panel"]')
  await expect(left).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(2500)
  await left.scrollIntoViewIfNeeded()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await left.click()
  await page.waitForTimeout(1150)

  for (const target of ['crew', 'roadmap', 'changelog']) {
    const control =
      target === 'crew' ? 'about-crew-content' : `about-${target}-panel`
    const anchor = (await page
      .locator(`[aria-controls="${control}"]`)
      .boundingBox())!
    const frames = await page.evaluate(async (destination) => {
      const records: {
        title: string
        width: number
        left: number
        right: number
      }[] = []
      document
        .querySelector<HTMLElement>(
          `[aria-controls="${
            destination === 'crew'
              ? 'about-crew-content'
              : `about-${destination}-panel`
          }"]`
        )!
        .click()
      const start = performance.now()
      await new Promise<void>((resolve) => {
        const read = () => {
          const panel = document.querySelector<HTMLElement>(
            '.about-update-dock__panel'
          )
          if (panel && getComputedStyle(panel).visibility !== 'hidden') {
            const rect = panel.getBoundingClientRect()
            records.push({
              title: panel
                .querySelector('.update-program__path')!
                .textContent!.replace(/\s/g, ''),
              width: rect.width,
              left: rect.left,
              right: rect.right,
            })
          }
          if (performance.now() - start > 1500) resolve()
          else requestAnimationFrame(read)
        }
        requestAnimationFrame(read)
      })
      return records
    }, target)
    const destinationTitle =
      target === 'crew' ? 'C:\\CREDITS' : `C:\\${target.toUpperCase()}`
    const incoming = frames.filter((frame) => frame.title === destinationTitle)
    const outgoing = frames.filter((frame) => frame.title !== destinationTitle)
    expect(incoming.length).toBeGreaterThan(10)
    expect(outgoing.length).toBe(0)
    expect(incoming[0].width).toBeLessThan(incoming.at(-1)!.width * 0.4)
    for (let i = 1; i < incoming.length; i++) {
      expect(incoming[i].width).toBeGreaterThanOrEqual(
        incoming[i - 1].width - 1
      )
    }
    for (const frame of incoming) {
      expect(
        Math.abs(
          target === 'crew'
            ? frame.right - anchor.x - anchor.width
            : frame.left - anchor.x
        )
      ).toBeLessThanOrEqual(1)
    }
  }
})

test('program windows resize and flicker without scaling their title bar or border', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('[aria-controls="about-crew-content"]')
  await expect(trigger).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(2500)
  await trigger.scrollIntoViewIfNeeded()
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  const sample = async (closing: boolean) =>
    page.evaluate(async (close) => {
      const frames: {
        width: number
        height: number
        bar: number
        border: number
        opacity: number
        blinkCount: number
        right: number
        contentWidth: number
        contentX: number
        contentY: number
      }[] = []
      const button = document.querySelector<HTMLElement>(
        close
          ? '.update-program__collapse'
          : '[aria-controls="about-crew-content"]'
      )!
      button.click()
      const start = performance.now()
      await new Promise<void>((resolve) => {
        const read = () => {
          const panel = document.querySelector<HTMLElement>(
            '.about-update-dock__panel'
          )
          if (panel) {
            const bar = panel.querySelector<HTMLElement>(
              '.update-program__bar'
            )!
            const rect = panel.getBoundingClientRect()
            const content = panel
              .querySelector<HTMLElement>('.update-program__body-content')!
              .getBoundingClientRect()
            frames.push({
              width: rect.width,
              height: rect.height,
              bar: bar.getBoundingClientRect().height,
              border: parseFloat(getComputedStyle(bar).borderTopWidth),
              opacity: Number(getComputedStyle(panel).opacity),
              blinkCount: Math.max(
                0,
                ...panel.getAnimations().map((animation) => {
                  const effect = animation.effect as KeyframeEffect
                  return effect
                    .getKeyframes()
                    .filter((frame) => Number(frame.opacity) < 0.9).length
                })
              ),
              right: rect.right,
              contentWidth: content.width,
              contentX: content.x,
              contentY: content.y,
            })
          }
          if (performance.now() - start > 1200) resolve()
          else requestAnimationFrame(read)
        }
        requestAnimationFrame(read)
      })
      return frames
    }, closing)

  const entering = await sample(false)
  const leaving = await sample(true)
  for (const frames of [entering, leaving]) {
    expect(frames.length).toBeGreaterThan(3)
    for (const frame of frames) {
      expect(frame.bar).toBe(28)
      expect(frame.border).toBe(1)
      expect(Math.abs(frame.right - frames[0].right)).toBeLessThanOrEqual(1)
      expect(
        Math.abs(frame.contentWidth - frames[0].contentWidth)
      ).toBeLessThanOrEqual(1)
      expect(Math.abs(frame.contentX - frames[0].contentX)).toBeLessThanOrEqual(
        1
      )
      expect(Math.abs(frame.contentY - frames[0].contentY)).toBeLessThanOrEqual(
        1
      )
    }
    expect(frames.some((frame) => frame.blinkCount === 3)).toBe(true)
  }
  expect(entering.at(-1)!.width).toBeGreaterThan(entering[0].width)
  expect(entering.at(-1)!.height).toBeGreaterThan(entering[0].height)
  expect(leaving.at(-1)!.width).toBeLessThan(leaving[0].width)
  expect(leaving.at(-1)!.height).toBeLessThan(leaving[0].height)
})

test('staff credits localize labels and remain centered and scrollable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const locale of ['zhCn', 'en']) {
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    const trigger = page.locator('[aria-controls="about-crew-content"]')
    await expect(trigger).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2500)
    if (locale === 'en') {
      await page
        .locator('.footer-com .language button')
        .filter({ hasText: 'En' })
        .evaluate((button: HTMLButtonElement) => button.click())
    }
    await trigger.click()
    const credits = page.locator('#about-crew-content')
    await expect(credits.locator('h2')).toHaveText('STAFF & CREDITS')
    await expect(credits.locator('.staff-credits__role h3').first()).toHaveText(
      locale === 'zhCn' ? '总导演' : 'GENERAL DIRECTOR'
    )
    const labels = await credits.locator('h3').allTextContents()
    expect(labels.every((label) => !label.includes('/'))).toBeTruthy()
    if (locale === 'en') expect(labels.join('')).not.toMatch(/[\u4e00-\u9fff]/)
    expect(
      await credits.evaluate((element) => getComputedStyle(element).textAlign)
    ).toBe('center')
    expect(
      await credits.evaluate((element) => getComputedStyle(element).fontSize)
    ).toBe('24px')
    const scroller = page.locator(
      '.is-crew-panel .update-program__body-content'
    )
    await scroller.evaluate(
      (element) => (element.scrollTop = element.scrollHeight)
    )
    await expect(credits.locator('.staff-credits__closing')).toBeInViewport()
    expect(
      await scroller.evaluate(
        (element) => element.scrollWidth - element.clientWidth
      )
    ).toBeLessThanOrEqual(1)
  }
})
