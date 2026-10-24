import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flr-page')).toBeVisible({ timeout: 20_000 })
})

test.describe('desktop cursor', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name.includes('mobile'))
    await expect(page.locator('.cursor-position')).toBeAttached()
    await expect(page.locator('.cursor-position')).not.toHaveClass(/is-loading/)
    await page.mouse.move(100, 100)
    await expect(page.locator('.cursor-position')).not.toHaveClass(/is-hidden/)
  })

  test('ordinary pages hide the cursor after ten idle seconds and show it on movement', async ({
    page,
  }) => {
    test.setTimeout(45000)
    const cursor = page.locator('.cursor-position')
    await page.mouse.move(160, 120)
    await page.waitForTimeout(9200)
    await expect(cursor).not.toHaveClass(/is-hidden/)
    await expect(cursor).toHaveClass(/is-hidden/, { timeout: 2000 })
    await expect(page.locator('html')).toHaveClass(/custom-cursor-enabled/)
    await page.mouse.move(180, 140)
    await expect(cursor).not.toHaveClass(/is-hidden/)
  })

  test('coalesces input bursts into one position write per frame and stops while idle', async ({
    page,
  }) => {
    const result = await page
      .locator('.cursor-position')
      .evaluate(async (cursor) => {
        const delay = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms))
        await delay(500)
        let writes = 0
        let maxBatch = 0
        const observer = new MutationObserver((records) => {
          writes += records.length
          maxBatch = Math.max(maxBatch, records.length)
        })
        observer.observe(cursor, {
          attributes: true,
          attributeFilter: ['style'],
        })
        for (let index = 0; index < 1000; index++) {
          window.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: 200 + index / 2,
              clientY: 400,
            })
          )
        }
        await new Promise<void>((resolve, reject) => {
          const start = performance.now()
          const check = () => {
            const x = new DOMMatrixReadOnly(getComputedStyle(cursor).transform)
              .m41
            if (x === 699.5) resolve()
            else if (performance.now() - start > 3000)
              reject(new Error('Cursor did not settle'))
            else requestAnimationFrame(check)
          }
          requestAnimationFrame(check)
        })
        await Promise.resolve()
        const movingWrites = writes
        await delay(200)
        const idleWrites = writes - movingWrites
        // 重复的原地事件也不应重新启动渲染。
        window.dispatchEvent(
          new PointerEvent('pointermove', { clientX: 699.5, clientY: 400 })
        )
        await delay(100)
        const duplicateWrites = writes - movingWrites
        observer.disconnect()
        const matrix = new DOMMatrixReadOnly(getComputedStyle(cursor).transform)
        return {
          movingWrites,
          idleWrites,
          duplicateWrites,
          maxBatch,
          x: matrix.m41,
          y: matrix.m42,
        }
      })
    expect(result.movingWrites).toBeGreaterThan(0)
    expect(result.movingWrites).toBeLessThan(100)
    expect(result.maxBatch).toBe(1)
    expect(result.idleWrites).toBe(0)
    expect(result.duplicateWrites).toBe(0)
    expect(result.x).toBeCloseTo(699.5)
    expect(result.y).toBeCloseTo(400)
  })

  test('preserves moving scale, interactive rotation, loading and difference blending', async ({
    page,
  }) => {
    const cursor = page.locator('.cursor-position')
    const body = cursor.locator('.cursor-body')
    await expect(cursor).toHaveCSS('mix-blend-mode', 'difference')
    const maxScale = await page.evaluate(async () => {
      let maxScale = 1
      document.body.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true })
      )
      for (let index = 0; index < 25; index++) {
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: 200 + index * 8,
            clientY: 200,
          })
        )
        await new Promise((resolve) => setTimeout(resolve, 20))
        const body = document.querySelector('.cursor-body')!
        maxScale = Math.max(
          maxScale,
          new DOMMatrixReadOnly(getComputedStyle(body).transform).a
        )
      }
      return maxScale
    })
    expect(maxScale).toBeCloseTo(1.2, 2)
    await expect(body).toHaveCSS('transform', 'none')

    await page.locator('button').first().dispatchEvent('pointerover')
    const shape = cursor.locator('.cursor-shape')
    await expect(shape).toHaveClass(/is-active/)
    await expect(shape).not.toHaveClass(/is-moving/)
    await expect(cursor.locator('.cursor-triangle-rotation')).toHaveCSS(
      'animation-name',
      /spin/
    )
    await expect(body).toHaveCSS('transform', 'none')

    await page.evaluate(async () => {
      const moduleURL = '/src/stores/cursorState.ts'
      const { default: useCursorState } = await import(
        /* @vite-ignore */ moduleURL
      )
      useCursorState().startLoading('cursor-audit')
    })
    await expect(cursor).toHaveClass(/is-loading/)
    await expect(shape).toHaveCSS('border-radius', '50%')
    await expect(shape).toHaveCSS('clip-path', 'none')
    await expect(shape).toHaveCSS('animation-name', /cursor-loading-opacity/)
    await expect(body).toHaveCSS('transform', 'none')
    await page.evaluate(async () => {
      const moduleURL = '/src/stores/cursorState.ts'
      const { default: useCursorState } = await import(
        /* @vite-ignore */ moduleURL
      )
      useCursorState().stopLoading('cursor-audit')
    })
    await expect(cursor).not.toHaveClass(/is-loading/)
  })

  test('wheel bursts keep one morph animation without position writes and stop after idle', async ({
    page,
  }) => {
    const cursor = page.locator('.cursor-position')
    const shape = cursor.locator('.cursor-shape')
    const body = cursor.locator('.cursor-body')
    const result = await cursor.evaluate(async (cursor) => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms))
      document.body.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true })
      )
      await delay(500)
      let writes = 0
      const observer = new MutationObserver((records) => {
        writes += records.length
      })
      observer.observe(cursor, { attributes: true, attributeFilter: ['style'] })
      const body = cursor.querySelector('.cursor-body')!
      const wheel = () =>
        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 20 }))
      wheel()
      await delay(30)
      const animation = body.getAnimations()[0]
      let sameAnimation = !!animation
      let maxStretch = 1
      for (let index = 0; index < 8; index++) {
        for (let burst = 0; burst < 100; burst++) wheel()
        await delay(110)
        sameAnimation &&= body.getAnimations()[0] === animation
        maxStretch = Math.max(
          maxStretch,
          new DOMMatrixReadOnly(getComputedStyle(body).transform).a
        )
      }
      observer.disconnect()
      return { writes, sameAnimation, maxStretch }
    })
    expect(result.writes).toBe(0)
    expect(result.sameAnimation).toBe(true)
    expect(result.maxStretch).toBeGreaterThan(1.2)
    await expect(shape).not.toHaveClass(/is-scrolling/)
    await expect(body).toHaveCSS('transform', 'none')

    await page.evaluate(() =>
      window.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 20, ctrlKey: true })
      )
    )
    await expect(shape).not.toHaveClass(/is-scrolling/)
    await page.mouse.wheel(0, 50)
    await expect(shape).toHaveClass(/is-scrolling/)
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(shape).not.toHaveClass(/is-scrolling/)
  })

  test('scroll end eases from the current ellipse back to a circle', async ({
    page,
  }) => {
    const body = page.locator('.cursor-body')
    const result = await page
      .locator('.cursor-position')
      .evaluate(async (cursor) => {
        document.body.dispatchEvent(
          new PointerEvent('pointerover', { bubbles: true })
        )
        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 20 }))
        await new Promise((resolve) => requestAnimationFrame(resolve))
        const body = cursor.querySelector('.cursor-body')!
        const shape = cursor.querySelector('.cursor-shape')!
        const morph = body
          .getAnimations()
          .find((animation) => animation instanceof CSSAnimation)!
        // 固定在最大椭圆，验证结束时保留当前形态，再逐渐恢复。
        morph.pause()
        morph.currentTime = 400
        const stretch = () =>
          new DOMMatrixReadOnly(getComputedStyle(body).transform).a
        const before = stretch()
        await new Promise<void>((resolve, reject) => {
          const started = performance.now()
          const check = () => {
            if (!shape.classList.contains('is-scrolling')) resolve()
            else if (performance.now() - started > 2000)
              reject(new Error('Scroll did not end'))
            else requestAnimationFrame(check)
          }
          requestAnimationFrame(check)
        })
        const start = stretch()
        await new Promise((resolve) => setTimeout(resolve, 80))
        const middle = stretch()
        return { before, start, middle }
      })
    expect(result.before).toBeCloseTo(1.3)
    expect(result.start).toBeGreaterThan(1.2)
    expect(result.middle).toBeGreaterThan(1)
    expect(result.middle).toBeLessThan(result.start)
    await expect(body).toHaveCSS('transform', 'none')
    await expect
      .poll(() => body.evaluate((element) => element.getAnimations().length))
      .toBe(0)
  })

  test('scroll morph respects interactive, loading and reduced motion states', async ({
    page,
  }) => {
    const cursor = page.locator('.cursor-position')
    const shape = cursor.locator('.cursor-shape')
    const body = cursor.locator('.cursor-body')
    await page.locator('button').first().dispatchEvent('pointerover')
    await page.mouse.wheel(0, 20)
    await expect(shape).toHaveClass(/is-active/)
    await expect(shape).not.toHaveClass(/is-scrolling/)
    await expect(body).toHaveCSS('animation-name', 'none')
    await page.evaluate(async () => {
      document.body.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true })
      )
      const moduleURL = '/src/stores/cursorState.ts'
      const { default: useCursorState } = await import(
        /* @vite-ignore */ moduleURL
      )
      useCursorState().startLoading('cursor-scroll-audit')
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 20 }))
    })
    await expect(shape).not.toHaveClass(/is-scrolling/)
    await expect(body).toHaveCSS('animation-name', 'none')
    await page.evaluate(async () => {
      const moduleURL = '/src/stores/cursorState.ts'
      const { default: useCursorState } = await import(
        /* @vite-ignore */ moduleURL
      )
      useCursorState().stopLoading('cursor-scroll-audit')
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.mouse.wheel(0, 20)
    await expect(body).toHaveCSS('animation-name', 'none')
  })

  test('resets pressed state on blur and suspends input and animation while hidden', async ({
    page,
  }) => {
    const cursor = page.locator('.cursor-position')
    await page.mouse.down()
    await expect(cursor.locator('.cursor-scale')).toHaveClass(/is-clicked/)
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(cursor.locator('.cursor-scale')).not.toHaveClass(/is-clicked/)
    await expect(cursor).toHaveClass(/is-hidden/)
    await expect(page.locator('html')).not.toHaveClass(/custom-cursor-enabled/)
    await page.mouse.up()
    await page.evaluate(() => {
      document.body.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true })
      )
      window.dispatchEvent(
        new PointerEvent('pointermove', { clientX: 100, clientY: 100 })
      )
    })
    await expect(cursor).not.toHaveClass(/is-hidden/)

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(cursor).toHaveClass(/is-hidden/)
    await expect(page.locator('html')).not.toHaveClass(/custom-cursor-enabled/)
    await expect(cursor.locator('.cursor-shape')).toHaveCSS(
      'animation-play-state',
      'paused'
    )
    const position = await cursor.getAttribute('style')
    await page.evaluate(() => {
      window.dispatchEvent(
        new PointerEvent('pointermove', { clientX: 600, clientY: 300 })
      )
    })
    await expect(cursor).toHaveAttribute('style', position!)
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'visibilityState')
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(cursor).toHaveClass(/is-hidden/)
    await page.mouse.move(600, 300)
    await expect(cursor).not.toHaveClass(/is-hidden/)
    await expect(page.locator('html')).toHaveClass(/custom-cursor-enabled/)
  })

  test('does not render inside native-cursor regions and snaps on return', async ({
    page,
  }) => {
    const cursor = page.locator('.cursor-position')
    const result = await cursor.evaluate(async (cursor) => {
      const region = document.createElement('div')
      region.className = 'native-cursor'
      document.body.append(region)
      region.dispatchEvent(
        new PointerEvent('pointerover', {
          bubbles: true,
          clientX: 200,
          clientY: 200,
        })
      )
      await Promise.resolve()
      let writes = 0
      const observer = new MutationObserver((records) => {
        writes += records.length
      })
      observer.observe(cursor, { attributes: true, attributeFilter: ['style'] })
      for (let index = 0; index < 100; index++) {
        region.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            clientX: 400 + index,
            clientY: 200,
          })
        )
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
      const hidden = cursor.classList.contains('is-hidden')
      observer.disconnect()
      region.remove()
      document.body.dispatchEvent(
        new PointerEvent('pointerover', {
          bubbles: true,
          clientX: 499,
          clientY: 200,
        })
      )
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const x = new DOMMatrixReadOnly(getComputedStyle(cursor).transform).m41
      return { writes, hidden, x }
    })
    expect(result.writes).toBe(0)
    expect(result.hidden).toBe(true)
    expect(result.x).toBe(499)
    await expect(cursor).not.toHaveClass(/is-hidden/)
  })

  test('has equal convergence after equal elapsed time at 60, 120 and 240Hz', async ({
    page,
  }) => {
    const positions = await page
      .locator('.cursor-position')
      .evaluate(async (cursor) => {
        const nativeRequest = window.requestAnimationFrame
        const nativeCancel = window.cancelAnimationFrame
        const nativeNow = performance.now.bind(performance)
        let time = nativeNow()
        let id = 0
        const pending = new Map<number, FrameRequestCallback>()
        window.requestAnimationFrame = (callback) => {
          pending.set(++id, callback)
          return id
        }
        window.cancelAnimationFrame = (key) => {
          pending.delete(key)
        }
        performance.now = () => time
        const tick = async (elapsed: number) => {
          time += elapsed
          const callbacks = [...pending.values()]
          pending.clear()
          for (const callback of callbacks) callback(time)
          await Promise.resolve()
        }
        const move = (x: number) =>
          window.dispatchEvent(
            new PointerEvent('pointermove', { clientX: x, clientY: 200 })
          )
        const positions: number[] = []
        try {
          for (const hz of [60, 120, 240]) {
            window.dispatchEvent(new Event('blur'))
            move(200)
            await tick(1000 / hz)
            move(600)
            for (let frame = 0; frame < hz / 10; frame++) await tick(1000 / hz)
            positions.push(
              new DOMMatrixReadOnly(getComputedStyle(cursor).transform).m41
            )
          }
        } finally {
          window.cancelAnimationFrame = nativeCancel
          window.requestAnimationFrame = nativeRequest
          performance.now = nativeNow
          for (const callback of pending.values()) nativeRequest(callback)
        }
        return positions
      })
    for (const x of positions) expect(x).toBeCloseTo(600 - 400 * 0.7 ** 6, 3)
  })
})

test('coarse pointers keep the native cursor', async ({ page }, info) => {
  test.skip(!info.project.name.includes('mobile'))
  await expect(page.locator('.cursor-position')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(/custom-cursor-enabled/)
})

test('shared pointer sampling preserves the final sample and cancels timers on blur, hidden and unsubscribe', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const moduleURL = '/src/utils/pointerSamples.ts'
    const { subscribePointerSamples } = await import(
      /* @vite-ignore */ moduleURL
    )
    const fast: number[] = []
    const slow: number[] = []
    let trailingDelivered: () => void
    const trailing = new Promise<void>((resolve) => {
      trailingDelivered = resolve
    })
    const stopFast = subscribePointerSamples((event: PointerEvent) =>
      fast.push(event.clientX)
    )
    const stopSlow = subscribePointerSamples((event: PointerEvent) => {
      slow.push(event.clientX)
      if (event.clientX === 99) trailingDelivered()
    }, 100)
    const move = (x: number) =>
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: x }))
    const delay = () => new Promise((resolve) => setTimeout(resolve, 140))
    try {
      for (let index = 0; index < 100; index++) move(index)
      await trailing
      move(200)
      window.dispatchEvent(new Event('blur'))
      await delay()
      move(300)
      move(301)
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
      await delay()
      Reflect.deleteProperty(document, 'hidden')
      stopFast()
      stopSlow()
      move(400)
      await delay()
      return { fast, slow }
    } finally {
      Reflect.deleteProperty(document, 'hidden')
      stopFast()
      stopSlow()
    }
  })
  expect(result.fast).toHaveLength(103)
  expect(result.slow).toEqual([0, 99, 300])
})
