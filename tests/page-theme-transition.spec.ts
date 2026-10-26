import { expect, test } from '@playwright/test'

test('module theme colors interpolate across DOM and continue from interrupted colors', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 45000 }
  )
  const samples = await page.evaluate(async () => {
    const app = (document.querySelector('#app') as any).__vue_app__
    const router = app.config.globalProperties.$router
    const probe = document.createElement('span')
    probe.style.color = 'var(--page-theme-color)'
    document.body.append(probe)
    const read = () => ({
      root: document.documentElement.style.getPropertyValue(
        '--page-theme-color'
      ),
      color: getComputedStyle(probe).color,
      backdrop: getComputedStyle(document.querySelector('.temple-backdrop')!)
        .color,
      header: getComputedStyle(document.querySelector('.current-module-name')!)
        .color,
    })
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))
    const start = read()
    await router.push('/flanerie')
    await pause(300)
    const middle = read()
    await router.push('/creative')
    const interrupted = read()
    await pause(350)
    const redirected = read()
    await pause(1300)
    const end = read()
    probe.remove()
    return { start, middle, interrupted, redirected, end }
  })
  expect(samples.start.root).toBe('#3276fe')
  expect(samples.middle.color).not.toBe(samples.start.color)
  expect(samples.middle.color).not.toBe('rgb(196, 65, 41)')
  expect(samples.interrupted.color).not.toBe('rgb(139, 92, 199)')
  expect(samples.redirected.color).not.toBe(samples.interrupted.color)
  expect(samples.redirected.color).not.toBe('rgb(139, 92, 199)')
  for (const sample of [samples.middle, samples.redirected, samples.end]) {
    expect(sample.backdrop).toBe(sample.color)
    expect(sample.header).toBe(sample.color)
  }
  expect(samples.end.root).toBe('#8b5cc7')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reducedMotionColor = await page.evaluate(async () => {
    const app = (document.querySelector('#app') as any).__vue_app__
    await app.config.globalProperties.$router.push('/archive')
    return document.documentElement.style.getPropertyValue('--page-theme-color')
  })
  expect(reducedMotionColor).toBe('#3276fe')
})
