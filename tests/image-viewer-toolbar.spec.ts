import { expect, test } from '@playwright/test'

test('image preview toolbar has desktop-only hover and two green click flashes', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route(/\.(?:webp|jpe?g|png)(?:\?|$)/i, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="gray"/></svg>',
    })
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  const trigger = page.locator('.media-gallery__open').first()
  await trigger.waitFor({ state: 'attached' })
  await trigger.evaluate((button: HTMLButtonElement) => button.click())
  const viewer = page.locator('.el-image-viewer__wrapper')
  await expect(viewer.locator('.safe-image-viewer__tool')).toHaveCount(2)
  const button = viewer.locator('.safe-image-viewer__tool').first()
  await button.hover()
  const background = info.project.name.includes('mobile')
    ? 'rgba(0, 0, 0, 0)'
    : 'rgb(226, 52, 86)'
  await expect(button).toHaveCSS('background-color', background)
  const frames = await button.evaluate((element: HTMLButtonElement) => {
    element.click()
    return element
      .getAnimations()
      .flatMap((animation) =>
        (animation.effect as KeyframeEffect).getKeyframes()
      )
      .filter((frame) => frame.backgroundColor)
      .map((frame) => ({ offset: frame.offset, color: frame.backgroundColor }))
  })
  expect(
    frames
      .filter((frame) => frame.color === 'rgb(29, 203, 169)')
      .map((frame) => frame.offset)
  ).toEqual([0, 0.5])
  await page.waitForTimeout(320)
  await expect(button).toHaveCSS('background-color', background)
  const image = viewer.locator('.el-image-viewer__img')
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth)
    )
    .toBeGreaterThan(0)
  const zoomIn = viewer.getByRole('button', { name: '放大', exact: true })
  for (let index = 0; index < 8; index++) await zoomIn.click()
  // 放大图片覆盖操作栏所在区域后，按钮仍须位于命中测试的最上层。
  for (const tool of await viewer.locator('.safe-image-viewer__tool').all()) {
    expect(
      await tool.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        return element.contains(
          document.elementFromPoint(
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height / 2
          )
        )
      })
    ).toBe(true)
  }
  const readScale = () =>
    image.evaluate((element: HTMLImageElement) =>
      Number(/scale\(([^)]+)\)/.exec(element.style.transform)?.[1] || 1)
    )
  const zoomedScale = await readScale()
  await button.click()
  await expect.poll(readScale).toBeLessThan(zoomedScale)
  await viewer.locator('.el-image-viewer__close').click()
})
