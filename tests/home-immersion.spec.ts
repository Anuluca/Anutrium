import { expect, test } from './helpers/sceneDiagnostics'

test('immersive clock hover offers HIDE and previews hidden time at half its normal opacity', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const clock = page.locator('.temple-clock')
  await expect(clock).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  const alert = page.locator('.mobile-experience-alert .el-alert__close-btn')
  if (await alert.isVisible()) await alert.click()
  await page.locator('.logo-box .header-home-link').first().click()
  await expect(clock).toHaveClass(/is-immersive/)
  await expect(clock).toHaveCSS('opacity', '0.5')
  // 等缩放完成，保证测试实际命中最终的时间区域。
  await expect
    .poll(async () => {
      const bounds = (await clock.boundingBox())!
      const height = await page.evaluate(() => innerHeight)
      return Math.abs(
        bounds.y +
          bounds.height -
          (height - Math.min(48, Math.max(24, height * 0.04)))
      )
    })
    .toBeLessThanOrEqual(1)
  const fullscreen = await page.evaluate(() => !!document.fullscreenElement)
  const hasHover = !testInfo.project.name.includes('mobile')
  if (hasHover) {
    await clock.hover()
    expect(
      await clock.evaluate(
        (element) => getComputedStyle(element, '::before').content
      )
    ).toBe('"HIDE"')
    await expect(clock.locator('.temple-clock__character').first()).toHaveCSS(
      'opacity',
      '0'
    )
  }
  await clock.click()
  await expect(clock).toHaveCSS('opacity', '0')
  if (hasHover) {
    await page.mouse.move(10, 100)
    await clock.hover()
    await expect(clock).toHaveCSS('opacity', '0.25')
    await expect(clock.locator('.temple-clock__character').first()).toHaveCSS(
      'opacity',
      '1'
    )
    expect(
      await clock.evaluate(
        (element) => getComputedStyle(element, '::before').content
      )
    ).toBe('none')
    await page.mouse.move(10, 100)
    await expect(clock).toHaveCSS('opacity', '0')
  }
  await clock.click()
  await expect(clock).toHaveCSS('opacity', '0.5')
  await expect(clock).toHaveAttribute('aria-pressed', 'true')
  if (hasHover) {
    await expect(clock.locator('.temple-clock__character').first()).toHaveCSS(
      'opacity',
      '1'
    )
    expect(
      await clock.evaluate(
        (element) => getComputedStyle(element, '::before').content
      )
    ).toBe('none')
    await page.mouse.move(10, 100)
    await clock.hover()
    expect(
      await clock.evaluate(
        (element) => getComputedStyle(element, '::before').content
      )
    ).toBe('"HIDE"')
    await expect(clock.locator('.temple-clock__character').first()).toHaveCSS(
      'opacity',
      '0'
    )
  }
  await expect(page.locator('.layout-page')).toHaveClass(/is-home-immersive/)
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(
    fullscreen
  )
  await page.keyboard.press('Escape')
})

test('home immersion fades controls, keeps time, blocks picking and restores on one click', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.clock.setFixedTime(new Date('2026-10-25T12:34:56'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  const alert = page.locator('.mobile-experience-alert .el-alert__close-btn')
  if (await alert.isVisible()) await alert.click()
  const shell = page.locator('.layout-page')
  const footer = page.locator('.footer-com')
  await expect(footer).toHaveCSS('opacity', '1')
  const clock = page.locator('.temple-clock')
  const initialClock = (await clock.boundingBox())!

  // 采集完整淡出/淡入曲线，防止最终状态正确但中间直接跳变。
  await page.evaluate(() => {
    const probe = {
      values: [] as number[],
      visibleValues: [] as number[],
      running: true,
    }
    ;(window as any).immersionFadeProbe = probe
    const sample = () => {
      const style = getComputedStyle(document.querySelector('.footer-com')!)
      const opacity = Number(style.opacity)
      probe.values.push(opacity)
      if (style.visibility === 'visible') probe.visibleValues.push(opacity)
      if (probe.running) requestAnimationFrame(sample)
    }
    sample()
  })
  await page.locator('.logo-box .header-home-link').first().click()
  await expect(shell).toHaveClass(/is-home-immersive/)
  await expect(stage).toHaveAttribute('data-immersive', 'true')
  if (!testInfo.project.name.includes('mobile'))
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(true)
  for (const selector of [
    '.footer-com',
    '.page-footer-home',
    '.temple-backdrop',
    '.temple-clock__tagline',
  ]) {
    await expect(page.locator(selector)).toHaveCSS('opacity', '0')
    await expect(page.locator(selector)).toBeHidden()
  }
  await expect(page.locator('.temple-clock')).toBeVisible()
  await expect(page.locator('.logo-box')).toHaveCSS('opacity', '0')
  await expect(
    page.getByRole('button', { name: '退出沉浸模式' })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(async () => {
      const bounds = (await clock.boundingBox())!
      const viewportHeight = await page.evaluate(() => innerHeight)
      const bottomInset = Math.min(48, Math.max(24, viewportHeight * 0.04))
      return Math.abs(bounds.y + bounds.height - (viewportHeight - bottomInset))
    })
    .toBeLessThanOrEqual(1)
  const immersiveClock = (await clock.boundingBox())!
  await expect(clock).toHaveText('12:34')
  await expect(clock).toHaveCSS('transition-duration', '2s, 0.25s, 0s')
  await page.clock.setFixedTime(new Date('2026-10-25T12:34:57'))
  await expect(clock).toHaveText('12:34')
  await page.clock.setFixedTime(new Date('2026-10-25T12:35:00'))
  await expect(clock).toHaveText('12:35')
  expect(immersiveClock.height).toBeGreaterThan(initialClock.height)
  expect(immersiveClock.width).toBeGreaterThan(initialClock.width)
  const fullscreenBeforeToggle = await page.evaluate(
    () => !!document.fullscreenElement
  )
  await clock.click()
  await expect(clock).toHaveCSS('opacity', '0')
  await expect(clock).toHaveAttribute('aria-pressed', 'false')
  await expect(shell).toHaveClass(/is-home-immersive/)
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(
    fullscreenBeforeToggle
  )
  if (!testInfo.project.name.includes('mobile')) {
    await page.mouse.move(10, 100)
    await clock.hover()
    await expect(clock).toHaveCSS('opacity', '0.25')
    await page.mouse.move(10, 100)
    await expect(clock).toHaveCSS('opacity', '0')
  }
  await clock.click()
  await expect(clock).toHaveCSS('opacity', '0.5')
  await expect(clock).toHaveAttribute('aria-pressed', 'true')
  await expect(shell).toHaveClass(/is-home-immersive/)
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(
    fullscreenBeforeToggle
  )
  if (!testInfo.project.name.includes('mobile')) {
    await expect(page.locator('.home-about-action')).toBeHidden()
    await expect(page.locator('.fullscreen')).toBeHidden()
  }
  const obelisks = page.locator('.temple-obelisk')
  for (const button of await obelisks.all()) await expect(button).toBeDisabled()
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  await expect(stage).toHaveAttribute('data-hovered', 'none')
  await page.waitForTimeout(700)
  const head = await stage.getAttribute('data-head-rotation')
  await page.mouse.move(viewport.width - 50, 100)
  await expect
    .poll(() => stage.getAttribute('data-head-rotation'))
    .not.toBe(head)
  await expect(stage).toHaveAttribute('data-hovered', 'none')
  if (!testInfo.project.name.includes('mobile')) {
    const cursor = page.locator('.cursor-position')
    await expect(cursor).not.toHaveClass(/is-hidden/)
    await expect(cursor).toHaveClass(/is-hidden/, { timeout: 1800 })
    await expect(stage).toHaveAttribute(
      'data-statue-head-pointer',
      '0.00000,0.00000'
    )
    await expect(page.locator('html')).toHaveClass(/custom-cursor-enabled/)
    await page.mouse.move(viewport.width - 70, 120)
    await expect(cursor).not.toHaveClass(/is-hidden/)
    await expect(stage).not.toHaveAttribute(
      'data-statue-head-pointer',
      '0.00000,0.00000'
    )
  }
  // 静止且光标隐藏时也持续呼吸，不能因场景按需渲染而停在某个亮度。
  await expect
    .poll(
      async () => Number(await stage.getAttribute('data-statue-holy-light')),
      {
        timeout: 9000,
      }
    )
    .toBeLessThan(1.6 * 0.25)
  await expect
    .poll(
      async () => Number(await stage.getAttribute('data-statue-holy-light')),
      {
        timeout: 9000,
      }
    )
    .toBeGreaterThan(1.6 * 0.95)
  await page.screenshot({ path: testInfo.outputPath('immersive.png') })

  // 恢复点击落在模型画布上也不能顺便聚焦模型。
  await page.mouse.click(10, 100)
  await expect(shell).not.toHaveClass(/is-home-immersive/)
  await expect(stage).toHaveAttribute('data-immersive', 'false')
  await expect(stage).toHaveAttribute('data-statue-holy-light', '1.000')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  await expect(footer).toHaveCSS('opacity', '1')
  await expect(page.locator('.temple-backdrop')).toBeVisible()
  await expect(page.locator('.logo-box')).toHaveCSS('opacity', '1')
  await expect(page.locator('.temple-clock__tagline')).toBeVisible()
  await expect(clock).not.toHaveClass(/is-immersive/)
  await expect(clock).toHaveText('12:35:00')
  await expect
    .poll(async () =>
      Math.abs((await clock.boundingBox())!.height - initialClock.height)
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false)
  const samples = await page.evaluate(() => {
    const probe = (window as any).immersionFadeProbe
    probe.running = false
    return {
      values: probe.values as number[],
      visibleValues: probe.visibleValues as number[],
    }
  })
  const hidden = samples.values.findIndex((value) => value === 0)
  expect(
    samples.values.slice(0, hidden).some((value) => value > 0 && value < 1)
  ).toBe(true)
  expect(
    samples.values.slice(hidden).some((value) => value > 0 && value < 1)
  ).toBe(true)
  expect(samples.visibleValues.some((value) => value > 0 && value < 1)).toBe(
    true
  )
  await expect(
    page.locator('.temple-obelisk[data-obelisk="archive"]')
  ).toBeEnabled()

  // 原生退出全屏和 API 被拒绝时都能恢复，避免控件一直隐藏。
  await page.locator('.logo-box .header-home-link').first().click()
  await expect(shell).toHaveClass(/is-home-immersive/)
  if (!testInfo.project.name.includes('mobile')) {
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(true)
    await page.evaluate(() => document.exitFullscreen())
  } else {
    await page.keyboard.press('Escape')
  }
  await expect(shell).not.toHaveClass(/is-home-immersive/)
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () =>
      Promise.reject(new DOMException('Fullscreen denied', 'NotAllowedError'))
  })
  await page.locator('.logo-box .header-home-link').first().click()
  await expect(shell).toHaveClass(/is-home-immersive/)
  await page.keyboard.press('Escape')
  await expect(shell).not.toHaveClass(/is-home-immersive/)
  await expect(footer).toHaveCSS('opacity', '1')
  expect(errors).toEqual([])
})
