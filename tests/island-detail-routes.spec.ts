import { expect, test } from './helpers/sceneDiagnostics'

const modules = [
  ['/atrium/laboratory', 'LABORATORY', 'left'],
  ['/atrium/notes', 'NOTES', 'left'],
  ['/atrium/games', 'GAME LIBRARY', 'right'],
  ['/atrium/collections', 'COLLECTIBLES', 'right'],
] as const

test('Island modules support direct URLs, refresh, and pointer-driven heads', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const [path, id, side] of modules) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const root = page.locator('.island-focus')
    const stage = page.locator('.temple-stage')
    await expect(root).toHaveAttribute('data-detail-item', id, {
      timeout: 45000,
    })
    await expect(root).toHaveAttribute('data-detail-phase', 'detail')
    await expect(stage).toHaveAttribute('data-island-detail-module', id)
    await expect(root).toHaveAttribute('data-detail-side', side)
    await expect(root.locator('.island-detail')).toBeVisible()
    await expect(
      root.locator('.island-links [data-link-item]:visible')
    ).toHaveCount(1)
    const marker = await root
      .locator(`[data-link-item="${id}"] .island-anchor__frame`)
      .boundingBox()
    expect(marker!.width).toBeGreaterThanOrEqual(64)
    const titleLayout = await root
      .locator('.island-panels .island-window:visible')
      .evaluate((element) => {
        const bar = element
          .querySelector('.island-window__bar')!
          .getBoundingClientRect()
        const card = Array.from(element.querySelectorAll('.island-item')).find(
          (e) => e.getClientRects().length
        )!
        const title = card.querySelector('.island-item__title')!
        return {
          ratio: bar.width / element.getBoundingClientRect().width,
          inset:
            title.getBoundingClientRect().left -
            card.getBoundingClientRect().left,
          size: parseFloat(getComputedStyle(title).fontSize),
        }
      })
    expect(titleLayout.ratio).toBeLessThan(0.25)
    expect(titleLayout.inset).toBeGreaterThanOrEqual(15)
    expect(titleLayout.size).toBeGreaterThanOrEqual(18)
    await expect(
      root.locator(
        '.island-panels .island-window:visible .island-window__glyph'
      )
    ).toHaveText(side === 'right' ? '◀' : '▶')
    const [before, after] = await page.evaluate(async () => {
      const stage = document.querySelector<HTMLElement>('.temple-stage')!
      const move = async (x: number, y: number) => {
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: innerWidth * x,
            clientY: innerHeight * y,
            pointerType: 'mouse',
            bubbles: true,
          })
        )
        await new Promise((resolve) => setTimeout(resolve, 160))
        return stage.dataset.statueHeadPointer
      }
      return [await move(0.2, 0.3), await move(0.8, 0.65)]
    })
    expect(before).not.toBe(after)
    const focusedFrame = await root
      .locator(`[data-link-item="${id}"] .island-anchor__frame`)
      .boundingBox()
    expect(focusedFrame!.x).toBeGreaterThanOrEqual(-1)
    expect(focusedFrame!.x + focusedFrame!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1
    )
    await expect(root.locator('.island-links .is-active')).toHaveCount(0)
    const rotation = (await stage.getAttribute('data-statue-body-rotation'))!
      .split(',')
      .map(Number)
    expect(rotation[1]).toBeCloseTo(
      id === 'COLLECTIBLES'
        ? Math.PI
        : side === 'left'
        ? -Math.PI / 2
        : Math.PI / 2,
      2
    )
  }
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.island-focus')).toHaveAttribute(
    'data-detail-item',
    'COLLECTIBLES',
    { timeout: 45000 }
  )
})

test('Island history restores the same scene and module', async ({ page }) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/notes', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/atrium\/notes$/)
  const root = page.locator('.island-focus')
  await expect(root).toHaveAttribute('data-detail-item', 'NOTES', {
    timeout: 45000,
  })
  await page.evaluate(() => {
    ;(window as any).retainedIslandCanvas = document.querySelector(
      '.temple-stage canvas'
    )
  })
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/atrium$/)
  await expect(root).toHaveAttribute('data-detail-phase', 'overview')
  await page.locator('[data-island-item="GAME LIBRARY"]').click()
  await expect(page).toHaveURL(/\/atrium\/games$/)
  await expect(root).toHaveAttribute('data-detail-item', 'GAME LIBRARY')
  await page.goBack()
  await expect(root).toHaveAttribute('data-detail-phase', 'overview')
  await page.goForward()
  await expect(root).toHaveAttribute('data-detail-item', 'GAME LIBRARY')
  expect(
    await page.evaluate(
      () =>
        (window as any).retainedIslandCanvas ===
        document.querySelector('.temple-stage canvas')
    )
  ).toBe(true)
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/atrium\/collections$/)
  await expect(root).toHaveAttribute('data-detail-item', 'COLLECTIBLES', {
    timeout: 45000,
  })
})

test('Island CRT transitions restore the selected card immediately and reveal siblings during restoration', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus')
  await expect(root).toBeVisible({ timeout: 45000 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>('[data-island-item="LABORATORY"]')!
      .click()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
  })
  await expect(root).toHaveAttribute('data-detail-phase', 'overview')
  await expect(page).toHaveURL(/\/atrium$/)
  const item = root.locator('[data-flash-item="LABORATORY"]')
  const sibling = root.locator('[data-flash-item="NOTES"]')
  const original = await item.boundingBox()
  await page
    .locator('[data-island-item="LABORATORY"]')
    .evaluate((e) => (e as HTMLButtonElement).click())
  await expect(sibling).toHaveCSS('animation-name', 'anutriumCrtOff')
  await expect(root).toHaveAttribute('data-detail-phase', 'detail')
  await expect(root.locator('.island-detail')).toBeVisible()
  await page.waitForTimeout(900)
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.island-focus')!
    const sibling = root.querySelector('[data-flash-item="NOTES"]')!
    const item = root.querySelector('[data-flash-item="LABORATORY"]')!
    const trace: any[] = []
    ;(window as any).returnTransitionTrace = trace
    const observer = new MutationObserver(() => {
      trace.push({
        phase: root.dataset.detailPhase,
        time: performance.now(),
        animation: getComputedStyle(sibling).animationName,
        visibility: getComputedStyle(sibling).visibility,
        height: item.getBoundingClientRect().height,
      })
      if (root.dataset.detailPhase === 'overview') observer.disconnect()
    })
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-detail-phase'],
    })
  })
  const returnRequested = await page.evaluate(() => performance.now())
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-detail-phase', 'overview', {
    timeout: 10000,
  })
  const trace = await page.evaluate(() => (window as any).returnTransitionTrace)
  const restoring = trace.find((entry: any) => entry.phase === 'restoring')
  const revealing = trace.find((entry: any) => entry.phase === 'revealing')
  expect(restoring.time - returnRequested).toBeLessThan(400)
  expect(revealing.time - restoring.time).toBeGreaterThanOrEqual(750)
  expect(revealing.time - restoring.time).toBeLessThan(1500)
  expect(restoring.visibility).toBe('hidden')
  expect(revealing.animation).toBe('anutriumCrtOn')
  expect(
    Math.abs((await item.boundingBox())!.height - original!.height)
  ).toBeLessThanOrEqual(1)
  await expect(sibling).toBeVisible()
  expect(await page.evaluate(() => document.body.scrollTop)).toBe(0)
})

test('legacy list pages are removed while collection detail remains addressable', async ({
  page,
}) => {
  for (const path of ['/atrium/study-notes', '/atrium/merch']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/404$/)
  }
})
