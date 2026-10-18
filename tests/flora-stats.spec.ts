import { expect, test } from '@playwright/test'

test('pet stats use a shared 150 scale, follow pet selection and fit the profile layout', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  const mobile = info.project.name.includes('mobile')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const chart = page.locator('.flora-stats-chart')
  await expect(chart).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  if (mobile) {
    const alert = page.locator('.mobile-experience-alert')
    await expect(alert).toBeVisible({ timeout: 20000 })
    await alert.click()
  }
  await page.evaluate(() => document.fonts.ready)
  const axes = ['hp', 'atk', 'def', 'spe', 'spd', 'spa']
  const values = {
    huahua: [100, 100, 50, 80, 100, 10],
    xiaohei: [150, 150, 100, 150, 80, 100],
  }
  for (const pet of ['huahua', 'xiaohei'] as const) {
    if (pet === 'xiaohei')
      await page.locator('button[data-pet-id="xiaohei"]').click()
    await expect(chart.locator('.flora-stats-chart__value')).toHaveText(
      values[pet].map(String)
    )
    await expect(chart.getByRole('img')).toHaveAttribute('aria-label', /150/)
    await expect(chart.locator('.flora-stats-chart__label')).toHaveText([
      'HP',
      'Atk',
      'Def',
      'Spe',
      'SpD',
      'SpA',
    ])
    const groups = await chart
      .locator('g[data-stat]')
      .evaluateAll((elements) =>
        elements.map((el) => el.getAttribute('data-stat'))
      )
    expect(groups).toEqual(axes)
    const theme = pet === 'huahua' ? 'rgb(138, 44, 27)' : 'rgb(69, 75, 85)'
    await expect(chart.locator('.flora-stats-chart__label').first()).toHaveCSS(
      'font-family',
      'Anton, sans-serif'
    )
    await expect(chart.locator('.flora-stats-chart__label').first()).toHaveCSS(
      'fill',
      theme
    )
    await expect(chart.locator('.flora-stats-chart__value').first()).toHaveCSS(
      'fill',
      'rgb(255, 255, 255)'
    )
    await expect(chart.locator('.flora-stats-chart__values')).toHaveCSS(
      'fill',
      theme
    )
    await expect(chart.locator('.flora-stats-chart__values')).toHaveCSS(
      'stroke',
      theme
    )
    await expect(chart.locator('.flora-stats-chart__values')).toHaveCSS(
      'fill-opacity',
      '1'
    )
    const points = await chart
      .locator('.flora-stats-chart__values')
      .evaluate((element: SVGPolygonElement) =>
        [...element.points].map((point) => ({ x: point.x, y: point.y }))
      )
    for (const [index, point] of points.entries()) {
      expect(
        (Math.hypot(point.x - 180, point.y - 180) / 112) * 150
      ).toBeCloseTo(values[pet][index], 2)
      const angle = -Math.PI / 2 + (index * Math.PI) / 3
      expect(point.x - 180).toBeCloseTo(
        (Math.cos(angle) * 112 * values[pet][index]) / 150,
        2
      )
      expect(point.y - 180).toBeCloseTo(
        (Math.sin(angle) * 112 * values[pet][index]) / 150,
        2
      )
    }
  }
  await page.locator('.flora-media-region').evaluate((el) => {
    el.scrollTop = 0
  })
  const bounds = (await chart.boundingBox())!
  const profile = (await page.locator('.flora-pet-profile').boundingBox())!
  if (mobile) expect(bounds.y - profile.y - profile.height).toBeCloseTo(0, 0)
  else expect(bounds.x - profile.x - profile.width).toBeCloseTo(0, 0)
  if (!mobile)
    expect(bounds.y + bounds.height).toBeCloseTo(profile.y + profile.height, 0)
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width
  )
  await chart.scrollIntoViewIfNeeded()
  await chart.locator('svg').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito'
  )
  await page.screenshot({ path: `.tmp/flora-stats-${info.project.name}.png` })
})
