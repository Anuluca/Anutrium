import { expect, test } from '@playwright/test'

test('section counts keep natural digit widths and justify or center their labels', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('http://localhost:3000/count-layout-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><div id="fixture"></div>',
    })
  )
  await page.goto('/count-layout-test')
  await page.evaluate(async () => {
    const { createApp, h, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: SectionCount } = await import(
      '/src/components/SectionCount/index.vue'
    )
    const count = ref(12)
    const label = ref('PHOTOGRAPHY COLLECTION')
    createApp({
      render: () =>
        h('div', [
          h(SectionCount, { count: 123456, label: 'PHOTOS' }),
          h(SectionCount, { count: count.value, label: label.value }),
        ]),
    }).mount('#fixture')
    ;(window as any).countFixture = { count, label }
    await document.fonts.ready
  })
  const counts = page.locator('.section-count')
  await expect(counts.nth(0).locator('.section-count__value')).toHaveText(
    '123456'
  )
  await expect(counts.nth(1).locator('.section-count__value')).toHaveText('12')
  const measure = (index: number) =>
    counts.nth(index).evaluate((root) => {
      const value = root.querySelector<HTMLElement>('.section-count__value')!
      const label = root.querySelector('small')!
      const digits = value.getBoundingClientRect()
      const first = label.firstElementChild!.getBoundingClientRect()
      const last = label.lastElementChild!.getBoundingClientRect()
      return {
        digitWidth: digits.width,
        naturalWidth: value.offsetWidth,
        transform: getComputedStyle(value).transform,
        left: first.left - digits.left,
        right: last.right - digits.right,
        labelWidth: last.right - first.left,
        center: (first.left + last.right - digits.left - digits.right) / 2,
      }
    })
  const justified = await measure(0)
  expect(justified.transform).toBe('none')
  expect(
    Math.abs(justified.digitWidth - justified.naturalWidth)
  ).toBeLessThanOrEqual(1)
  expect(Math.abs(justified.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(justified.right)).toBeLessThanOrEqual(1)
  const centered = await measure(1)
  expect(centered.labelWidth).toBeGreaterThan(centered.digitWidth)
  expect(Math.abs(centered.center)).toBeLessThanOrEqual(1)
  expect(centered.transform).toBe('none')
  await page.evaluate(() => {
    ;(window as any).countFixture.count.value = 12345678
    ;(window as any).countFixture.label.value = 'WORKS'
  })
  await expect(counts.nth(1).locator('.section-count__value')).toHaveText(
    '12345678'
  )
  const updated = await measure(1)
  expect(Math.abs(updated.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(updated.right)).toBeLessThanOrEqual(1)
  expect(updated.transform).toBe('none')
})
