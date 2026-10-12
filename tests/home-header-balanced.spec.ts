import { expect, test } from '@playwright/test'

const order = [
  'archive',
  'flanerie',
  'statue',
  'sprigatito',
  'pokeyard',
  'island',
]
const titles = [
  'ARCHIVE',
  'FLÂNERIE',
  'ISLAND',
  'FLORATRIUM',
  'POKÉYARD',
  'CREATIVE',
]

test('desktop route hover animates the line in both menu groups', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '悬停动画用于桌面导航')
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 30000 }
  )

  for (const id of ['archive', 'sprigatito']) {
    const action = page.locator(`.desktop-menu [data-temple-nav="${id}"]`)
    const line = action.locator('.line')
    await expect(line).toHaveCSS('transform', 'matrix(0, 0, 0, 1, 0, 0)')
    await action.hover()
    const scales = await line.evaluate(async (element) => {
      const values: number[] = []
      // 采样动画过程，避免只有终态可见但填充动画仍失效。
      for (let frame = 0; frame < 40; frame++) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        )
        values.push(
          new DOMMatrixReadOnly(getComputedStyle(element).transform).a
        )
      }
      return values
    })
    expect(scales.some((scale) => scale > 0 && scale < 1)).toBe(true)
    await expect(line).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
    await expect(line).toHaveCSS('transition-duration', '0.5s')
    await page.mouse.move(720, 700)
    await expect(line).toHaveCSS('transform', 'matrix(0, 0, 0, 1, 0, 0)')
  }
})

test('focused desktop header keeps its full title centered with equal route gaps and aligned edge offsets', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '左右分组用于桌面导航')
  test.setTimeout(120000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 30000 }
  )
  const shell = page.locator('.layout-page')
  await expect(shell).toHaveClass(/temple-header-balanced/)
  await expect(page.locator('.desktop-menu')).toBeVisible()
  const aboutAction = page.locator(
    '.menu-box:not(.menu-box--right) [data-temple-nav="about"]'
  )
  await expect(aboutAction.locator('svg')).toBeVisible()
  await expect(aboutAction).toHaveText('')
  await expect(page.locator('.footer-about')).toHaveCount(0)
  for (const width of [1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 768 })
    for (const [index, id] of order.entries()) {
      await page.locator(`.desktop-menu [data-temple-nav="${id}"]`).click()
      await expect(page.locator('.current-module-name')).toHaveText(
        titles[index]
      )
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-selected',
        id
      )
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-settled',
        'true'
      )
      const layout = await shell.evaluate((element) => {
        const rect = (node: Element) => {
          const r = node.getBoundingClientRect()
          return { left: r.left, right: r.right, top: r.top, width: r.width }
        }
        const header = element.querySelector('.el-menu-layout-all')!
        const title = element.querySelector('.logo-box')!
        const routes = Array.from(
          element.querySelectorAll('.desktop-menu .temple-nav-action'),
          rect
        )
        const titleRect = rect(title)
        const titlePadding = parseFloat(getComputedStyle(title).paddingLeft)
        const gap = parseFloat(
          getComputedStyle(element.querySelector('.menu-box')!).columnGap
        )
        // 左侧入口对齐 Logo 图形的可见边缘，补偿 SVG 盒子内部的留白。
        element.classList.remove('temple-header-balanced')
        const previousTop = rect(title).top
        const previousLeft = rect(
          element.querySelector('.logo-box .logo')!
        ).left
        const headerStyle = getComputedStyle(header)
        const logoVisualInset =
          parseFloat(
            headerStyle.getPropertyValue('--header-logo-visual-inline-inset')
          ) * parseFloat(getComputedStyle(document.documentElement).fontSize)
        const last = element.querySelector('.desktop-menu-item:last-child')!
        const previousRight =
          rect(header).right -
          parseFloat(headerStyle.paddingRight) -
          parseFloat(getComputedStyle(last).paddingRight)
        element.classList.add('temple-header-balanced')
        return {
          routes,
          title: titleRect,
          titlePadding,
          gap,
          previousTop,
          previousLeft: previousLeft + logoVisualInset,
          previousRight,
        }
      })
      expect(
        Math.abs((layout.title.left + layout.title.right) / 2 - width / 2)
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(layout.title.top - layout.previousTop)
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(layout.routes[0].left - layout.previousLeft)
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(layout.routes[6].right - layout.previousRight)
      ).toBeLessThanOrEqual(1)
      for (const index of [1, 2, 3, 5, 6])
        expect(
          layout.routes[index].left - layout.routes[index - 1].right
        ).toBeCloseTo(layout.gap, 0)
      expect(layout.titlePadding).toBeGreaterThanOrEqual(15)
      expect(layout.title.left - layout.routes[3].right).toBeGreaterThanOrEqual(
        0
      )
      expect(layout.routes[4].left - layout.title.right).toBeGreaterThanOrEqual(
        0
      )
    }
  }
  await aboutAction.click()
  await expect(page.locator('.about-overlay')).toBeVisible()
  await expect(page.locator('.about-overlay .asset-credits')).toBeAttached()
  await expect(page.locator('.current-module-name')).toHaveText('ABOUT')
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(page.locator('.current-module-name')).toHaveText('CREATIVE')
  await page.locator('.logo-box').click()
  await expect(shell).toHaveClass(/temple-header-default/)
  await expect(page.locator('.desktop-menu')).toHaveCount(0)
  const logo = (await page.locator('.logo-box .logo').boundingBox())!
  expect(
    Math.abs(logo.x + logo.width / 2 - page.viewportSize()!.width / 2)
  ).toBeLessThanOrEqual(1)
})
