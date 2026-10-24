import { expect, test } from '@playwright/test'

test('viewer theme, navigation hit areas, square tools and cursor work together', async ({
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
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('.media-gallery__open').first()
  await expect(trigger).toBeAttached({ timeout: 20000 })
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.flr-page')).toBeVisible({ timeout: 20000 })
  await page.waitForTimeout(850)
  const viewer = page.locator('.el-image-viewer__wrapper')
  await expect(async () => {
    if (!(await viewer.isVisible()))
      await trigger.evaluate((element: HTMLButtonElement) => element.click())
    await expect(viewer).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await expect(viewer).not.toHaveClass(/viewer-fade-enter-active/)
  const mobile = info.project.name.includes('mobile')
  const tools = viewer.locator('.safe-image-viewer__tool')
  await expect(tools).toHaveCount(2)
  for (let i = 0; i < 2; i++) {
    await expect(tools.nth(i)).toBeVisible({ timeout: 20000 })
    const size = await tools.nth(i).boundingBox()
    expect(Math.abs(size!.width - size!.height)).toBeLessThanOrEqual(1)
    await expect(tools.nth(i)).toHaveCSS('border-left-width', '0px')
  }
  await expect(viewer.locator('.el-image-viewer__actions')).toHaveCSS(
    'border-left-width',
    '0px'
  )
  const theme = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue('--page-theme-color')
  )
  expect(
    await viewer.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--viewer-accent').trim()
    )
  ).toBe(theme)
  const next = viewer.locator('.el-image-viewer__next')
  await next.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished))
  )
  await expect(next).toHaveCSS('border-right-width', '0px')
  await expect(viewer.locator('.el-image-viewer__prev')).toHaveCSS(
    'border-left-width',
    '0px'
  )
  await expect(next.locator('.safe-image-viewer__nav-fill')).toHaveCount(1)
  await expect(next.locator('.safe-image-viewer__nav-surface')).toHaveCSS(
    'mask-image',
    /data:image\/png/
  )
  const transparentTextPixels = await next
    .locator('.safe-image-viewer__nav-surface')
    .evaluate(async (element) => {
      const image = new Image()
      image.src = getComputedStyle(element).maskImage.slice(5, -2)
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data
      let transparent = 0
      for (let index = 3; index < pixels.length; index += 4)
        if (pixels[index] === 0) transparent++
      return transparent
    })
  expect(transparentTextPixels).toBeGreaterThan(100)
  expect(
    await next
      .locator('.safe-image-viewer__nav-fill')
      .evaluate((element) => getComputedStyle(element).maskImage)
  ).toContain('linear-gradient')
  const closeSize = await viewer
    .locator('.el-image-viewer__close')
    .evaluate((element) => ({
      width: getComputedStyle(element).width,
      height: getComputedStyle(element).height,
    }))
  expect(closeSize).toEqual({ width: '28px', height: '28px' })
  if (mobile) {
    const bottomCard = (await next.boundingBox())!
    await expect(viewer.locator('.el-image-viewer__prev')).toBeHidden()
    const toolbar = (await viewer
      .locator('.el-image-viewer__actions')
      .boundingBox())!
    expect(bottomCard.y + bottomCard.height).toBeCloseTo(
      page.viewportSize()!.height,
      0
    )
    expect(toolbar.y + toolbar.height).toBeLessThan(bottomCard.y)
  }
  const image = viewer.locator('.el-image-viewer__img:visible')
  const firstUrl = await image.getAttribute('src')
  const box = (await next.boundingBox())!
  await page.mouse.click(box.x + box.width - 4, box.y + 8)
  await expect(image).not.toHaveAttribute('src', firstUrl!)
  await expect(image).toHaveCSS('filter', 'brightness(1)')
  const corners = viewer.locator('.safe-image-viewer__corners')
  if (mobile) await expect(corners).toBeHidden()
  else {
    await expect(corners).toBeVisible()
    await expect
      .poll(async () => {
        const photo = (await image.boundingBox())!
        const frame = (await corners.boundingBox())!
        return Math.max(
          Math.abs(frame.x + frame.width / 2 - photo.x - photo.width / 2),
          Math.abs(frame.y + frame.height / 2 - photo.y - photo.height / 2),
          Math.abs(frame.width - photo.width - 32),
          Math.abs(frame.height - photo.height - 32)
        )
      })
      .toBeLessThanOrEqual(1)
  }
  if (mobile) {
    const client = await page.context().newCDPSession(page)
    const original = (await image.boundingBox())!
    const center = {
      x: original.x + original.width / 2,
      y: original.y + original.height / 2,
    }
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      points: { x: number; y: number; id: number }[]
    ) => client.send('Input.dispatchTouchEvent', { type, touchPoints: points })
    const pinch = async (start: number, end: number) => {
      await touch('touchStart', [
        { x: center.x - start, y: center.y, id: 1 },
        { x: center.x + start, y: center.y, id: 2 },
      ])
      await touch('touchMove', [
        { x: center.x - end, y: center.y, id: 1 },
        { x: center.x + end, y: center.y, id: 2 },
      ])
      await touch('touchEnd', [])
    }
    await pinch(40, 100)
    const zoomed = (await image.boundingBox())!
    expect(zoomed.width).toBeGreaterThan(original.width * 2)
    await expect(next).toHaveCSS('opacity', '0')
    await expect(viewer.locator('.el-image-viewer__prev')).toHaveCSS(
      'opacity',
      '0'
    )
    await touch('touchStart', [{ ...center, id: 1 }])
    await touch('touchMove', [{ x: center.x + 40, y: center.y + 30, id: 1 }])
    await touch('touchEnd', [])
    const panned = (await image.boundingBox())!
    expect(panned.x - zoomed.x).toBeCloseTo(40, 0)
    await pinch(100, 40)
    const fitted = (await image.boundingBox())!
    expect(fitted.width).toBeCloseTo(original.width, 0)
    await expect(viewer.locator('.el-image-viewer__prev')).toHaveCSS(
      'opacity',
      '1'
    )
    await touch('touchStart', [{ ...center, id: 1 }])
    await touch('touchMove', [{ x: center.x + 50, y: center.y + 50, id: 1 }])
    await touch('touchEnd', [])
    expect((await image.boundingBox())!.x).toBeCloseTo(fitted.x, 0)
    expect((await image.boundingBox())!.y).toBeCloseTo(fitted.y, 0)
    const beforeSwipe = await image.getAttribute('src')
    await touch('touchStart', [{ ...center, id: 1 }])
    await touch('touchMove', [{ x: center.x, y: center.y + 100, id: 1 }])
    await touch('touchEnd', [])
    await expect(image).not.toHaveAttribute('src', beforeSwipe!)
    await client.detach()
  }
  if (!info.project.name.includes('mobile')) {
    await page.mouse.move(
      page.viewportSize()!.width / 2,
      page.viewportSize()!.height / 2
    )
    const previous = viewer.locator('.el-image-viewer__prev')
    await previous.hover()
    await expect(image).toHaveCSS('filter', 'brightness(0.5)')
    await expect(corners).toHaveCSS('opacity', '0')
    await expect(corners).toHaveCSS('animation-name', 'viewer-corner-out')
    await expect
      .poll(() =>
        previous.evaluate(
          (element) => getComputedStyle(element, '::before').opacity
        )
      )
      .toBe('1')
    await viewer.locator('.el-image-viewer__close').hover()
    await expect(image).toHaveCSS('filter', 'brightness(1)')
    await expect(corners).toHaveCSS('opacity', '1')
    expect(
      await corners.evaluate(
        (element) => getComputedStyle(element, '::before').animationName
      )
    ).toBe('viewer-corner-in')
    await expect
      .poll(() =>
        previous.evaluate(
          (element) => getComputedStyle(element, '::before').opacity
        )
      )
      .toBe('0')
    for (const control of [
      previous,
      viewer.locator('.el-image-viewer__close'),
      tools.first(),
    ]) {
      await control.hover()
      await expect(page.locator('.cursor-shape')).toHaveClass(/is-active/)
      expect(
        await page
          .locator('.cursor-position')
          .evaluate(
            (element, viewerZIndex) =>
              Number(getComputedStyle(element).zIndex) > viewerZIndex,
            Number(
              await viewer.evaluate(
                (element) => getComputedStyle(element).zIndex
              )
            )
          )
      ).toBe(true)
    }
    await expect(tools.first()).toHaveCSS(
      'background-color',
      'rgb(226, 52, 86)'
    )
    await expect(tools.first()).toHaveCSS('color', 'rgb(0, 0, 0)')
  }
  await page.mouse.move(10, 10)
  await tools.nth(1).click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(true), 100)
          )
      )
    )
    .toBe(true)
  await expect
    .poll(async () => {
      const imageTransform = await image.evaluate(
        (element) => (element as HTMLElement).style.transform
      )
      return corners.evaluate(
        (element, transform) =>
          (element as HTMLElement).style.transform === transform,
        imageTransform
      )
    })
    .toBe(true)
  await page.screenshot({ path: `.tmp/image-viewer-${info.project.name}.png` })
  await viewer.locator('.el-image-viewer__close').click()
  await expect(viewer).toHaveClass(/is-crt-closing/)
  await expect(viewer.locator('.el-image-viewer__close')).toHaveCSS(
    'animation-name',
    'viewer-mask-out'
  )
  await expect(viewer.locator('.el-image-viewer__canvas')).toHaveCSS(
    'animation-name',
    'anutriumCrtOff'
  )
  await expect(viewer.locator('.el-image-viewer__mask')).toHaveCSS(
    'animation-name',
    'viewer-mask-out'
  )
  await expect(viewer).not.toBeAttached()
})
