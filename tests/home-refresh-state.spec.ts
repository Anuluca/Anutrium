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

test('refresh after detail menu navigation restores the initial home without a click', async ({
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
  await expectInitialHome(page, mobile)
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
