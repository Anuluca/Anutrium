import { expect, test } from '@playwright/test'

import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'

test('design cards open independent image lists inline and in fullscreen without page shifts', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(150000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/creative?current=DESIGN', { waitUntil: 'domcontentloaded' })
  const home = page.locator('.temple-page')
  const cards = page.locator('.creative-design .shared-work-card')
  await expect(home).toHaveAttribute('data-settled', 'true', { timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await page.evaluate(() => document.fonts.ready)
  await expect(cards).toHaveCount(4)
  const expectColumns = async (expected: number) => {
    const columns = await page
      .locator('.creative-design__cards')
      .evaluate(
        (root) => getComputedStyle(root).gridTemplateColumns.split(' ').length
      )
    expect(columns).toBe(expected)
  }
  await expectColumns(2)
  await expect(cards.locator('.work-card-stack')).toHaveCount(0)
  await expect(cards.locator('.work-card-info > small:first-child')).toHaveText(
    ['自制', '自制', '自制', '自制']
  )
  await expect(cards.locator('.work-card-info__time')).toHaveText([
    '2026-05',
    '2026-07',
    'RENEWING',
    'RENEWING',
  ])
  for (const [id, hasInfo] of [
    ['lucarioCard', false],
    ['ironvalientCard', false],
    ['trainerCards', true],
    ['appleMusicCover', true],
  ] as const) {
    const response = await page.request.get(`/__floratrium/media?pet=${id}`)
    const album = await response.json()
    expect(response.ok()).toBe(true)
    await page.locator(`[data-design="${id}"]`).scrollIntoViewIfNeeded()
    await page.locator(`[data-design="${id}"]`).focus()
    const position = await readPagePosition(page, '.creative-design')
    const panelScroll = await page
      .locator('.temple-focus-content .scroll-viewport__scroll')
      .evaluate((root) => root.scrollTop)
    await page.locator(`[data-design="${id}"]`).click()
    const detail = page.locator('.design-detail')
    await expect(detail).toBeVisible()
    await expect(detail.locator('.media-gallery__card')).toHaveCount(
      album.totalItems,
      { timeout: 25000 }
    )
    if (id === 'appleMusicCover') {
      expect(
        await detail
          .locator('.media-gallery')
          .evaluate(
            (root) =>
              getComputedStyle(root).gridTemplateColumns.split(' ').length
          )
      ).toBe(4)
    }
    await expect(detail.locator('.photo-info__inner')).toHaveCount(0)
    if (hasInfo) {
      await detail.locator('.media-gallery__open').first().click()
      const viewer = page.locator('.el-image-viewer__wrapper')
      await expect(viewer.locator('.safe-image-viewer__info')).toBeVisible()
      await expect(viewer.locator('.photo-info__time')).toHaveText(
        /^\d{4}-\d{2}-\d{2}$/
      )
      await page.keyboard.press('Escape')
      await expect(viewer).toHaveCount(0)
    }
    await expect(page.locator('.work-detail-inline, .modal-body')).toHaveCount(
      0
    )
    if (!isMobile) {
      await expect(page.locator('.design-detail-inline')).toBeVisible()
      await expect(
        page.locator('.design-detail-inline .diamond-close-btn')
      ).toHaveCount(0)
      const current = page.locator(`[data-design="${id}"]`)
      await expect(current).toHaveAttribute('aria-current', 'true')
      await expect(current.locator('.work-card-image')).toHaveCSS(
        'filter',
        'none'
      )
      expect(
        await current
          .locator('.work-card-info')
          .evaluate((element) => getComputedStyle(element).textShadow)
      ).not.toContain('rgba(0, 0, 0, 0)')
      const bounds = (await page
        .locator('.design-detail-inline')
        .boundingBox())!
      expect(bounds.x).toBeGreaterThanOrEqual(
        page.viewportSize()!.width / 2 - 1
      )
    } else
      await expect(
        page.locator('.el-overlay-dialog .design-detail')
      ).toBeVisible()
    expectPagePositionToMatch(
      await readPagePosition(page, '.creative-design'),
      position
    )
    expect(
      Math.abs(
        (await page
          .locator('.temple-focus-content .scroll-viewport__scroll')
          .evaluate((root) => root.scrollTop)) - panelScroll
      )
    ).toBeLessThanOrEqual(1)
    await expect(
      detail.getByRole('button', { name: '列表模式', exact: true })
    ).toHaveAttribute('aria-pressed', 'true')
    await detail.getByRole('button', { name: '大图预览', exact: true }).click()
    await expect(
      detail.locator('.inline-image-preview__thumbnail')
    ).toHaveCount(album.totalItems)
    await expect
      .poll(() =>
        detail.evaluate((body) => {
          const preview = body
            .querySelector('.inline-image-preview')!
            .getBoundingClientRect()
          const bounds = body.getBoundingClientRect()
          const style = getComputedStyle(body)
          const top = bounds.top + parseFloat(style.paddingTop)
          const bottom = bounds.bottom - parseFloat(style.paddingBottom)
          return Math.abs((preview.top + preview.bottom - top - bottom) / 2)
        })
      )
      .toBeLessThanOrEqual(1)
    if (album.totalItems > 1) {
      await detail.getByRole('button', { name: '下一张', exact: true }).click()
      await expect(
        detail.locator('.inline-image-preview__thumbnail').nth(1)
      ).toHaveAttribute('aria-current', 'true')
    }
    if (id === 'appleMusicCover') {
      await expect
        .poll(
          () =>
            detail
              .locator('.inline-image-preview__open img')
              .evaluate((image: HTMLImageElement) => image.naturalWidth),
          { timeout: 25000 }
        )
        .toBeGreaterThan(0)
      await page.screenshot({ path: `.tmp/design-${info.project.name}.png` })
      await detail.locator('.inline-image-preview__open').click()
      await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
      expectPagePositionToMatch(
        await readPagePosition(page, '.creative-design'),
        position
      )
      await page.keyboard.press('Escape')
      await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
      await expect(detail).toBeVisible()
    }
    if (isMobile) await page.locator('.modal-close-row button').click()
    else await page.keyboard.press('Escape')
    await expect(detail).toHaveCount(0)
    await expect(home).toHaveAttribute('data-selected', 'island')
    expectPagePositionToMatch(
      await readPagePosition(page, '.creative-design'),
      position
    )
  }
  if (!isMobile) {
    await page
      .getByRole('button', { name: '展开全屏内容', exact: true })
      .click()
    await expect(home).toHaveClass(/temple-page--expanded/)
    await expect
      .poll(() =>
        page.locator('.temple-menu').evaluate((menu) => {
          const bounds = menu.getBoundingClientRect()
          const button = menu
            .querySelector('.temple-expand')!
            .getBoundingClientRect()
          return Math.abs(
            button.left +
              button.width / 2 -
              (bounds.right + window.innerWidth) / 2
          )
        })
      )
      .toBeLessThanOrEqual(1)
    await expectColumns(4)
    await page.locator('[data-design="trainerCards"]').click()
    await expect(
      page.locator('.el-overlay-dialog .design-detail')
    ).toBeVisible()
    await expect(page.locator('.design-detail-inline')).toHaveCount(0)
    const dialogBounds = (await page
      .locator('.modal-wrapper-dialog:visible')
      .boundingBox())!
    const closeBounds = (await page
      .locator('.modal-close-row button:visible')
      .boundingBox())!
    expect(closeBounds.y).toBeGreaterThan(dialogBounds.y + dialogBounds.height)
    expect(
      Math.abs(
        closeBounds.x +
          closeBounds.width / 2 -
          dialogBounds.x -
          dialogBounds.width / 2
      )
    ).toBeLessThanOrEqual(1)
    await page.locator('.modal-close-row button').click()
    await expect(page.locator('.design-detail')).toHaveCount(0)
  }
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const read = () =>
      [root, container].flatMap((element) => {
        const bounds = element.getBoundingClientRect()
        return [bounds.top, bounds.left]
      })
    const probe = { initial: read(), samples: [] as number[][] }
    ;(window as any).designLeaveGeometry = probe
    const sample = () => {
      if (!root.isConnected) return
      probe.samples.push(read())
      requestAnimationFrame(sample)
    }
    sample()
    const app = document.querySelector('#app') as any
    void app.__vue_app__.config.globalProperties.$router.push(
      '/flanerie/changsha'
    )
  })
  await expect(home).toHaveCount(0, { timeout: 30000 })
  const geometry = await page.evaluate(
    () =>
      (window as any).designLeaveGeometry as {
        initial: number[]
        samples: number[][]
      }
  )
  expect(geometry.samples.length).toBeGreaterThan(1)
  for (const sample of geometry.samples)
    sample.forEach((value, index) =>
      expect(Math.abs(value - geometry.initial[index])).toBeLessThanOrEqual(1)
    )
})

test('archive current card fades its theme gradient and restores its image when closed', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, '手机端没有半屏详情')
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 45000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  const card = page.locator('.works-grid .shared-work-card').first()
  await card.scrollIntoViewIfNeeded()
  const samples = await card.evaluate(
    (button) =>
      new Promise<number[]>((resolve) => {
        const info = button.querySelector('.work-card-info')!
        const values = [Number(getComputedStyle(info, '::before').opacity)]
        ;(button as HTMLButtonElement).click()
        const start = performance.now()
        const sample = () => {
          values.push(Number(getComputedStyle(info, '::before').opacity))
          if (performance.now() - start > 400) resolve(values)
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
  )
  expect(samples.some((value) => value > 0 && value < 1)).toBe(true)
  await expect(card).toHaveAttribute('aria-current', 'true')
  await expect(card.locator('.work-card-image')).toHaveCSS('filter', 'none')
  expect(
    await card
      .locator('.work-card-info')
      .evaluate((info) => getComputedStyle(info).textShadow)
  ).toContain('0.55')
  await page.keyboard.press('Escape')
  await expect(card).not.toHaveAttribute('aria-current', 'true')
  await expect(card.locator('.work-card-image')).toHaveCSS(
    'filter',
    'brightness(0.62)'
  )
  await expect
    .poll(() =>
      card
        .locator('.work-card-info')
        .evaluate((info) => getComputedStyle(info, '::before').opacity)
    )
    .toBe('0')
})

test('design album failure can retry without stale images from another card', async ({
  page,
}) => {
  test.setTimeout(90000)
  let fail = true
  await page.route('**/__floratrium/media?pet=lucarioCard', (route) =>
    fail
      ? route.fulfill({ status: 503, json: { error: 'unavailable' } })
      : route.continue()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/creative?current=DESIGN', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 45000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await page.locator('[data-design="lucarioCard"]').click()
  await expect(page.locator('.design-detail [role="alert"]')).toBeVisible()
  fail = false
  await page
    .locator('.design-detail')
    .getByRole('button', { name: '重试', exact: true })
    .click()
  await expect(page.locator('.design-detail .media-gallery__card')).toHaveCount(
    1
  )
})
