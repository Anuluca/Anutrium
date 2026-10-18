import { expect, test } from '@playwright/test'

import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'

test('pet move cards show types and PP with forgotten moves in a scroll-safe modal', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/?module=sprigatito', { waitUntil: 'domcontentloaded' })
  const panel = page.locator('.flora-moves')
  await expect(panel).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  if (info.project.name.includes('mobile')) {
    const alert = page.locator('.mobile-experience-alert')
    await expect(alert).toBeVisible({ timeout: 20000 })
    await alert.click()
    await expect(alert).toHaveCount(0)
  }
  const current = panel.locator(':scope > .flora-moves__list .flora-move-card')
  const name = '.flora-move-card__name'
  const pp = '.flora-move-card__pp'
  const type = '.flora-move-card__type'
  await expect(current.locator(name)).toHaveText([
    '咬住',
    '睡觉',
    '轮唱',
    '摇尾巴',
  ])
  await expect(current.locator(pp)).toHaveText([
    '25/25',
    '5/5',
    '15/15',
    '30/30',
  ])
  await expect(current.locator(type)).toHaveText([
    '恶',
    '超能力',
    '一般',
    '一般',
  ])
  const boxes = await current.evaluateAll((cards) =>
    cards.map((card) => {
      const { x, y, width } = card.getBoundingClientRect()
      return { x, y, width }
    })
  )
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThanOrEqual(1)
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x)
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y)
  expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThanOrEqual(1)
  await expect
    .poll(() =>
      panel.evaluate((element) => {
        const level = document
          .querySelector('.flora-pet-level')!
          .getBoundingClientRect()
        const name = element
          .querySelector('.flora-move-card__name')!
          .getBoundingClientRect()
        return name.top - level.bottom
      })
    )
    .toBeGreaterThanOrEqual(8)
  const mediaHeading = await page
    .locator('.flora-video-gallery h2')
    .boundingBox()
  const movesBounds = (await panel.boundingBox())!
  expect(
    mediaHeading!.y - movesBounds.y - movesBounds.height
  ).toBeGreaterThanOrEqual(8)
  await page.mouse.move(0, 0)
  for (const selector of [name, type, pp]) {
    const text = current.first().locator(selector)
    await expect(text).toHaveCSS('-webkit-text-fill-color', 'rgba(0, 0, 0, 0)')
    expect(
      await text.evaluate(
        (element) =>
          getComputedStyle(element.querySelector('span') ?? element).maskImage
      )
    ).toContain('repeating-linear-gradient')
  }
  if (!info.project.name.includes('mobile')) {
    await current.first().hover()
    const hover = await current.first().evaluate((card) => ({
      opacity: getComputedStyle(card, '::before').opacity,
      scale: new DOMMatrix(getComputedStyle(card).transform).a,
    }))
    expect(Number(hover.opacity)).toBe(0.6)
    expect(hover.scale).toBe(1)
    for (const selector of [name, type, pp])
      await expect(current.first().locator(selector)).toHaveCSS(
        '-webkit-text-stroke-width',
        '0px'
      )
    await expect(page.locator('.cursor-shape')).toHaveClass(/is-active/)
  }
  const toggle = panel.locator('.flora-moves__toggle')
  const panelBounds = (await panel.boundingBox())!
  const toggleBounds = (await toggle.boundingBox())!
  expect(
    Math.abs(
      toggleBounds.x + toggleBounds.width - panelBounds.x - panelBounds.width
    )
  ).toBeLessThanOrEqual(1)
  await expect(toggle).toHaveText('FORGOTTEN ×2')
  await expect(toggle).toHaveCSS('font-family', 'Anton, sans-serif')
  await expect(toggle).toHaveCSS('font-weight', '400')
  await expect(panel).toHaveCSS('opacity', '0.4')
  await expect(toggle.locator('svg')).toHaveCount(0)
  await expect(toggle.locator('span')).toHaveCSS(
    '-webkit-text-fill-color',
    'rgba(0, 0, 0, 0)'
  )
  await expect(
    panel.locator(':scope > h2, :scope > .flora-moves__header')
  ).toHaveCount(0)
  const modal = page.locator('.flora-moves-modal')
  await toggle.scrollIntoViewIfNeeded()
  const initial = await readPagePosition(page, '.flora-focus-layout')
  await toggle.click()
  await expect(modal).toBeVisible()
  await expect(modal.locator(name)).toHaveText(['扑击', '乱抓'])
  await expect(modal.locator(pp)).toHaveText(['20/20', '15/15'])
  await expect(modal.locator(type)).toHaveText(['虫', '一般'])
  expectPagePositionToMatch(
    await readPagePosition(page, '.flora-focus-layout'),
    initial
  )
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito'
  )
  expectPagePositionToMatch(
    await readPagePosition(page, '.flora-focus-layout'),
    initial
  )
  await page.locator('button[data-pet-id="xiaohei"]').click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toHaveText('FORGOTTEN ×5')
  await expect(current.locator(name)).toHaveText([
    '撒娇',
    '吼叫',
    '冥想',
    '摇尾巴',
  ])
  await expect(current.locator(pp)).toHaveText([
    '20/20',
    '20/20',
    '20/20',
    '30/30',
  ])
  await expect(current.locator(type)).toHaveText([
    '妖精',
    '一般',
    '超能力',
    '一般',
  ])
  await toggle.click()
  await expect(modal.locator(name)).toHaveText([
    '咬碎',
    '叫声',
    '乱抓',
    '扑击',
    '高速移动',
  ])
  await expect(modal.locator(pp)).toHaveText([
    '15/15',
    '40/40',
    '15/15',
    '20/20',
    '30/30',
  ])
  const modalCards = await modal
    .locator('.flora-move-card')
    .evaluateAll((cards) =>
      cards.map((card) => {
        const { x, y } = card.getBoundingClientRect()
        return { x, y }
      })
    )
  for (let i = 1; i < modalCards.length; i++) {
    expect(Math.abs(modalCards[i].x - modalCards[0].x)).toBeLessThanOrEqual(1)
    expect(modalCards[i].y).toBeGreaterThan(modalCards[i - 1].y)
  }
  await page.screenshot({
    path: `.tmp/flora-moves-modal-${info.project.name}.png`,
  })
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await panel.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `.tmp/flora-moves-${info.project.name}.png` })
  const album = page.locator('.flora-album-gallery')
  const albumButton = album.locator('button.flora-album-gallery__expand')
  await expect(albumButton).toHaveCSS(
    'font-size',
    info.project.name.includes('mobile') ? '18px' : '36px'
  )
  await expect(album.locator('.flora-album-gallery__title button')).toHaveCSS(
    'font-size',
    info.project.name.includes('mobile') ? '44px' : '72px'
  )
  await albumButton.click()
  await expect(albumButton).toHaveText('COLLAPSE')
  await expect(panel).toBeHidden()
  await albumButton.click()
  await expect(albumButton).toHaveText('EXPAND')
  await expect(panel).toBeVisible()
})
