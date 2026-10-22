import { expect, test } from '@playwright/test'

test('detail header restores when its original lower edge returns below the menu', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30_000,
  })
  const header = page.locator('.detail-page-header')
  await expect(header).toBeVisible()
  const anchor = page.locator('.detail-page-header-slot')
  const originalHeight = await anchor.evaluate(
    (element) => element.getBoundingClientRect().height
  )
  const originalFonts = await header.evaluate((element) => ({
    back: parseFloat(
      getComputedStyle(element.querySelector('button')!).fontSize
    ),
    title: parseFloat(getComputedStyle(element.querySelector('h1')!).fontSize),
  }))

  await page.evaluate(() =>
    document.body.scrollTo({ top: 180, behavior: 'instant' as ScrollBehavior })
  )
  await expect(header).toHaveClass(/detail-page-header--compact/)
  await expect
    .poll(async () =>
      header.evaluate((element) => {
        const back = getComputedStyle(element.querySelector('button')!)
        const title = getComputedStyle(element.querySelector('h1')!)
        return Math.abs(parseFloat(back.fontSize) - parseFloat(title.fontSize))
      })
    )
    .toBeLessThan(0.1)

  const compact = await header.evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    menuBottom: document
      .querySelector('.el-menu-layout-all')!
      .getBoundingClientRect().bottom,
    back: parseFloat(
      getComputedStyle(element.querySelector('button')!).fontSize
    ),
    background: getComputedStyle(element).backgroundColor,
    contentBackground: getComputedStyle(
      element.querySelector('.detail-page-header__content')!
    ).backgroundColor,
    contentPadding: parseFloat(
      getComputedStyle(element.querySelector('.detail-page-header__content')!)
        .paddingLeft
    ),
    backBackground: getComputedStyle(element.querySelector('button')!)
      .backgroundColor,
    titleBackground: getComputedStyle(element.querySelector('h1')!)
      .backgroundColor,
  }))
  expect(Math.abs(compact.top - compact.menuBottom)).toBeLessThanOrEqual(1)
  expect(compact.back).toBeGreaterThan(originalFonts.back)
  expect(compact.back).toBeLessThan(originalFonts.title)
  expect(compact.background).toBe('rgba(0, 0, 0, 0)')
  expect(compact.contentBackground).not.toBe('rgba(0, 0, 0, 0)')
  expect(compact.contentPadding).toBeGreaterThan(0)
  expect(compact.backBackground).toBe('rgba(0, 0, 0, 0)')
  expect(compact.titleBackground).toBe('rgba(0, 0, 0, 0)')
  expect(
    Math.abs(
      (await anchor.evaluate(
        (element) => element.getBoundingClientRect().height
      )) - originalHeight
    )
  ).toBeLessThanOrEqual(1)

  await page.evaluate(() =>
    document.body.scrollTo({ top: 100, behavior: 'instant' as ScrollBehavior })
  )
  await expect
    .poll(() => page.evaluate(() => document.body.scrollTop))
    .toBeLessThan(120)
  await expect(header).toHaveClass(/detail-page-header--compact/)

  await page.evaluate(() => {
    const anchor = document.querySelector('.detail-page-header-slot')!
    const menu = document.querySelector('.el-menu-layout-all')!
    const top =
      document.body.scrollTop +
      anchor.getBoundingClientRect().bottom -
      menu.getBoundingClientRect().bottom -
      8
    document.body.scrollTo({
      top: Math.max(0, top),
      behavior: 'instant' as ScrollBehavior,
    })
  })
  await expect(header).not.toHaveClass(/detail-page-header--compact/)
  expect(
    await anchor.evaluate((element) => element.getBoundingClientRect().top)
  ).toBeLessThan(
    await page
      .locator('.el-menu-layout-all')
      .evaluate((element) => element.getBoundingClientRect().bottom)
  )
  await expect(
    page.locator('.detail-page-header-slot > .detail-page-header')
  ).toHaveCount(1)
})
