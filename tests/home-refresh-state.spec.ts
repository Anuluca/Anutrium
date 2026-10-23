import { expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('https://use.typekit.net/**', (route) => route.abort())
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

const expectInitialHome = async (page: Page, mobile: boolean) => {
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-mode',
    'full',
    { timeout: 30000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  await expect(page.locator('.layout-page')).toHaveClass(
    /temple-header-default/
  )
  await expect(
    page.locator(mobile ? '.mobile-menu-icon' : '.desktop-menu')
  ).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--page-theme-color')
          .trim()
      )
    )
    .toBe('#e23456')
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem('anutrium:flanerie:returning-from-detail')
      )
    )
    .toBeNull()
}

test('refresh after detail menu navigation retains the selected menu', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  const mobile = testInfo.project.name.includes('mobile')
  await page.goto('/flanerie/changsha?from=home', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.flr-page')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  if (mobile) await page.getByRole('button', { name: '切换导航菜单' }).click()
  await page.locator('[data-temple-nav="sprigatito"]').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito',
    { timeout: 30000 }
  )
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem('anutrium:flanerie:returning-from-detail')
      )
    )
    .toBeNull()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito',
    { timeout: 30000 }
  )
})

for (const selection of [
  'archive',
  'flanerie',
  'island',
  'pokeyard',
  'statue',
  'sprigatito',
]) {
  test(`refresh and same-tab revisit retain ${selection}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // 从不同的公开入口切换，覆盖地址仍为旧入口的情况。
    await page.goto(selection === 'island' ? '/flanerie' : '/creative', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 30000 }
    )
    if (testInfo.project.name.includes('mobile'))
      await page.getByRole('button', { name: '切换导航菜单' }).click()
    await page
      .locator(`[data-temple-nav="${selection}"]`)
      .first()
      .evaluate((element: HTMLElement) => element.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      selection,
      { timeout: 30000 }
    )
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      selection,
      { timeout: 30000 }
    )
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      selection,
      { timeout: 30000 }
    )
  })
}

test('About survives reload and closing it restores the remembered background', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/creative', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 30000 }
  )
  if (testInfo.project.name.includes('mobile'))
    await page.getByRole('button', { name: '切换导航菜单' }).click()
  await page
    .locator('[data-temple-nav="about"]')
    .first()
    .evaluate((element: HTMLElement) => element.click())
  await expect(page.locator('.about-overlay')).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.about-overlay')).toBeVisible({ timeout: 30000 })
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'island',
    { timeout: 30000 }
  )
})

test('HOME reset survives refresh and explicit module links override the memory', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/creative', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 30000 }
  )
  await page.locator('.logo-box').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none',
    { timeout: 30000 }
  )
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie',
    { timeout: 30000 }
  )
})

for (const entry of [
  { path: '/creative?isExpand=true&current=ILLUSTRATION', selection: 'island' },
  {
    path: '/?module=archive&isExpand=true&current=OTHER',
    selection: 'archive',
  },
  { path: '/flanerie?current=EVENTS', selection: 'flanerie' },
]) {
  test(`reset after ${entry.path} survives reload without replaying entry parameters`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(entry.path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      entry.selection,
      { timeout: 30000 }
    )
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 30000 }
    )
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 30000,
    })
    await page.locator('.logo-box').click()
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      'none'
    )
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(sessionStorage.getItem('anutrium:temple:session')!)
              .selection
        )
      )
      .toBeNull()
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(
      entry.path
    )
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'data-entrance-finished',
      'true',
      { timeout: 30000 }
    )
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      'none'
    )
    await expect(page.locator('.temple-page')).not.toHaveClass(
      /temple-page--expanded/
    )
    await expect(page.locator('.temple-menu')).toHaveCount(0)
    // 正常访问链接仍按 URL 进入，只有刷新相同地址才恢复当前场景。
    await page.goto(entry.path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      entry.selection,
      { timeout: 30000 }
    )
  })
}

test('new windows start at home even when opener sessionStorage is copied', async ({
  page,
  context,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito',
    { timeout: 30000 }
  )
  const popupPromise = page.waitForEvent('popup')
  await page.evaluate(() => window.open('/', '_blank'))
  const popup = await popupPromise
  await popup.emulateMedia({ reducedMotion: 'reduce' })
  await expect(popup.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await expect(popup.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none',
    { timeout: 30000 }
  )
  await popup.close()
  const freshTab = await context.newPage()
  await freshTab.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(freshTab.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 30000 }
  )
  await expect(freshTab.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none',
    { timeout: 30000 }
  )
  await freshTab.close()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito',
    { timeout: 30000 }
  )
})

test('initial home load discards a leftover journey return marker', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  // 模拟旧版本留下的会话状态，验证路由守卫在首页加载动画前完成清理。
  await page.addInitScript(() => {
    sessionStorage.setItem('anutrium:flanerie:returning-from-detail', 'true')
    sessionStorage.setItem('anutrium:flanerie:selected-vlog', 'changsha')
    sessionStorage.setItem('anutrium:flanerie:scroll-top', '1200')
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expectInitialHome(page, testInfo.project.name.includes('mobile'))
})
