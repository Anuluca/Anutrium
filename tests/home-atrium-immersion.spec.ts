import { expect, test } from './helpers/sceneDiagnostics'

test('atrium return keeps zen viewport responsive and fades its title before hiding', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  const home = page.locator('.temple-page')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 60000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  const alert = page.locator('.mobile-experience-alert .el-alert__close-btn')
  if (await alert.isVisible()) await alert.click()

  for (const selection of ['statue', null]) {
    await page.evaluate((id) => {
      const app = (document.querySelector('#app') as any).__vue_app__
      app.config.globalProperties.$pinia._s.get('temple-navigation').request(id)
    }, selection)
    await expect(page).toHaveURL(selection ? /\/atrium$/ : /:\d+\/$/, {
      timeout: 20000,
    })
    await expect(home).toHaveAttribute('data-selected', selection ?? 'none')
    await expect(home).toHaveAttribute('data-settled', 'true', {
      timeout: 20000,
    })
    await expect(stage).toHaveAttribute('data-entrance-finished', 'true')
    await expect(page.locator('body')).not.toHaveClass(/shell-leaving/)
    for (const node of [home, page.locator('.router-container')])
      expect(
        await node.evaluate(
          (element) => (element as HTMLElement).style.position
        )
      ).toBe('')
  }

  // 先改变视口，再进入原生全屏；Chromium 不允许调整全屏窗口尺寸。
  // 固定旧高度会在视口增高后留下底部缺口。
  const viewport = page.viewportSize()!
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height + 96,
  })
  await page.locator('.logo-box .header-home-link').first().click()
  await expect(page.locator('.layout-page')).toHaveClass(/is-home-immersive/)
  await expect
    .poll(() =>
      home.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        return Math.max(
          Math.abs(bounds.top),
          Math.abs(bounds.bottom - innerHeight)
        )
      })
    )
    .toBeLessThanOrEqual(1)

  const backdrop = page.locator('.temple-backdrop')
  await expect(backdrop.locator('.temple-backdrop__zen')).toHaveCSS(
    'opacity',
    '1'
  )
  const fade = await backdrop.evaluate(async (element) => {
    const samples: { opacity: number; visible: boolean }[] = []
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const sample = () => {
        const style = getComputedStyle(element)
        samples.push({
          opacity: Number(style.opacity),
          visible: style.visibility === 'visible',
        })
        if (style.visibility === 'hidden' || performance.now() - start > 6000)
          resolve()
        else requestAnimationFrame(sample)
      }
      sample()
    })
    return samples
  })
  expect(
    fade.some(
      ({ opacity, visible }) => visible && opacity > 0.1 && opacity < 0.9
    )
  ).toBe(true)
  expect(fade.at(-1)).toEqual({ opacity: 0, visible: false })
  await expect(page.locator('.footer-bottom-gradient')).toHaveCSS(
    'opacity',
    '0'
  )
  await page.screenshot({ path: testInfo.outputPath('atrium-return-zen.png') })
  await page.keyboard.press('Escape')
  await expect(backdrop).toHaveCSS('opacity', '1')
  await expect(backdrop).toBeVisible()
})
