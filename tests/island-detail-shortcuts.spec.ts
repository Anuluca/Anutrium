import { expect, test } from './helpers/sceneDiagnostics'

test('characters slide inside individual masks and keep both alignments', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const nav = page.locator(
    '.island-focus:not(.island-closing-snapshot) .island-detail-nav'
  )
  const first = nav.locator('.island-detail-nav__label').first()
  await expect(nav).toBeAttached({ timeout: 45000 })
  await expect
    .poll(
      async () => {
        return first
          .locator('.island-detail-nav__char')
          .first()
          .evaluate((char) => {
            const x = new DOMMatrix(getComputedStyle(char).transform).m41
            return x < -0.1 && x > -char.getBoundingClientRect().width
          })
      },
      { intervals: [20], timeout: 10000 }
    )
    .toBe(true)
  const offsets = await nav.evaluate(async (element) => {
    const root = element.closest<HTMLElement>('.island-focus')!
    const inset = parseFloat(getComputedStyle(element).left)
    const left =
      element.getBoundingClientRect().left -
      root.getBoundingClientRect().left -
      inset
    ;(element as HTMLElement).style.transition = 'none'
    element.classList.add('island-detail-nav--right')
    const readRight = () =>
      root.getBoundingClientRect().right -
      inset -
      element.getBoundingClientRect().right
    const right = readRight()
    await new Promise((resolve) => setTimeout(resolve, 300))
    return { left, right, rightAfterReveal: readRight() }
  })
  expect(Math.abs(offsets.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(offsets.right)).toBeLessThanOrEqual(1)
  expect(Math.abs(offsets.rightAfterReveal)).toBeLessThanOrEqual(1)
  await expect(nav.locator('.island-detail-nav__label')).toHaveText(
    ['LABORATORY', 'NOTES', 'GAMES', 'COLLECTIONS'],
    { timeout: 10000 }
  )
})

test('detail shortcuts follow the content side and navigate between modules', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  const nav = root.locator('.island-detail-nav')
  await expect(nav).toBeVisible({ timeout: 45000 })
  await expect(nav.locator('button')).toHaveCount(4)
  await expect(root).toHaveAttribute('data-detail-item', 'LABORATORY')
  await expect(nav.locator('button').first()).toHaveAttribute(
    'aria-current',
    'page'
  )
  const left = await nav.boundingBox()
  const bounds = await root.locator('.island-panels').boundingBox()
  expect(Math.abs(left!.x - bounds!.x)).toBeLessThanOrEqual(1)
  if (test.info().project.name === 'chromium')
    expect(
      Math.abs(left!.y + left!.height - bounds!.y - bounds!.height)
    ).toBeLessThanOrEqual(1)

  await nav.getByRole('button', { name: 'COLLECTIONS' }).click()
  await expect(page).toHaveURL(/\/atrium\/collections$/)
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute(
    'aria-label',
    'COLLECTIONS'
  )
  const right = await nav.boundingBox()
  await expect(nav.locator('.island-detail-nav__label')).toHaveText([
    'LABORATORY',
    'NOTES',
    'GAMES',
    'COLLECTIONS',
  ])
  const wrapping = await nav
    .locator('.island-detail-nav__label')
    .evaluateAll((labels) =>
      labels.map((label) => getComputedStyle(label).whiteSpace)
    )
  expect(wrapping.every((value) => value === 'nowrap')).toBe(true)
  const rightBounds = await root.locator('.island-panels').boundingBox()
  expect(
    Math.abs(right!.x + right!.width - rightBounds!.x - rightBounds!.width)
  ).toBeLessThanOrEqual(1)
  if (test.info().project.name === 'mobile-chrome') {
    const panel = await root.locator('.island-panels').boundingBox()
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(right!.y)
  }
})

test('shortcut hover flashes and click waits for the flash', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', '悬停交互仅在桌面端验证')
  test.setTimeout(90000)
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  const link = root.locator('.island-detail-nav').getByRole('button', {
    name: 'NOTES',
  })
  await expect(link).toBeVisible({ timeout: 45000 })
  await page.waitForTimeout(600)
  const opacity = await link.evaluate((button) => {
    button.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse' })
    )
    const element = button.querySelector<HTMLElement>(
      '.island-detail-nav__flash'
    )!
    const animation = element.getAnimations()[0]
    if (!animation) return []
    animation.pause()
    return [10, 50, 100, 145].map((time) => {
      animation.currentTime = time
      return Number(getComputedStyle(element).opacity)
    })
  })
  expect(opacity).toEqual([1, 0, 1, 0])
  await link.hover()
  await page.waitForTimeout(220)
  await expect(link).toHaveCSS(
    '-webkit-text-fill-color',
    'rgba(226, 52, 86, 0.25)'
  )
  await link.click()
  await expect(page).toHaveURL(/\/atrium\/laboratory$/)
  await expect(page).toHaveURL(/\/atrium\/notes$/)
})

test('shortcut characters retract left without changing text or row geometry', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const nav = page.locator(
    '.island-focus:not(.island-closing-snapshot) .island-detail-nav'
  )
  await expect(nav).toBeVisible({ timeout: 45000 })
  await expect(nav).not.toHaveClass(/enter-active/, { timeout: 10000 })
  const before = await nav.boundingBox()
  const sample = await nav.evaluate(async (element) => {
    const char = element.querySelector('.island-detail-nav__char')!
    const samples: Array<{ x: number; width: number; classes: string }> = []
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await new Promise<void>((resolve) => {
      const read = () => {
        if (!element.isConnected) return resolve()
        samples.push({
          x: new DOMMatrix(getComputedStyle(char).transform).m41,
          width: element.getBoundingClientRect().width,
          classes: element.className,
        })
        requestAnimationFrame(read)
      }
      read()
    })
    return samples
  })
  expect(
    sample.some((value) => value.x < 0),
    JSON.stringify(sample)
  ).toBe(true)
  expect(
    sample.every((value) => Math.abs(value.width - before!.width) <= 1)
  ).toBe(true)
  await expect(nav).toHaveCount(0, { timeout: 10000 })
  await expect(page).toHaveURL(/\/atrium$/)
})

test('right-side shortcuts stay right-aligned while disappearing', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  const nav = root.locator('.island-detail-nav')
  await expect(nav).toBeVisible({ timeout: 45000 })
  await page.waitForTimeout(2300)
  const edges = await nav.evaluate(async (element) => {
    const right = element.getBoundingClientRect().right
    const deltas: number[] = []
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await new Promise<void>((resolve) => {
      const read = () => {
        if (!element.isConnected) return resolve()
        deltas.push(Math.abs(element.getBoundingClientRect().right - right))
        requestAnimationFrame(read)
      }
      read()
    })
    return deltas
  })
  expect(edges.length).toBeGreaterThan(1)
  expect(Math.max(...edges)).toBeLessThanOrEqual(1)
  await expect(nav).toHaveCount(0, { timeout: 10000 })
})

test('shortcut hover hitboxes match each visible row on both sides', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', '悬停交互仅适用于桌面端')
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  const nav = root.locator('.island-detail-nav')
  await expect(nav).toBeVisible({ timeout: 45000 })
  for (const target of ['/atrium/laboratory', '/atrium/collections']) {
    if (target !== '/atrium/laboratory') {
      await page.evaluate(
        (path) =>
          (
            document.querySelector('#app') as any
          ).__vue_app__.config.globalProperties.$router.push(path),
        target
      )
      await expect(page).toHaveURL(target)
    }
    await expect(nav.locator('.island-detail-nav__label')).toHaveText([
      'LABORATORY',
      'NOTES',
      'GAMES',
      'COLLECTIONS',
    ])
    const rows = await nav.locator('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const bounds = button.getBoundingClientRect()
        const labelBounds = button
          .querySelector('.island-detail-nav__label')!
          .getBoundingClientRect()
        const hits = [0.1, 0.5, 0.9].map((fraction) => {
          const hit = document.elementFromPoint(
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height * fraction
          )
          return hit?.closest('button') === button
        })
        return {
          topDelta: labelBounds.top - bounds.top,
          bottomDelta: labelBounds.bottom - bounds.bottom,
          hits,
        }
      })
    )
    for (const row of rows) {
      expect(Math.abs(row.topDelta)).toBeLessThanOrEqual(1)
      expect(Math.abs(row.bottomDelta)).toBeLessThanOrEqual(1)
      expect(row.hits).toEqual([true, true, true])
    }
  }
})
