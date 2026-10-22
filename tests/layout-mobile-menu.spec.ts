import { expect, test } from '@playwright/test'

test('mobile menu cancels a pending open and keeps About last without leaking its scroll lock', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '手机端菜单交互')
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  const toggle = page.locator('.mobile-menu-icon')
  await expect(toggle).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await expect(page.locator('.home-about-action')).toHaveCount(0)

  // 同一事件轮次内打开又关闭，覆盖 nextTick 尚未完成的竞态窗口。
  await toggle.evaluate((button: HTMLButtonElement) => {
    button.click()
    button.click()
  })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.mobile-menu-panel.active')).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('body')).toHaveClass(/mobile-menu-scroll-locked/)
  const lastItem = page.locator('.mobile-menu-items > button').last()
  await expect(lastItem).toHaveAttribute('data-temple-nav', 'about')
  await lastItem.click()
  await expect(page.locator('.about-overlay .about-page')).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('html')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )
  await expect(page.locator('body')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveCount(0)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(page.locator('.desktop-menu')).toBeVisible()
  await expect(page.locator('body')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )
})
