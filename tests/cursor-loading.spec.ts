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

test('desktop cursor keeps a white inversion base across route themes', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  for (const path of ['/', '/archive']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const cursor = page.locator('.cursor-position')
    await expect(cursor).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
    await expect(cursor).toHaveCSS('mix-blend-mode', 'difference')
    await expect(cursor.locator('.cursor-body')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)'
    )
  }
})

test('desktop cursor shows loading during route navigation and restores afterward', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })

  const cursor = page.locator('.cursor-position')
  await expect(cursor).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(page.locator('.flr-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.mouse.move(300, 300)
  await expect(cursor).not.toHaveClass(/\bis-hidden\b/)
  const normalShapeWidth = await cursor
    .locator('.cursor-shape')
    .evaluate((element) => getComputedStyle(element).width)

  await page.locator('button').first().dispatchEvent('pointerover')
  await expect(cursor.locator('.cursor-shape')).toHaveClass(/\bis-active\b/)
  // 首页菜单已改为模型聚焦入口；通过真实路由守卫验证完整加载周期。
  await page.evaluate(() => {
    const app = (document.querySelector('#app') as any).__vue_app__
    void app.config.globalProperties.$router.push('/colorPalette')
  })

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
  await expect(page.locator('.palette-tool')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(cursor).not.toHaveClass(/\bis-loading\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
})
