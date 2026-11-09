import { expect, test } from '@playwright/test'

test('desktop replica fits the window and scales uniformly when its container changes', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'), '电脑端窗口适配')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ai-playground/arknightxpersona3reload', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await expect(page.locator('.ark-scene.scene-ready')).toBeVisible({
    timeout: 20000,
  })
  const read = () =>
    page.evaluate(() => {
      const frame = document.querySelector<HTMLElement>('.replica-frame')!
      const viewport = document.querySelector<HTMLElement>('.scene-viewport')!
      const scene = document.querySelector<HTMLElement>('.ark-scene')!
      const bounds = frame.getBoundingClientRect()
      const visible = viewport.getBoundingClientRect()
      const content = scene.getBoundingClientRect()
      const credit = document
        .querySelector('.replica-credit')!
        .getBoundingClientRect()
      const ancillaryBounds = [
        '.detail-page-header',
        '.replica-credit',
        '.footer-com',
      ].map((selector) =>
        document.querySelector(selector)!.getBoundingClientRect()
      )
      return {
        footerTop:
          document.querySelector('#page-footer-portal')!.getBoundingClientRect()
            .top - innerHeight,
        ancillaryOverflow: Math.max(
          ...ancillaryBounds.flatMap((rect) => [
            -rect.top,
            -rect.left,
            rect.right - innerWidth,
            rect.bottom - innerHeight,
          ])
        ),
        overflow: Math.max(
          -bounds.top,
          -bounds.left,
          bounds.right - innerWidth,
          bounds.bottom - innerHeight,
          credit.bottom - innerHeight,
          credit.bottom -
            document.querySelector('.footer-com')!.getBoundingClientRect().top,
          visible.left - content.left,
          visible.top - content.top,
          content.right - visible.right,
          content.bottom - visible.bottom
        ),
        ratioError: Math.abs(content.width / content.height - 1600 / 912),
        fillError: Math.min(
          Math.abs(content.width - visible.width),
          Math.abs(content.height - visible.height)
        ),
        width: content.width,
      }
    })
  for (const [width, height] of [
    [1440, 900],
    [1280, 600],
    [1920, 1080],
    [2560, 1440],
    [1000, 700],
  ]) {
    await page.setViewportSize({ width, height })
    await expect
      .poll(async () => (await read()).overflow)
      .toBeLessThanOrEqual(1)
    await expect
      .poll(async () => (await read()).ancillaryOverflow)
      .toBeLessThanOrEqual(1)
    await expect
      .poll(async () => (await read()).footerTop)
      .toBeGreaterThanOrEqual(-1)
    await expect.poll(async () => (await read()).ratioError).toBeLessThan(0.001)
    await expect
      .poll(async () => (await read()).fillError)
      .toBeLessThanOrEqual(1)
  }
  const original = await read()
  await page.locator('.replica-content').evaluate((element: HTMLElement) => {
    element.style.width = '35%'
  })
  await expect
    .poll(async () => (await read()).width)
    .toBeLessThan(original.width * 0.8)
  await expect.poll(async () => (await read()).overflow).toBeLessThanOrEqual(1)
})

test('replica template keeps desktop and mobile geometry stable while leaving', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/ai-playground/arknightxpersona3reload', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await expect(page.locator('.ark-scene.scene-ready')).toBeAttached({
    timeout: 20000,
  })
  await page.evaluate(() => {
    const root = document.querySelector('.replica-experiment-page')!
    const container = document.querySelector('.router-container')!
    const read = () =>
      [root, container].map((element) => {
        const rect = element.getBoundingClientRect()
        return [rect.top, rect.left]
      })
    const probe = { before: read(), frames: [] as number[][][] }
    ;(window as any).replicaLeaveGeometry = probe
    const sample = () => {
      if (!root.isConnected) return
      probe.frames.push(read())
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    void (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/')
  })
  await expect(page.locator('.replica-experiment-page')).toHaveCount(0, {
    timeout: 20000,
  })
  const probe = await page.evaluate(() => (window as any).replicaLeaveGeometry)
  expect(probe.frames.length).toBeGreaterThan(0)
  for (const frame of probe.frames)
    for (let index = 0; index < frame.length; index++)
      for (let axis = 0; axis < 2; axis++)
        expect(
          Math.abs(frame[index][axis] - probe.before[index][axis])
        ).toBeLessThanOrEqual(1)
})
