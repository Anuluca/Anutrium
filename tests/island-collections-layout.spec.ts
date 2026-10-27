import { expect, test } from './helpers/sceneDiagnostics'

test('收藏品按行排列展架，展开和收起保留滚动位置', async ({ page }, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const content = page.locator('.island-collections-content')
  await expect(content).toBeVisible({ timeout: 45000 })
  const button = page.getByRole('button', { name: '展开全屏内容', exact: true })
  await expect(button).toBeEnabled()
  const mobile = info.project.name.includes('mobile')
  const readLayout = () =>
    content.evaluate((element) => {
      return Array.from(element.querySelectorAll('.collection-grid')).map(
        (grid) => {
          const cards = Array.from(
            grid.querySelectorAll('.collection-card-entry')
          )
          const shelves = Array.from(
            grid.querySelectorAll('.collection-grid__row-shelf')
          )
          const columns =
            getComputedStyle(grid).gridTemplateColumns.split(' ').length
          return {
            columns,
            cards: cards.length,
            shelves: shelves.length,
            rows: cards.map((card) =>
              Math.round(card.getBoundingClientRect().top)
            ),
            overflow: grid.scrollWidth - grid.clientWidth,
          }
        }
      )
    })
  const verify = async (columns: number) => {
    for (const grid of await readLayout()) {
      expect(grid.columns).toBe(columns)
      expect(grid.shelves).toBe(Math.ceil(grid.cards / columns))
      expect(grid.overflow).toBeLessThanOrEqual(1)
      if (grid.cards >= columns)
        expect(new Set(grid.rows.slice(0, columns)).size).toBe(1)
      if (grid.cards > columns)
        expect(grid.rows[columns]).toBeGreaterThan(grid.rows[0])
    }
  }
  await verify(mobile ? 1 : 4)
  const panel = page.locator('.island-panels .island-window--interests')
  const before = await panel.boundingBox()
  const scroll = page.locator(
    '.island-detail__viewport .scroll-viewport__scroll'
  )
  await scroll.evaluate((element) => {
    element.scrollTop = 40
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await button.click()
  const collapse = page.getByRole('button', {
    name: '恢复半屏内容',
    exact: true,
  })
  await expect(collapse).toBeEnabled()
  await expect(collapse).toHaveAttribute('aria-expanded', 'true')
  await verify(mobile ? 1 : 5)
  expect((await panel.boundingBox())!.width).toBeGreaterThan(before!.width)
  expect(await scroll.evaluate((element) => element.scrollTop)).toBe(40)
  await page.screenshot({
    path: `/tmp/atrium-collections-expanded-${info.project.name}.png`,
  })
  await collapse.click()
  await expect(button).toBeEnabled()
  await verify(mobile ? 1 : 4)
  expect(await scroll.evaluate((element) => element.scrollTop)).toBe(40)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/atrium$/)
  await expect(page.locator('.island-focus')).not.toHaveClass(
    /has-collections-expanded/
  )
})
