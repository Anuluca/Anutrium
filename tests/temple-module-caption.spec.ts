import { expect, test } from '@playwright/test'

test('module captions occupy the model-side lower corner with theme colors and individual scanlines', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    '标题用于桌面半屏模型区域'
  )
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 30000 }
  )
  const caption = page.locator('.temple-module-caption')
  for (const [id, label, color, side] of [
    ['archive', '作品集', 'rgb(50, 118, 254)', 'left'],
    ['flanerie', '旅程', 'rgb(139, 92, 199)', 'left'],
    ['pokeyard', '宝可后院', 'rgb(241, 198, 64)', 'right'],
    ['island', '创作', 'rgb(206, 76, 135)', 'right'],
  ]) {
    if (id !== 'archive')
      await page.locator(`.desktop-menu [data-temple-nav="${id}"]`).click()
    await expect(caption).toBeVisible({ timeout: 20000 })
    await expect(caption).toHaveAttribute('data-category', id)
    await expect(caption).toHaveText(label)
    await expect(caption).toHaveCSS('color', color)
    const geometry = await caption.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const menu = document
        .querySelector('.temple-menu')!
        .getBoundingClientRect()
      const footer = document
        .querySelector('.footer-com')!
        .getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        bottomGap: footer.top - rect.bottom,
        menuLeft: menu.left,
        menuRight: menu.right,
        viewport: window.innerWidth,
        fontSize: parseFloat(getComputedStyle(element).fontSize),
        masks: [...element.children].map(
          (child) => getComputedStyle(child).maskImage
        ),
      }
    })
    expect(Math.abs(geometry.bottomGap - 24)).toBeLessThanOrEqual(1)
    expect(geometry.fontSize).toBeGreaterThanOrEqual(48)
    expect(new Set(geometry.masks).size).toBe(Array.from(label).length)
    expect(
      geometry.masks.every((mask) => mask.includes('linear-gradient'))
    ).toBe(true)
    if (side === 'left') {
      expect(geometry.right).toBeLessThanOrEqual(geometry.menuLeft)
      expect(
        Math.abs(geometry.left - (geometry.viewport - geometry.menuRight))
      ).toBeLessThanOrEqual(1)
    } else {
      expect(geometry.left).toBeGreaterThanOrEqual(geometry.menuRight)
      expect(
        Math.abs(geometry.viewport - geometry.right - geometry.menuLeft)
      ).toBeLessThanOrEqual(1)
    }
    if (id === 'archive' || id === 'island')
      await page.screenshot({
        path: `test-results/temple-module-caption-${id}.png`,
      })
  }
  await page.locator('.temple-expand').click()
  await expect(caption).toHaveCount(0)
  await page.locator('.temple-expand').click()
  await expect(caption).toBeVisible()
})

test('module caption changes preserve fullscreen leaving geometry', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toBeVisible()
  const samples = await page.evaluate(async () => {
    const nodes = [
      document.querySelector('.temple-page')!,
      document.querySelector('.router-container')!,
    ]
    const initial = nodes.map((node) => node.getBoundingClientRect())
    const deltas: number[] = []
    const app = (document.querySelector('#app') as any).__vue_app__
    const navigation = app.config.globalProperties.$router.push('/colorPalette')
    await new Promise<void>((resolve) => {
      const sample = () => {
        if (!nodes[0].isConnected) return resolve()
        deltas.push(
          ...nodes.map((node, index) => {
            const rect = node.getBoundingClientRect()
            return Math.max(
              Math.abs(rect.left - initial[index].left),
              Math.abs(rect.top - initial[index].top)
            )
          })
        )
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    await navigation
    return deltas
  })
  expect(samples.length).toBeGreaterThan(0)
  expect(Math.max(...samples)).toBeLessThanOrEqual(1)
})
