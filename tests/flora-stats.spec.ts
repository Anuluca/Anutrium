import { expect, test } from '@playwright/test'

test('pet stats use a shared 150 scale, follow pet selection and fit the profile layout', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  const mobile = info.project.name.includes('mobile')
  const switchLanguage = async (label: string) => {
    if (mobile) {
      await page.locator('.mobile-menu-icon').click()
      await page.locator('.mobile-menu-language').click()
      const openMenu = page.locator('.mobile-menu-icon[aria-expanded="true"]')
      if (await openMenu.isVisible()) await openMenu.click()
    } else {
      await page
        .locator('.language')
        .getByRole('button', { name: label, exact: true })
        .click()
    }
  }
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
  if (mobile) {
    const originalViewport = page.viewportSize()!
    // 覆盖不同 CSS 视口宽度，以及触屏设备跨过旧 767px 文字断点的情况。
    for (const width of [320, 390, 430, 800]) {
      await page.setViewportSize({ width, height: Math.round(width * 2.16) })
      await expect(page.locator('.flora-focus-layout')).toHaveClass(
        /flora-focus-layout--mobile/
      )
      const geometry = await page
        .locator('.flora-pet-memo')
        .evaluate((memo) => {
          const header = memo.closest('.flora-pet-profile__header')!
          const svg = header.querySelector('.flora-pet-stats svg')!
          const encounter = memo.querySelectorAll('p')[2]
          return {
            font: parseFloat(getComputedStyle(memo).fontSize),
            headerWidth: header.getBoundingClientRect().width,
            chartWidth: svg.getBoundingClientRect().width,
            chartHeight: svg.getBoundingClientRect().height,
            memoHeight: memo.getBoundingClientRect().height,
            encounterHeight: encounter.getBoundingClientRect().height,
            encounterLineHeight: parseFloat(
              getComputedStyle(encounter).lineHeight
            ),
            headerHeight: header.getBoundingClientRect().height,
            contentHeight:
              memo.getBoundingClientRect().bottom -
              header.getBoundingClientRect().top,
          }
        })
      expect(geometry.font / geometry.headerWidth).toBeCloseTo(0.05, 3)
      expect(
        Math.abs(geometry.chartHeight - geometry.memoHeight * 1.2)
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(geometry.chartWidth - geometry.chartHeight)
      ).toBeLessThanOrEqual(1)
      expect(geometry.encounterHeight).toBeLessThanOrEqual(
        geometry.encounterLineHeight + 1
      )
      expect(
        Math.abs(geometry.headerHeight - geometry.contentHeight)
      ).toBeLessThanOrEqual(1)
    }
    await page.setViewportSize(originalViewport)
  }
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
    const effect =
      pet === 'huahua'
        ? {
            increased: 'atk',
            decreased: 'spd',
            nature: '顽皮',
            date: '2025年04月',
            place: '江西省南昌市',
            characteristic: '有一点点固执。',
          }
        : {
            increased: 'spe',
            decreased: 'atk',
            nature: '胆小',
            date: '2020年01月',
            place: '安徽省池州市',
            characteristic: '对声音敏感。',
          }
    await expect(page.locator('.flora-pet-memo')).toContainText(
      `${effect.nature}的性格。`
    )
    await expect(page.locator('.flora-pet-memo')).toContainText(effect.date)
    if (mobile) {
      const memoBounds = (await page.locator('.flora-pet-memo').boundingBox())!
      const chartBounds = (await chart.boundingBox())!
      expect(
        Math.abs(memoBounds.height * 1.2 - chartBounds.height)
      ).toBeLessThanOrEqual(1)
    }
    await expect(page.locator('.flora-pet-memo')).toContainText(
      `在${effect.place}遇到了它。`
    )
    await expect(page.locator('.flora-pet-memo')).toContainText(
      effect.characteristic
    )
    for (const part of ['label', 'value']) {
      await expect(
        chart.locator(
          `[data-stat="${effect.increased}"] .flora-stats-chart__${part}`
        )
      ).toHaveCSS(part === 'label' ? 'stroke' : 'fill', 'rgb(226, 52, 86)')
      await expect(
        chart.locator(
          `[data-stat="${effect.decreased}"] .flora-stats-chart__${part}`
        )
      ).toHaveCSS(part === 'label' ? 'stroke' : 'fill', 'rgb(73, 153, 232)')
    }
    await switchLanguage('En')
    await expect(page.locator('.flora-pet-memo')).toContainText(
      pet === 'huahua' ? 'Naughty nature.' : 'Timid nature.'
    )
    await expect(page.locator('.flora-pet-memo')).toContainText(
      pet === 'huahua' ? 'Met in Nanchang, Jiangxi.' : 'Met in Chizhou, Anhui.'
    )
    await expect(page.locator('.flora-pet-memo')).toContainText(
      pet === 'huahua' ? "It's somewhat stubborn!" : "It's alert to sounds!"
    )
    await switchLanguage('中文')
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
      'stroke',
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
        (Math.hypot(point.x - 180, point.y - 180) / 142) * 150
      ).toBeCloseTo(values[pet][index], 2)
      const angle = -Math.PI / 2 + (index * Math.PI) / 3
      expect(point.x - 180).toBeCloseTo(
        (Math.cos(angle) * 142 * values[pet][index]) / 150,
        2
      )
      expect(point.y - 180).toBeCloseTo(
        (Math.sin(angle) * 142 * values[pet][index]) / 150,
        2
      )
    }
  }
  await page.locator('.flora-media-region').evaluate((el) => {
    el.scrollTop = 0
  })
  const bounds = (await chart.boundingBox())!
  const header = page.locator('.flora-pet-profile__header')
  await expect(header.locator(':scope > .flora-pet-stats')).toHaveCount(1)
  await expect(header.locator('.flora-pet-level')).toHaveCount(mobile ? 0 : 1)
  const headerBounds = (await header.boundingBox())!
  expect(bounds.height).toBeCloseTo(headerBounds.height * (mobile ? 1.2 : 1), 0)
  const level = (await page.locator('.flora-pet-level').boundingBox())!
  const moves = (await page.locator('.flora-pet-profile__moves').boundingBox())!
  if (mobile) {
    const identity = page.locator('.flora-identity-bar')
    await expect(identity.locator('.flora-pet-level')).toHaveCount(1)
    const identityBounds = (await identity.boundingBox())!
    const plate = (await page.locator('.flora-pet-level__plate').boundingBox())!
    expect(level.x + level.width).toBeCloseTo(
      identityBounds.x + identityBounds.width,
      0
    )
    expect(plate.width).toBeCloseTo(identityBounds.width / 2, 0)
    expect(plate.x + plate.width).toBeCloseTo(
      identityBounds.x + identityBounds.width,
      0
    )
    const details = page.locator('.flora-identity-bar__details')
    const nameBounds = (await details
      .locator('.flora-identity-bar__name')
      .boundingBox())!
    const genderBounds = (await details
      .locator('.flora-identity-bar__gender')
      .boundingBox())!
    expect(genderBounds.x).toBeGreaterThanOrEqual(
      nameBounds.x + nameBounds.width
    )
    expect(genderBounds.x + genderBounds.width).toBeLessThanOrEqual(level.x)
    expect(bounds.y).toBeGreaterThan(level.y + level.height)
  } else {
    expect(bounds.x).toBeGreaterThanOrEqual(level.x + level.width)
    expect(bounds.y).toBeCloseTo(level.y, 0)
  }
  expect(moves.y).toBeGreaterThanOrEqual(
    headerBounds.y + headerBounds.height - 1
  )
  expect(moves.x).toBeCloseTo(headerBounds.x, 0)
  await expect(chart.locator('.flora-stats-chart__values')).toHaveCSS(
    'opacity',
    '0.5'
  )
  await expect(chart.locator('mask line')).toHaveCount(6)
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
