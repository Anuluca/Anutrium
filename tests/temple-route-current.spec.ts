import { expect, type Page, test } from '@playwright/test'

test.setTimeout(90000)
const push = (page: Page, path: string) =>
  page.evaluate(async (path) => {
    const app = document.querySelector('#app') as any
    await app.__vue_app__.config.globalProperties.$router.push(path)
  }, path)
const expectSection = async (page: Page, name: string) => {
  const root = page.locator('.temple-focus-content .scroll-viewport__scroll')
  await expect(root.locator(`[data-section-label="${name}"]`)).toHaveCount(1, {
    timeout: 30000,
  })
  let previousTop = Number.NaN
  let stableSamples = 0
  await expect
    .poll(
      async () => {
        const state = await root.evaluate((root, name) => {
          const target = [
            ...root.querySelectorAll<HTMLElement>('[data-section-label]'),
          ].find((section) => section.dataset.sectionLabel === name)!
          const expected = Math.max(
            0,
            Math.min(
              root.scrollHeight - root.clientHeight,
              root.scrollTop +
                target.getBoundingClientRect().top -
                root.getBoundingClientRect().top
            )
          )
          const expanding = [
            ...root.querySelectorAll('.home-section-content'),
          ].some((body) =>
            body
              .getAnimations()
              .some(
                (animation) =>
                  animation.playState === 'running' &&
                  (animation.effect as KeyframeEffect)
                    .getKeyframes()
                    .some((frame) => 'height' in frame)
              )
          )
          return {
            offset: Math.abs(expected - root.scrollTop),
            top: root.scrollTop,
            expanding,
          }
        }, name)
        if (
          !state.expanding &&
          state.offset <= 1 &&
          state.top > 0 &&
          Math.abs(state.top - previousTop) <= 1
        )
          stableSamples++
        else stableSamples = 0
        previousTop = state.top
        return stableSamples >= 2
      },
      { timeout: 15000, intervals: [100] }
    )
    .toBe(true)
}

test('current starts scrolling immediately with fade-only entry and follows query and history changes', async ({
  page,
}) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const probe = { reveal: 0, scroll: 0, heightAnimations: 0 }
    ;(window as any).sectionEntryProbe = probe
    const animate = Element.prototype.animate
    Element.prototype.animate = function (...args) {
      if (this.matches('.home-section-content')) {
        probe.reveal ||= performance.now()
        if (
          Array.isArray(args[0]) &&
          args[0].some((frame) => 'height' in frame)
        )
          probe.heightAnimations++
      }
      return animate.apply(this, args)
    }
    const scrollTo = Element.prototype.scrollTo
    Element.prototype.scrollTo = function (...args: any[]) {
      if (
        this.matches('.temple-focus-content .scroll-viewport__scroll') &&
        args[0]?.top > 0
      )
        probe.scroll ||= performance.now()
      return scrollTo.apply(this, args as [ScrollToOptions])
    }
  })
  await page.goto('/creative?isExpand=true&current=illustration', {
    waitUntil: 'domcontentloaded',
  })
  await expectSection(page, 'ILLUSTRATION')
  const probe = await page.evaluate(() => (window as any).sectionEntryProbe)
  expect(probe.heightAnimations).toBe(0)
  expect(probe.scroll).toBeGreaterThan(0)
  expect(probe.scroll - probe.reveal).toBeLessThan(250)
  const samples = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>(
      '.temple-focus-content .scroll-viewport__scroll'
    )!
    const values = [root.scrollTop]
    const app = document.querySelector('#app') as any
    await app.__vue_app__.config.globalProperties.$router.push(
      '/creative?isExpand=true&current=PHOTOGRAPHY'
    )
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const sample = () => {
        values.push(root.scrollTop)
        if (performance.now() - start < 1400) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    return values
  })
  const start = samples[0]
  const end = samples.at(-1)!
  expect(start - end).toBeGreaterThan(20)
  expect(
    samples.filter((value) => value > end + 2 && value < start - 2).length
  ).toBeGreaterThan(3)
  await expectSection(page, 'PHOTOGRAPHY')
  await push(page, '/creative?isExpand=false&current=craft')
  await expectSection(page, 'CRAFT')
  await page.goBack()
  await expectSection(page, 'PHOTOGRAPHY')
})

test('current targets archive and journey sections after reload and module changes', async ({
  page,
}) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive?current=other', { waitUntil: 'domcontentloaded' })
  await expectSection(page, 'OTHER')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expectSection(page, 'OTHER')
  await push(page, '/?module=flanerie&isExpand=true&current=events')
  await expectSection(page, 'EVENTS')
})

test('unknown current is ignored and pointer input cancels pending alignment', async ({
  page,
}) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/creative?current=unknown', {
    waitUntil: 'domcontentloaded',
  })
  const root = page.locator('.temple-focus-content .scroll-viewport__scroll')
  await expect(root.locator('[data-section-label="ILLUSTRATION"]')).toHaveCount(
    1,
    { timeout: 30000 }
  )
  expect(await root.evaluate((root) => root.scrollTop)).toBe(0)
  await push(page, '/creative?current=illustration')
  await root.evaluate((root) => {
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    root.scrollTop = 0
  })
  await expect
    .poll(() =>
      root.evaluate(
        (root) =>
          root
            .getAnimations({ subtree: true })
            .filter(
              (animation) =>
                animation.playState === 'running' &&
                (animation.effect as KeyframeEffect)
                  .getKeyframes()
                  .some((frame) => 'height' in frame)
            ).length
      )
    )
    .toBe(0)
  const maxDrift = await root.evaluate(async (root) => {
    const end = performance.now() + 300
    let drift = 0
    await new Promise<void>((resolve) => {
      const sample = () => {
        drift = Math.max(drift, Math.abs(root.scrollTop))
        if (performance.now() < end) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    return drift
  })
  expect(maxDrift).toBeLessThanOrEqual(1)
})
