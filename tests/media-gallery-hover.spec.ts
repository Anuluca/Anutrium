import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route(
    /assets\.anuluca\.com.*\.(?:jpe?g|webp|png)(?:\?|$)/i,
    (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="#6898be"/><path d="M0 0H40V40H0Z M40 40H80V80H40Z" fill="#e5d082"/></pattern></defs><rect width="800" height="600" fill="url(#grid)"/></svg>',
      })
  )
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flr-page')).toBeVisible({ timeout: 20_000 })
})

test('Cinco preserves reference motion without hue rotation and supports re-entry', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  const button = page.locator('.media-gallery__open--image').first()
  await expect(async () => {
    await button.scrollIntoViewIfNeeded()
    await expect(button.locator('..').locator('..')).not.toHaveClass(
      /is-loading/
    )
  }).toPass({ timeout: 5000 })
  await button.hover()
  const surface = page.locator('.media-gallery__cinco-surface')
  await expect(surface.locator('.media-gallery__cinco-layer')).toHaveCount(2)
  await expect(button).toHaveCSS('filter', 'none')
  const frames = await surface.evaluate(async (surface) => {
    const source = await (
      await fetch('/src/composables/useImageCincoHover.ts')
    ).text()
    const moduleURL = source.match(/from ["']([^"']*\/gsap\.js[^"']*)/)?.[1]
    if (!moduleURL) throw new Error('GSAP module not found')
    const { gsap } = await import(moduleURL)
    const [bottom, top] = [...surface.children] as HTMLElement[]
    const timeline = gsap.getTweensOf(bottom)[0].parent
    timeline.pause(0)
    const frames = [0, 0.05, 0.1, 0.2, 0.5].map((time) => {
      timeline.time(time)
      const style = getComputedStyle(bottom)
      const matrix = new DOMMatrixReadOnly(style.transform)
      return {
        scale: matrix.a,
        skew: matrix.c,
        filter: style.filter,
        clip: getComputedStyle(top).clipPath,
      }
    })
    timeline.play()
    return frames
  })
  // 沿用参考站 Fx5 的运动参数，按用户要求移除色相旋转。
  const reference = [
    { scale: 1.5, brightness: 4, saturate: 2, inset: 0 },
    {
      scale: 1.4458,
      brightness: 3.187,
      saturate: 1.729,
      inset: 13.55,
    },
    {
      scale: 1.4024,
      brightness: 2.536,
      saturate: 1.512,
      inset: 24.4,
    },
    {
      scale: 1.3432,
      brightness: 1.648,
      saturate: 1.216,
      inset: 39.2,
    },
    { scale: 1.3, brightness: 1, saturate: 1, inset: 50 },
  ]
  for (let index = 0; index < frames.length; index++) {
    const actual = frames[index]
    const expected = reference[index]
    const filter = actual.filter.match(/-?[\d.]+/g)?.map(Number)
    expect(actual.scale).toBeCloseTo(expected.scale, 4)
    expect(actual.skew).toBe(0)
    expect(filter?.[0]).toBeCloseTo(expected.brightness, 4)
    expect(filter?.[1]).toBeCloseTo(expected.saturate, 4)
    expect(actual.filter).not.toContain('hue-rotate')
    expect(Number(actual.clip.match(/[\d.]+/)?.[0])).toBeCloseTo(
      expected.inset,
      3
    )
  }
  await expect(button.locator('img')).toHaveCSS('transform', 'none')
  await page.mouse.move(1, 1)
  await button.hover()
  await expect(surface).toHaveCount(1)
  await expect(surface.locator('.media-gallery__cinco-layer').last()).toHaveCSS(
    'clip-path',
    'inset(50%)'
  )
  await page.mouse.move(1, 1)
  await expect(surface).toHaveCount(0)
})

test('removes both layers on leave and preview opening', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  const buttons = page
    .locator('.media-gallery')
    .first()
    .locator('.media-gallery__open--image')
  await expect(async () => {
    await buttons.first().scrollIntoViewIfNeeded()
    await expect(buttons.first().locator('..').locator('..')).not.toHaveClass(
      /is-loading/
    )
  }).toPass({ timeout: 5000 })
  await buttons.first().hover()
  const surface = page.locator('.media-gallery__cinco-surface')
  await expect(surface).toHaveCount(1)
  await page.mouse.move(1, 1)
  await expect(surface).toHaveCount(0)
  await expect(page.locator('.media-gallery__cinco-layer')).toHaveCount(0)
  await expect(async () => {
    await buttons.nth(1).scrollIntoViewIfNeeded()
    await expect(buttons.nth(1).locator('..').locator('..')).not.toHaveClass(
      /is-loading/
    )
  }).toPass({ timeout: 5000 })
  await buttons.nth(1).hover()
  await expect(surface).toHaveCount(1)
  await buttons.nth(1).click()
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
  await expect(surface).toHaveCount(0)
})

test('touch devices and reduced motion do not create Cinco layers', async ({
  page,
}, info) => {
  if (!info.project.name.includes('mobile'))
    await page.emulateMedia({ reducedMotion: 'reduce' })
  const button = page.locator('.media-gallery__open--image').first()
  await expect(async () => {
    await button.scrollIntoViewIfNeeded()
    await expect(button).toBeVisible()
  }).toPass({ timeout: 5000 })
  await expect(button.locator('..').locator('..')).not.toHaveClass(/is-loading/)
  await button.hover()
  await expect(page.locator('.media-gallery__cinco-surface')).toHaveCount(0)
})
