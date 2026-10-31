import { expect, test } from '@playwright/test'

test('mobile detail title opens a centered, dismissible module dropdown', async ({
  page,
}, info) => {
  test.skip(!info.project.name.includes('mobile'), '仅检查手机端下拉交互')
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  await expect(root.locator('.island-detail:visible')).toBeVisible({
    timeout: 45000,
  })
  await page.evaluate(() => document.fonts.ready)
  await expect(root.locator('.island-detail-nav')).toHaveCount(0)

  const trigger = root.locator('.island-item:visible .island-item__title-text')
  const arrow = trigger.locator('.island-mobile-dropdown-arrow')
  await expect(arrow).toBeVisible()
  expect(
    await arrow.evaluate(
      (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a
    )
  ).toBe(1)
  await page.mouse.move(1, 1)
  const titleStyle = () =>
    trigger.evaluate((element) => ({
      fill: getComputedStyle(element).webkitTextFillColor,
      stroke: getComputedStyle(element).webkitTextStrokeWidth,
    }))
  const beforeHover = await titleStyle()
  await trigger.hover()
  expect(await titleStyle()).toEqual(beforeHover)
  await trigger.tap()
  const menu = root.locator('.island-mobile-detail-dropdown:visible')
  await expect(menu).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(
    await arrow.evaluate(
      (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a
    )
  ).toBe(-1)
  await expect(menu.getByRole('button')).toHaveCount(4)
  const style = await menu.evaluate((element) => ({
    blur: getComputedStyle(element, '::before').backdropFilter,
    font: getComputedStyle(element.querySelector('button')!).fontFamily,
    fontSize: getComputedStyle(element.querySelector('button')!).fontSize,
    buttonsFit: Array.from(
      element.querySelectorAll('button'),
      (button) =>
        button.scrollWidth <= button.clientWidth + 1 &&
        button.getBoundingClientRect().height >= 44
    ),
    alignments: Array.from(
      element.querySelectorAll('button'),
      (button) => getComputedStyle(button).textAlign
    ),
  }))
  expect(style.blur).toBe('blur(6px)')
  expect(style.font).toContain('Anton')
  expect(style.fontSize).toBe('32px')
  expect(style.buttonsFit.every(Boolean)).toBe(true)
  expect(style.alignments.every((alignment) => alignment === 'center')).toBe(
    true
  )

  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.tap()
  await page.mouse.click(2, 300)
  await expect(menu).toHaveCount(0)
  await trigger.tap()
  await menu.getByRole('button', { name: 'NOTES' }).tap()
  await expect(page).toHaveURL(/\/atrium\/notes$/)
  await expect(root).toHaveAttribute('data-detail-item', 'NOTES', {
    timeout: 20000,
  })
  await expect(
    root.locator('.island-mobile-detail-dropdown:visible')
  ).toHaveCount(0)
})
