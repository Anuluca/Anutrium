import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('https://use.typekit.net/**', (route) => route.abort())
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.mouse.move(0, 0)
})

test('a delayed scene import keeps ANUTRIUM hidden with the scene', async ({
  page,
}) => {
  test.setTimeout(60000)
  let releaseScene!: () => void
  const sceneGate = new Promise<void>((resolve) => {
    releaseScene = resolve
  })
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    await sceneGate
    await route.continue()
  })
  try {
    await page.goto('/archive', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-backdrop')).toHaveCount(1)
    await expect(page.locator('.temple-stage')).toHaveCSS('opacity', '0')
    await expect(page.locator('.temple-stage canvas')).toHaveCount(0)
    await page.waitForTimeout(300)
    await expect(page.locator('.temple-stage')).toHaveCSS('opacity', '0')
  } finally {
    releaseScene()
  }
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.temple-stage')).toHaveCSS('opacity', '1')
  await expect(page.locator('.temple-stage canvas')).toHaveCSS(
    'visibility',
    'visible'
  )
})

for (const entry of [
  {
    id: 'archive',
    path: '/archive',
    color: 'rgb(50, 118, 254)',
    hex: '#3276fe',
  },
  {
    id: 'sprigatito',
    path: '/flanerie/changsha?from=home',
    color: 'rgb(138, 44, 27)',
    hex: '#8a2c1b',
  },
]) {
  test(`${entry.id} simple entrance starts in the target colour without a red fade`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000)
    await page.addInitScript(() => {
      const samples: Array<{
        color: string
        labelColor?: string
        canvasVisible: boolean
      }> = []
      ;(window as any).simpleEntranceSamples = samples
      let completedAt = 0
      const sample = () => {
        const stage = document.querySelector<HTMLElement>(
          '.temple-stage[data-entrance-mode="simple"]'
        )
        if (stage) {
          const backdrop = stage.querySelector('.temple-backdrop')!
          const canvas = stage.querySelector('canvas')
          if (Number(getComputedStyle(stage).opacity) > 0)
            samples.push({
              color: getComputedStyle(backdrop).color,
              labelColor: stage.dataset.statueLabelColor,
              canvasVisible:
                !!canvas && getComputedStyle(canvas).visibility === 'visible',
            })
          if (stage.dataset.entranceFinished === 'true' && !completedAt)
            completedAt = performance.now()
        }
        if (!completedAt || performance.now() - completedAt < 900)
          requestAnimationFrame(sample)
        else (window as any).simpleEntranceSamplingDone = true
      }
      requestAnimationFrame(sample)
    })
    await page.goto(entry.path, { waitUntil: 'domcontentloaded' })
    if (entry.id === 'sprigatito') {
      await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
        timeout: 30000,
      })
      if (testInfo.project.name.includes('mobile'))
        await page.getByRole('button', { name: '切换导航菜单' }).click()
      await page.locator('[data-temple-nav="sprigatito"]').click()
    }
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      entry.id,
      { timeout: 30000 }
    )
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).simpleEntranceSamplingDone)
      )
      .toBe(true)
    const samples = await page.evaluate(
      () =>
        (window as any).simpleEntranceSamples as Array<{
          color: string
          labelColor?: string
          canvasVisible: boolean
        }>
    )
    expect(samples.length).toBeGreaterThan(3)
    expect(samples.every((sample) => sample.canvasVisible)).toBe(true)
    expect([...new Set(samples.map((sample) => sample.color))]).toEqual([
      entry.color,
    ])
    // 三维字样的材质使用完整主题色，不受聚焦背景压暗影响，单独核对首帧颜色。
    expect([...new Set(samples.map((sample) => sample.labelColor))]).toEqual([
      entry.hex,
    ])
  })
}

test('module changes after simple entrance retain their colour animation', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  const result = await page.evaluate(async () => {
    const stage = document.querySelector<HTMLElement>('.temple-stage')!
    const original = stage.dataset.statueLabelColor
    const colors: string[] = []
    ;(
      document.querySelector('[data-obelisk="flanerie"]') as HTMLButtonElement
    ).click()
    const deadline = performance.now() + 1400
    await new Promise<void>((resolve) => {
      const sample = () => {
        colors.push(stage.dataset.statueLabelColor!)
        if (performance.now() < deadline) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    return { original, colors }
  })
  expect(result.original).toBe('#3276fe')
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-statue-label-color',
    '#8b5cc7',
    { timeout: 10000 }
  )
  expect(
    result.colors.some(
      (color) => color !== result.original && color !== '#8b5cc7'
    )
  ).toBe(true)
})
