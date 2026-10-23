import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/colorPalette', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.footer-com')).toHaveClass(/footer-expanded/, {
    timeout: 20000,
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1100)
})

test('marquee fills the viewport throughout a cycle and joins without a position jump', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const track = page.locator('.footer-com .marquee-wrap')
  await expect
    .poll(() => track.evaluate((element) => element.getAnimations().length))
    .toBeGreaterThan(0)
  const geometry = await track.evaluate(async (element) => {
    const viewport = element.closest('.center')!.getBoundingClientRect()
    const groups = [
      ...element.querySelectorAll<HTMLElement>('.marquee-content'),
    ]
    const first = groups[0].getBoundingClientRect()
    const animation = element.getAnimations()[0]
    animation.pause()
    const duration = Number(animation.effect!.getTiming().duration)
    const coverage: { left: number; right: number }[] = []
    for (const progress of [0, 0.25, 0.75, 0.99999]) {
      animation.currentTime = duration * progress
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
      coverage.push({
        left: groups[0].getBoundingClientRect().left - viewport.left,
        right:
          groups[groups.length - 1].getBoundingClientRect().right -
          viewport.right,
      })
    }
    const readVisible = () =>
      [...element.querySelectorAll<HTMLElement>('.recommend-link')]
        .map((link) => ({
          text: link.textContent!.trim(),
          left: link.getBoundingClientRect().left - viewport.left,
          right: link.getBoundingClientRect().right - viewport.left,
        }))
        .filter((link) => link.right > 2 && link.left < viewport.width - 2)
    const before = readVisible()
    animation.currentTime = duration * 1.00001
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const after = readVisible()
    return {
      width: viewport.width,
      cycle: first.width,
      distance: parseFloat(
        (element as HTMLElement).style.getPropertyValue(
          '--footer-marquee-distance'
        )
      ),
      copies: groups.length,
      gap: parseFloat(getComputedStyle(groups[0]).paddingRight),
      coverage,
      before,
      after,
      hiddenCopies: groups
        .slice(1)
        .every(
          (group) =>
            group.getAttribute('aria-hidden') === 'true' &&
            [...group.querySelectorAll('a')].every(
              (link) => link.tabIndex === -1
            )
        ),
    }
  })
  expect(geometry.copies).toBeGreaterThanOrEqual(
    Math.ceil(geometry.width / geometry.cycle) + 1
  )
  expect(Math.abs(geometry.distance - geometry.cycle)).toBeLessThan(0.01)
  expect(geometry.hiddenCopies).toBe(true)
  expect(geometry.gap).toBeLessThanOrEqual(36)
  for (const sample of geometry.coverage) {
    expect(sample.left).toBeLessThanOrEqual(1)
    expect(sample.right).toBeGreaterThanOrEqual(-1)
  }
  expect(geometry.before.map((link) => link.text)).toEqual(
    geometry.after.map((link) => link.text)
  )
  for (const [index, link] of geometry.before.entries()) {
    expect(Math.abs(link.left - geometry.after[index].left)).toBeLessThan(1)
  }
})

test('marquee recalculates coverage after viewport resizing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 3840, height: 2160 })
  const track = page.locator('.footer-com .marquee-wrap')
  await expect
    .poll(() =>
      track.evaluate((element) => {
        const groups = element.querySelectorAll('.marquee-content')
        const width = element.closest('.center')!.getBoundingClientRect().width
        const cycle = groups[0].getBoundingClientRect().width
        return groups.length >= Math.ceil(width / cycle) + 1
      })
    )
    .toBe(true)
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect
    .poll(() =>
      track.evaluate((element) => {
        const groups = element.querySelectorAll('.marquee-content')
        const width = element.closest('.center')!.getBoundingClientRect().width
        const cycle = groups[0].getBoundingClientRect().width
        return groups.length === Math.max(2, Math.ceil(width / cycle) + 1)
      })
    )
    .toBe(true)
})

test('random rants appear at the end of each copy without changing cycle width and switch languages', async ({
  page,
}) => {
  const track = page.locator('.footer-com .marquee-wrap')
  const visibleRants = track.locator(
    '.recommend-rant .recommend-title:not(.rant-inactive)'
  )
  const readCycleWidth = () =>
    track
      .locator('.marquee-content')
      .first()
      .evaluate((element) => element.getBoundingClientRect().width)
  const initialWidth = await readCycleWidth()

  for (const [random, text] of [
    [0.1, '这个时代的DJ REMIX会不会多过头了'],
    [0.9, '不要暂停我的音乐'],
  ] as const) {
    await track.evaluate((element, value) => {
      const originalRandom = Math.random
      try {
        Math.random = () => value
        element.dispatchEvent(new AnimationEvent('animationiteration'))
      } finally {
        Math.random = originalRandom
      }
    }, random)
    await expect(visibleRants.first()).toHaveText(text)
    expect(await visibleRants.allTextContents()).toEqual(
      Array(await track.locator('.marquee-content').count()).fill(text)
    )
    expect(Math.abs((await readCycleWidth()) - initialWidth)).toBeLessThan(0.01)
  }

  expect(
    await track
      .locator('.marquee-content')
      .first()
      .evaluate((element) =>
        element
          .querySelector('.recommend')!
          .lastElementChild!.classList.contains('recommend-rant')
      )
  ).toBe(true)

  // 手机端语言按钮隐藏，直接触发同一个按钮处理器验证双语切换。
  await page
    .locator('.footer-com .language button')
    .filter({ hasText: /^En$/ })
    .evaluate((element) => (element as HTMLButtonElement).click())
  await expect(visibleRants.first()).toHaveText("DON'T PAUSE MY MUSIC")
  await expect(track.locator('.recommend-rant').first()).toContainText(
    'ARE THERE TOO MANY DJ REMIXES THESE DAYS?'
  )
})

test('desktop thumbnail sits above its link and uses CRT power and flip animations', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop hover preview')
  await page.route('**/*image=card-mobile*', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="180"><rect width="260" height="180" fill="#e23456"/></svg>',
    })
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('.marquee-wrap').evaluate((element) => {
    element.getAnimations().forEach((animation) => animation.pause())
  })
  const link = page.locator('.footer-com .recommend-link').first()
  const footerBefore = await page.locator('.footer-com').boundingBox()
  await link.hover()
  const preview = page.locator('.footer-thumbnail')
  await expect(preview).toHaveCount(1)
  await expect(preview.locator('img')).toHaveAttribute(
    'src',
    /27b03fd3.*\?image=card-mobile$/
  )
  const enter = await preview.evaluate((element) => {
    const style = getComputedStyle(element)
    const animation = element.getAnimations()[0]
    animation.pause()
    const screen = element.querySelector('.footer-thumbnail-screen')!
    const screenAnimation = screen.getAnimations()[0]
    screenAnimation.pause()
    return {
      name: style.animationName,
      duration: style.animationDuration,
      opacity: style.opacity,
      flip: (animation.effect as KeyframeEffect).getKeyframes()[0].transform,
      crtName: getComputedStyle(screen).animationName,
      crtDuration: getComputedStyle(screen).animationDuration,
    }
  })
  expect(enter).toMatchObject({
    name: 'footer-thumbnail-flip-in',
    duration: '0.46s',
    opacity: '0.4',
    crtName: 'anutriumCrtOn',
    crtDuration: '0.46s',
  })
  expect(enter.flip).toContain('rotateY(-78deg)')
  await preview.evaluate(async (element) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      animation.pause()
      animation.currentTime = Number(animation.effect!.getTiming().duration)
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })
  const imageBounds = (await preview.boundingBox())!
  const linkBounds = (await link.boundingBox())!
  expect(imageBounds.width).toBeCloseTo(180, 0)
  expect(imageBounds.height).toBeCloseTo(125, 0)
  expect(imageBounds.y + imageBounds.height).toBeLessThan(linkBounds.y)
  expect(imageBounds.x).toBeGreaterThanOrEqual(0)
  expect(imageBounds.x + imageBounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width
  )
  expect(await page.locator('.footer-com').boundingBox()).toEqual(footerBefore)
  await page.mouse.move(0, 0)
  await expect(preview).toHaveClass(/footer-thumbnail-leave-active/)
  const leave = await preview.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      name: style.animationName,
      duration: style.animationDuration,
      crtName: getComputedStyle(
        element.querySelector('.footer-thumbnail-screen')!
      ).animationName,
    }
  })
  expect(leave).toEqual({
    name: 'footer-thumbnail-flip-out',
    duration: '0.42s',
    crtName: 'anutriumCrtOff',
  })
  await expect(preview).toHaveCount(0)
})

test('leaving before an image loads cannot revive a stale thumbnail', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop hover preview')
  let releaseImage!: () => void
  const heldImage = new Promise<void>((resolve) => {
    releaseImage = resolve
  })
  let imageRequested!: () => void
  const requestStarted = new Promise<void>((resolve) => {
    imageRequested = resolve
  })
  await page.route('**/*image=card-mobile*', async (route) => {
    imageRequested()
    await heldImage
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="180"/>',
    })
  })
  await page.locator('.footer-com .recommend-link').first().hover()
  await requestStarted
  await page.mouse.move(0, 0)
  releaseImage()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.footer-thumbnail')).toHaveCount(0)
})

test('mobile does not render or request hover thumbnails', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Mobile thumbnail suppression')
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('image=card-mobile'))
      requests.push(request.url())
  })
  const link = page.locator('.footer-com .recommend-link').first()
  await link.dispatchEvent('mouseenter')
  await link.focus()
  await page.waitForTimeout(400)
  await expect(page.locator('.footer-thumbnail')).toHaveCount(0)
  expect(requests).toEqual([])
})
