import { expect, test } from '@playwright/test'

test('gallery defaults and custom columns keep row decorations aligned after resizing', async ({
  page,
}) => {
  await page.route('**/gallery-columns-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><div id="fixture"></div>',
    })
  )
  await page.route('**/gallery-column-*.svg*', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>',
    })
  )
  await page.goto('/gallery-columns-fixture')
  await page.evaluate(async () => {
    const { createApp, h, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Gallery } = await import(
      '/src/components/MediaGallery/index.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    const columns = ref(undefined)
    const items = Array.from({ length: 13 }, (_, index) => ({
      url: `/gallery-column-${index}.svg`,
    }))
    createApp({ render: () => h(Gallery, { columns: columns.value, items }) })
      .use(i18n)
      .mount('#fixture')
    ;(window as any).galleryColumnsFixture = columns
  })

  const gallery = page.locator('.media-gallery')
  const expectColumns = async (count: number) => {
    await expect
      .poll(() =>
        gallery.evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(' ').length
        )
      )
      .toBe(count)
    await expect(gallery.locator('.is-row-end')).toHaveCount(
      Math.floor(13 / count)
    )
    const geometry = await gallery
      .locator('.media-gallery__card')
      .evaluateAll((cards) =>
        cards.map((card) => ({
          left: card.getBoundingClientRect().left,
          top: card.getBoundingClientRect().top,
          start: card.classList.contains('is-row-start'),
          end: card.classList.contains('is-row-end'),
          last: card.classList.contains('is-last-row'),
          paddingLeft: getComputedStyle(card).paddingLeft,
          paddingRight: getComputedStyle(card).paddingRight,
          divider: getComputedStyle(card, '::after').display,
          border: getComputedStyle(card).borderBottomColor,
        }))
      )
    const lastRowStart = Math.floor(12 / count) * count
    geometry.forEach((card, index) => {
      expect(card.start).toBe(index % count === 0)
      expect(card.end).toBe((index + 1) % count === 0)
      expect(card.last).toBe(index >= lastRowStart)
      if (card.start) expect(card.paddingLeft).toBe('0px')
      if (card.end) {
        expect(card.paddingRight).toBe('0px')
        expect(card.divider).toBe('none')
      }
      if (card.last) expect(card.border).toBe('rgba(0, 0, 0, 0)')
      if (index % count !== 0)
        expect(card.top).toBeCloseTo(geometry[index - 1].top, 0)
    })
  }

  // 覆盖原有 900px 边界、默认值、部分配置、任意列数及运行时切换。
  for (const width of [1280, 900, 901, 393]) {
    await page.setViewportSize({ width, height: 850 })
    await expectColumns(width > 900 ? 3 : 2)
  }
  for (const config of [
    { value: { desktop: 5, mobile: 3 }, desktop: 5, mobile: 3 },
    { value: { desktop: 4 }, desktop: 4, mobile: 2 },
    { value: { desktop: 2 }, desktop: 2, mobile: 2 },
    { value: { desktop: 4, mobile: 4 }, desktop: 4, mobile: 4 },
    { value: { desktop: 1, mobile: 1 }, desktop: 1, mobile: 1 },
    { value: { desktop: 0, mobile: -1 }, desktop: 3, mobile: 2 },
    { value: 4, desktop: 4, mobile: 2 },
  ]) {
    await page.evaluate((value) => {
      ;(window as any).galleryColumnsFixture.value = value
    }, config.value)
    for (const width of [1280, 393]) {
      await page.setViewportSize({ width, height: 850 })
      await expectColumns(width > 900 ? config.desktop : config.mobile)
    }
  }
})
