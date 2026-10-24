import { expect, test } from '@playwright/test'

test('mixed media preview opens videos, switches back to images and releases playback on close', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body style="margin:0;min-height:2400px"></body></html>',
    })
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const videoBytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 90
    const context = canvas.getContext('2d')!
    context.fillStyle = '#e23456'
    context.fillRect(0, 0, 160, 90)
    const stream = canvas.captureStream(10)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (event) => chunks.push(event.data)
    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    })
    recorder.start()
    await new Promise((resolve) => setTimeout(resolve, 1200))
    recorder.stop()
    const blob = await finished
    stream.getTracks().forEach((track) => track.stop())
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  await page.route('**/fixture.mp4', (route) =>
    route.fulfill({
      contentType: 'video/webm',
      body: Buffer.from(videoBytes),
    })
  )
  await page.evaluate(async () => {
    const { createApp, h } = await import('/node_modules/.vite/deps/vue.js')
    const { default: Gallery } = await import(
      '/src/components/MediaGallery/index.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    const root = document.createElement('div')
    document.body.append(root)
    createApp({
      render: () =>
        h(Gallery, {
          items: [
            {
              url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/%3E',
              title: 'Image',
            },
            { url: '/fixture.mp4', title: 'Video' },
          ],
        }),
    })
      .use(i18n)
      .mount(root)
  })
  const width = await page.evaluate(
    () => document.body.getBoundingClientRect().width
  )
  await page.getByRole('button', { name: 'Video', exact: true }).click()
  const viewer = page.locator('.el-image-viewer__wrapper')
  const video = viewer.locator('video')
  await expect(video).toBeVisible()
  await expect(viewer.locator('.el-image-viewer__next')).toBeHidden()
  await expect(video).toHaveAttribute('src', '/fixture.mp4')
  await expect(video).toHaveAttribute('controls', '')
  await expect
    .poll(() => video.evaluate((element) => element.currentTime))
    .toBeGreaterThan(0)
  await expect(viewer.locator('.safe-image-viewer__tool')).toHaveCount(0)
  await expect(viewer.locator('.el-image-viewer__canvas')).toBeHidden()
  await video.focus()
  await video.press('ArrowLeft')
  await expect(video).toBeVisible()
  await page.locator('.el-image-viewer__prev').click()
  await expect(video).toHaveCount(0)
  await expect(viewer.locator('.el-image-viewer__img')).toBeVisible()
  await expect(viewer.locator('.el-image-viewer__prev')).toBeHidden()
  await page.keyboard.press('ArrowLeft')
  await expect(viewer.locator('video')).toHaveCount(0)
  await expect(viewer.locator('.safe-image-viewer__tool')).toHaveCount(2)
  await page.locator('.el-image-viewer__next').click()
  await expect(video).toBeVisible()
  await video.evaluate((element) => {
    element.pause = () => {
      document.body.dataset.previewPaused = 'true'
    }
  })
  await viewer.locator('.el-image-viewer__close').click()
  await expect(viewer).toHaveCount(0)
  await expect(page.locator('body')).toHaveAttribute(
    'data-preview-paused',
    'true'
  )
  expect(
    Math.abs(
      (await page.evaluate(() => document.body.getBoundingClientRect().width)) -
        width
    )
  ).toBeLessThanOrEqual(1)
})
