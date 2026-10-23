import { expect, test } from '@playwright/test'

test('both creative galleries poll new and deleted images, preserve data on failure and stop when collapsed', async ({
  page,
}) => {
  test.setTimeout(90000)
  let count = 3
  let fail = false
  let requests = 0
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/__floratrium/media?**', (route) => {
    const album = new URL(route.request().url()).searchParams.get('pet')
    if (album !== 'photography' && album !== 'illustration')
      return route.continue()
    requests++
    if (fail)
      return route.fulfill({ status: 503, json: { error: 'unavailable' } })
    const prefix =
      album === 'photography' ? 'Creative/Photography' : 'Creative/illustration'
    const filename =
      album === 'photography'
        ? '20260709_003441_modified_time_compressed_945b813d79d1.webp'
        : '20240122_215617_TWO SIDES_表里.webp'
    return route.fulfill({
      json: {
        items: Array.from({ length: count }, (_, index) => ({
          key: `${prefix}/${index}.webp`,
          url: `https://assets.anuluca.com/${prefix}/${filename}?entry=${index}`,
          type: 'image',
        })),
        totalItems: count,
        totalPages: 1,
        nextCursor: null,
      },
    })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/creative', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.creative-illustration')).toBeAttached({
    timeout: 45000,
  })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  // 未展开就读取全量数量，两组预览保持折叠。
  for (const selector of ['.creative-photography', '.creative-illustration']) {
    await expect(page.locator(selector)).toHaveAttribute(
      'data-expanded',
      'false'
    )
    await expect(
      page
        .locator(selector)
        .locator('xpath=ancestor::section[1]')
        .locator('.section-count__value')
    ).toHaveText('03')
  }
  expect(requests).toBe(2)
  await page.clock.install()
  for (const selector of ['.creative-photography', '.creative-illustration']) {
    await page
      .locator(
        `${selector} > .creative-media__toggle:not(.creative-media__process)`
      )
      .click()
    await expect(page.locator(`${selector} .media-gallery__card`)).toHaveCount(
      3
    )
  }
  for (const kind of ['photography', 'illustration']) {
    const root = page.locator(`.creative-${kind}`)
    const layout = await root.evaluate((element) => {
      const panel = element.querySelector('.creative-media__all')!
      const button = element.querySelector(
        '.creative-media__toggle:not(.creative-media__process)'
      )!
      const container = panel.getBoundingClientRect()
      const bounds = button.getBoundingClientRect()
      const pagination = panel
        .querySelector('.flora-album-gallery__pagination')!
        .getBoundingClientRect()
      return {
        width: bounds.width,
        padding: getComputedStyle(button).padding,
        iconPosition: getComputedStyle(button.querySelector('svg')!).position,
        gradientDisplay: getComputedStyle(button, '::before').display,
        right: bounds.right - container.right,
        bottom: container.bottom - bounds.bottom,
        centerDifference:
          (bounds.top + bounds.bottom - pagination.top - pagination.bottom) / 2,
        paginationCenterDifference:
          (pagination.left +
            pagination.right -
            container.left -
            container.right) /
          2,
      }
    })
    expect(layout.iconPosition).toBe('absolute')
    expect(layout.gradientDisplay).not.toBe('none')
    expect(layout.padding).toBe(
      test.info().project.name.includes('mobile') ? '6px 8px' : '10px 14px'
    )
    expect(layout.right).toBeCloseTo(0, 0)
    expect(Math.abs(layout.centerDifference)).toBeLessThanOrEqual(1)
    expect(Math.abs(layout.paginationCenterDifference)).toBeLessThanOrEqual(1)
    expect(layout.bottom).toBeCloseTo(12, 0)
    if (kind === 'photography') {
      await expect(root.locator('.media-gallery__info')).toHaveCount(0)
      continue
    }
    const metadata = await root
      .locator('.photo-info__inner')
      .first()
      .evaluate((element) => {
        const title = element
          .querySelector('.photo-info__device')!
          .getBoundingClientRect()
        const date = element
          .querySelector('.photo-info__time')!
          .getBoundingClientRect()
        return {
          titleLeft: title.left,
          titleRight: title.right,
          dateLeft: date.left,
          dateRight: date.right,
          right: element.getBoundingClientRect().right,
          padding: parseFloat(getComputedStyle(element).paddingRight),
        }
      })
    expect(metadata.titleRight).toBeLessThanOrEqual(metadata.dateLeft)
    expect(
      Math.abs(metadata.dateRight - (metadata.right - metadata.padding))
    ).toBeLessThanOrEqual(1)
    await expect(root.locator('.photo-info__time').first()).toHaveText(
      '2024-01-22'
    )
  }
  await expect(
    page.locator('.creative-illustration .photo-info__device').first()
  ).toHaveText('表里')
  count = 4
  await page.clock.fastForward(15001)
  for (const selector of ['.creative-photography', '.creative-illustration'])
    await expect(page.locator(`${selector} .media-gallery__card`)).toHaveCount(
      4
    )
  fail = true
  await page.clock.fastForward(15001)
  for (const selector of ['.creative-photography', '.creative-illustration']) {
    await expect(page.locator(`${selector} .media-gallery__card`)).toHaveCount(
      4
    )
    await expect(page.locator(`${selector} [role="alert"]`)).toHaveCount(0)
  }
  fail = false
  count = 1
  await page.clock.fastForward(15001)
  for (const selector of ['.creative-photography', '.creative-illustration']) {
    await expect(page.locator(`${selector} .media-gallery__card`)).toHaveCount(
      1
    )
    await page
      .locator(
        `${selector} > .creative-media__toggle:not(.creative-media__process)`
      )
      .click()
    await expect(page.locator(selector)).toHaveAttribute(
      'data-expanded',
      'false'
    )
  }
  const before = requests
  await page.clock.fastForward(30001)
  expect(requests).toBe(before)
})

test('creative filenames parse encoded bilingual titles and ignore legacy processing suffixes', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const info = await page.evaluate(async () => {
    const { getCreativeImageInfo } = await import(
      /* @vite-ignore */ '/src/utils/creativeMedia.ts'
    )
    return [
      '20240122_215617_TWO SIDES_表里.webp',
      '20240122_215617_表里_TWO SIDES.webp',
      '20260530_233444_modified_time_compressed_2cadb319aa4e.webp',
      '20260230_000000_TEST_测试.webp',
    ].map((name) =>
      getCreativeImageInfo(
        `https://assets.anuluca.com/Creative/illustration/${encodeURIComponent(
          name
        )}?image=card-thumb`
      )
    )
  })
  expect(info[0]).toEqual({
    date: '2024-01-22',
    title: '表里',
    titleEn: 'TWO SIDES',
  })
  expect(info[1]).toEqual(info[0])
  expect(info[2]).toEqual({ date: '2026-05-30', title: '', titleEn: '' })
  expect(info[3].date).toBeNull()
})
