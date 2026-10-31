import { expect, test } from '@playwright/test'

test('Atrium submenu opens each detail from another scene module across the full link row', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', '桌面导航仅在桌面端显示')
  test.setTimeout(180000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const [slug, module] of [
    ['laboratory', 'LABORATORY'],
    ['notes', 'NOTES'],
    ['games', 'GAME LIBRARY'],
    ['collections', 'COLLECTIBLES'],
  ]) {
    await page.goto('/creative', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 45000 }
    )
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
    await page.locator('[data-temple-nav="statue"]').hover()
    const menu = page.locator('.atrium-submenu')
    const link = menu.locator(`a[href="/atrium/${slug}"]`)
    await expect(link).toBeVisible()
    const row = await link.boundingBox()
    const bounds = await menu.boundingBox()
    expect(Math.abs(row!.x - bounds!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(row!.width - bounds!.width)).toBeLessThanOrEqual(1)
    await link.hover({ position: { x: 2, y: row!.height / 2 } })
    expect(await link.evaluate((element) => element.matches(':hover'))).toBe(
      true
    )
    await expect
      .poll(() =>
        link
          .locator('.atrium-submenu-title')
          .evaluate((element) => getComputedStyle(element, '::after').opacity)
      )
      .toBe('1')
    await link.click({ position: { x: 2, y: row!.height / 2 } })
    const root = page.locator('.island-focus:not(.island-closing-snapshot)')
    await expect(root).toHaveAttribute('data-detail-item', module, {
      timeout: 45000,
    })
    await expect(root).toHaveAttribute('data-detail-phase', 'detail')
    await expect(root.locator('.island-detail')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/atrium/${slug}$`))
  }
})

test('selecting an Atrium submenu closes it until the next deliberate interaction', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', '桌面导航仅在桌面端显示')
  test.setTimeout(60000)
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 45000,
  })
  const trigger = page.locator('[data-temple-nav="statue"]')
  const menu = page.locator('.atrium-submenu')
  await trigger.hover()
  await expect(menu).toBeVisible()
  await menu.locator('a[href="/atrium/notes"]').click()
  await expect(page).toHaveURL(/\/atrium\/notes$/)
  await expect(page.locator('.route-curtain')).toHaveCount(0)
  await expect(page.locator('.island-focus')).toHaveAttribute(
    'data-detail-item',
    'NOTES',
    { timeout: 45000 }
  )
  await expect(menu).toBeHidden()
  await page.mouse.move(0, 0)
  await trigger.hover()
  await expect(menu).toBeVisible()
  await menu.locator('a[href="/atrium/collections"]').focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/atrium\/collections$/)
  await expect(page.locator('.route-curtain')).toHaveCount(0)
  await expect(menu).toBeHidden()
  await expect(trigger).toBeEnabled({ timeout: 45000 })
  await trigger.focus()
  await expect(menu).toBeVisible()
})

test('Atrium submenu has the same placement and overlays neighboring navigation on both layouts', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', '桌面导航仅在桌面端显示')
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const snapshots = []
  for (const path of ['/flanerie/changsha', '/atrium/collections']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const trigger = page.locator('[data-temple-nav="statue"]')
    await expect(trigger).toBeVisible({ timeout: 45000 })
    await expect(trigger).toBeEnabled({ timeout: 45000 })
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 45000,
    })
    await trigger.focus()
    const menu = page.locator('.atrium-submenu')
    await expect(menu).toBeVisible()
    await page.waitForTimeout(400)
    snapshots.push(
      await menu.evaluate((element) => {
        const trigger =
          element.parentElement!.querySelector<HTMLElement>(
            '.temple-nav-action'
          )!
        const sibling =
          element.parentElement!.previousElementSibling!.querySelector<HTMLElement>(
            '.temple-nav-action'
          )!
        const box = element.getBoundingClientRect()
        const anchor = trigger.getBoundingClientRect()
        const backdrop = getComputedStyle(element, '::before')
        return {
          gap: box.top - anchor.bottom,
          width: box.width,
          height: box.height,
          padding: getComputedStyle(element).padding,
          backdropTop: Number.parseFloat(backdrop.top),
          blur: backdrop.backdropFilter,
          mask: backdrop.maskImage,
          menuZ: Number(getComputedStyle(element).zIndex),
          triggerZ: Number(getComputedStyle(trigger).zIndex),
          siblingZ: Number(getComputedStyle(sibling).zIndex),
        }
      })
    )
  }
  const [other, atrium] = snapshots
  for (const key of ['gap', 'width', 'height', 'backdropTop'] as const)
    expect(Math.abs(other[key] - atrium[key]), key).toBeLessThanOrEqual(1)
  expect(other.padding).toBe(atrium.padding)
  expect(other.blur).toMatch(/^blur\((?!0px)/)
  expect(other.mask).toBe('none')
  expect(other.menuZ).toBeGreaterThan(other.siblingZ)
  expect(other.triggerZ).toBeGreaterThan(other.menuZ)
})

test('scrolled detail header does not block the Atrium submenu', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', '桌面导航仅在桌面端显示')
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const trigger = page.locator('[data-temple-nav="statue"]')
  await expect(trigger).toBeVisible({ timeout: 45000 })
  await page.evaluate(() =>
    document.body.scrollTo({ top: 800, behavior: 'instant' })
  )
  await expect(page.locator('.detail-page-header--compact')).toBeVisible()
  await trigger.hover()
  const link = page.locator('.atrium-submenu-link').first()
  await expect(link).toBeVisible()
  await link.hover()
  await expect(link).toBeVisible()
  expect(await link.evaluate((element) => element.matches(':hover'))).toBe(true)
})
