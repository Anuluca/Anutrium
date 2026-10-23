import { expect, test } from '@playwright/test'

test('browser back restores flanerie after switching from the creative entry', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/creative', { waitUntil: 'domcontentloaded' })
  const home = page.locator('.temple-page')
  await expect(home).toHaveAttribute('data-selected', 'island', {
    timeout: 30000,
  })
  await expect(home).toHaveAttribute('data-settled', 'true', {
    timeout: 30000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  if (info.project.name.includes('mobile'))
    await page.getByRole('button', { name: '切换导航菜单' }).click()
  await page.locator('[data-temple-nav="flanerie"]').first().click()
  await expect(home).toHaveAttribute('data-selected', 'flanerie')
  await expect(home).toHaveAttribute('data-settled', 'true')
  await expect(page).toHaveURL(/\/creative$/)
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const read = () =>
      [root, container].flatMap((element) => {
        const bounds = element.getBoundingClientRect()
        return [bounds.top, bounds.left]
      })
    const probe = { initial: read(), samples: [] as number[][] }
    ;(window as any).journeyLeaveGeometry = probe
    const sample = () => {
      if (!root.isConnected) return
      probe.samples.push(read())
      requestAnimationFrame(sample)
    }
    sample()
  })
  await page.locator('.shared-vlog-card').first().click()
  await expect(page).toHaveURL(/\/flanerie\/[^?]+\?from=home$/)
  await expect(page.locator('.detail-page-header__back')).toBeVisible()
  await expect(page.locator('.route-curtain')).toHaveCount(0, {
    timeout: 30000,
  })
  const geometry = await page.evaluate(
    () =>
      (window as any).journeyLeaveGeometry as {
        initial: number[]
        samples: number[][]
      }
  )
  expect(geometry.samples.length).toBeGreaterThan(1)
  for (const sample of geometry.samples)
    sample.forEach((value, index) =>
      expect(Math.abs(value - geometry.initial[index])).toBeLessThanOrEqual(1)
    )
  await page.goBack()
  await expect(page).toHaveURL(/\/creative$/)
  await expect(home).toHaveAttribute('data-selected', 'flanerie', {
    timeout: 30000,
  })
  await expect(home).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.shared-vlog-card').first()).toBeVisible()

  // 显式模块链接仍按目标地址导航，不能被历史返回记忆覆盖。
  await page.locator('.shared-vlog-card').first().click()
  await expect(page).toHaveURL(/\/flanerie\/[^?]+\?from=home$/)
  await expect(page.locator('.route-curtain')).toHaveCount(0, {
    timeout: 30000,
  })
  await page.evaluate(async () => {
    const app = document.querySelector('#app') as any
    await app.__vue_app__.config.globalProperties.$router.push('/creative')
  })
  await expect(home).toHaveAttribute('data-selected', 'island', {
    timeout: 30000,
  })
})
