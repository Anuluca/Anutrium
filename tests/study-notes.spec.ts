import { expect, test } from '@playwright/test'

const NOTE_ROUTE = '/island/study-notes'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(NOTE_ROUTE, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.study-note-card')).toHaveCount(6)
})

test('renders a responsive square-cornered masonry with image-free cards', async ({
  page,
}) => {
  const stack = page.locator('.study-note-stack')
  const cards = page.locator('.study-note-card')
  const isMobile = (page.viewportSize()?.width || 0) <= 600
  await expect(stack).toHaveClass(/\bis-ready\b/)

  await expect(
    page.locator('.study-note-card--with-image .study-note-card__image')
  ).toHaveCount(1)
  await expect(page.locator('.study-note-card--without-image')).toHaveCount(5)
  await expect(page.locator('.study-note-card--important')).toHaveCount(0)
  await expect(cards.locator('.study-note-card__category')).toHaveCount(6)
  await expect(cards.locator('.study-note-card__date')).toHaveCount(6)

  const gridColumnCount = await stack.evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
  )
  expect(gridColumnCount).toBe(isMobile ? 1 : 4)

  const occupiedColumns = await cards.evaluateAll(
    (elements) =>
      new Set(
        elements.map((element) =>
          Math.round(element.getBoundingClientRect().left)
        )
      ).size
  )
  expect(occupiedColumns).toBe(isMobile ? 1 : 4)

  if (!isMobile) {
    const gaps = await cards.evaluateAll((elements) => {
      const rects = elements.map((element) => element.getBoundingClientRect())
      const firstRow = rects
        .filter((rect) => Math.abs(rect.top - rects[0].top) < 1)
        .sort((left, right) => left.left - right.left)
      const horizontalGap = firstRow[1].left - firstRow[0].right
      const sameColumn = rects
        .filter((rect) => Math.abs(rect.left - firstRow[1].left) < 1)
        .sort((top, bottom) => top.top - bottom.top)
      const verticalGap = sameColumn[1].top - sameColumn[0].bottom

      return { horizontalGap, verticalGap }
    })

    expect(gaps.horizontalGap).toBeLessThan(11)
    expect(Math.abs(gaps.horizontalGap - gaps.verticalGap)).toBeLessThanOrEqual(
      1
    )
  }

  const borderRadii = await cards.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).borderRadius)
  )
  expect(new Set(borderRadii)).toEqual(new Set(['0px']))

  const firstCardOrder = await cards
    .first()
    .locator(':scope > *')
    .evaluateAll((elements) =>
      elements.map((element) => element.className as string)
    )
  expect(firstCardOrder).toEqual([
    'study-note-card__category no-rem',
    'study-note-card__visual',
    'study-note-card__copy',
  ])

  const imageFreeCardOrder = await cards
    .nth(1)
    .locator(':scope > *')
    .evaluateAll((elements) =>
      elements.map((element) => element.className as string)
    )
  expect(imageFreeCardOrder).toEqual([
    'study-note-card__category no-rem',
    'study-note-card__copy',
  ])
})

test('preserves the masonry gap after returning from another route', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.reload({ waitUntil: 'domcontentloaded' })

  const cards = page.locator('.study-note-card')
  await expect(cards).toHaveCount(6)
  await expect(page.locator('.study-note-stack')).toHaveClass(/\bis-ready\b/)

  await cards.first().click()
  await expect(page).toHaveURL(/\/404$/)
  await page.goBack({ waitUntil: 'domcontentloaded' })

  await expect(page).toHaveURL(/\/island\/study-notes$/)
  await expect(page.locator('.study-note-stack')).toHaveClass(/\bis-ready\b/)

  await expect
    .poll(async () => {
      return cards.evaluateAll((elements) => {
        const rects = elements
          .map((element) => element.getBoundingClientRect())
          .sort((first, second) => first.top - second.top)
        const repeatedColumn = rects.find((candidate, index) =>
          rects.some(
            (rect, rectIndex) =>
              rectIndex !== index && Math.abs(rect.left - candidate.left) < 1
          )
        )
        if (!repeatedColumn) return 0

        const sameColumn = rects.filter(
          (rect) => Math.abs(rect.left - repeatedColumn.left) < 1
        )

        return sameColumn[1].top - sameColumn[0].bottom
      })
    })
    .toBeGreaterThan(0)
})
