import { expect, test } from './helpers/sceneDiagnostics'

test('Atrium photo UI fades in both directions while the star background remains visible', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  const entry = page.getByRole('button', { name: '进入拍照模式' })
  await expect(entry).toBeVisible({ timeout: 45000 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const sampleFade = async (selector: string) =>
    page.evaluate(async (selector) => {
      const element = document.querySelector<HTMLElement>('.island-focus')!
      ;(document.querySelector(selector) as HTMLElement).click()
      const opacity: number[] = []
      const start = performance.now()
      await new Promise<void>((resolve) => {
        const sample = () => {
          opacity.push(Number(getComputedStyle(element).opacity))
          if (performance.now() - start >= 420) resolve()
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      return opacity
    }, selector)
  const entering = await sampleFade('.island-photo-entry')
  expect(entering.some((value) => value > 0.01 && value < 0.99)).toBe(true)
  await expect(page.locator('.star-container')).toBeVisible()
  const leaving = await sampleFade('[aria-label="退出拍照模式"]')
  expect(leaving.some((value) => value > 0.01 && value < 0.99)).toBe(true)
  await expect(page.locator('.island-focus')).toBeVisible()
})

test('Atrium photo mode rotates, zooms, downloads and restores its controls', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(page.getByRole('button', { name: '进入拍照模式' })).toBeVisible({
    timeout: 45000,
  })
  await page.getByRole('button', { name: '进入拍照模式' }).click()
  await expect(stage).toHaveAttribute('data-photo-mode', 'true')
  await expect(page.locator('.island-focus')).toBeHidden()
  await expect(page.locator('.el-menu-layout-all')).toBeHidden()
  await expect(page.locator('.footer-com')).toBeHidden()
  await expect(page.locator('.star-container')).toBeVisible()
  await expect(page.locator('.photo-poses button')).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'STANDING' })).toHaveCSS(
    'font-family',
    /Anton/
  )
  await expect(page.getByRole('button', { name: '截图并保存' })).toHaveCSS(
    'border-top-width',
    '0px'
  )
  await expect(page.locator('.fullscreen')).toBeHidden()
  await expect(page.locator('.mobile-menu-icon')).toBeHidden()
  const rotation = await stage.getAttribute('data-statue-body-rotation')
  const canvasBounds = (await stage.locator('canvas').boundingBox())!
  const dragX = canvasBounds.x + canvasBounds.width * 0.6
  const dragY = canvasBounds.y + canvasBounds.height * 0.45
  await page.mouse.move(dragX, dragY)
  await page.mouse.down()
  await page.mouse.move(dragX + 60, dragY + 20, { steps: 5 })
  await page.mouse.up()
  await expect
    .poll(() => stage.getAttribute('data-statue-body-rotation'))
    .not.toBe(rotation)
  const zoom = Number(await stage.getAttribute('data-camera-zoom'))
  await page.mouse.wheel(0, -120)
  await expect
    .poll(async () => Number(await stage.getAttribute('data-camera-zoom')))
    .toBeGreaterThan(zoom)
  // 相机缩放也会更新投影；保存的画布应与当前姿态一致。
  await page.screenshot({ path: `/tmp/atrium-photo-${info.project.name}.png` })
  await page.getByRole('option', { name: 'STANDING', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '截图并保存' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^atrium-.*\.png$/)
  expect(await download.failure()).toBeNull()
  await download.saveAs(`/tmp/atrium-capture-${info.project.name}.png`)
  await page.getByRole('button', { name: '隐藏拍照工具' }).click()
  await expect(page.locator('.atrium-photo-controls')).toHaveClass(/is-hidden/)
  await page.getByRole('button', { name: '显示拍照工具' }).click()
  await page.getByRole('button', { name: '退出拍照模式' }).click()
  await expect(stage).toHaveAttribute('data-photo-mode', 'false')
  await expect(page.locator('.island-focus')).toBeVisible()
  await expect(page.locator('.el-menu-layout-all')).toBeVisible()
})

test('Atrium module headers use English and its desktop menu links directly to modules', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus')
  await expect(root).toHaveAttribute('data-detail-phase', 'detail', {
    timeout: 45000,
  })
  const title = root.locator(
    '.island-panels .island-item:visible .island-item__title'
  )
  await expect(title).toHaveText('COLLECTIONS')
  await expect(title).toHaveCSS('font-family', /Anton/)
  const heading = root.locator(
    '.island-panels .island-window:visible .island-window__bar h2'
  )
  await expect(heading).toHaveText('宅')
  await expect(heading).toHaveCSS('font-family', /UnboundedSans/)
  await expect(heading).toHaveCSS('mask-image', /linear-gradient/)
  const insets = await root
    .locator('.island-panels .island-window:visible')
    .evaluate((element) => {
      const bar = element.querySelector('.island-window__bar')!
      const title = bar.querySelector('h2')!
      const item = element.querySelector(
        '.island-item:not([style*="display: none"])'
      )!
      const count = item.querySelector('.island-item__count')!
      return {
        left:
          title.getBoundingClientRect().left - bar.getBoundingClientRect().left,
        right:
          item.getBoundingClientRect().right -
          count.getBoundingClientRect().right,
      }
    })
  expect(Math.abs(insets.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(insets.right)).toBeLessThanOrEqual(1)
  await page.evaluate(() => {
    ;(
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$i18n.locale = 'en'
  })
  await expect(heading).toHaveText('OTAKU')
  await page.screenshot({ path: `/tmp/atrium-header-${info.project.name}.png` })
  if (!info.project.name.includes('mobile')) {
    await page.locator('[data-temple-nav="statue"]').hover()
    const link = page
      .locator('.atrium-submenu')
      .getByRole('link', { name: 'NOTES&CHATS' })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/atrium\/notes$/)
    await expect(
      root.locator('.island-panels .island-item:visible .island-item__title')
    ).toHaveText('NOTES&CHATS')
  }
})
