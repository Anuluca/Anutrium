import { expect, type Page, test } from '@playwright/test'

type EntranceFrame = {
  text: string
  flashes: number[]
  cursors: number[]
  opacity: number
  bounds: number[]
}

const prepareHome = async (page: Page) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await page.evaluate(() => document.fonts.load('400 96px Anton', '№ 001'))
  return (await page
    .locator('.temple-stage')
    .getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
}

test('Flora number reveals each digit and flashes twice without a cursor or frame shift', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const point = await prepareHome(page)
  await page.mouse.click(point[0], point[1])
  const number = page.locator('.flora-number-bar__number')
  await expect(number).toBeVisible()
  // 使用浏览器实际动画时钟逐帧采样，避免软件 WebGL 低帧率漏掉 48ms 闪烁。
  const frames = await number.evaluate((number) => {
    const animations = number.getAnimations({ subtree: true })
    animations.forEach((animation) => animation.pause())
    const digits = Array.from(number.querySelectorAll('.is-typing-digit'))
    const frames: EntranceFrame[] = []
    for (let time = 0; time <= 1200; time += 12) {
      animations.forEach((animation) => {
        animation.currentTime = time
      })
      const rect = number.getBoundingClientRect()
      frames.push({
        text: digits
          .map((slot) => {
            const glyph = slot.querySelector('.flora-number-bar__character')!
            return getComputedStyle(glyph).visibility === 'visible'
              ? glyph.textContent
              : ''
          })
          .join(''),
        flashes: digits.map((slot) => {
          const glyph = slot.querySelector('.flora-number-bar__character')!
          return getComputedStyle(glyph).visibility === 'visible'
            ? Number(getComputedStyle(glyph).opacity)
            : -1
        }),
        cursors: digits.flatMap((slot, index) =>
          getComputedStyle(slot, '::after').content !== 'none' ? [index] : []
        ),
        opacity: Number(getComputedStyle(number).opacity),
        bounds: [rect.left, rect.top, rect.width, rect.height],
      })
    }
    return frames
  })
  expect([...new Set(frames.map((frame) => frame.text))]).toEqual([
    '',
    '0',
    '00',
    '001',
  ])
  expect(frames[0].opacity).toBeLessThan(0.25)
  expect(
    frames.some((frame) => frame.opacity > 0.25 && frame.opacity < 0.9)
  ).toBe(true)
  const last = frames[frames.length - 1]
  expect(last.opacity).toBe(1)
  expect(last.cursors).toEqual([])
  for (let digit = 0; digit < 3; digit++) {
    let blinkCount = 0
    let wasOff = false
    for (const frame of frames) {
      const off = frame.flashes[digit] === 0
      if (off && !wasOff) blinkCount++
      wasOff = off
    }
    expect(blinkCount).toBe(2)
  }
  for (const frame of frames) {
    expect(frame.cursors.length).toBeLessThanOrEqual(1)
    frame.bounds.forEach((value, index) => {
      expect(Math.abs(value - frames[0].bounds[index])).toBeLessThanOrEqual(1)
    })
  }
})

test('Flora number shows immediately with no flashing cursor when motion is reduced', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const point = await prepareHome(page)
  await page.mouse.click(point[0], point[1])
  const number = page.locator('.flora-number-bar__number')
  await expect(number).toBeVisible()
  expect(
    await number.evaluate((element) => getComputedStyle(element).animationName)
  ).toBe('none')
  const digits = await number
    .locator('.is-typing-digit')
    .evaluateAll((elements) =>
      elements.map((slot) => ({
        glyph: getComputedStyle(
          slot.querySelector('.flora-number-bar__character')!
        ).visibility,
        cursor: getComputedStyle(slot, '::after').content,
      }))
    )
  expect(digits).toHaveLength(3)
  expect(
    digits.every(
      (digit) => digit.glyph === 'visible' && digit.cursor === 'none'
    )
  ).toBe(true)
})
