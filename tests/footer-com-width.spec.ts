import { expect, test } from '@playwright/test'

test('footer width changes animate before paint and remain continuous when reversed', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 60000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  await expect(page.locator('.footer-wide')).toBeAttached()
  const transitions = await page.evaluate(async () => {
    const footer = document.querySelector<HTMLElement>('.footer-com')!
    const app = (document.querySelector('#app') as any).__vue_app__
    const navigation =
      app.config.globalProperties.$pinia.state.value['temple-navigation']
    const frame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const left = () => footer.getBoundingClientRect().left
    await frame()
    await frame()
    const sample = async (selected: string | null, count: number) => {
      const before = left()
      navigation.selected = selected
      const positions: number[] = []
      for (let i = 0; i < count; i++) {
        await frame()
        positions.push(left())
      }
      return { before, positions }
    }
    // 逐帧记录可见边缘，覆盖正常切换和动画尚未结束时反向切换。
    const enter = await sample('archive', 40)
    const returning = await sample(null, 5)
    const reversed = await sample('archive', 40)
    const rect = footer.getBoundingClientRect()
    return {
      enter,
      returning,
      reversed,
      isMobile: matchMedia('(max-aspect-ratio: 1 / 1)').matches,
      footerLeft: rect.left,
      footerWidth: rect.width,
      viewportWidth: window.innerWidth,
    }
  })
  if (transitions.isMobile) {
    expect(transitions.footerLeft).toBe(0)
    expect(transitions.footerWidth).toBe(transitions.viewportWidth)
    return
  }
  for (const transition of [
    transitions.enter,
    transitions.returning,
    transitions.reversed,
  ]) {
    expect(
      Math.abs(transition.positions[0] - transition.before)
    ).toBeLessThanOrEqual(1)
    const direction = Math.sign(
      transition.positions.at(-1)! - transition.before
    )
    const positions = [transition.before, ...transition.positions]
    for (let i = 1; i < positions.length; i++) {
      expect(
        (positions[i] - positions[i - 1]) * direction
      ).toBeGreaterThanOrEqual(-1)
    }
  }
  expect(
    Math.abs(transitions.enter.positions.at(-1)! - transitions.enter.before)
  ).toBeGreaterThan(2)
})
