import { expect, type Page } from '@playwright/test'

export interface PagePosition {
  anchorTop: number
  bodyOverflow: string
  bodyWidth: number
  pageScrollTop: number
}

export const readPagePosition = (
  page: Page,
  anchorSelector: string
): Promise<PagePosition> =>
  page.evaluate((selector) => {
    const anchor = document.querySelector<HTMLElement>(selector)!

    return {
      anchorTop: anchor.getBoundingClientRect().top,
      bodyOverflow: getComputedStyle(document.body).overflowY,
      bodyWidth: document.body.getBoundingClientRect().width,
      pageScrollTop: Math.max(
        window.scrollY,
        document.scrollingElement?.scrollTop || 0,
        document.documentElement.scrollTop,
        document.body.scrollTop
      ),
    }
  }, anchorSelector)

export const scrollPageToRatio = async (page: Page, ratio = 1) => {
  await page.evaluate((scrollRatio) => {
    const maxScrollTop = Math.max(
      0,
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ) - window.innerHeight
    )
    const scrollTop = maxScrollTop * Math.min(1, Math.max(0, scrollRatio))

    window.scrollTo(0, scrollTop)
    document.scrollingElement?.scrollTo(0, scrollTop)
    document.documentElement.scrollTop = scrollTop
    document.body.scrollTop = scrollTop
  }, ratio)

  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          window.scrollY,
          document.scrollingElement?.scrollTop || 0,
          document.documentElement.scrollTop,
          document.body.scrollTop
        )
      )
    )
    .toBeGreaterThan(100)
}

export const expectPagePositionToMatch = (
  actual: PagePosition,
  expected: PagePosition,
  maxDelta = 1
) => {
  expect(actual.bodyOverflow).toBe(expected.bodyOverflow)
  expect(Math.abs(actual.bodyWidth - expected.bodyWidth)).toBeLessThanOrEqual(
    maxDelta
  )
  expect(
    Math.abs(actual.pageScrollTop - expected.pageScrollTop)
  ).toBeLessThanOrEqual(maxDelta)
  expect(Math.abs(actual.anchorTop - expected.anchorTop)).toBeLessThanOrEqual(
    maxDelta
  )
}
