import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'
import { expect, test } from './helpers/sceneDiagnostics'

test('agent list modal preserves position and supports history, expansion and replica navigation', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const entry = page.getByRole('button', { name: /AI Agent能力测试/ })
  await expect(entry).toBeVisible({ timeout: 45000 })
  const expand = page.getByRole('button', { name: '展开全屏内容', exact: true })
  if (!info.project.name.includes('mobile')) await expect(expand).toBeEnabled()
  const before = await readPagePosition(
    page,
    '.island-laboratory-content .tl-grid'
  )
  await entry.click()
  const modal = page.locator('.modal-wrapper-dialog:visible')
  const card = modal.locator('.shared-work-card')
  const columns = () =>
    modal
      .locator('.ai-agent-tests__grid')
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').length
      )
  await expect(modal).toBeVisible()
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('GPT-6 Astra')
  await expect(card.locator('.work-card-stack')).toHaveCount(0)
  await expect.poll(columns).toBe(2)
  expectPagePositionToMatch(
    await readPagePosition(page, '.island-laboratory-content .tl-grid'),
    before
  )
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page).toHaveURL(/\/atrium\/laboratory$/)
  expectPagePositionToMatch(
    await readPagePosition(page, '.island-laboratory-content .tl-grid'),
    before
  )
  if (!info.project.name.includes('mobile')) {
    await expand.click()
    await expect(
      page.getByRole('button', { name: '恢复半屏内容', exact: true })
    ).toBeEnabled()
    await entry.click()
    await expect.poll(columns).toBe(4)
    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)
    await page
      .getByRole('button', { name: '恢复半屏内容', exact: true })
      .click()
    await expect(expand).toBeEnabled()
  }
  await entry.click()
  await page.goBack()
  await expect(modal).toHaveCount(0)
  await page.goForward()
  await expect(modal).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(modal).toBeVisible({ timeout: 45000 })
  await expect
    .poll(() =>
      card
        .locator('img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBeGreaterThan(0)
  await card.click()
  await expect(page).toHaveURL(/\/ai-playground\/arknightxpersona3reload$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'GPT-6-Astra前端UI复刻'
  )
})
