import { expect, test } from '@playwright/test'
import path from 'node:path'

import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'

// UI geometry tests use the exact generated font bytes without depending on
// CDN timing. Actual R2 loading and glyph matching are tested in font-subsets.
test.beforeEach(async ({ page }) => {
  await page.route('https://assets.anuluca.com/fonts/unbounded/**', (route) => {
    const filename = path.basename(new URL(route.request().url()).pathname)
    return route.fulfill({
      path: path.resolve('scripts/fonts/generated', filename),
      contentType: 'font/woff2',
      headers: { 'access-control-allow-origin': '*' },
    })
  })
})

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
  expect(
    Math.abs(bounds.height - (triggerBounds.y - container.y + 56) * 0.9)
  ).toBeLessThanOrEqual(1)
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

  await page.evaluate(() => document.fonts.ready)
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

for (const target of ['changelog', 'roadmap', 'crew'] as const) {
  test(`${target} window resizes without flickering or scaling its title bar or border`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    const contentId =
      target === 'crew' ? 'about-crew-content' : `about-${target}-panel`
    const trigger = page.locator(`[aria-controls="${contentId}"]`)
    await expect(trigger).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2500)
    await trigger.scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    const sample = async (closing: boolean) =>
      page.evaluate(
        async ({ close, contentId }) => {
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
              : `[aria-controls="${contentId}"]`
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
                  right:
                    contentId === 'about-crew-content' ? rect.right : rect.left,
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
        },
        { close: closing, contentId }
      )

    const entering = await sample(false)
    const leaving = await sample(true)
    for (const frames of [entering, leaving]) {
      expect(frames.length).toBeGreaterThan(3)
      for (const frame of frames) {
        expect(frame.bar).toBe(28)
        expect(frame.border).toBe(1)
        expect(frame.opacity).toBe(1)
        if (target === 'crew') {
          expect(Math.abs(frame.right - frames[0].right)).toBeLessThanOrEqual(1)
          expect(
            Math.abs(frame.contentWidth - frames[0].contentWidth)
          ).toBeLessThanOrEqual(1)
          expect(
            Math.abs(frame.contentX - frames[0].contentX)
          ).toBeLessThanOrEqual(1)
          expect(
            Math.abs(frame.contentY - frames[0].contentY)
          ).toBeLessThanOrEqual(1)
        }
      }
      expect(frames.every((frame) => frame.blinkCount === 0)).toBe(true)
    }
    expect(entering.at(-1)!.width).toBeGreaterThan(entering[0].width)
    expect(entering.at(-1)!.height).toBeGreaterThan(entering[0].height)
    expect(leaving.at(-1)!.width).toBeLessThan(leaving[0].width)
    expect(leaving.at(-1)!.height).toBeLessThan(leaving[0].height)
  })
}

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

test('credits enter after window expansion, autoplay and pause over text', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('[aria-controls="about-crew-content"]')
  await expect(trigger).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(2500)
  await trigger.scrollIntoViewIfNeeded()
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.mouse.move(0, 0)
  const frames = await page.evaluate(async () => {
    let entranceEndedAt: number | null = null
    const recordEntranceEnd = (event: AnimationEvent) => {
      if (event.animationName.startsWith('staff-credits-entrance'))
        entranceEndedAt = performance.now()
    }
    document.addEventListener('animationend', recordEntranceEnd)
    document
      .querySelector<HTMLButtonElement>('[aria-controls="about-crew-content"]')!
      .click()
    const records: {
      entered: boolean
      width: number
      dockWidth: number
      opacity: number
      scrollTop: number
      entranceRunning: boolean
      afterEntrance: number | null
    }[] = []
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const sample = () => {
        const content = document.querySelector<HTMLElement>(
          '#about-crew-content'
        )
        if (content)
          records.push({
            entered: content.classList.contains('is-entered'),
            width: content
              .closest('.about-update-dock__panel')!
              .getBoundingClientRect().width,
            dockWidth: content
              .closest('.about-panel-dock')!
              .getBoundingClientRect().width,
            opacity: Number(getComputedStyle(content).opacity),
            scrollTop: content.parentElement!.scrollTop,
            afterEntrance:
              entranceEndedAt === null
                ? null
                : performance.now() - entranceEndedAt,
            entranceRunning: content
              .getAnimations()
              .some((animation) =>
                (animation as CSSAnimation).animationName.startsWith(
                  'staff-credits-entrance'
                )
              ),
          })
        if (performance.now() - start < 1800) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    document.removeEventListener('animationend', recordEntranceEnd)
    return records
  })
  const expandedWidth = frames.at(-1)!.width
  expect(
    frames.some((frame) => !frame.entered && frame.width < expandedWidth - 1)
  ).toBeTruthy()
  expect(
    frames
      .filter((frame) => frame.entered)
      .every((frame) => Math.abs(frame.width - frame.dockWidth) <= 1)
  ).toBeTruthy()
  expect(
    frames
      .filter((frame) => !frame.entered)
      .every((frame) => frame.opacity === 0)
  ).toBeTruthy()
  expect(
    frames.some(
      (frame) => frame.entered && frame.entranceRunning && frame.opacity < 1
    )
  ).toBeTruthy()
  expect(
    frames
      .filter((frame) => frame.entranceRunning)
      .every((frame) => frame.scrollTop === 0)
  ).toBeTruthy()
  expect(
    frames.some(
      (frame) => frame.entered && !frame.entranceRunning && frame.scrollTop > 1
    )
  ).toBeTruthy()
  const scroller = page.locator('.is-crew-panel .update-program__body-content')
  const waitingFrames = frames.filter(
    (frame) => frame.afterEntrance !== null && frame.afterEntrance < 190
  )
  expect(waitingFrames.length).toBeGreaterThan(0)
  expect(waitingFrames.every((frame) => frame.scrollTop === 0)).toBe(true)
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop), {
      timeout: 6000,
    })
    .toBeGreaterThan(5)
  const textPoint = await page
    .locator('.staff-credits__role h3, .staff-credits__role p')
    .evaluateAll((elements) => {
      for (const element of elements) {
        const rect = element.getBoundingClientRect()
        if (rect.top <= 180 || rect.bottom >= innerHeight - 100) continue
        const node = element.firstChild
        if (!node || node.nodeType !== Node.TEXT_NODE) continue
        const range = document.createRange()
        range.setStart(node, 0)
        range.setEnd(node, 1)
        const character = range.getBoundingClientRect()
        if (character.left - rect.left < 4) continue
        return {
          x: character.left + character.width / 2,
          y: character.top + character.height / 2,
          blankX: rect.left + 1,
        }
      }
      throw new Error('No visible text with surrounding blank space')
    })
  await page.mouse.move(textPoint.x, textPoint.y)
  const pausedAt = await scroller.evaluate((element) => element.scrollTop)
  await page.waitForTimeout(500)
  expect(
    Math.abs(
      (await scroller.evaluate((element) => element.scrollTop)) - pausedAt
    )
  ).toBeLessThanOrEqual(1)
  await page.mouse.move(textPoint.blankX, textPoint.y)
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop), {
      timeout: 3000,
    })
    .toBeGreaterThan(pausedAt + 5)
  await page.mouse.move(0, 0)
  await scroller.evaluate(
    (element) => (element.scrollTop = element.scrollHeight)
  )
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop), {
      timeout: 4000,
    })
    .toBeLessThan(5)
  await page.locator('.is-crew-panel .update-program__collapse').click()
  await expect(page.locator('#about-crew-content')).toHaveCount(0)
  await trigger.click()
  await expect(scroller).toBeVisible()
  expect(await scroller.evaluate((element) => element.scrollTop)).toBe(0)
})

test('passion windows reuse the page progress bar and hide native scrollbars', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const crew = page.locator('[aria-controls="about-crew-content"]')
  await expect(crew).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(2500)
  await crew.scrollIntoViewIfNeeded()
  const initial = await readPagePosition(page, '.about-page')
  for (const control of [
    'about-crew-content',
    'about-roadmap-panel',
    'about-changelog-panel',
  ]) {
    await page
      .locator(`[aria-controls="${control}"]`)
      .evaluate((button: HTMLButtonElement) => button.click())
    const panel = page.locator('.about-update-dock__panel')
    await expect(panel).toBeVisible()
    const scroller = panel.locator('.update-program__body-content')
    const progress = panel.locator('.page-scroll-progress.is-embedded')
    await expect(progress).toHaveCount(1)
    expect(
      await scroller.evaluate(
        (element) => getComputedStyle(element).scrollbarWidth
      )
    ).toBe('none')
    expect(
      await scroller.evaluate(
        (element) => getComputedStyle(element, '::-webkit-scrollbar').display
      )
    ).toBe('none')
    expect(
      await progress.evaluate((element) => getComputedStyle(element).position)
    ).toBe('absolute')
    for (const ratio of [0, 0.5, 1]) {
      const expected = await scroller.evaluate((element, position) => {
        const max = element.scrollHeight - element.clientHeight
        element.scrollTop = max * position
        return max > 0 ? element.scrollTop / max : 0
      }, ratio)
      await expect
        .poll(() =>
          progress.evaluate((element) =>
            Number(
              getComputedStyle(element).getPropertyValue(
                '--page-scroll-progress-scale'
              )
            )
          )
        )
        .toBeCloseTo(expected, 3)
    }
    expectPagePositionToMatch(
      await readPagePosition(page, '.about-page'),
      initial
    )
    await panel.locator('.update-program__collapse').click()
    await expect(panel).toHaveCount(0)
  }
})

test('credits cache geometry, respect manual backwards scrolling and pause outside the viewport', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('[aria-controls="about-crew-content"]')
  await expect(trigger).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(2500)
  await trigger.scrollIntoViewIfNeeded()
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.mouse.move(0, 0)
  await trigger.click()
  const scroller = page.locator('.is-crew-panel .update-program__body-content')
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(5)
  await page.evaluate(() => document.fonts.ready)
  const heightReads = await scroller.evaluate(async (element) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'scrollHeight'
    )!
    let reads = 0
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      get() {
        reads++
        return descriptor.get!.call(this)
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 400))
    delete (element as unknown as { scrollHeight?: number }).scrollHeight
    return reads
  })
  expect(heightReads).toBe(0)
  await scroller.evaluate((el) => {
    el.scrollTop = 500
  })
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(505)
  await scroller.evaluate((el) => {
    el.scrollTop = 100
  })
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(100)
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeLessThan(150)
  // 页面末尾仍可能露出窗口，因此直接移动窗口来验证视口暂停。
  const previousTransform = await scroller.evaluate((el) => {
    const dock = el.closest('.about-panel-dock') as HTMLElement
    const previous = dock.style.transform
    dock.style.transform = 'translateX(200vw)'
    return previous
  })
  await expect
    .poll(() =>
      scroller.evaluate((el) => el.getBoundingClientRect().left > innerWidth)
    )
    .toBe(true)
  await page.waitForTimeout(250)
  const pausedAt = await scroller.evaluate((el) => el.scrollTop)
  await page.waitForTimeout(400)
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(pausedAt)
  await scroller.evaluate((el, transform) => {
    ;(el.closest('.about-panel-dock') as HTMLElement).style.transform =
      transform
  }, previousTransform)
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(pausedAt + 5)
})
