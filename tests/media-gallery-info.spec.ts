import { expect, test } from '@playwright/test'

test('information opt-in stays separate from fullscreen metadata and follows image switches', async ({
  page,
  isMobile,
}) => {
  await page.route('http://localhost:3000/gallery-info-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><div id="fixture"></div>',
    })
  )
  await page.route('**/gallery-info-*.svg*', (route) => {
    const portrait = route.request().url().includes('portrait')
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${
        portrait ? 200 : 900
      }" height="600"><rect width="100%" height="100%" fill="#849da5"/></svg>`,
    })
  })
  await page.goto('/gallery-info-fixture')
  await page.evaluate(async () => {
    const { createApp, h, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Gallery } = await import(
      '/src/components/MediaGallery/index.vue'
    )
    const { default: Info } = await import(
      '/src/components/MediaPhotoInfo/index.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    await import('/node_modules/reset-css/reset.css')
    await import('/src/assets/style/global.less')
    const showInfo = ref(false)
    const items = [
      {
        url: '/gallery-info-landscape.svg',
        device: '训练家卡',
        time: '2026-10-23',
        location: '南昌',
      },
      { url: '/gallery-info-empty.svg' },
      {
        url: '/gallery-info-portrait.svg',
        device: '播放列表封面',
        time: '2026-10-22',
        location: '南昌',
      },
    ]
    createApp({
      render: () =>
        h(
          Gallery,
          { items, showInfo: showInfo.value },
          {
            info: ({ item }: any) => h(Info, { item }),
          }
        ),
    })
      .use(i18n)
      .mount('#fixture')
    ;(window as any).galleryInfoFixture = { showInfo }
  })
  const gallery = page.locator('.media-gallery')
  await expect(gallery.locator('.media-gallery__info')).toHaveCount(0)
  await page.evaluate(() => {
    ;(window as any).galleryInfoFixture.showInfo.value = true
  })
  await expect(gallery.locator('.media-gallery__info')).toHaveCount(3)
  await page.evaluate(() => {
    ;(window as any).galleryInfoFixture.showInfo.value = false
  })
  await expect(gallery.locator('.media-gallery__info')).toHaveCount(0)
  await gallery.locator('.media-gallery__open').first().click()
  const viewer = page.locator('.el-image-viewer__wrapper')
  const info = viewer.locator('.safe-image-viewer__info')
  const bar = viewer.locator('.el-image-viewer__actions')
  await expect(info).toContainText('训练家卡')
  await expect(bar).toHaveCSS('animation-name', 'viewer-mask-in')
  const styles = await bar.evaluate((element) => {
    const info = element.querySelector('.safe-image-viewer__info')!
    const tools = element.querySelector('.safe-image-viewer__tools')!
    const divider = info
      .querySelector('.photo-info__divider')!
      .getBoundingClientRect()
    const time = info
      .querySelector('.photo-info__time')!
      .getBoundingClientRect()
    const location = info
      .querySelector('.photo-info__location')!
      .getBoundingClientRect()
    const device = info
      .querySelector('.photo-info__device')!
      .getBoundingClientRect()
    const meta = info
      .querySelector('.photo-info__meta')!
      .getBoundingClientRect()
    return {
      contentLeftOffset: device.left - meta.left,
      contentVerticalGap: meta.top - device.bottom,
      gap:
        tools.getBoundingClientRect().left - info.getBoundingClientRect().right,
      left: divider.left - time.right,
      right: location.left - divider.right,
      infoBackground: getComputedStyle(info).backgroundColor,
      toolsBackground: getComputedStyle(tools).backgroundColor,
      background: getComputedStyle(element).backgroundColor,
    }
  })
  if (isMobile) {
    expect(Math.abs(styles.contentLeftOffset)).toBeLessThanOrEqual(1)
    expect(styles.contentVerticalGap).toBeGreaterThanOrEqual(0)
  } else {
    expect(styles.contentLeftOffset).toBeLessThan(0)
    expect(styles.contentVerticalGap).toBeLessThan(0)
  }
  expect(styles.gap).toBe(8)
  expect(Math.abs(styles.left - styles.right)).toBeLessThanOrEqual(1)
  expect(styles.infoBackground).toBe('rgba(16, 14, 17, 0.86)')
  expect(styles.toolsBackground).toBe('rgba(11, 8, 12, 0.84)')
  expect(styles.background).toBe('rgba(0, 0, 0, 0)')
  await page.keyboard.press('ArrowRight')
  await expect(info).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(info).toContainText('播放列表封面')
  await expect(info).toContainText('2026-10-22')
  await expect
    .poll(() =>
      viewer
        .locator('.el-image-viewer__img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBe(200)
  await expect
    .poll(() =>
      bar.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const corners = document
          .querySelector(
            '.el-image-viewer__wrapper .safe-image-viewer__corners'
          )!
          .getBoundingClientRect()
        return Math.abs(
          bounds.width - (innerWidth <= 768 ? innerWidth : corners.width)
        )
      })
    )
    .toBeLessThanOrEqual(1)
  await page.setViewportSize({ width: 320, height: 740 })
  await expect
    .poll(() =>
      bar.evaluate((element) => element.getBoundingClientRect().width)
    )
    .toBe(320)
  await expect(info.locator('.photo-info__inner')).toHaveCSS(
    'font-size',
    '13px'
  )
  await expect(info.locator('.photo-info__inner')).toHaveCSS(
    'padding-left',
    '18px'
  )
  await expect(viewer.locator('.safe-image-viewer__corners')).toBeHidden()
  const mobileMetadata = await info.evaluate((element) => {
    const divider = element
      .querySelector('.photo-info__divider')!
      .getBoundingClientRect()
    const time = element
      .querySelector('.photo-info__time')!
      .getBoundingClientRect()
    const location = element
      .querySelector('.photo-info__location')!
      .getBoundingClientRect()
    const root = element.getBoundingClientRect()
    return {
      left: divider.left - time.right,
      right: location.left - divider.right,
      overflow: location.right - root.right,
    }
  })
  expect(
    Math.abs(mobileMetadata.left - mobileMetadata.right)
  ).toBeLessThanOrEqual(1)
  expect(mobileMetadata.overflow).toBeLessThanOrEqual(1)
  const geometry = await bar.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const children = Array.from(
      element.querySelector('.el-image-viewer__actions__inner')!.children
    )
      .filter((child) => getComputedStyle(child).display !== 'none')
      .map((child) => child.getBoundingClientRect())
    return children.every(
      (child) =>
        child.width > 0 &&
        child.left >= bounds.left - 1 &&
        child.right <= bounds.right + 1
    )
  })
  expect(geometry).toBe(true)
  await page.screenshot({ path: '.tmp/gallery-info-mobile.png' })
  await page.keyboard.press('Escape')
  await expect(viewer).toHaveClass(/is-crt-closing/)
  await expect(bar).toHaveCSS('animation-name', 'viewer-mask-out')
  await expect(viewer).toHaveCount(0)
})
