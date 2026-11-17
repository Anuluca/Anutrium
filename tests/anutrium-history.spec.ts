import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'
import { expect, test } from './helpers/sceneDiagnostics'

test('Anutrium history preserves its panel and supports version links and route history', async ({
  page,
  context,
}, info) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const entry = page.getByRole('button', { name: /Anutrium历史版本/ })
  await expect(entry).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const anchor = '.island-laboratory-content .tl-grid'
  const before = await readPagePosition(page, anchor)
  await entry.click()
  const modal = page.locator('.modal-wrapper-dialog:visible')
  const cards = modal.locator('.anutrium-history .shared-work-card')
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(/\/atrium\/laboratory\/history$/)
  await expect(cards).toHaveCount(5)
  const columns = () =>
    modal
      .locator('.laboratory-gallery-grid')
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').length
      )
  await expect.poll(columns).toBe(2)
  expectPagePositionToMatch(await readPagePosition(page, anchor), before)
  await expect
    .poll(() =>
      cards
        .locator('img')
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0)
        )
    )
    .toBe(true)

  // 验证每个独立归档地址，同时避免测试加载完整历史站点。
  await context.route(
    /^https:\/\/(?:history|garden)\.anuluca\.com\//,
    (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<title>History preview</title>',
      })
  )
  const links = [
    'https://garden.anuluca.com/',
    ...['0.1-alpha', '1.0', '1.2', '2.0'].map(
      (version) => `https://history.anuluca.com/v${version}/`
    ),
  ]
  for (const [index, link] of links.entries()) {
    const popupPromise = page.waitForEvent('popup')
    await cards.nth(index).click()
    const popup = await popupPromise
    await popup.waitForLoadState('domcontentloaded')
    expect(popup.url()).toBe(link)
    expect(await popup.evaluate(() => window.opener)).toBeNull()
    await popup.close()
  }
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(200)
  expectPagePositionToMatch(await readPagePosition(page, anchor), before)
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page).toHaveURL(/\/atrium\/laboratory$/)
  expectPagePositionToMatch(await readPagePosition(page, anchor), before)
  if (!info.project.name.includes('mobile')) {
    await page
      .getByRole('button', { name: '展开全屏内容', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: '恢复半屏内容', exact: true })
    ).toBeEnabled()
    await entry.click()
    await expect.poll(columns).toBe(4)
    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)
  }
  await entry.click()
  await page.goBack()
  await expect(modal).toHaveCount(0)
  await page.goForward()
  await expect(modal).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(modal).toBeVisible({ timeout: 45000 })
  await expect(cards).toHaveCount(5)
})

test('Archive history link navigates in the same tab while external links keep their target', async ({
  page,
  context,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 45000,
  })
  const card = page.locator('.archive-content .shared-work-card').filter({
    has: page.locator('strong', { hasText: /^Anutrium$/ }),
  })
  await expect(card).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await card.click()
  const history = page.locator('a.link-item[href="/atrium/laboratory/history"]')
  await expect(history).toBeVisible()
  await expect(history).not.toHaveAttribute('target', '_blank')
  await expect(
    page.locator('a.link-item[href="https://anuluca.com"]')
  ).toHaveAttribute('target', '_blank')
  const tabs = context.pages().length
  await history.click()
  await expect(page).toHaveURL(/\/atrium\/laboratory\/history$/)
  await expect(page.locator('.anutrium-history .shared-work-card')).toHaveCount(
    5
  )
  await expect(page.locator('.anutrium-history')).toBeVisible()
  expect(context.pages()).toHaveLength(tabs)
  await page.goBack()
  await expect(page).toHaveURL(/\/archive$/)
  await expect(page.locator('.anutrium-history')).not.toBeVisible()
})
