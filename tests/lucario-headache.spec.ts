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
        json: { lucarioHeadache: true, updatedAt: null },
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

for (const mode of ['headache', 'normal'] as const) {
  test(`${mode} pillar focus preserves its head tracking behavior`, async ({
    page,
  }) => {
    await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
      socket.close()
    )
    await page.route('**/site/home-features', (route) =>
      route.fulfill({
        json: { lucarioHeadache: mode === 'headache', updatedAt: null },
      })
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const stage = page.locator('.temple-stage')
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
      timeout: 45000,
    })
    await page
      .locator('[data-obelisk="pokeyard"]')
      .evaluate((element: HTMLButtonElement) => element.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      'pokeyard'
    )
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    await expect(stage).toHaveAttribute(
      'data-head-aim',
      mode === 'headache' ? 'pointer' : 'pokeyard'
    )
    const viewport = page.viewportSize()!
    const yaw = async () =>
      Number((await stage.getAttribute('data-head-rotation'))!.split(',')[1])
    await page.mouse.move(viewport.width * 0.85, viewport.height * 0.5)
    if (mode === 'headache') await expect.poll(yaw).toBeLessThan(-0.05)
    else await expect.poll(yaw).toBeGreaterThan(0.05)
    await page.mouse.move(viewport.width * 0.15, viewport.height * 0.5)
    await expect.poll(yaw).toBeGreaterThan(0.05)
  })
}
