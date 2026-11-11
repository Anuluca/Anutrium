import { expect, type Page, test } from '@playwright/test'

import {
  babelBooks,
  mockBabelLibrary,
  openMonkeyTypewriter,
} from './helpers/babelLibrary'

async function setLocale(page: Page, locale: string) {
  await page.evaluate((value) => {
    const app = document.querySelector('#app') as HTMLElement & {
      __vue_app__: {
        config: { globalProperties: { $i18n: { locale: string } } }
      }
    }
    app.__vue_app__.config.globalProperties.$i18n.locale = value
  }, locale)
}

test('language switches across monkey page and library without changing English article or draft', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockBabelLibrary(page)
  await page.route('**/monkey-articles/generate', (route) =>
    route.fulfill({ json: babelBooks[0] })
  )
  await openMonkeyTypewriter(page)
  await expect(page.locator('.start-button')).toHaveText('START')
  await setLocale(page, 'en')
  await expect(
    page.getByRole('heading', { name: 'Monkey Typewriter', exact: true })
  ).toBeVisible()
  await expect(page.locator('.babel-entrance')).toHaveAttribute(
    'aria-label',
    'Library of Babel'
  )
  await expect(page.locator('.babel-title-fallback')).toHaveText(
    'Library of Babel'
  )
  await expect(page.locator('.start-button')).toHaveText('START')
  await page.locator('.start-button').click()
  await expect(
    page.getByRole('textbox', { name: 'Article content', exact: true })
  ).toHaveValue(babelBooks[0].content)
  await expect(page.locator('.start-button')).toHaveText('RESTART')
  await expect(page.locator('.analysis-summary')).toContainText('Generated')
  await expect(page.locator('.monkey-lab')).not.toContainText(/[\u4e00-\u9fff]/)
  const draft = 'The English draft stays unchanged.'
  await page
    .getByRole('textbox', { name: 'Article content', exact: true })
    .fill(draft)
  await setLocale(page, 'zhCn')
  await expect(
    page.getByRole('textbox', { name: '文章正文', exact: true })
  ).toHaveValue(draft)
  await expect(
    page.getByRole('textbox', { name: '文章标题', exact: true })
  ).toHaveValue(babelBooks[0].title)
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  await expect(modal.getByRole('button', { name: '刷新书架' })).toBeVisible()
  await setLocale(page, 'en')
  await expect(
    modal.getByRole('button', { name: 'Refresh shelves' })
  ).toBeVisible()
  await expect(modal.locator('.babel-title-fallback')).toHaveText(
    'Library of Babel'
  )
  await modal.locator('.library-book').first().click()
  const reader = modal.locator('.babel-reader')
  await expect(reader).toBeVisible()
  await expect(reader.locator('.manuscript-title')).toHaveText(
    babelBooks[0].title
  )
  await expect(reader.locator('.manuscript-highlights')).toHaveText(
    babelBooks[0].content
  )
  for (const label of [
    'Copy text',
    'Download .txt',
    'Share',
    'Back to shelves',
  ]) {
    await expect(
      reader.getByRole('button', { name: label, exact: true })
    ).toBeVisible()
  }
  await page.screenshot({
    path: `test-results/monkey-reader-en-${test.info().project.name}.png`,
    fullPage: true,
  })
  await setLocale(page, 'zhCn')
  await expect(reader.getByRole('button', { name: '复制全文' })).toBeVisible()
  await expect(reader.locator('.manuscript-highlights')).toHaveText(
    babelBooks[0].content
  )
  await reader.getByRole('button', { name: '返回书架' }).click()
  await modal.locator('.diamond-close-btn').click()
  await expect(modal).toBeHidden()
  await expect(
    page.getByRole('textbox', { name: '文章正文', exact: true })
  ).toHaveValue(draft)
  await setLocale(page, 'en')
  await expect(
    page.getByRole('textbox', { name: 'Article content', exact: true })
  ).toHaveValue(draft)
  await page.screenshot({
    path: `test-results/monkey-locale-${test.info().project.name}.png`,
    fullPage: true,
  })
})

test('existing request errors react to locale changes and START stays English', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/monkey-articles/generate', (route) =>
    route.fulfill({ status: 429, json: { error: 'rate_limited' } })
  )
  await openMonkeyTypewriter(page)
  await page.locator('.start-button').click()
  const alert = page.locator('.lab-feedback [role=alert]')
  await expect(alert).toContainText('每分钟最多 5 次')
  await setLocale(page, 'en')
  await expect(alert).toContainText('The limit is 5 per minute')
  await expect(page.locator('.start-button')).toHaveText('START')
  await setLocale(page, 'zhCn')
  await expect(alert).toContainText('每分钟最多 5 次')
})
