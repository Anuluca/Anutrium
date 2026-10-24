import { expect, test } from '@playwright/test'

test('compact title shows reading progress and flashes while returning to top', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000)
  await page.setViewportSize({
    width: testInfo.project.name.includes('mobile') ? 393 : 1440,
    height: 600,
  })
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 30_000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30_000,
  })
  await page.evaluate(() =>
    document.body.scrollTo({ top: 800, behavior: 'instant' as ScrollBehavior })
  )
  const header = page.locator('.detail-page-header')
  const content = header.locator('.detail-page-header__content')
  const heading = header.getByRole('button', { name: '回到页面顶部' })
  const progress = header.locator('.detail-page-header__progress')
  await expect(header).toHaveClass(/--compact/)
  await expect(heading).toBeVisible()
  await expect(page.locator('.back-to-top-button')).toHaveCount(0)
  await expect
    .poll(() =>
      progress.evaluate((el) => {
        const ratio =
          document.body.scrollTop / (document.body.scrollHeight - innerHeight)
        return Math.abs(
          new DOMMatrixReadOnly(getComputedStyle(el).transform).m11 - ratio
        )
      })
    )
    .toBeLessThan(0.001)
  const geometry = await content.evaluate((el) => {
    const rect = el.getBoundingClientRect()
    const back = el
      .querySelector('.detail-page-header__back')!
      .getBoundingClientRect()
    return {
      center: Math.abs((rect.left + rect.right) / 2 - innerWidth / 2),
      left: back.left - rect.left,
      height: rect.height - back.height,
    }
  })
  for (const delta of Object.values(geometry))
    expect(Math.abs(delta)).toBeLessThanOrEqual(1)
  const progressGeometry = await progress.evaluate((el) => {
    const content = el.parentElement!.getBoundingClientRect()
    const style = getComputedStyle(el)
    return {
      fullWidth: Math.abs(parseFloat(style.width) - content.width),
      bottom: Math.abs(el.getBoundingClientRect().bottom - content.bottom),
    }
  })
  expect(progressGeometry.fullWidth).toBeLessThanOrEqual(1)
  expect(progressGeometry.bottom).toBeLessThanOrEqual(1)
  await heading.hover()
  await expect(heading.locator('h1')).toHaveCSS('color', 'rgb(0, 0, 0)')
  await expect(header.locator('.detail-page-header__back')).toHaveCSS(
    'color',
    'rgb(0, 0, 0)'
  )
  const hover = await content.evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    theme: getComputedStyle(el).getPropertyValue('--page-theme-color').trim(),
  }))
  expect(hover.background).not.toBe('rgba(0, 0, 0, 0)')

  // 暂停闪烁但不暂停滚动，确保回顶没有等待动画完成。
  const frames = await heading.evaluate((el) => {
    el.click()
    const animation = el
      .parentElement!.getAnimations()
      .find((a) => a.effect!.getTiming().duration === 180)!
    animation.pause()
    return animation
      .effect!.getKeyframes()
      .map((frame) => frame.backgroundColor)
  })
  expect(frames[0]).toBe(frames[2])
  expect(frames[1]).toBe(frames[3])
  expect(frames[0]).not.toBe(frames[1])
  await expect
    .poll(() => page.evaluate(() => document.body.scrollTop))
    .toBeLessThanOrEqual(1)
  await expect(header).not.toHaveClass(/--compact/)
  expect(new URL(page.url()).pathname).toBe('/flanerie/changsha')

  // 键盘回顶与返回导航使用独立入口。
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() =>
    document.body.scrollTo({ top: 800, behavior: 'instant' as ScrollBehavior })
  )
  await expect(header).toHaveClass(/--compact/)
  await heading.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => page.evaluate(() => document.body.scrollTop))
    .toBeLessThanOrEqual(1)
  await page.evaluate(() =>
    document.body.scrollTo({ top: 800, behavior: 'instant' as ScrollBehavior })
  )
  await expect(header).toHaveClass(/--compact/)
  await header.locator('.detail-page-header__back').click()
  await expect(page).toHaveURL(/\/flanerie$/)
})

test('detail header restores when its original lower edge returns below the menu', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 30_000,
  })
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
  expect(compact.contentPadding).toBe(0)
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
