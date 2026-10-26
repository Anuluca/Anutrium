import { expect, type Page, test } from './helpers/sceneDiagnostics'

const blankPage = async (page: Page) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><body></body>',
    })
  )
  await page.goto('/')
}

test('zodiac masks preserve the blurred icon alpha and reuse cached data', async ({
  page,
}) => {
  await blankPage(page)
  const results = await page.evaluate(async () => {
    const url = '/src/utils/templeLabelTextures.ts'
    const { getTempleLabelCanvas, getTempleZodiacMask } = await import(url)
    return ['aquarius', 'sagittarius', 'leo', 'pisces'].map((sign) => {
      const mask = getTempleZodiacMask(sign)
      const image = getTempleLabelCanvas('TEST', sign)
        .canvas.getContext('2d')
        .getImageData(36, 37, 56, 56).data
      const alpha = (x: number, y: number) =>
        x < 0 || y < 0 || x >= 56 || y >= 56 ? 0 : image[(y * 56 + x) * 4 + 3]
      const sample = (x: number, y: number) => {
        const a = Math.floor(x),
          b = Math.floor(y),
          dx = x - a,
          dy = y - b
        return (
          alpha(a, b) * (1 - dx) * (1 - dy) +
          alpha(a + 1, b) * dx * (1 - dy) +
          alpha(a, b + 1) * (1 - dx) * dy +
          alpha(a + 1, b + 1) * dx * dy
        )
      }
      let error = 0
      for (let y = 0; y < 56; y++)
        for (let x = 0; x < 56; x++) {
          let reference = 0
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              reference +=
                sample(x + dx * 1.8, y + dy * 1.8) *
                (dx === 0 ? 0.5 : 0.25) *
                (dy === 0 ? 0.5 : 0.25)
          error = Math.max(error, Math.abs(mask.data[y * 56 + x] - reference))
        }
      return {
        sign,
        error,
        reused: getTempleZodiacMask(sign) === mask,
        lit: mask.data.some((alpha: number) => alpha > 100),
        empty: mask.data.some((alpha: number) => alpha === 0),
      }
    })
  })
  for (const result of results) {
    expect(result.error, result.sign).toBeLessThanOrEqual(1)
    expect(result.reused && result.lit && result.empty, result.sign).toBe(true)
  }
})

test('projection controller skips idle writes and preserves asymmetric fade timing', async ({
  page,
}) => {
  await blankPage(page)
  const result = await page.evaluate(async () => {
    const threeUrl = '/node_modules/three/build/three.module.js'
    const projectionUrl = '/src/views/Home/scene/zodiacProjection.ts'
    const THREE = await import(threeUrl)
    const { createZodiacProjection } = await import(projectionUrl)
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const texture = new THREE.Texture()
    const projection = createZodiacProjection(
      geometry,
      new THREE.Vector3(0, 1, 5),
      '#3276fe',
      texture
    )
    let writes = 0,
      value = 0
    Object.defineProperty(projection.material.uniforms.intensity, 'value', {
      get: () => value,
      set: (next: number) => {
        writes++
        value = next
      },
    })
    for (let i = 0; i < 100; i++) projection.update(false, 1 / 60)
    const idleWrites = writes
    projection.update(true, 0.5)
    const rising = projection.strength
    projection.update(false, 0.25)
    const falling = projection.strength
    for (let i = 0; i < 200; i++) projection.update(true, 1 / 30)
    const settledWrites = writes
    for (let i = 0; i < 100; i++) projection.update(true, 1 / 60)
    const stableWrites = writes - settledWrites
    for (let i = 0; i < 200; i++) projection.update(false, 1 / 30)
    const hidden =
      !projection.beam.visible &&
      !projection.moving &&
      projection.strength === 0
    projection.material.dispose()
    geometry.dispose()
    texture.dispose()
    return { idleWrites, rising, falling, stableWrites, hidden }
  })
  expect(result.idleWrites).toBe(0)
  expect(result.rising).toBeCloseTo(1 - Math.exp(-1), 6)
  expect(result.falling).toBeCloseTo(result.rising * Math.exp(-1), 6)
  expect(result.stableWrites).toBe(0)
  expect(result.hidden).toBe(true)
})

test('obelisk controls preserve hover projection and keyboard focus on both layouts', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  const controls = page.locator('.temple-obelisk')
  await expect(controls).toHaveCount(4)
  for (const [index, id] of [
    'archive',
    'flanerie',
    'pokeyard',
    'island',
  ].entries()) {
    const button = page.locator(`[data-obelisk="${id}"]`)
    await expect(button).toBeEnabled()
    await expect(button).not.toHaveAttribute('aria-label', /^[IV]+ \/ /)
    if (!info.project.name.includes('mobile')) {
      await button.hover({ force: true })
      await expect
        .poll(
          async () =>
            Number(
              (await stage.getAttribute('data-zodiac-projection'))?.split(',')[
                index
              ]
            ),
          { timeout: 10000 }
        )
        .toBe(1)
    }
  }
  await controls.first().focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'archive'
  )
  await expect
    .poll(async () => await stage.getAttribute('data-zodiac-projection'), {
      timeout: 10000,
    })
    .toBe('0.000,0.000,0.000,0.000')
  await page.keyboard.press('Escape')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
})
