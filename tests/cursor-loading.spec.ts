import { expect, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000

test('desktop cursor grows slightly while the pointer is pressed', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const cursor = page.locator('.cursor-position')
  const cursorScale = cursor.locator('.cursor-scale')
  await expect(cursor).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await page.mouse.move(
    page.viewportSize()!.width / 2,
    page.viewportSize()!.height / 2
  )
  await expect(cursor).not.toHaveClass(/\bis-hidden\b/)

  await page.mouse.down()
  await expect(cursorScale).toHaveClass(/\bis-clicked\b/)
  await expect(cursorScale).toHaveCSS(
    'transform',
    /matrix\(1\.3, 0, 0, 1\.3, 0, 0\)/
  )

  await page.mouse.up()
  await expect(cursorScale).not.toHaveClass(/\bis-clicked\b/)
  await expect(cursorScale).toHaveCSS('transform', 'none')
})

test('desktop cursor uses the loading state for the full route transition', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const cursor = page.locator('.cursor-position')
  const archiveMenuItem = page.locator('.el-menu-item.ARCHIVE')
  await expect(cursor).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(archiveMenuItem).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  await page.mouse.move(8, page.viewportSize()!.height / 2)
  await expect(cursor).not.toHaveClass(/\bis-hidden\b/)
  const normalShapeWidth = await cursor
    .locator('.cursor-shape')
    .evaluate((element) => getComputedStyle(element).width)

  await archiveMenuItem.hover()
  await expect(cursor.locator('.cursor-shape')).toHaveClass(/\bis-active\b/)
  await archiveMenuItem.click()

  await expect(cursor).toHaveClass(/\bis-loading\b/)
  const loadingAnimations = await cursor.evaluate((element) => {
    const shapeStyle = getComputedStyle(
      element.querySelector('.cursor-shape') as Element
    )

    return {
      scale: getComputedStyle(element.querySelector('.cursor-scale') as Element)
        .animationName,
      opacity: shapeStyle.animationName,
      shape: {
        width: shapeStyle.width,
        borderRadius: shapeStyle.borderRadius,
        clipPath: shapeStyle.clipPath,
      },
    }
  })
  expect(loadingAnimations.scale).toContain('cursor-loading-scale')
  expect(loadingAnimations.opacity).toContain('cursor-loading-opacity')
  expect(loadingAnimations.shape).toEqual({
    width: normalShapeWidth,
    borderRadius: '50%',
    clipPath: 'none',
  })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(cursor).toHaveClass(/\bis-loading\b/)
  await expect(cursor).not.toHaveClass(/\bis-loading\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
})
