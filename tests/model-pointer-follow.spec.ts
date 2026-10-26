import { expect, test } from './helpers/sceneDiagnostics'

test('central model eases behind the pointer in two stages and settles without overshoot', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const body = await response.text()
    const marker = 'renderer.domElement.tabIndex = 0'
    expect(body).toContain(marker)
    // 测试直接读取实际插值状态，避免诊断字段的限频影响时间采样。
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        'window.__modelFollowProbe = {headCurrent, headTarget, pointerHeadEase, renderer};' +
          marker
      ),
    })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  const result = await page.evaluate(async () => {
    const probe = (window as any).__modelFollowProbe
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))
    const move = (x: number) =>
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: ((x + 1) * innerWidth) / 2,
          clientY: innerHeight / 2,
          pointerType: 'mouse',
        })
      )
    move(0)
    await wait(3500)
    move(0.8)
    const samples: { time: number; input: number; model: number }[] = []
    const start = performance.now()
    while (performance.now() - start < 3200) {
      await new Promise(requestAnimationFrame)
      samples.push({
        time: performance.now() - start,
        input: probe.pointerHeadEase.x,
        model: probe.headCurrent.x,
      })
    }
    return { samples, target: probe.headTarget.x }
  })
  expect(result.target).toBeCloseTo(0.8)
  // 软件 WebGL 可能跳过多个显示帧，使用首个实际推进的状态验证两级延迟。
  const early = result.samples.find((sample) => sample.model > 0.001)!
  expect(early.input).toBeGreaterThan(early.model)
  expect(early.model).toBeGreaterThan(0)
  expect(early.model).toBeLessThan(early.input * 0.9)
  const later = result.samples.find((sample) => sample.time >= 1000)!
  expect(later.model).toBeGreaterThan(0.64)
  expect(result.samples.at(-1)!.model).toBeCloseTo(0.8, 2)
  for (let index = 1; index < result.samples.length; index++) {
    expect(result.samples[index].model).toBeGreaterThanOrEqual(
      result.samples[index - 1].model
    )
    expect(result.samples[index].model).toBeLessThanOrEqual(0.8)
  }

  const duplicateFrames = await page.evaluate(async () => {
    const probe = (window as any).__modelFollowProbe
    const canvas = document.querySelector('.temple-stage canvas')!
    const repeatSample = () =>
      canvas.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: innerWidth * 0.9,
          clientY: innerHeight / 2,
          pointerType: 'mouse',
        })
      )
    // 先同步真实画布命中与边界缓存，再验证同一位置的重复输入。
    repeatSample()
    let previousFrame = probe.renderer.info.render.frame
    let stableSince = performance.now()
    const deadline = stableSince + 10000
    while (performance.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      const currentFrame = probe.renderer.info.render.frame
      if (currentFrame !== previousFrame) stableSince = performance.now()
      else if (performance.now() - stableSince >= 300) break
      previousFrame = currentFrame
    }
    if (performance.now() >= deadline)
      throw new Error('Model did not become idle before duplicate input')
    const before = probe.renderer.info.render.frame
    for (let index = 0; index < 1000; index++) repeatSample()
    await new Promise((resolve) => setTimeout(resolve, 250))
    return probe.renderer.info.render.frame - before
  })
  console.log(`Model duplicate pointer frames: ${duplicateFrames}`)
  expect(duplicateFrames).toBe(0)

  // 用真实时间验证全身预览；扫描完成后，身体也应经过相同的延迟再追上。
  await stage.locator('canvas').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'statue'
  )
  await expect(stage).toHaveAttribute('data-statue-mouse-follow', 'true', {
    timeout: 20000,
  })
  await page.evaluate(() => {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: innerWidth * 0.1,
        clientY: innerHeight / 2,
        pointerType: 'mouse',
      })
    )
  })
  await expect
    .poll(
      async () => {
        const [, yaw] = (await stage.getAttribute('data-statue-body-rotation'))!
          .split(',')
          .map(Number)
        return yaw
      },
      { timeout: 10000 }
    )
    .toBeCloseTo((-0.8 * 5 * Math.PI) / 180, 2)
  await page.keyboard.press('Escape')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 20000 }
  )
  await expect(stage).toHaveAttribute('data-head-aim', 'pointer')
})
