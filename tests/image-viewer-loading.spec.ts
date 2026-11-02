/* eslint-disable vue/one-component-per-file */
import { expect, type Route, test } from '@playwright/test'

test('image lists reuse looping SVG logos with unique masks and settle on success or failure', async ({
  page,
}) => {
  await page.route('http://localhost:3000/gallery-logo-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0"><div id="fixture" style="width:min(100%,640px)"></div></body>',
    })
  )
  const requests = new Map<string, Route>()
  await page.route(/gallery-logo-(first|second)\.png(?:\?|$)/, (route) => {
    requests.set(new URL(route.request().url()).pathname, route)
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/gallery-logo-fixture')
  await page.evaluate(async () => {
    const { createApp, h } = await import('/node_modules/.vite/deps/vue.js')
    const { default: Gallery } = await import(
      '/src/components/MediaGallery/index.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    createApp({
      render: () =>
        h(
          'div',
          ['first', 'second'].map((name) =>
            h(Gallery, {
              items: [
                { url: `https://assets.anuluca.com/gallery-logo-${name}.png` },
              ],
            })
          )
        ),
    })
      .use(i18n)
      .mount('#fixture')
  })
  const logos = page.locator('.media-gallery__loading .loading-logo')
  await expect(logos).toHaveCount(2)
  await expect(logos.locator('svg')).toHaveCount(2)
  const maskIds = await logos
    .locator('mask')
    .evaluateAll((elements) => elements.map((element) => element.id))
  expect(new Set(maskIds).size).toBe(2)
  const stroke = logos.first().locator('.draw-animation').first()
  await expect(stroke).toHaveCSS('animation-iteration-count', 'infinite')
  const iteration = await stroke.evaluate((element) => {
    const animation = element.getAnimations()[0]
    animation.currentTime = 6500
    return animation.effect!.getComputedTiming().currentIteration
  })
  expect(iteration).toBeGreaterThanOrEqual(2)
  await expect.poll(() => requests.size).toBe(2)
  await requests.get('/gallery-logo-first.png')!.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"/>',
  })
  await expect(logos).toHaveCount(1)
  await requests.get('/gallery-logo-second.png')!.abort()
  await expect(logos).toHaveCount(0)
  await expect(page.locator('.media-gallery__frame.is-loading')).toHaveCount(0)
})

test('preview shows a looping SVG logo on initial load and switches, and clears it on success or failure', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="margin:0;min-height:2400px"></body></html>',
    })
  )
  const requests = new Map<string, Route>()
  await page.route(
    'https://assets.anuluca.com/viewer-loading-*.png',
    (route) => {
      requests.set(new URL(route.request().url()).pathname, route)
    }
  )
  await page.goto('/')
  await page.evaluate(async () => {
    const { createApp, h } = await import('/node_modules/.vite/deps/vue.js')
    const { default: Viewer } = await import(
      '/src/components/SafeImageViewer/index.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    const root = document.createElement('div')
    document.body.append(root)
    createApp({
      render: () =>
        h(Viewer, {
          urlList: ['first', 'second', 'error'].map(
            (name) => `https://assets.anuluca.com/viewer-loading-${name}.png`
          ),
        }),
    })
      .use(i18n)
      .mount(root)
  })
  const viewer = page.locator('.el-image-viewer__wrapper')
  const placeholder = viewer.locator('.safe-image-viewer__placeholder')
  const image = viewer.locator('.el-image-viewer__img')
  await expect(placeholder).toBeVisible()
  await expect(placeholder).toHaveAttribute('aria-busy', 'true')
  await expect(placeholder.locator('.draw-animation').first()).toHaveCSS(
    'animation-iteration-count',
    'infinite'
  )
  await expect(image).toBeHidden()
  const bounds = await placeholder.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width
  )
  const finish = async (name: string) => {
    const path = `/viewer-loading-${name}.png`
    await expect.poll(() => requests.has(path)).toBe(true)
    const route = requests.get(path)!
    requests.delete(path)
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#6898be"/></svg>',
    })
  }
  await finish('first')
  await expect(placeholder).toHaveCount(0)
  await expect(image).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(placeholder).toBeVisible()
  await expect(image).toBeHidden()
  expect(
    await placeholder.evaluate((element) =>
      element
        .getAnimations()
        .some(
          (animation) =>
            animation.effect instanceof KeyframeEffect &&
            animation.effect
              .getKeyframes()
              .some((frame) => 'translate' in frame)
        )
    )
  ).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(placeholder.locator('.draw-animation').first()).toHaveCSS(
    'animation-name',
    'none'
  )
  await finish('second')
  await expect(placeholder).toHaveCount(0)
  await expect(image).toBeVisible()
  expect(
    await image.evaluate((element) =>
      element
        .getAnimations()
        .some(
          (animation) =>
            animation.effect instanceof KeyframeEffect &&
            animation.effect
              .getKeyframes()
              .some((frame) => 'translate' in frame)
        )
    )
  ).toBe(false)
  await page.keyboard.press('ArrowRight')
  await expect(placeholder).toBeVisible()
  await expect.poll(() => requests.has('/viewer-loading-error.png')).toBe(true)
  await requests.get('/viewer-loading-error.png')!.abort()
  await expect(placeholder).toHaveCount(0)
  await expect(image).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await finish('second')
  await expect(placeholder).toHaveCount(0)
  await expect(image).toBeVisible()
})

test('inline preview keeps its background visible and confines the loading SVG logo to the image', async ({
  page,
}) => {
  await page.route('http://localhost:3000/inline-loading-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><div id="fixture"></div>',
    })
  )
  const requests = new Map<string, Route>()
  await page.route(/\/inline-loading-(first|second)\.png$/, (route) => {
    requests.set(new URL(route.request().url()).pathname, route)
  })
  await page.goto('/inline-loading-fixture')
  await page.evaluate(async () => {
    const { createApp, h } = await import('/node_modules/.vite/deps/vue.js')
    const { default: Viewer } = await import(
      '/src/components/SafeImageViewer/index.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    createApp({
      render: () =>
        h(Viewer, {
          inline: true,
          urlList: ['/inline-loading-first.png', '/inline-loading-second.png'],
          titles: ['FIRST', 'SECOND'],
        }),
    })
      .use(i18n)
      .mount('#fixture')
  })
  const preview = page.locator('.inline-image-preview')
  const placeholder = preview.locator('.inline-image-preview__placeholder')
  await expect(placeholder).toBeVisible()
  await expect(placeholder.locator('.draw-animation').first()).toHaveCSS(
    'animation-iteration-count',
    'infinite'
  )
  await expect(preview.locator('.inline-image-preview__status')).toHaveCount(0)
  const geometry = await placeholder.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const stage = element
      .closest('.inline-image-preview__stage')!
      .getBoundingClientRect()
    const figure = element
      .closest('.inline-image-preview__figure')!
      .getBoundingClientRect()
    return {
      width: bounds.width,
      height: bounds.height,
      stageWidth: stage.width,
      figureWidth: figure.width,
    }
  })
  expect(geometry.width).toBeGreaterThan(0)
  expect(geometry.height).toBeGreaterThan(0)
  expect(geometry.width).toBeLessThan(geometry.stageWidth)
  expect(Math.abs(geometry.width - geometry.figureWidth)).toBeLessThanOrEqual(1)
  await expect.poll(() => requests.has('/inline-loading-first.png')).toBe(true)
  await requests.get('/inline-loading-first.png')!.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"/>',
  })
  await expect(placeholder).toHaveCount(0)
  await preview.getByRole('button', { name: '下一张', exact: true }).click()
  await expect(placeholder).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(placeholder.locator('.draw-animation').first()).toHaveCSS(
    'animation-name',
    'none'
  )
  await expect.poll(() => requests.has('/inline-loading-second.png')).toBe(true)
  await requests.get('/inline-loading-second.png')!.abort()
  await expect(placeholder).toHaveCount(0)
  await expect(preview.locator('.inline-image-preview__status')).toBeVisible()
  await expect(preview.locator('.inline-image-preview__status')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)'
  )
})
