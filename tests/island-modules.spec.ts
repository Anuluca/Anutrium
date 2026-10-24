import { expect, test } from '@playwright/test'

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
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus')
  await expect(root).toBeVisible({ timeout: 45000 })
  const targets = root.locator('.island-targets')
  await expect(targets.getByRole('button')).toHaveCount(5)
  await expect(root.locator('[data-island-reserved]')).toHaveCount(2)
  await expect(root.locator('.island-panels h2')).toHaveText([
    '想法',
    '笔记',
    '宅',
  ])
  await expect(root.locator('.island-links line')).toHaveCount(5)
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
        sections[1].bottom - bounds.bottom,
        sections[2].right - bounds.right,
        sections[2].bottom - bounds.bottom,
      ],
      gap: sections[2].left - sections[0].right,
      noteGap: sections[1].top - sections[0].bottom,
      reservedHeight: reserved[0].height,
      reservedGap: sections[0].top - reserved[0].bottom,
      z: {
        panels: +getComputedStyle(panel).zIndex,
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
      ).map((line) => {
        const group = panel.querySelector<HTMLElement>(
          `[data-flash-item="${line.parentElement!.getAttribute(
            'data-link-item'
          )}"]`
        )!
        const rect = group.getBoundingClientRect()
        return (
          line.y1.baseVal.value -
          (rect.top + rect.height / 2 - element.getBoundingClientRect().top)
        )
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
        panel.querySelectorAll('.island-window--notes .island-item')
      ).map((item) => ({
        left: item.getBoundingClientRect().left,
        top: item.getBoundingClientRect().top,
        right: item.getBoundingClientRect().right,
      })),
    }
  })
  expect(geometry.inset.every((value) => value >= 16)).toBe(true)
  expect(geometry.fill.every((value) => Math.abs(value) <= 1)).toBe(true)
  expect(geometry.gap).toBeGreaterThanOrEqual(
    info.project.name.includes('mobile') ? 40 : 64
  )
  expect(geometry.noteGap).toBeGreaterThan(0)
  expect(geometry.reservedHeight).toBeGreaterThanOrEqual(64)
  expect(geometry.reservedGap).toBeGreaterThan(0)
  expect(geometry.inset[2]).toBeGreaterThanOrEqual(
    info.project.name.includes('mobile') ? 114 : 124
  )
  geometry.originOffsets.forEach((offset) =>
    expect(Math.abs(offset)).toBeLessThanOrEqual(1)
  )
  geometry.modules.forEach((module) => {
    expect(module.border).toBe('0px')
    expect(module.gap).toBeGreaterThanOrEqual(12)
  })
  expect(
    Math.abs(geometry.notes[0].top - geometry.notes[1].top)
  ).toBeLessThanOrEqual(1)
  expect(
    geometry.notes[1].left - geometry.notes[0].right
  ).toBeGreaterThanOrEqual(12)
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
  expect(geometry.anchors['STUDY NOTES'].x).toBeLessThan(
    geometry.anchors.MISCELLANY.x
  )
  expect(geometry.anchors.COLLECTIBLES.x).toBeGreaterThan(
    geometry.anchors.MISCELLANY.x
  )
  expect(geometry.anchors.LABORATORY.x).toBeLessThan(
    geometry.anchors.MISCELLANY.x
  )
  expect(geometry.anchors['GAME LIBRARY'].x).toBeGreaterThan(
    geometry.anchors.MISCELLANY.x
  )
  expect(geometry.anchors.LABORATORY.y).toBeLessThan(
    geometry.anchors.MISCELLANY.y
  )
  expect(geometry.anchors['GAME LIBRARY'].y).toBeLessThan(
    geometry.anchors.MISCELLANY.y
  )
  for (const heading of geometry.headings) {
    expect(heading.fill).toBe('rgb(0, 0, 0)')
    expect(heading.font).toContain('UnboundedSans')
    expect(heading.weight).toBe('400')
    expect(heading.size).toBe(
      info.project.name.includes('mobile') ? '51px' : '60px'
    )
    expect(heading.mask).toBe('none')
    expect(heading.overlayMask).toContain('linear-gradient')
    expect(heading.opacity).toBe('1')
    expect(heading.overflowTop).toBeGreaterThan(0)
    expect(heading.background).toBe('rgba(0, 0, 0, 0)')
  }
  await targets.getByRole('button', { name: '学习笔记', exact: true }).hover()
  await expect(
    root.locator('.island-panels .island-window--notes .island-window__bar')
  ).toHaveCSS('color', 'rgb(29, 203, 169)')
  await expect(root.locator('.island-window--notes h2')).toHaveCSS(
    '-webkit-text-fill-color',
    'rgb(0, 0, 0)'
  )
  expect(
    await root
      .locator('.island-window--notes h2')
      .evaluate(
        (title) => getComputedStyle(title, '::after').webkitTextFillColor
      )
  ).toBe('rgb(29, 203, 169)')
  await expect(root.locator('.island-window__code')).toHaveCount(0)
  await expect(root.locator('[data-flash-item="STUDY NOTES"]')).toHaveCSS(
    'color',
    'rgb(29, 203, 169)'
  )
  await expect(root.locator('[data-flash-item="MISCELLANY"]')).toHaveCSS(
    'color',
    'rgb(226, 52, 86)'
  )
  await expect(root.locator('[data-flash-item="STUDY NOTES"] img')).toHaveCSS(
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
  await targets.getByRole('button', { name: '学习笔记', exact: true }).hover()
  await expect(root.locator('[data-link-item="STUDY NOTES"]')).toHaveCSS(
    'color',
    'rgb(29, 203, 169)'
  )
  await expect(root.locator('[data-link-item="MISCELLANY"]')).toHaveCSS(
    'color',
    'rgb(226, 52, 86)'
  )
  await expect(root.locator('[data-link-item="LABORATORY"]')).toHaveCSS(
    'color',
    'rgb(226, 52, 86)'
  )
  await page.evaluate(() => {
    const app = document.querySelector('#app') as any
    app.__vue_app__.config.globalProperties.$i18n.locale = 'en'
  })
  await expect(root.locator('.island-panels h2')).toHaveText([
    'IDEAS',
    'NOTES',
    'OTAKU',
  ])
  await page.screenshot({
    path: `/tmp/anutrium-island-final-${info.project.name}.png`,
  })
})

test('Island flashes twice before navigating and preserves leave geometry', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
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
  await expect(page).toHaveURL(/\/404$/)
  // Capture the old page and route container until unmount, including the leave transition.
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.island-focus')).toBeVisible({ timeout: 45000 })
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
  await page.locator('[data-island-item="STUDY NOTES"]').click()
  await expect(page).toHaveURL(/\/island\/study-notes$/)
  await expect(page.locator('.study-notes-page')).toBeVisible({
    timeout: 15000,
  })
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
  await page.locator('.detail-page-header__back').click()
  await expect(page).toHaveURL(/\/island$/)
  await expect(page.locator('.island-focus')).toBeVisible({ timeout: 45000 })
  await page.locator('[data-island-item="COLLECTIBLES"]').click()
  await expect(page).toHaveURL(/\/island\/merch$/)
  await expect(page.locator('.merch-page')).toBeVisible({ timeout: 20000 })
})
