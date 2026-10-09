import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

test('personal bay blocks page scrolling and restores it after leaving', async ({
  page,
}, testInfo) => {
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.lucario-page')
  await expect(root).toBeVisible({ timeout: 20000 })
  await expect(root).not.toHaveClass(/route-enter-active/)
  const readPosition = () =>
    root.evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      left: element.getBoundingClientRect().left,
      scrollTop: document.body.scrollTop,
      documentTop: document.documentElement.scrollTop,
    }))
  const initial = await readPosition()
  await page.mouse.move(200, 300)
  await page.mouse.wheel(0, 600)
  await page.keyboard.press('PageDown')
  await page.keyboard.press('End')
  if (testInfo.project.name.includes('mobile')) {
    const session = await page.context().newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 200, y: 600 }],
    })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 200, y: 200 }],
    })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await session.detach()
  }
  await page.waitForTimeout(350)
  const after = await readPosition()
  for (const key of Object.keys(initial) as Array<keyof typeof initial>) {
    expect(Math.abs(after[key] - initial[key]), key).toBeLessThanOrEqual(1)
  }

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await page.locator('.mobile-menu-items a[href="/craft"]').click()
  } else {
    await page.locator('.menu-box a[href="/craft"]').click()
  }
  await expect(root).toHaveCount(0)
  await expect(page.locator('.craft-page')).toBeVisible()
  // 离场及菜单关闭后，目标页应恢复正常滚动。
  await expect
    .poll(async () => {
      await page.locator('.craft-page').evaluate(() => {
        document.body.scrollTop = 100
      })
      await page.waitForTimeout(100)
      return page.evaluate(() => document.body.scrollTop)
    })
    .toBeGreaterThan(1)
})

test('mirrored head center has continuous symmetric normals', async () => {
  const metadata = JSON.parse(
    await readFile(resolve('public/models/lucario-island.json'), 'utf8')
  )
  const bytes = await readFile(resolve('public/models/lucario-island.bin'))
  const { positions, normals, weights } = metadata.attributes
  let chinSamples = 0
  for (let index = 0; index < positions.count / 3; index += 1) {
    const x = bytes.readFloatLE(positions.offset + index * 12)
    const y = bytes.readFloatLE(positions.offset + index * 12 + 4)
    const weight = bytes.readFloatLE(weights.offset + index * 4)
    if (weight <= 0.9 || Math.abs(x - metadata.center[0]) >= 0.0002) continue
    const normal = [0, 1, 2].map((axis) =>
      bytes.readFloatLE(normals.offset + index * 12 + axis * 4)
    )
    expect(Math.abs(normal[0])).toBeLessThan(0.000001)
    expect(Math.hypot(...normal)).toBeCloseTo(1, 5)
    if (y < metadata.headPivot[1] + 0.15) chinSamples += 1
  }
  expect(chinSamples).toBeGreaterThan(0)
})

test('baked neck reduction adds no folded faces or open seams', async () => {
  const [json, bytes] = await Promise.all([
    readFile(resolve('public/models/lucario-island.json'), 'utf8'),
    readFile(resolve('public/models/lucario-island.bin')),
  ])
  const metadata = JSON.parse(json)
  const positions = metadata.attributes.positions
  const indices = metadata.attributes.indices
  const points = Array.from({ length: positions.count / 3 }, (_, index) =>
    [0, 1, 2].map((axis) =>
      bytes.readFloatLE(positions.offset + (index * 3 + axis) * 4)
    )
  )
  expect(points.flat().every(Number.isFinite)).toBe(true)
  const keys = points.map((point) =>
    point.map((value) => value.toFixed(5)).join(',')
  )
  const faces = new Map<string, number>()
  const edges = new Map<string, number>()
  for (let offset = 0; offset < indices.count; offset += 3) {
    const face = [0, 1, 2].map(
      (item) => keys[bytes.readUInt16LE(indices.offset + (offset + item) * 2)]
    )
    expect(new Set(face).size).toBe(3)
    const id = [...face].sort().join('|')
    faces.set(id, (faces.get(id) ?? 0) + 1)
    for (let edge = 0; edge < 3; edge += 1) {
      const id = [face[edge], face[(edge + 1) % 3]].sort().join('|')
      edges.set(id, (edges.get(id) ?? 0) + 1)
    }
  }
  // 原网格已有少量重合面和开放边；本次颈部重排不得增加它们。
  expect(
    [...faces.values()].reduce((sum, count) => sum + count - 1, 0)
  ).toBeLessThanOrEqual(2)
  expect(
    [...edges.values()].filter((count) => count > 2).length
  ).toBeLessThanOrEqual(4)
  expect(
    [...edges.values()].filter((count) => count === 1).length
  ).toBeLessThanOrEqual(289)
  expect(metadata.stats.neckFacesAfter).toBe(70)
})

test('island canvas fills its stage after navigation from another page', async ({
  page,
}, testInfo) => {
  await page.goto('/craft', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 15000,
  })
  await expect(page.locator('.craft-page')).toBeVisible()
  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await expect(page.locator('.mobile-menu-panel')).toHaveClass(/\bactive\b/)
  }
  await page
    .locator(
      testInfo.project.name.includes('mobile')
        ? '.mobile-menu-items a[href="/island"]'
        : '.menu-box a[href="/island"]'
    )
    .click()
  const root = page.locator('.lucario-page')
  await expect(root).toBeVisible({ timeout: 20000 })
  // 新上下文会重新预热 GPU 程序；先等待场景就绪，再检查入场后的几何。
  await expect(root.locator('.lucario-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 20000 }
  )
  await expect(root).not.toHaveClass(/route-enter-active/)
  await expect(page.locator('.router-container')).toHaveClass(
    /\bpage-layout--main\b/
  )
  await expect(page.locator('.el-menu-layout-all')).not.toHaveClass(
    /\bcontent-aligned\b/
  )
  await root.locator('canvas').evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished)
    )
  })
  const geometry = await root.locator('.lucario-stage').evaluate((stage) => {
    const canvas = stage.querySelector('canvas')!
    const a = stage.getBoundingClientRect()
    const b = canvas.getBoundingClientRect()
    const bleed =
      parseFloat(getComputedStyle(stage).getPropertyValue('--canvas-bleed')) ||
      0
    return {
      width: a.width - b.width,
      height: a.height + bleed * 2 - b.height,
      left: a.left - b.left,
      top: a.top - bleed - b.top,
    }
  })
  for (const [field, delta] of Object.entries(geometry))
    expect(
      Math.abs(delta),
      `${field}: ${JSON.stringify(geometry)}`
    ).toBeLessThanOrEqual(1)
  const clipping = await root.evaluate((element) => ({
    overflow: getComputedStyle(element).overflow,
    bottom: element.querySelector('canvas')!.getBoundingClientRect().bottom,
    viewport: innerHeight,
  }))
  if (testInfo.project.name.includes('mobile')) {
    expect(clipping.overflow).toBe('clip')
    expect(clipping.bottom).toBeGreaterThan(clipping.viewport)
  } else {
    expect(clipping.overflow).toBe('hidden')
    expect(Math.abs(clipping.bottom - clipping.viewport)).toBeLessThanOrEqual(1)
  }
})

test('removed experimental routes lead to the not-found page', async ({
  page,
}) => {
  for (const path of ['/test2', '/test3']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/404$/)
    await expect(page.locator('.not-found-page')).toBeVisible()
  }
})

test('island simplifies its model and follows the pointer with its head, then leaves without shifting', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 15000,
  })
  const root = page.locator('.lucario-page')
  await expect(root).toBeVisible({ timeout: 20000 })
  await expect(root).not.toHaveClass(/route-enter-active/)
  await expect(root.locator('.lucario-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 15000 }
  )
  await expect(root.getByRole('alert')).toHaveCount(0)
  const originalFaces = Number(
    await root.locator('.lucario-stage').getAttribute('data-original-faces')
  )
  const simplifiedFaces = Number(
    await root.locator('.lucario-stage').getAttribute('data-simplified-faces')
  )
  expect(simplifiedFaces).toBeGreaterThan(0)
  expect(simplifiedFaces).toBeLessThan(originalFaces)
  const previousFaces = Number(
    await root.locator('.lucario-stage').getAttribute('data-previous-faces')
  )
  expect(simplifiedFaces).toBeLessThan(previousFaces)
  await expect(root.locator('.lucario-stage')).toHaveAttribute(
    'data-face-surface-preserved',
    'true'
  )
  await expect(root.locator('.lucario-stage')).toHaveAttribute(
    'data-contour-preserved',
    'true'
  )
  const shapeError = Number(
    await root
      .locator('.lucario-stage')
      .getAttribute('data-simplification-error')
  )
  expect(shapeError).toBeLessThanOrEqual(0.004)
  const neck = await root.locator('.lucario-stage').evaluate((stage) => {
    const data = (stage as HTMLElement).dataset
    return {
      before: Number(data.neckFacesBefore),
      after: Number(data.neckFacesAfter),
      error: Number(data.neckError),
      preserved: data.neckContourPreserved,
    }
  })
  expect(neck.after).toBeGreaterThan(0)
  expect(neck.after).toBeLessThan(neck.before)
  expect(neck.after).toBe(70)
  expect(neck.error).toBeLessThanOrEqual(0.012)
  expect(neck.preserved).toBe('true')
  const head = await root.locator('.lucario-stage').evaluate((stage) => {
    const data = (stage as HTMLElement).dataset
    return {
      before: Number(data.headFacesBefore),
      after: Number(data.headFacesAfter),
      error: Number(data.headError),
      preserved: data.headContourPreserved,
    }
  })
  expect(head.before).toBeGreaterThan(0)
  expect(head.after).toBeLessThan(564)
  expect(head.after / head.before).toBeGreaterThanOrEqual(0.3)
  expect(head.after / head.before).toBeLessThanOrEqual(0.4)
  expect(head.error).toBeLessThanOrEqual(0.008)
  expect(head.preserved).toBe('true')
  const canvas = root.getByRole('img', {
    name: '头部跟随指针的路卡利欧三维模型',
  })
  await expect(canvas).toBeVisible()
  await expect(root.locator('.lucario-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 15000 }
  )
  await expect(root.locator('.lucario-scan-line')).toHaveCount(0)
  await canvas.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished)
    )
  })
  // 隔离网站背景动画，验证指针驱动的头部变化。
  await page.addStyleTag({ content: '.lucario-stage { background: #050105; }' })
  await page.waitForTimeout(1000)
  const second = await canvas.screenshot()
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width - 10, viewport.height / 2)
  await page.waitForTimeout(900)
  const followed = await canvas.screenshot()
  expect(second.equals(followed)).toBe(false)
  await page.screenshot({
    path: `test-results/island-lucario-${testInfo.project.name}.png`,
  })

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await expect(page.locator('.mobile-menu-panel')).toHaveClass(/\bactive\b/)
  }
  const link = page.locator(
    testInfo.project.name.includes('mobile')
      ? '.mobile-menu-items a[href="/craft"]'
      : '.menu-box a[href="/craft"]'
  )
  await page.evaluate(() => {
    const state = { done: false, samples: [] as number[][] }
    ;(
      window as typeof window & { lucarioDeparture?: typeof state }
    ).lucarioDeparture = state
    const sample = () => {
      const root = document.querySelector('.lucario-page')
      const container = document.querySelector('.router-container')
      if (!root || !container) {
        state.done = true
        return
      }
      const a = root.getBoundingClientRect()
      const b = container.getBoundingClientRect()
      state.samples.push([a.left, a.top, b.left, b.top])
      requestAnimationFrame(sample)
    }
    sample()
  })
  await link.click()
  await expect(page.locator('.craft-page')).toBeVisible()
  await expect(root).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { lucarioDeparture?: { done: boolean } })
            .lucarioDeparture?.done
      )
    )
    .toBe(true)
  const samples = await page.evaluate(
    () =>
      (window as typeof window & { lucarioDeparture?: { samples: number[][] } })
        .lucarioDeparture!.samples
  )
  expect(samples.length).toBeGreaterThan(1)
  for (const sample of samples)
    sample.forEach((coordinate, index) =>
      expect(Math.abs(coordinate - samples[0][index])).toBeLessThanOrEqual(1)
    )
  expect(errors).toEqual([])
})

test('loading stays silent and the model shrinks before three quick glitch flashes', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.includes('mobile'),
    '桌面改为连续三维神殿场景，原有入场动画仅保留在手机端'
  )
  let release!: () => void
  const loadingGate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/models/lucario-island.bin', async (route) => {
    await loadingGate
    await route.continue()
  })
  try {
    await page.goto('/island', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.lucario-stage')).toBeVisible()
    await expect(page.locator('.lucario-scan-line')).toHaveCount(0)
    await expect(page.getByText('模型加载中', { exact: true })).toHaveCount(0)
    await expect(page.locator('.lucario-page [role="status"]')).toHaveCount(0)
    // 记录动画对象，确保快速闪烁结束后仍可验证完整的次数和关键帧。
    await page.evaluate(() => {
      const entry: Animation[] = []
      ;(window as typeof window & { lucarioEntry?: Animation[] }).lucarioEntry =
        entry
      const animate = Element.prototype.animate
      Element.prototype.animate = function (keyframes, options) {
        const animation = animate.call(this, keyframes, options)
        if (this.matches('.lucario-stage canvas')) {
          entry.push(animation)
          animation.pause()
        }
        return animation
      }
    })
    await expect(page.locator('.lucario-stage')).toHaveAttribute(
      'aria-busy',
      'true'
    )
    await page.screenshot({
      path: `test-results/island-silent-loading-${testInfo.project.name}.png`,
    })
    release()
    await expect(page.locator('.lucario-stage')).toHaveAttribute(
      'aria-busy',
      'false',
      { timeout: 15000 }
    )
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { lucarioEntry?: Animation[] })
            .lucarioEntry!.length
      )
    ).toBe(2)
    const entry = await page.evaluate(() =>
      (
        window as typeof window & { lucarioEntry?: Animation[] }
      ).lucarioEntry!.map((animation) => ({
        id: animation.id,
        duration: animation.effect!.getTiming().duration,
        delay: animation.effect!.getTiming().delay,
        iterations: animation.effect!.getTiming().iterations,
        frames: (animation.effect as KeyframeEffect)
          .getKeyframes()
          .map((frame) => ({
            opacity: frame.opacity,
            transform: frame.transform,
            clip: frame.clipPath,
            filter: frame.filter,
          })),
      }))
    )
    const flicker = entry!.find(
      (animation) => animation.id === 'lucario-flicker-in'
    )!
    expect(flicker.duration).toBe(80)
    expect(flicker.delay).toBe(1920)
    expect(flicker.iterations).toBe(3)
    expect(flicker.frames.map((frame) => Number(frame.opacity))).toEqual([
      0.45, 1, 1, 0.85, 0.55, 1,
    ])
    expect(flicker.frames.every((frame) => !frame.clip)).toBe(true)
    expect(
      flicker.frames.every((frame) =>
        /^translateX\([^)]+\)$/.test(String(frame.transform))
      )
    ).toBe(true)
    expect(
      flicker.frames.some((frame) =>
        frame.transform?.includes('translateX(-10px)')
      )
    ).toBe(true)
    expect(
      flicker.frames.some((frame) => frame.filter?.includes('hue-rotate'))
    ).toBe(true)
    const shrink = entry!.find(
      (animation) => animation.id === 'lucario-shrink-in'
    )!
    expect(shrink.duration).toBe(1920)
    expect(shrink.delay).toBe(0)
    expect(shrink.frames.map((frame) => Number(frame.opacity))).toEqual([0, 1])
    expect(shrink.frames.map((frame) => frame.transform)).toEqual([
      'scale(2)',
      'scale(1)',
    ])
    expect(shrink.frames.every((frame) => !frame.clip)).toBe(true)
    await expect(page.locator('.lucario-stage')).toHaveAttribute(
      'data-material-phase',
      'wireframe'
    )
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 15000,
    })
    const canvas = page.locator('.lucario-stage canvas')
    // 固定缩放和透明度，仅比较头部从正常角度到低头的实际渲染变化。
    await page.addStyleTag({
      content: '.lucario-stage { background: #050105; }',
    })
    await canvas.evaluate(() => {
      const shrink = (
        window as typeof window & { lucarioEntry?: Animation[] }
      ).lucarioEntry!.find((animation) => animation.id === 'lucario-shrink-in')!
      ;(shrink.effect as KeyframeEffect).setKeyframes([
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1)', opacity: 1 },
      ])
      shrink.currentTime = 0
    })
    await page.waitForTimeout(100)
    const uprightHead = await canvas.screenshot()
    await canvas.evaluate(() => {
      const shrink = (
        window as typeof window & { lucarioEntry?: Animation[] }
      ).lucarioEntry!.find((animation) => animation.id === 'lucario-shrink-in')!
      shrink.currentTime = 960
    })
    await page.waitForTimeout(100)
    const loweringHead = await canvas.screenshot()
    expect(uprightHead.equals(loweringHead)).toBe(false)
    await canvas.evaluate(async () => {
      const shrink = (
        window as typeof window & { lucarioEntry?: Animation[] }
      ).lucarioEntry!.find((animation) => animation.id === 'lucario-shrink-in')!
      shrink.currentTime = 1919
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
    })
    await expect(page.locator('.lucario-stage')).toHaveAttribute(
      'data-material-phase',
      'wireframe'
    )
    const wireframeImage = await canvas.screenshot()
    expect(loweringHead.equals(wireframeImage)).toBe(false)
    await page.screenshot({
      path: `test-results/island-wireframe-entry-${testInfo.project.name}.png`,
    })
    await canvas.evaluate(() => {
      const shrink = (
        window as typeof window & { lucarioEntry?: Animation[] }
      ).lucarioEntry!.find((animation) => animation.id === 'lucario-shrink-in')!
      shrink.finish()
    })
    await expect(page.locator('.lucario-stage')).toHaveAttribute(
      'data-material-phase',
      'chrome'
    )
    const normalImage = await canvas.screenshot()
    expect(wireframeImage.equals(normalImage)).toBe(false)
    // 检查实际中间帧，避免关键帧存在、却被全局缓动跳过的回归。
    const renderedGlitch = await canvas.evaluate(async (element) => {
      const flicker = (
        window as typeof window & { lucarioEntry?: Animation[] }
      ).lucarioEntry!.find(
        (animation) => animation.id === 'lucario-flicker-in'
      )!
      flicker.pause()
      flicker.currentTime = 1920 + 20
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
      const style = getComputedStyle(element)
      return {
        opacity: Number(style.opacity),
        transform: style.transform,
        filter: style.filter,
        clip: style.clipPath,
      }
    })
    expect(renderedGlitch.opacity).toBe(1)
    expect(renderedGlitch.transform).toBe('matrix(1, 0, 0, 1, -10, 0)')
    expect(renderedGlitch.filter).toContain('hue-rotate(75deg)')
    expect(renderedGlitch.clip).toBe('none')
    expect(normalImage.equals(await canvas.screenshot())).toBe(false)
    await page.screenshot({
      path: `test-results/island-glitch-${testInfo.project.name}.png`,
    })
    await canvas.evaluate(() => {
      for (const animation of (
        window as typeof window & { lucarioEntry?: Animation[] }
      ).lucarioEntry!)
        animation.finish()
    })
    await page.locator('.lucario-stage canvas').evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      )
    })
    await expect(page.locator('.lucario-stage')).toHaveAttribute(
      'data-entrance-finished',
      'true'
    )
    await expect(page.locator('.lucario-scan-line')).toHaveCount(0)
    await expect(page.locator('.lucario-stage canvas')).toHaveCSS(
      'filter',
      'none'
    )
    await expect(page.locator('.lucario-stage canvas')).toHaveCSS(
      'clip-path',
      'none'
    )
    await expect(page.locator('.lucario-stage canvas')).toHaveCSS(
      'transform',
      'none'
    )
  } finally {
    release()
  }
})
