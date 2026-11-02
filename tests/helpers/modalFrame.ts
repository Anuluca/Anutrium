import { expect, type Locator } from '@playwright/test'

export async function expectModalFrame(modal: Locator) {
  await expect(modal).toHaveCSS('border-top-width', '3px')
  await expect(modal.locator('.corner-tl')).toBeVisible()
  await expect(modal.locator('.corner-br')).toBeVisible()
  await expect(modal.locator('.corner-bl')).toHaveCount(0)
  await expect(modal.locator('.corner-tl')).toHaveCSS('border-top-width', '8px')
  await expect(modal.locator('.corner-br')).toHaveCSS(
    'border-bottom-width',
    '8px'
  )
  await expect
    .poll(() =>
      modal.evaluate((element) => {
        const frame = element.getBoundingClientRect()
        const topLeft = element
          .querySelector('.corner-tl')!
          .getBoundingClientRect()
        const bottomRight = element
          .querySelector('.corner-br')!
          .getBoundingClientRect()
        return Math.max(
          Math.abs(frame.left - topLeft.left - 5),
          Math.abs(frame.top - topLeft.top - 5),
          Math.abs(bottomRight.right - frame.right - 5),
          Math.abs(bottomRight.bottom - frame.bottom - 5)
        )
      })
    )
    .toBeLessThanOrEqual(1)
  const colors = await modal.evaluate((element) => ({
    frame: getComputedStyle(element).borderTopColor,
    corner: getComputedStyle(element.querySelector('.corner-tl')!)
      .borderTopColor,
  }))
  expect(colors.frame).toMatch(/\/\s*0\.35\)/)
  expect(colors.corner).toMatch(/\/\s*0\.45\)/)
}
