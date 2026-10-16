import { expect, type Route, test } from '@playwright/test'

test('preview shows a shimmer on initial load and switches, and clears it on success or failure', async ({
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
  await expect(placeholder).toHaveCSS(
    'animation-name',
    'viewer-placeholder-shimmer'
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
  await viewer.locator('.el-image-viewer__next').click()
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
  await expect(placeholder).toHaveCSS('animation-name', 'none')
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
  await viewer.locator('.el-image-viewer__next').click()
  await expect(placeholder).toBeVisible()
  await expect.poll(() => requests.has('/viewer-loading-error.png')).toBe(true)
  await requests.get('/viewer-loading-error.png')!.abort()
  await expect(placeholder).toHaveCount(0)
  await expect(image).toBeVisible()
  await viewer.locator('.el-image-viewer__prev').click()
  await finish('second')
  await expect(placeholder).toHaveCount(0)
  await expect(image).toBeVisible()
})
