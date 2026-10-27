import { expect, test } from './helpers/sceneDiagnostics'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
})

test('Island fills the inset container, projects body anchors and shares hover colors', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://assets.anuluca.com/Island/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="16" height="32" fill="red"/><rect x="16" width="16" height="32" fill="blue"/></svg>',
    })
  )
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus')
  await expect(root).toBeVisible({ timeout: 45000 })
  const targets = root.locator('.island-targets')
  await expect(targets.getByRole('button')).toHaveCount(4)
  await expect(root.locator('[data-island-reserved]')).toHaveCount(2)
  await expect(root.locator('.island-panels h2')).toHaveText(['想法', '宅'])
  await expect(root.locator('.island-links line')).toHaveCount(4)
  const geometry = await root.evaluate((element) => {
    const panel = element.querySelector('.island-panels')!
    const canvas = element.parentElement!.querySelector('canvas')!
    const bounds = panel.getBoundingClientRect()
    const reserved = Array.from(
      panel.querySelectorAll('[data-island-reserved]')
    ).map((element) => element.getBoundingClientRect())
    const sections = Array.from(panel.querySelectorAll('.island-window')).map(
      (section) => section.getBoundingClientRect()
    )
    const lines = Object.fromEntries(
      Array.from(
        element.querySelectorAll<SVGLineElement>('.island-links line')
      ).map((line) => [
        line.parentElement!.getAttribute('data-link-item'),
        { x: line.x2.baseVal.value, y: line.y2.baseVal.value },
      ])
    )
    return {
      inset: [
        bounds.left,
        innerWidth - bounds.right,
        bounds.top,
        innerHeight - bounds.bottom,
      ],
      fill: [
        sections[0].left - bounds.left,
        reserved[0].top - bounds.top,
        sections[0].bottom - bounds.bottom,
        sections[1].right - bounds.right,
        sections[1].bottom - bounds.bottom,
      ],
      gap: sections[1].left - sections[0].right,
      reservedHeight: reserved[0].height,
      reservedGap: sections[0].top - reserved[0].bottom,
      z: {
        panels: parseInt(getComputedStyle(panel).zIndex, 10) || 0,
        canvas: +getComputedStyle(canvas).zIndex,
        lines: +getComputedStyle(element.querySelector('.island-links')!)
          .zIndex,
      },
      headings: Array.from(panel.querySelectorAll('h2')).map((h) => ({
        fill: getComputedStyle(h).webkitTextFillColor,
        font: getComputedStyle(h).fontFamily,
        weight: getComputedStyle(h).fontWeight,
        size: getComputedStyle(h).fontSize,
        mask: getComputedStyle(h).maskImage,
        overlayMask: getComputedStyle(h, '::after').maskImage,
        opacity: getComputedStyle(h).opacity,
        overflowTop:
          h.parentElement!.getBoundingClientRect().top -
          h.getBoundingClientRect().top,
        background: getComputedStyle(h.parentElement!).backgroundColor,
      })),
      anchors: lines,
      originOffsets: Array.from(
        element.querySelectorAll<SVGLineElement>('.island-links line')
      ).map((line) => line.y1.baseVal.value - line.y2.baseVal.value),
      connectionsWithinCards: Array.from(
        panel.querySelectorAll<HTMLElement>('[data-flash-item]')
      ).map((card) => {
        const rect = card.getBoundingClientRect()
        const line = element.querySelector<SVGLineElement>(
          `[data-link-item="${card.dataset.flashItem}"] line`
        )!
        const y = line.y1.baseVal.value + element.getBoundingClientRect().top
        return y >= rect.top - 1 && y <= rect.bottom + 1
      }),
      modules: Array.from(panel.querySelectorAll('.island-window')).map(
        (group) => {
          const header = group
            .querySelector('.island-window__bar')!
            .getBoundingClientRect()
          const body = group
            .querySelector('.island-window__body')!
            .getBoundingClientRect()
          return {
            border: getComputedStyle(group).borderTopWidth,
            gap: body.top - header.bottom,
          }
        }
      ),
      notes: Array.from(
        panel.querySelectorAll('.island-window--ideas .island-item')
      ).map((item) => ({
        left: item.getBoundingClientRect().left,
        top: item.getBoundingClientRect().top,
        right: item.getBoundingClientRect().right,
        bottom: item.getBoundingClientRect().bottom,
      })),
    }
  })
  expect(geometry.inset.every((value) => value >= 16)).toBe(true)
  expect(geometry.fill.every((value) => Math.abs(value) <= 1)).toBe(true)
  expect(geometry.gap).toBeGreaterThanOrEqual(
    info.project.name.includes('mobile') ? 40 : 64
  )
  expect(geometry.reservedHeight).toBeGreaterThanOrEqual(64)
  expect(geometry.reservedGap).toBeGreaterThan(0)
  expect(geometry.inset[2]).toBeGreaterThanOrEqual(
    info.project.name.includes('mobile') ? 114 : 124
  )
  geometry.originOffsets.forEach((offset) =>
    expect(Math.abs(offset)).toBeLessThanOrEqual(1)
  )
  expect(geometry.connectionsWithinCards.every(Boolean)).toBe(true)
  geometry.modules.forEach((module) => {
    expect(module.border).toBe('0px')
    expect(module.gap).toBeGreaterThanOrEqual(12)
  })
  expect(geometry.notes).toHaveLength(2)
  expect(
    geometry.notes[1].top - geometry.notes[0].bottom
  ).toBeGreaterThanOrEqual(12)
  expect(
    Math.abs(geometry.notes[0].left - geometry.notes[1].left)
  ).toBeLessThanOrEqual(1)
  await expect(
    root.locator('.island-panels .island-window--notes')
  ).toHaveCount(0)
  await expect(
    root.locator('.island-panels .island-window--ideas .island-item__title')
  ).toHaveText(['LABORATORY', 'NOTES&CHATS'])
  await expect(root.locator('[data-island-item="STUDY NOTES"]')).toHaveCount(0)
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-statue-fill-color',
    '#000000'
  )
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-statue-fill-opacity',
    '0.550'
  )

  expect(geometry.z.panels).toBeLessThanOrEqual(geometry.z.canvas)
  expect(geometry.z.lines).toBeGreaterThan(geometry.z.canvas)
  expect(geometry.anchors.COLLECTIBLES.x).toBeGreaterThan(
    geometry.anchors.NOTES.x
  )
  expect(geometry.anchors.LABORATORY.x).toBeLessThan(geometry.anchors.NOTES.x)
  expect(geometry.anchors['GAME LIBRARY'].x).toBeGreaterThan(
    geometry.anchors.NOTES.x
  )
  expect(geometry.anchors.LABORATORY.y).toBeLessThan(geometry.anchors.NOTES.y)
  expect(geometry.anchors['GAME LIBRARY'].y).toBeLessThan(
    geometry.anchors.NOTES.y
  )
  for (const heading of geometry.headings) {
    expect(heading.fill).toBe('rgb(0, 0, 0)')
    expect(heading.font).toContain('UnboundedSans')
    expect(heading.weight).toBe('400')
    expect(heading.size).toBe(
      info.project.name.includes('mobile') ? '60px' : '72px'
    )
    expect(heading.mask).toBe('none')
    expect(heading.overlayMask).toContain('linear-gradient')
    expect(heading.opacity).toBe('1')
    expect(heading.overflowTop).toBeGreaterThan(0)
    expect(heading.background).toBe('rgba(0, 0, 0, 0)')
  }
  await targets.getByRole('button', { name: '笔记', exact: true }).hover()
  await expect(
    root.locator('.island-panels .island-window--ideas .island-window__bar')
  ).toHaveCSS('color', 'rgb(29, 203, 169)')
  await expect(root.locator('.island-window--ideas h2')).toHaveCSS(
    '-webkit-text-fill-color',
    'rgb(0, 0, 0)'
  )
  expect(
    await root
      .locator('.island-window--ideas h2')
      .evaluate(
        (title) => getComputedStyle(title, '::after').webkitTextFillColor
      )
  ).toBe('rgb(29, 203, 169)')
  await expect(root.locator('.island-window__code')).toHaveCount(0)
  await expect(root.locator('[data-flash-item="NOTES"]')).toHaveCSS(
    'color',
    'rgb(29, 203, 169)'
  )
  await expect(root.locator('[data-flash-item="NOTES"] img')).toHaveCSS(
    'filter',
    'none'
  )
  const cover = root.locator('[data-flash-item="COLLECTIBLES"] img')
  await expect(cover).not.toHaveCSS('filter', 'none')
  await targets.getByRole('button', { name: '收藏品', exact: true }).hover()
  await expect(cover).toHaveCSS('filter', 'none')
  await expect(root.locator('[data-flash-item="GAME LIBRARY"]')).toHaveCSS(
    'color',
    'rgb(226, 52, 86)'
  )
  await targets.getByRole('button', { name: '笔记', exact: true }).hover()
  await expect(root.locator('[data-link-item="NOTES"]')).toHaveCSS(
    'color',
    'rgb(29, 203, 169)'
  )
  await expect(root.locator('[data-link-item="LABORATORY"]')).toHaveCSS(
    'color',
    'rgb(226, 52, 86)'
  )
  await page.evaluate(() => {
    const app = document.querySelector('#app') as any
    app.__vue_app__.config.globalProperties.$i18n.locale = 'en'
  })
  await expect(root.locator('.island-panels h2')).toHaveText(['IDEAS', 'OTAKU'])
  await page.screenshot({
    path: `/tmp/anutrium-island-final-${info.project.name}.png`,
  })
})

test('Island opens mirrored inline content and preserves leave geometry', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.island-focus')).toBeVisible({ timeout: 45000 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const probe = await page.evaluate(async () => {
    const panel = document.querySelector(
      '.island-panels .island-window--ideas .island-window__bar'
    )!
    const start = performance.now()
    document
      .querySelector<HTMLButtonElement>('[data-island-item="LABORATORY"]')!
      .click()
    const animation = panel.getAnimations()[0]
    const frames = animation.effect!.getKeyframes().map((frame) => frame.color)
    await animation.finished
    return { frames, duration: performance.now() - start }
  })
  expect(probe.frames.slice(0, 4)).toEqual([
    'rgb(29, 203, 169)',
    'rgb(226, 52, 86)',
    'rgb(29, 203, 169)',
    'rgb(226, 52, 86)',
  ])
  expect(probe.duration).toBeGreaterThanOrEqual(220)
  const root = page.locator('.island-focus')
  await expect(root).toHaveAttribute('data-detail-item', 'LABORATORY')
  await expect(page.locator('.island-detail .signal-code')).toHaveText('404')
  await expect(page).toHaveURL(/\/atrium\/laboratory$/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.island-detail__back')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(root).not.toHaveClass(/has-detail/)
  for (const [id, side, content] of [
    ['NOTES', 'left', '.island-notes-content'],
    ['COLLECTIBLES', 'right', '.island-collections-content'],
    ['GAME LIBRARY', 'right', '.signal-code'],
  ]) {
    await page.locator(`[data-island-item="${id}"]`).click()
    await expect(root).toHaveAttribute('data-detail-side', side)
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'data-island-detail-side',
      side
    )
    await expect
      .poll(async () => {
        const rotation = await page
          .locator('.temple-stage')
          .getAttribute('data-statue-body-rotation')
        return Math.abs(
          Number(rotation?.split(',')[1]) -
            (id === 'COLLECTIBLES'
              ? Math.PI
              : side === 'left'
              ? -Math.PI / 2
              : Math.PI / 2)
        )
      })
      .toBeLessThan(0.02)
    await expect(page.locator(`.island-detail ${content}`)).toBeVisible()
    await expect(root.locator('.island-targets')).toBeHidden()
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'data-statue-label-scale',
      '0.000'
    )
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'data-head-nod-angle',
      '0.000'
    )
    const detailZoom = Number(
      await page.locator('.temple-stage').getAttribute('data-camera-zoom')
    )
    expect(detailZoom).toBeGreaterThan(1.3)
    const header = await root
      .locator('.island-panels .island-window:visible')
      .evaluate((element) => {
        const group = element
          .querySelector('.island-window__bar')!
          .getBoundingClientRect()
        const item = Array.from(element.querySelectorAll('.island-item')).find(
          (e) => e.getClientRects().length
        )!
        const title = item
          .querySelector('.island-item__title')!
          .getBoundingClientRect()
        const count = item
          .querySelector('.section-count')!
          .getBoundingClientRect()
        return {
          groupRight: group.right,
          titleLeft: title.left,
          titleRight: title.right,
          countLeft: count.left,
        }
      })
    expect(header.titleLeft).toBeGreaterThan(header.groupRight)
    expect(header.countLeft).toBeGreaterThanOrEqual(header.titleRight)
    await expect(
      root.locator('.island-detail .detail-page-header')
    ).toHaveCount(0)
    if (id === 'NOTES') {
      const columns = await root
        .locator('.study-note-stack')
        .evaluate(
          (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length
        )
      expect(columns).toBe((page.viewportSize()?.width ?? 0) < 600 ? 1 : 2)
    }
    await page.keyboard.press('Escape')
    await expect(root).not.toHaveClass(/has-detail/)
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      'statue'
    )
  }
  await page.locator('[data-island-item="NOTES"]').click()
  await expect(
    page.locator('.island-detail .island-notes-content')
  ).toBeVisible()
  // Capture the old page and route container until unmount, including the leave transition.
  await page.evaluate(() => {
    const elements = [
      document.querySelector('.temple-page')!,
      document.querySelector('.router-container')!,
    ]
    const read = () =>
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect()
        return [rect.top, rect.left]
      })
    const probe = { initial: read(), samples: [] as number[][], done: false }
    ;(window as any).islandLeaveProbe = probe
    const tick = () => {
      if (!elements[0].isConnected) {
        probe.done = true
        return
      }
      probe.samples.push(read())
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await page.locator('.island-detail .study-note-card').first().click()
  await expect(page).toHaveURL(/\/404$/)
  await expect
    .poll(() => page.evaluate(() => (window as any).islandLeaveProbe.done))
    .toBe(true)
  const geometry = await page.evaluate(
    () =>
      (window as any).islandLeaveProbe as {
        initial: number[]
        samples: number[][]
      }
  )
  expect(geometry.samples.length).toBeGreaterThan(1)
  for (const sample of geometry.samples)
    sample.forEach((value, index) =>
      expect(Math.abs(value - geometry.initial[index])).toBeLessThanOrEqual(1)
    )
})
