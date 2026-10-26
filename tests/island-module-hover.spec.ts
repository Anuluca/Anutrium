import { expect, test } from '@playwright/test'

test('Island links flash twice, anchors blink and open inline details, and interests share a row', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="app" style="position:fixed;inset:0"></div>',
    })
  )
  await page.goto('/')
  await page.evaluate(async (mobile) => {
    const { mountIslandLayout } = await import(
      '/tests/fixtures/island-link-layout.ts'
    )
    const layout = await mountIslandLayout(mobile)
    ;(window as any).islandHoverLayout = layout
    const x = innerWidth / 2
    await layout.update({
      chest: { x, y: 200 },
      rightHand: { x, y: 260 },
      leftHand: { x, y: 320 },
      rightBraid: { x, y: 380 },
      leftBraid: { x, y: 440 },
    })
  }, info.project.name.includes('mobile'))
  const link = page.locator('[data-link-item="COLLECTIBLES"]')
  await page.evaluate(() =>
    (window as any).islandHoverLayout.setInteractive(false)
  )
  await page
    .locator('[data-island-item="COLLECTIBLES"]')
    .dispatchEvent('pointerenter')
  await expect(link).not.toHaveClass(/is-active/)
  await page.evaluate(() =>
    (window as any).islandHoverLayout.setInteractive(true)
  )
  await page
    .locator('[data-island-item="COLLECTIBLES"]')
    .dispatchEvent('pointerenter')
  await expect(link).not.toHaveClass(/is-active/)
  const marker = link.locator('.island-anchor')
  const line = link.locator('line')
  await expect(line).toHaveCSS('opacity', '0')
  const breathing = await marker.evaluate((element) => {
    const animation = element.getAnimations()[0]
    animation.pause()
    animation.currentTime = 0
    const maximum = getComputedStyle(element).opacity
    const flashes = [
      120, 230, 340, 450, 600, 2300, 2650, 2750, 2850, 2950, 3100,
    ].map((time) => {
      animation.currentTime = time
      return getComputedStyle(element).opacity
    })
    animation.currentTime = 1300
    const minimum = getComputedStyle(element).opacity
    return {
      maximum,
      minimum,
      flashes,
      iterations: animation.effect!.getTiming().iterations,
    }
  })
  expect(breathing).toEqual({
    maximum: '0.5',
    minimum: '0',
    flashes: ['0', '0.5', '0', '0.5', '0', '0', '0.5', '0', '0.5', '0', '0.5'],
    iterations: Infinity,
  })
  const cards = page.locator(
    '.island-panels .island-window--interests .island-item'
  )
  const [left, right] = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })
  )
  expect(right.x).toBeGreaterThan(left.x + left.width)
  expect(Math.abs(left.y - right.y)).toBeLessThan(1)
  expect(Math.abs(left.width - right.width)).toBeLessThan(1)
  expect(Math.abs(left.height - right.height)).toBeLessThan(1)

  await page.locator('[data-island-item="COLLECTIBLES"]').hover()
  await expect(link).toHaveClass('is-active')
  await expect(marker).toHaveCSS('opacity', '1')
  for (const element of [line, marker.locator('.island-anchor__frame')]) {
    const flash = await element.evaluate((element) => {
      const animations = element.getAnimations()
      const animation = animations[0]
      animation.pause()
      const opacity = [0, 60, 120, 180, 240].map((time) => {
        animation.currentTime = time
        return getComputedStyle(element).opacity
      })
      return {
        count: animations.length,
        duration: animation.effect!.getTiming().duration,
        opacity,
      }
    })
    expect(flash).toEqual({
      count: 1,
      duration: 240,
      opacity: ['1', '0', '1', '0', '1'],
    })
  }
  const merging = await marker
    .locator('.island-anchor__merge')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const animation = element.getAnimations()[0]
        animation.pause()
        const timing = animation.effect!.getTiming()
        const sample = (time: number) => {
          animation.currentTime = timing.delay + time
          const style = getComputedStyle(element)
          return {
            opacity: Number(style.opacity),
            scale: new DOMMatrixReadOnly(style.transform).a,
          }
        }
        return {
          delay: timing.delay,
          start: sample(0),
          middle: sample(150),
          end: sample(420),
          pointerEvents: getComputedStyle(element).pointerEvents,
        }
      })
    )
  expect(merging).toHaveLength(4)
  await expect(marker.locator('path.island-anchor__merge')).toHaveCount(4)
  await expect(marker.locator('.island-anchor__frame rect')).toHaveCount(0)
  expect(new Set(merging.map((layer) => layer.start.scale)).size).toBe(4)
  for (const layer of merging) {
    expect(layer.delay).toBe(0)
    expect(layer.start.opacity).toBeGreaterThan(0)
    expect(layer.start.scale).toBeGreaterThan(1)
    expect(layer.middle.scale).toBeGreaterThan(1)
    expect(layer.middle.scale).toBeLessThan(layer.start.scale)
    expect(layer.middle.opacity).toBeGreaterThan(0)
    expect(layer.end).toEqual({ opacity: 0, scale: 1 })
    expect(layer.pointerEvents).toBe('none')
  }
  await page.mouse.move(1, 1)
  await expect(link).not.toHaveClass('is-active')
  await expect(line).toHaveCSS('opacity', '0')
  await marker.hover()
  await expect(link).toHaveClass('is-active')
  await expect(page.locator('[data-flash-item="COLLECTIBLES"]')).toHaveClass(
    /is-active/
  )
  await marker.click()
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).islandHoverLayout.router.currentRoute.value.path
      )
    )
    .toBe('/atrium/collections')
  await expect(page.locator('.island-focus')).toHaveAttribute(
    'data-detail-item',
    'COLLECTIBLES'
  )
  await expect(
    page.locator('.island-detail .island-collections-content')
  ).toBeVisible()
  await page.evaluate(() => (window as any).islandHoverLayout.unmount())
})

test('Island cards reach their full overview geometry before animation cleanup', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="app" style="position:fixed;inset:0"></div>',
    })
  )
  await page.goto('/')
  await page.evaluate(async (mobile) => {
    const { mountIslandLayout } = await import(
      '/tests/fixtures/island-link-layout.ts'
    )
    await mountIslandLayout(mobile)
  }, info.project.name.includes('mobile'))
  for (const id of ['LABORATORY', 'COLLECTIBLES']) {
    const item = page.locator(`[data-flash-item="${id}"]`)
    const initial = await item.boundingBox()
    await page.locator(`[data-island-item="${id}"]`).click()
    await expect(page.locator('.island-focus')).toHaveAttribute(
      'data-detail-item',
      id
    )
    await page.evaluate(async (id) => {
      const { sampleIslandLayoutTransition } = await import(
        '/tests/fixtures/island-link-layout.ts'
      )
      sampleIslandLayoutTransition(id, [1])
      ;(
        document.querySelector('.island-focus') as any
      ).__vueParentComponent.exposed.closeDetail()
    }, id)
    await expect(page.locator('.island-focus')).toHaveAttribute(
      'data-detail-phase',
      'restoring'
    )
    const samples = await page.evaluate(async (id) => {
      const { sampleIslandLayoutTransition } = await import(
        '/tests/fixtures/island-link-layout.ts'
      )
      return sampleIslandLayoutTransition(id, [0.99, 0.999, 1])
    }, id)
    await expect(page.locator('.island-focus')).toHaveAttribute(
      'data-detail-phase',
      'overview'
    )
    const final = samples[2]
    for (const key of ['left', 'top', 'width', 'height'] as const)
      expect(Math.abs(samples[1][key] - final[key])).toBeLessThanOrEqual(1)
    expect(Math.abs(final.width - initial!.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(final.height - initial!.height)).toBeLessThanOrEqual(1)
  }
})
