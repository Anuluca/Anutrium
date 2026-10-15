import { expect, test } from '@playwright/test'

test('statue clock types after model entrance, ticks without retyping, and resets after pillar focus', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.clock.setFixedTime(new Date('2026-10-11T23:59:58'))
  await page.addInitScript(() => {
    const state = { entranceFinished: '', visibleCharacters: -1 }
    ;(window as any).clockEntrance = state
    const observer = new MutationObserver(() => {
      const clock = document.querySelector('.temple-clock')
      if (!clock) return
      state.entranceFinished =
        document
          .querySelector('.temple-stage')
          ?.getAttribute('data-entrance-finished') ?? ''
      state.visibleCharacters = [...clock.children].filter(
        (character) => getComputedStyle(character).visibility === 'visible'
      ).length
      observer.disconnect()
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const clock = page.locator('.temple-clock')
  await expect(clock).toBeVisible({ timeout: 45000 })
  const entrance = await page.evaluate(() => (window as any).clockEntrance)
  expect(entrance.entranceFinished).toBe('true')
  expect(entrance.visibleCharacters).toBeLessThan(8)
  const visibleCharacters = () =>
    clock
      .locator('.temple-clock__character')
      .evaluateAll(
        (characters) =>
          characters.filter(
            (character) => getComputedStyle(character).visibility === 'visible'
          ).length
      )
  await expect.poll(visibleCharacters).toBe(8)
  await expect(clock).toHaveAttribute('datetime', '23:59:58')
  expect(
    await clock.evaluate((element) => getComputedStyle(element).color)
  ).toBe('rgb(226, 52, 86)')
  const animationsBefore = await clock.evaluate((element) =>
    element
      .getAnimations({ subtree: true })
      .map((animation) => animation.startTime)
  )
  await page.clock.setFixedTime(new Date('2026-10-12T00:00:00'))
  await expect(clock).toHaveAttribute('datetime', '00:00:00')
  expect(
    await clock.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.startTime)
    )
  ).toEqual(animationsBefore)
  const colon = clock.locator('.temple-clock__colon').first()
  await expect(colon).toHaveCSS('animation-name', 'none')
  await expect(colon).toHaveCSS('opacity', '1')
  const bounds = (await clock.boundingBox())!
  const viewport = page.viewportSize()!
  expect(
    Math.abs(bounds.x + bounds.width / 2 - (viewport.width / 2 + 4))
  ).toBeLessThanOrEqual(1)
  expect(bounds.y + bounds.height).toBeLessThan(viewport.height)
  await page.screenshot({
    path: `test-results/temple-clock-${testInfo.project.name}.png`,
  })

  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((element: HTMLButtonElement) => element.click())
  await expect(clock).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.temple-clock')) return
      ;(window as any).clockReturnSettled = document
        .querySelector('.temple-page')
        ?.getAttribute('data-settled')
      observer.disconnect()
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await page.keyboard.press('Escape')
  await expect(clock).toBeVisible()
  expect(await page.evaluate(() => (window as any).clockReturnSettled)).toBe(
    'true'
  )
  await expect.poll(visibleCharacters).toBe(8)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(clock).toHaveAttribute('datetime', '00:00:00')
})
