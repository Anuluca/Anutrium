import { expect, test } from '@playwright/test'

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`headache pose restores normal ISLAND and resumes on return (${reducedMotion})`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /THREE.WebGLProgram|shader error/i.test(message.text())
      )
        errors.push(message.text())
    })
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.route('**/site/home-features', (route) =>
      route.fulfill({
        json: { lucarioHeadache: true, headacheCount: 10, updatedAt: null },
      })
    )
    await page.emulateMedia({ reducedMotion })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    const root = page.locator('.temple-page')
    await expect(stage).toHaveAttribute('aria-busy', 'false', {
      timeout: 45000,
    })
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 20000,
    })
    await expect(stage).not.toHaveAttribute('data-headache-caption')
    await expect(stage).not.toHaveAttribute('data-headache-count')
    await expect(stage).toHaveAttribute('data-headache-mix', '1.000')
    await expect(stage).toHaveAttribute('data-headache-redness', '1.000')
    await expect(stage).toHaveAttribute('data-headache-sticker', 'true')
    await expect(stage).toHaveAttribute(
      'data-headache-sticker-opacity',
      '1.000'
    )
    await expect(stage).toHaveAttribute(
      'data-headache-sticker-color',
      '#a63d32'
    )
    if (reducedMotion === 'reduce') {
      await expect(stage).toHaveAttribute('data-headache-sticker-frame', '0')
    } else {
      const firstFrame = await stage.getAttribute('data-headache-sticker-frame')
      await expect
        .poll(() => stage.getAttribute('data-headache-sticker-frame'))
        .not.toBe(firstFrame)
    }
    await page.screenshot({ path: testInfo.outputPath('headache.png') })

    await stage.locator('canvas').focus()
    await page.keyboard.press('Enter')
    await expect(root).toHaveAttribute('data-selected', 'statue')
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 15000,
    })
    await expect(stage).toHaveAttribute('data-headache-mode', 'normal')
    await expect(stage).toHaveAttribute('data-headache-mix', '0.000')
    await expect(stage).toHaveAttribute('data-headache-redness', '0.000')
    await expect(stage).toHaveAttribute('data-headache-sticker', 'false')
    await expect(stage).toHaveAttribute(
      'data-headache-sticker-opacity',
      '0.000'
    )
    await page.screenshot({ path: testInfo.outputPath('island-normal.png') })

    await page.keyboard.press('Escape')
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 15000,
    })
    await expect(stage).toHaveAttribute('data-headache-mix', '1.000')
    await expect(stage).toHaveAttribute('data-headache-redness', '1.000')
    await expect(stage).toHaveAttribute(
      'data-headache-sticker-opacity',
      '1.000'
    )
    expect(errors).toEqual([])
  })
}

for (const module of ['pokeyard', 'island'] as const) {
  for (const mode of ['headache', 'normal'] as const) {
    test(`${mode} ${module} pillar focus tracks the module and restores its home head behavior`, async ({
      page,
    }) => {
      await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
        socket.close()
      )
      await page.route('**/site/home-features', (route) =>
        route.fulfill({
          json: {
            lucarioHeadache: mode === 'headache',
            headacheCount: 10,
            updatedAt: null,
          },
        })
      )
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      const stage = page.locator('.temple-stage')
      await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
        timeout: 45000,
      })
      const viewport = page.viewportSize()!
      const yaw = async () =>
        Number((await stage.getAttribute('data-head-rotation'))!.split(',')[1])
      await page.mouse.move(viewport.width * 0.85, viewport.height * 0.5)
      await expect.poll(yaw).toBeGreaterThan(0.05)
      await page.mouse.move(viewport.width * 0.15, viewport.height * 0.5)
      await expect.poll(yaw).toBeLessThan(-0.05)
      await page
        .locator(`[data-obelisk="${module}"]`)
        .evaluate((element: HTMLButtonElement) => element.click())
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-selected',
        module
      )
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-settled',
        'true'
      )
      await expect(stage).toHaveAttribute('data-head-aim', module)
      const pitch = async () => {
        const [x, y, z, w] = (await stage.getAttribute('data-head-rotation'))!
          .split(',')
          .map(Number)
        return Math.asin(Math.max(-1, Math.min(1, 2 * (w * x - y * z))))
      }
      await expect.poll(pitch).toBeCloseTo((10 * Math.PI) / 180, 3)
      await expect(stage).toHaveAttribute('data-head-nod-angle', '0.000')
      await page.mouse.move(viewport.width * 0.85, viewport.height * 0.5)
      await expect.poll(yaw).toBeGreaterThan(0.05)
      const focusedYaw = await yaw()
      await page.mouse.move(viewport.width * 0.15, viewport.height * 0.5)
      await expect.poll(yaw).toBeCloseTo(focusedYaw, 3)
      if (mode === 'headache')
        await expect(stage).toHaveAttribute('data-headache-mix', '1.000')

      await page.keyboard.press('Escape')
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-settled',
        'true'
      )
      await expect(stage).toHaveAttribute('data-head-aim', 'pointer')
      await page.mouse.move(viewport.width * 0.85, viewport.height * 0.5)
      await expect.poll(yaw).toBeGreaterThan(0.05)
    })
  }
}
