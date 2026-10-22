import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://use.typekit.net/**', (route) => route.abort())
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.passion-section')).toBeVisible({ timeout: 25000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 25000,
  })
})

test('Passion keeps the cursor visible while loading and restores the crosshair on first movement', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  const section = page.locator('.passion-section')
  const cursor = page.locator('.cursor-position')
  const bounds = (await section.boundingBox())!
  const point = { x: bounds.x + 80, y: bounds.y + 90 }
  await page.evaluate(async () => {
    const moduleURL = '/src/stores/cursorState.ts'
    const { default: useCursorState } = await import(
      /* @vite-ignore */ moduleURL
    )
    useCursorState().startLoading('passion-test')
  })
  try {
    await expect(cursor).toHaveClass(/is-loading/)
    await page.mouse.move(point.x, point.y)
    await expect(section).toHaveClass(/is-crosshair-active/)
    await expect(cursor).not.toHaveClass(/is-hidden/)
    await expect(cursor).toHaveCSS('opacity', '1')

    // 模拟加载挂载时漏掉进入事件，首次移动必须在当前帧定位并显示。
    const state = await section.evaluate((el, point) => {
      el.dispatchEvent(new PointerEvent('pointerleave'))
      const hidden = getComputedStyle(
        el.querySelector('.passion-crosshair')!
      ).opacity
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerType: 'mouse',
          clientX: point.x,
          clientY: point.y,
          bubbles: true,
        })
      )
      const vertical = el.querySelector('.passion-crosshair__vertical')!
      const horizontal = el.querySelector('.passion-crosshair__horizontal')!
      const bounds = el.getBoundingClientRect()
      return {
        hidden,
        visible: getComputedStyle(el.querySelector('.passion-crosshair')!)
          .opacity,
        x:
          new DOMMatrixReadOnly(getComputedStyle(vertical).transform).m41 +
          bounds.left +
          0.5,
        y:
          new DOMMatrixReadOnly(getComputedStyle(horizontal).transform).m42 +
          bounds.top +
          0.5,
      }
    }, point)
    expect(state.hidden).toBe('0')
    expect(state.visible).toBe('1')
    expect(Math.abs(state.x - point.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(state.y - point.y)).toBeLessThanOrEqual(1)
  } finally {
    await page.evaluate(async () => {
      const moduleURL = '/src/stores/cursorState.ts'
      const { default: useCursorState } = await import(
        /* @vite-ignore */ moduleURL
      )
      useCursorState().stopLoading('passion-test')
    })
  }

  await page.mouse.move(2, 2)
  await expect(section).not.toHaveClass(/is-crosshair-active/)
  await expect(cursor).not.toHaveClass(/is-hidden/)
  await page.mouse.move(point.x, point.y)
  await expect(section).toHaveClass(/is-crosshair-active/)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(section).not.toHaveClass(/is-crosshair-active/)
})

test('touch input does not leave a crosshair behind', async ({
  page,
}, info) => {
  test.skip(!info.project.name.includes('mobile'))
  const section = page.locator('.passion-section')
  await section.dispatchEvent('pointerenter', {
    pointerType: 'touch',
    clientX: 100,
    clientY: 200,
  })
  await section.dispatchEvent('pointermove', {
    pointerType: 'touch',
    clientX: 110,
    clientY: 210,
  })
  await expect(section).not.toHaveClass(/is-crosshair-active/)
  await expect(page.locator('.passion-crosshair')).toHaveCSS('opacity', '0')
})
