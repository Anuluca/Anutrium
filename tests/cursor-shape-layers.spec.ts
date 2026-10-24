import { expect, test } from '@playwright/test'

test('cursor morph keeps layout fixed through hover, interruption, press and loading', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/__cursor-layers', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html style="font-size:30px"><body style="margin:0;background:#151515;min-height:100vh">
        <button style="position:absolute;left:20px;top:20px">hover</button>
        <div id="cursor-fixture"></div>
        <script type="module" src="/tests/fixtures/cursor-layout.ts"></script>
      </body></html>`,
    })
  )
  await page.goto('/__cursor-layers')
  const cursor = page.locator('.cursor-position')
  const shape = cursor.locator('.cursor-shape')
  await expect(cursor).toBeAttached()
  await page.mouse.move(300, 300)
  await expect(cursor).not.toHaveClass(/is-hidden/)
  await page.waitForTimeout(500)

  const session = await page.context().newCDPSession(page)
  await session.send('Performance.enable')
  const layoutCount = async () => {
    const { metrics } = await session.send('Performance.getMetrics')
    return metrics.find((metric) => metric.name === 'LayoutCount')!.value
  }
  const before = await layoutCount()
  const result = await shape.evaluate(async (shape) => {
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))
    const samples: number[][] = []
    const button = document.querySelector('button')!
    const hover = (active: boolean) =>
      (active ? button : document.body).dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true })
      )
    const sample = () => {
      samples.push([shape.clientWidth, shape.clientHeight])
      return shape.querySelector('.cursor-size')!.getBoundingClientRect().width
    }
    const normal = sample()
    hover(true)
    await wait(160)
    const intermediate = sample()
    const circleOpacity = Number(
      getComputedStyle(shape.querySelector('.cursor-body')!).opacity
    )
    const triangleOpacity = Number(
      getComputedStyle(shape.querySelector('.cursor-triangle')!).opacity
    )
    const clip = getComputedStyle(shape.querySelector('.cursor-size')!).clipPath
    hover(false)
    await wait(100)
    sample()
    hover(true)
    await wait(1100)
    // 旋转会改变包围框，使用变换矩阵检查实际尺寸，避免角度干扰。
    const activeScale = new DOMMatrixReadOnly(
      getComputedStyle(shape.querySelector('.cursor-size')!).transform
    ).a
    sample()
    return {
      samples,
      normal,
      intermediate,
      activeScale,
      circleOpacity,
      triangleOpacity,
      clip,
    }
  })
  // Blink 在切换合成层时可能进行一次布局；三次状态切换不应产生逐帧布局。
  expect((await layoutCount()) - before).toBeLessThanOrEqual(3)
  expect(
    result.samples.every(([width, height]) => width === 36 && height === 36)
  ).toBe(true)
  expect(result.normal).toBeCloseTo(24)
  expect(result.intermediate).toBeGreaterThan(24)
  expect(result.activeScale).toBe(1)
  expect(result.clip).toBe('none')
  expect(result.circleOpacity).toBeGreaterThan(0)
  expect(result.triangleOpacity).toBeGreaterThan(0)
  expect(result.circleOpacity + result.triangleOpacity).toBeCloseTo(1, 2)
  await expect(cursor.locator('.cursor-triangle-rotation')).toHaveCSS(
    'animation-name',
    /spin/
  )
  await expect(cursor.locator('.cursor-triangle')).toHaveCSS('opacity', '1')
  await expect(cursor.locator('.cursor-body')).toHaveCSS('opacity', '0')

  const rotation = await cursor.evaluate(async (cursor) => {
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))
    const face = cursor.querySelector('.cursor-triangle-rotation')!
    const animation = face.getAnimations()[0]
    document.body.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true })
    )
    await wait(50)
    const paused = Number(animation.currentTime)
    await wait(100)
    const stillPaused = Number(animation.currentTime)
    document
      .querySelector('button')!
      .dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    await wait(50)
    return {
      paused,
      stillPaused,
      resumed: Number(animation.currentTime),
      sameAnimation: face.getAnimations()[0] === animation,
    }
  })
  expect(rotation.paused).toBeGreaterThan(1000)
  expect(rotation.stillPaused).toBe(rotation.paused)
  expect(rotation.sameAnimation).toBe(true)
  expect(rotation.resumed).toBeGreaterThan(rotation.paused)
  expect(rotation.resumed - rotation.paused).toBeLessThan(150)

  await page.mouse.down()
  await expect(cursor.locator('.cursor-scale')).toHaveCSS(
    'transform',
    /matrix\(1\.3,/
  )
  await page.mouse.up()
  await page.evaluate(async () => {
    const moduleURL = '/src/stores/cursorState.ts'
    const { default: useCursorState } = await import(
      /* @vite-ignore */ moduleURL
    )
    useCursorState().startLoading('layers')
  })
  await expect(cursor.locator('.cursor-triangle')).toHaveCSS('opacity', '0')
  await expect(cursor.locator('.cursor-body')).toHaveCSS('opacity', '1')
  await expect(cursor.locator('.cursor-size')).toHaveCSS(
    'transform',
    /matrix\(0\.666667,/
  )
  await expect(shape).toHaveCSS('animation-name', /cursor-loading-opacity/)
  expect(
    await shape.evaluate((element) => [
      element.clientWidth,
      element.clientHeight,
    ])
  ).toEqual([36, 36])
  await session.detach()
})
