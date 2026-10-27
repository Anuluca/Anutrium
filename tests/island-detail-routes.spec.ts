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
    await expect(
      root.locator(`[data-link-item="${id}"] .island-anchor__frame`)
    ).toBeVisible()
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
          size: parseFloat(getComputedStyle(title).fontSize),
        }
      })
    expect(titleLayout.ratio).toBeGreaterThan(0.1)
    expect(titleLayout.ratio).toBeLessThan(0.15)
    expect(titleLayout.size).toBeGreaterThanOrEqual(18)
    await expect
      .poll(() =>
        root
          .locator('.island-panels .island-window:visible')
          .evaluate((element) => {
            const item = Array.from(
              element.querySelectorAll('.island-item')
            ).find((e) => e.getClientRects().length)!
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
    await expect
      .poll(
        async () =>
          (
            await root
              .locator('.island-item:visible .island-item__title-text')
              .boundingBox()
          )?.width ?? 0
      )
      .toBeGreaterThan(15)
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

test('Island switches cards and detail through CRT without layout movement', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  await expect(root).toBeVisible({ timeout: 45000 })
  await expect(root).toHaveAttribute('data-opening', 'false')
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.island-focus')!
    const trace: any[] = []
    ;(window as any).islandCrtTrace = trace
    const observer = new MutationObserver(() => {
      const phase = root.dataset.detailPhase
      const selected = root.querySelector<HTMLElement>(
        '[data-flash-item="LABORATORY"]'
      )!
      const sibling = root.querySelector<HTMLElement>(
        '[data-flash-item="NOTES"]'
      )!
      const ghost = document.querySelector<HTMLElement>(
        '.island-closing-snapshot [data-flash-item="LABORATORY"]'
      )
      const detail = root.querySelector<HTMLElement>('.island-window--ideas')!
      trace.push({
        phase,
        time: performance.now(),
        siblingAnimation: getComputedStyle(sibling).animationName,
        selectedAnimation: getComputedStyle(selected).animationName,
        ghostAnimation: ghost && getComputedStyle(ghost).animationName,
        detailAnimation: getComputedStyle(detail).animationName,
        detailPresent: !!root.querySelector('.island-detail'),
        titleTransform: (
          root.querySelector('.island-item__title-text') as HTMLElement
        ).style.transform,
      })
    })
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-detail-phase'],
    })
    document
      .querySelector<HTMLButtonElement>('[data-island-item="LABORATORY"]')!
      .click()
  })
  await expect(root).toHaveAttribute('data-detail-phase', 'detail')
  const trace = await page.evaluate(() => (window as any).islandCrtTrace)
  const leaving = trace.find((entry: any) => entry.phase === 'leaving')
  const detail = trace.find((entry: any) => entry.phase === 'detail')
  expect(leaving.siblingAnimation).toBe('anutriumCrtOff')
  expect(leaving.selectedAnimation).toBe('none')
  expect(detail.time - leaving.time).toBeGreaterThanOrEqual(200)
  expect(detail.ghostAnimation).toBe('anutriumCrtOff')
  expect(detail.detailAnimation).toBe('anutriumCrtOn')
  expect(detail.detailPresent).toBe(true)
  expect(detail.titleTransform).toBe('')
  const modelYaw = async () => {
    const rotation = await page
      .locator('.temple-stage')
      .getAttribute('data-statue-body-rotation')
    return Number(rotation?.split(',')[1])
  }
  await page.waitForTimeout(100)
  const enteringYaw = await modelYaw()
  expect(enteringYaw).toBeLessThan(0)
  expect(enteringYaw).toBeGreaterThan(-Math.PI / 2 + 0.01)
  await expect(page.locator('.island-closing-snapshot')).toHaveCount(0)
  await expect(root.locator('[data-island-group="ideas"]')).toHaveCSS(
    'animation-name',
    'none'
  )
  await expect(root.locator('.island-detail')).toBeVisible()
  await page.screenshot({
    path: `/tmp/atrium-crt-detail-${info.project.name}.png`,
  })
  await expect.poll(modelYaw).toBeCloseTo(-Math.PI / 2, 3)
  await root.evaluate((element) => {
    const endings: { element: HTMLElement; opacity: number }[] = []
    ;(window as any).returnCrtOpacity = endings
    element.addEventListener('animationend', (event) => {
      const animation = event as AnimationEvent
      const target = animation.target as HTMLElement
      if (
        animation.animationName === 'anutriumCrtOn' &&
        target.matches('.island-item, .island-window__bar')
      )
        endings.push({
          element: target,
          opacity: Number(getComputedStyle(target).opacity),
        })
    })
  })
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-detail-phase', 'revealing')
  await page.waitForTimeout(100)
  const returningYaw = await modelYaw()
  expect(returningYaw).toBeGreaterThan(-Math.PI / 2)
  expect(returningYaw).toBeLessThan(-0.01)
  await expect(root.locator('[data-flash-item="LABORATORY"]')).toHaveCSS(
    'animation-name',
    'anutriumCrtOn'
  )
  await expect(root).toHaveAttribute('data-detail-phase', 'overview')
  const opacityChanges = await page.evaluate(() =>
    (window as any).returnCrtOpacity.map(
      ({ element, opacity }: { element: HTMLElement; opacity: number }) =>
        Math.abs(Number(getComputedStyle(element).opacity) - opacity)
    )
  )
  expect(opacityChanges.length).toBeGreaterThanOrEqual(4)
  for (const delta of opacityChanges) expect(delta).toBeLessThanOrEqual(0.01)
  await expect(page.locator('.island-closing-snapshot')).toHaveCount(0)
  await expect.poll(modelYaw).toBeCloseTo(0, 3)
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
