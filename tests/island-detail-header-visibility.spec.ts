import { expect, test } from './helpers/sceneDiagnostics'

test('detail title remains visible and centered after the opening animation', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  const entry = page.locator('[data-island-item="COLLECTIBLES"]')
  await expect(entry).toBeVisible({ timeout: 45000 })
  await page.evaluate(() => document.fonts.ready)
  await entry.click()
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  const window = root.locator('.island-panels .island-window:visible')
  await expect(root).toHaveAttribute('data-detail-phase', 'detail')
  const ratios = await root.evaluate(async (element) => {
    const values: number[] = []
    const started = performance.now()
    await new Promise<void>((resolve) => {
      const sample = () => {
        const window = element.querySelector<HTMLElement>(
          '.island-window--interests'
        )!
        const item = Array.from(window.querySelectorAll('.island-item')).find(
          (e) => e.getClientRects().length
        )!
        const title = item
          .querySelector('.island-item__title-text')!
          .getBoundingClientRect()
        const header = window.getBoundingClientRect()
        if (header.width > 1) values.push(title.width / header.width)
        if (performance.now() - started >= 800) resolve()
        else requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    return values
  })
  expect(ratios.length).toBeGreaterThan(2)
  expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(0.01)
  await expect
    .poll(
      async () =>
        (
          await window
            .locator('.island-item:visible .island-item__title-text')
            .boundingBox()
        )?.width ?? 0
    )
    .toBeGreaterThan(15)
  await expect
    .poll(() =>
      window.evaluate((element) => {
        const item = Array.from(element.querySelectorAll('.island-item')).find(
          (e) => e.getClientRects().length
        )!
        const title = item
          .querySelector('.island-item__title-text')!
          .getBoundingClientRect()
        const header = element.getBoundingClientRect()
        return Math.abs(
          (title.left + title.right - header.left - header.right) / 2
        )
      })
    )
    .toBeLessThanOrEqual(1)
})
