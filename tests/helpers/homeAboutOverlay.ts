import type { Page } from '@playwright/test'

export async function openHomeAboutOverlay(page: Page) {
  const dismissAlert = page.locator(
    '.mobile-experience-alert .el-alert__close-btn'
  )
  if (await dismissAlert.isVisible()) await dismissAlert.click()
  const cornerAbout = page.locator('.home-about-action')
  if (await cornerAbout.isVisible()) {
    const openMenu = page.locator('.mobile-menu-icon[aria-expanded="true"]')
    if (await openMenu.isVisible()) await openMenu.click()
    await cornerAbout.click()
    return
  }
  if (await page.locator('.temple-page').count()) {
    // 模块内已无 About 按钮；背景休眠用例通过状态入口保留当前模块进行验证。
    await page.evaluate(() => {
      const app = document.querySelector('#app') as HTMLElement & {
        __vue_app__: {
          config: {
            globalProperties: {
              $pinia: {
                state: { value: Record<string, { aboutOpen: boolean }> }
              }
            }
          }
        }
      }
      app.__vue_app__.config.globalProperties.$pinia.state.value[
        'temple-navigation'
      ].aboutOpen = true
    })
    return
  }
  const toggle = page.locator('.mobile-menu-icon[aria-expanded="false"]')
  if (await toggle.isVisible()) await toggle.click()
  await page.locator('.temple-nav-action[data-temple-nav="about"]').click()
}
