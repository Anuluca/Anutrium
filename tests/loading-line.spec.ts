import { expect, test } from '@playwright/test'

test('loading line extends from the center and fades into the initial model horizon', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  // 复用用户开发服务时，其他编辑的热更新不能重置正在采样的入口动画。
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/models/lucario-island.bin?*', async (route) => {
    await gate
    await route.continue()
  })
  await page.addInitScript(() => {
    const probe = {
      full: 0,
      fade: 0,
      entered: 0,
      width: 0,
      offset: Infinity,
    }
    ;(window as any).loadingLineProbe = probe
    document.addEventListener('animationstart', (event) => {
      const animation = event as AnimationEvent
      if (
        (animation.target as Element).matches('.loading-line') &&
        animation.animationName.includes('loading-line-lifecycle')
      )
        probe.fade = performance.now()
    })
    new MutationObserver(() => {
      const line = document.querySelector<HTMLElement>('.loading-line')
      const stage = document.querySelector<HTMLElement>('.temple-stage')
      if (!probe.full && line?.classList.contains('is-fading')) {
        probe.full = performance.now()
        probe.width = line.getBoundingClientRect().width
      }
      if (!probe.entered && stage?.dataset.entrancePhase === 'statue' && line) {
        probe.entered = performance.now()
        probe.offset = Math.abs(
          line.getBoundingClientRect().top -
            stage.getBoundingClientRect().top -
            parseFloat(stage.style.getPropertyValue('--temple-horizon-y'))
        )
      }
    }).observe(document, { subtree: true, childList: true, attributes: true })
  })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const line = page.locator('.loading-line')
    await expect(line).toBeVisible({ timeout: 20000 })
    await expect(line).toHaveText('')
    await expect(line).toHaveCSS('height', '1px')
    await expect(line).toHaveCSS('opacity', '0.5')
    const flow = line.locator('.loading-line__flow')
    expect(
      await flow.evaluate((el) => getComputedStyle(el).animationName)
    ).toContain('loading-line-flow')
    await expect
      .poll(async () => Number(await line.getAttribute('aria-valuenow')))
      .toBeGreaterThan(10)
    const first = await line.boundingBox()
    await page.waitForTimeout(400)
    const second = await line.boundingBox()
    const viewport = page.viewportSize()!
    expect(second!.width).toBeGreaterThanOrEqual(first!.width)
    expect(second!.width).toBeLessThan(viewport.width)
    expect(
      Math.abs(second!.x + second!.width / 2 - viewport.width / 2)
    ).toBeLessThanOrEqual(1)
    await expect(page.locator('.temple-stage')).toHaveCSS('opacity', '0')
    const crystalGap = await page.evaluate(() => {
      const scene = document.querySelector<HTMLElement>(
        '.entry-overlay-container .scene-container'
      )!
      const canvas = scene.querySelector('canvas')!.getBoundingClientRect()
      const halfHeight = parseFloat(
        scene.style.getPropertyValue('--crystal-half-height')
      )
      return Math.abs(
        canvas.top +
          canvas.height / 2 +
          halfHeight -
          document.querySelector('.loading-line')!.getBoundingClientRect().top
      )
    })
    expect(crystalGap).toBeLessThanOrEqual(1)
    const handoffOffset = () =>
      page.evaluate(() => {
        const scene = document.querySelector<HTMLElement>(
          '.entry-overlay-container .scene-container'
        )!
        const canvas = scene.querySelector('canvas')!.getBoundingClientRect()
        const halfHeight = parseFloat(
          scene.style.getPropertyValue('--crystal-half-height')
        )
        const logo = document
          .querySelector('.logo-wrapper2')!
          .getBoundingClientRect()
        const line = document
          .querySelector('.loading-line')!
          .getBoundingClientRect()
        return Math.max(
          Math.abs(logo.height - halfHeight * 2),
          Math.abs(logo.top + logo.height / 2 - canvas.top - canvas.height / 2),
          Math.abs(logo.left + logo.width / 2 - canvas.left - canvas.width / 2),
          Math.abs(logo.bottom - line.top)
        )
      })
    await expect.poll(handoffOffset).toBeLessThanOrEqual(1)
    // 改变窗口高度后，2D Logo 与 3D 晶体仍应同步缩放并保持同一中心。
    await page.setViewportSize({ ...viewport, height: viewport.height + 80 })
    await expect.poll(handoffOffset).toBeLessThanOrEqual(1)
    await page.setViewportSize(viewport)
    await expect.poll(handoffOffset).toBeLessThanOrEqual(1)
    await expect(line.locator('.loading-line__projection')).toHaveCSS(
      'opacity',
      '0'
    )
    await page.screenshot({ path: testInfo.outputPath('loading-line.png') })
    release()
    await expect(line).toHaveClass(/is-fading/, { timeout: 30000 })
    await expect(line).toHaveAttribute('aria-valuenow', '100')
    await expect(page.locator('.logo-wrapper2')).toHaveClass(/show/)
    expect(await handoffOffset()).toBeLessThanOrEqual(1)
    const projection = line.locator('.loading-line__projection')
    const projectionAnimation = await projection.evaluate((el) =>
      el.getAnimations().map((animation) => ({
        name: (animation as CSSAnimation).animationName,
        duration: animation.effect!.getTiming().duration,
        delay: animation.effect!.getTiming().delay,
      }))
    )
    expect(projectionAnimation).toEqual([
      {
        name: expect.stringContaining('loading-line-project'),
        duration: 1000,
        delay: 240,
      },
      {
        name: expect.stringContaining('loading-line-fade'),
        duration: 1200,
        delay: 1240,
      },
    ])
    const projectionBounds = await projection.evaluate((el) => ({
      top: parseFloat(getComputedStyle(el).top),
      height: parseFloat(getComputedStyle(el).height),
      background: getComputedStyle(el).backgroundImage,
    }))
    expect(projectionBounds.top).toBe(1)
    expect(projectionBounds.background).toContain('112, 16, 35')
    expect(
      Math.abs(projectionBounds.height + second!.y + 1 - viewport.height)
    ).toBeLessThanOrEqual(1)
    const animations = await line.evaluate((el) =>
      el.getAnimations().map((animation) => ({
        name: (animation as CSSAnimation).animationName,
        duration: animation.effect!.getTiming().duration,
        delay: animation.effect!.getTiming().delay,
      }))
    )
    expect(animations).toEqual(
      expect.arrayContaining([
        {
          name: expect.stringContaining('loading-line-flash'),
          duration: 240,
          delay: 0,
        },
        {
          name: expect.stringContaining('loading-line-lifecycle'),
          duration: 1200,
          delay: 1240,
        },
      ])
    )
    await expect
      .poll(
        () => page.evaluate(() => (window as any).loadingLineProbe.entered),
        { timeout: 20000 }
      )
      .toBeGreaterThan(0)
    const probe = await page.evaluate(() => (window as any).loadingLineProbe)
    expect(Math.abs(probe.width - viewport.width)).toBeLessThanOrEqual(1)
    expect(probe.offset).toBeLessThanOrEqual(1)
    expect(probe.fade - probe.full).toBeGreaterThanOrEqual(1200)
    expect(probe.fade - probe.full).toBeLessThan(1400)
    expect(Math.abs(probe.entered - probe.fade)).toBeLessThan(100)
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const line = document.querySelector('.loading-line')
            return line && getComputedStyle(line).visibility !== 'hidden'
              ? 1
              : 0
          }),
        { timeout: 15000 }
      )
      .toBe(0)
  } finally {
    release()
  }
})
