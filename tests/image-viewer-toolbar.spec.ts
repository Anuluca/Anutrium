import { expect, test } from '@playwright/test'

test('image preview toolbar has desktop-only hover and two green click flashes', async ({
  page,
}, info) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('.media-gallery__open').first()
  await trigger.waitFor({ state: 'attached' })
  await trigger.evaluate((button: HTMLButtonElement) => button.click())
  const viewer = page.locator('.el-image-viewer__wrapper')
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
  await viewer.locator('.el-image-viewer__close').click()
})
