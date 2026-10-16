import { expect, test } from '@playwright/test'

test('3D collection loops without duplicate nodes, supports local browsing and previews the clicked photo', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body style="margin:0;min-height:2000px"></body></html>',
    })
  )
  await page.route('https://assets.anuluca.com/surfer-**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#e23456"/></svg>',
    })
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.evaluate(async () => {
    const { createApp, h } = await import('/node_modules/.vite/deps/vue.js')
    const { default: Strip } = await import(
      '/src/views/Home/components/FloraAlbumStrip.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    const root = document.createElement('div')
    root.style.cssText = 'width:min(880px,100%);height:360px;margin-top:40px'
    document.body.append(root)
    createApp({
      render: () =>
        h(Strip, {
          title: '精选照片',
          items: Array.from({ length: 10 }, (_, i) => ({
            key: String(i),
            type: 'image',
            url: `https://assets.anuluca.com/surfer-${i}.webp`,
          })),
        }),
    })
      .use(i18n)
      .mount(root)
  })
  const strip = page.locator('.flora-album-strip')
  const viewport = strip.locator('.flora-album-strip__viewport')
  const positions = strip.locator('.flora-album-strip__position')
  await expect(positions).toHaveCount(10)
  await expect(strip).toHaveClass(/is-running/)
  const centers = await positions.evaluateAll((elements) =>
    elements.slice(0, 3).map((element) => {
      const rect = element.querySelector('button')!.getBoundingClientRect()
      return {
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      }
    })
  )
  for (const key of ['y', 'width', 'height'] as const) {
    const values = centers.map((center) => center[key])
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  }
  await expect
    .poll(() =>
      positions
        .first()
        .evaluate((element) => element.getAnimations()[0]?.playState)
    )
    .toBe('running')
  const stack = await positions.evaluateAll((elements) =>
    elements
      .slice(0, 3)
      .map((element) => Number(getComputedStyle(element).zIndex))
  )
  expect(stack[0]).toBeGreaterThan(stack[1])
  expect(stack[1]).toBeGreaterThan(stack[2])
  const coverage = await viewport.evaluate((root) => {
    const animations = [
      ...root.querySelectorAll('.flora-album-strip__position'),
    ].map((element) => element.getAnimations()[0])
    const times = animations.map((animation) => Number(animation.currentTime))
    const bounds = root.getBoundingClientRect()
    const samples = [0, 2000, 6000, 14000].map((delta) => {
      animations.forEach((animation, index) => {
        animation.pause()
        animation.currentTime = times[index] + delta
      })
      const rects = [...root.querySelectorAll('.flora-album-strip__position')]
        .filter((element) => Number(getComputedStyle(element).opacity) > 0.01)
        .map((element) =>
          element.querySelector('button')!.getBoundingClientRect()
        )
        .sort((a, b) => a.left - b.left)
      return {
        count: rects.length,
        left: Math.min(...rects.map((rect) => rect.left)) - bounds.left,
        right: bounds.right - Math.max(...rects.map((rect) => rect.right)),
      }
    })
    animations.forEach((animation, index) => {
      animation.currentTime = times[index]
      animation.play()
    })
    return samples
  })
  for (const sample of coverage) {
    expect(sample.count).toBeGreaterThan(0)
    expect(sample.left).toBeGreaterThanOrEqual(8)
    expect(sample.right).toBeGreaterThanOrEqual(8)
  }
  const area = (await viewport.boundingBox())!
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
  await expect
    .poll(() =>
      positions
        .first()
        .evaluate((element) => element.getAnimations()[0]?.playState)
    )
    .toBe('running')
  const scrollTop = await page.evaluate(
    () => document.scrollingElement!.scrollTop
  )
  const before = await positions
    .first()
    .evaluate((element) => getComputedStyle(element).transform)
  await page.mouse.wheel(0, 600)
  await expect
    .poll(() =>
      positions
        .first()
        .evaluate((element) => getComputedStyle(element).transform)
    )
    .not.toBe(before)
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(
    scrollTop
  )
  await viewport.focus()
  const keyboardBefore = await positions
    .first()
    .evaluate((element) => getComputedStyle(element).transform)
  await viewport.press('ArrowRight')
  await expect
    .poll(() =>
      positions
        .first()
        .evaluate((element) => getComputedStyle(element).transform)
    )
    .not.toBe(keyboardBefore)
  await page.mouse.move(area.x + area.width * 0.6, area.y + area.height * 0.6)
  await page.mouse.down()
  await page.mouse.move(area.x + area.width * 0.3, area.y + area.height * 0.6, {
    steps: 8,
  })
  await page.mouse.up()
  await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(strip).toHaveClass(/is-reduced-motion/)
  await expect
    .poll(() =>
      positions.first().evaluate((element) => element.getAnimations().length)
    )
    .toBe(0)
  await expect(positions).toHaveCount(10)
  await strip.locator('.flora-album-strip__photo').nth(2).click()
  const viewer = page.locator('.el-image-viewer__wrapper')
  await expect(viewer).toBeVisible()
  await expect(viewer.locator('.el-image-viewer__img')).toHaveAttribute(
    'src',
    'https://assets.anuluca.com/surfer-2.webp'
  )
  await viewer.locator('.el-image-viewer__close').click()
  await expect(viewer).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.mouse.move(0, 0)
  for (let attempt = 0; attempt < 2; attempt++) {
    const photo = strip.locator('.flora-album-strip__photo').first()
    await photo.focus()
    await photo.evaluate((button: HTMLButtonElement) => button.click())
    await expect(viewer).toBeVisible()
    await expect(strip).not.toHaveClass(/is-running/)
    await viewer.locator('.el-image-viewer__close').click()
    await expect(viewer).toHaveCount(0)
    await expect(strip).toHaveClass(/is-running/)
    const time = await positions
      .first()
      .evaluate((element) => Number(element.getAnimations()[0].currentTime))
    await expect
      .poll(() =>
        positions
          .first()
          .evaluate((element) => Number(element.getAnimations()[0].currentTime))
      )
      .toBeGreaterThan(time)
  }
})
