import { expect, type Page, test } from '@playwright/test'

const CHINESE_CHESS_PATH = '/games/chineseChessCardGames/chineseChess'

interface TestRouter {
  push: (path: string) => Promise<void>
}

type VueAppElement = HTMLElement & {
  __vue_app__?: {
    config: {
      globalProperties: {
        $router: TestRouter
      }
    }
  }
}

const openGame = async (page: Page) => {
  await page.goto(CHINESE_CHESS_PATH, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/no-menu/, {
    timeout: 20_000,
  })
  await expect(page.locator('.chinese-chess-page')).not.toHaveClass(
    /route-enter-active/
  )
  await expect(page.getByRole('button', { name: /人机\s*对战/ })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('button', { name: /人机\s*对战/ }).click()
  await page.getByRole('button', { name: '简单' }).click()
  await expect(page.locator('.xiangqi-board')).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.locator('.xiangqi-board-shell')).toHaveClass(
    /xiangqi-board-shell--opening/,
    { timeout: 5_000 }
  )
  await expect(page.locator('.xiangqi-board-shell')).not.toHaveClass(
    /xiangqi-board-shell--opening/,
    { timeout: 5_000 }
  )
  await page.evaluate(() => document.fonts.ready)
}

const dragPiece = async (
  page: Page,
  fromSquare: string,
  toSquare: string,
  releaseOffset = { x: 0, y: 0 }
) => {
  const from = page.locator(`[data-square="${fromSquare}"]`)
  const to = page.locator(`[data-square="${toSquare}"]`)
  const fromBox = await from.boundingBox()
  const toBox = await to.boundingBox()
  if (!fromBox || !toBox) throw new Error('Drag coordinates are unavailable')

  await page.mouse.move(
    fromBox.x + fromBox.width / 2,
    fromBox.y + fromBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    toBox.x + toBox.width / 2 + releaseOffset.x,
    toBox.y + toBox.height / 2 + releaseOffset.y,
    { steps: 6 }
  )
  await page.mouse.up()
}

test('selects game mode and AI difficulty from the main menu', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'xiangqi-ai-victories-v1',
      JSON.stringify({ 3: '2026-09-08T04:05:06.000Z' })
    )
  })
  await page.goto(CHINESE_CHESS_PATH, { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('button', { name: /人机\s*对战/ })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('button', { name: /本地\s*1V1/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /更新\s*日志/ })).toBeVisible()
  await expect(page.locator('.xiangqi-menu__brand h1')).toHaveText('中国象棋')
  await expect(page.locator('.xiangqi-menu__board-background')).toHaveCSS(
    'opacity',
    '0.2'
  )
  await page.getByRole('button', { name: /人机\s*对战/ }).click()
  await expect(page.locator('.xiangqi-menu__difficulty')).toHaveCount(4)
  await expect(page.getByRole('button', { name: /简单/ })).toHaveClass(
    /xiangqi-piece-button--cleared/
  )
  await expect(
    page.locator('.xiangqi-menu__difficulty-row').filter({ hasText: '简单' })
  ).toContainText('将死时间：')
  await expect(page.locator('.xiangqi-piece-button svg')).toHaveCount(0)
  await expect(page.locator('.xiangqi-piece-button span').first()).toHaveCSS(
    'cursor',
    'pointer'
  )

  const difficultyScreenBottom = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.xiangqi-menu__card')!
    const screen = document.querySelector<HTMLElement>('.xiangqi-menu__screen')!
    return card.clientHeight - screen.offsetTop - screen.offsetHeight
  })
  expect(difficultyScreenBottom).toBeGreaterThan(40)
  expect(difficultyScreenBottom).toBeLessThan(110)

  await page.getByRole('button', { name: '中等' }).click()
  await expect(page.locator('.xiangqi-game__model')).toHaveText(
    '决策算法：ALPHA-BETA 深度5'
  )
  await expect(page.getByRole('button', { name: '旋转' })).toHaveCount(0)
  const gameBack = page
    .locator('.xiangqi-game__actions')
    .getByRole('button', { name: '返回', exact: true })
  await expect(gameBack).toHaveClass(/xiangqi-piece-button--back/)
  await gameBack.click()
  const confirmation = page.locator('.xiangqi-confirm')
  await expect(confirmation).toBeVisible()
  await expect(confirmation).toContainText('确认退出游戏吗？')
  await confirmation.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.locator('.xiangqi-board')).toBeVisible()
  await gameBack.click()
  await confirmation.getByRole('button', { name: '确认', exact: true }).click()
  await expect(page.locator('.xiangqi-menu__difficulty')).toHaveCount(4)
})

test('opens the game update log from the main menu', async ({ page }) => {
  await page.goto(CHINESE_CHESS_PATH, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/no-menu/, {
    timeout: 20_000,
  })
  const changelogButton = page.getByRole('button', { name: /更新\s*日志/ })
  await expect(changelogButton).toBeVisible({ timeout: 20_000 })
  await changelogButton.click()
  await expect(page).toHaveURL(new RegExp(`${CHINESE_CHESS_PATH}$`))
  await expect(page.locator('.xiangqi-menu__updates h2')).toHaveText('更新日志')
  await expect(page.locator('.xiangqi-menu__updates article')).toHaveCount(2)
  await expect(page.locator('.xiangqi-menu__brand')).toHaveCount(0)
  await expect(page.locator('.xiangqi-menu__board-background')).toHaveCount(0)
  const menuBack = page.getByRole('button', { name: '返回', exact: true })
  await expect(menuBack).toHaveClass(/xiangqi-piece-button--back/)
  const backColors = await menuBack.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      border: style.borderTopColor,
      text: style.color,
    }
  })
  expect(backColors).toEqual({
    background: 'rgb(113, 52, 31)',
    border: 'rgb(234, 199, 150)',
    text: 'rgb(234, 199, 150)',
  })
  await menuBack.click()
  await expect(page.getByRole('button', { name: /人机\s*对战/ })).toBeVisible()
})

test('supports local 1V1 and only shows board rotation in that mode', async ({
  page,
}) => {
  await page.goto(CHINESE_CHESS_PATH, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /本地\s*1V1/ }).click()
  await expect(page.locator('.xiangqi-board')).toBeVisible()
  await expect(page.locator('.xiangqi-board-shell')).toHaveClass(
    /xiangqi-board-shell--opening/,
    { timeout: 5_000 }
  )
  await expect(page.locator('.xiangqi-piece--opening')).toHaveCount(32)
  await expect(page.locator('.xiangqi-board-shell')).not.toHaveClass(
    /xiangqi-board-shell--opening/,
    { timeout: 5_000 }
  )
  await expect(page.locator('.xiangqi-turn-announcement')).toHaveText(
    '红方行棋'
  )
  await expect(page.getByRole('button', { name: '旋转' })).toBeVisible()
  const normalTurnMarker = await page
    .locator('.xiangqi-turn-marker')
    .evaluate((element) => ({
      left: Number.parseFloat(getComputedStyle(element).left),
      top: Number.parseFloat(getComputedStyle(element).top),
      boardHeight: document.querySelector<HTMLElement>('.xiangqi-board-shell')!
        .offsetHeight,
      boardWidth: document.querySelector<HTMLElement>('.xiangqi-board-shell')!
        .offsetWidth,
    }))
  expect(normalTurnMarker.left).toBeGreaterThan(normalTurnMarker.boardWidth)
  expect(normalTurnMarker.left - normalTurnMarker.boardWidth).toBeGreaterThan(8)
  expect(normalTurnMarker.top).toBeGreaterThan(normalTurnMarker.boardHeight / 2)

  await page.getByRole('button', { name: '旋转' }).click()
  await expect(page.locator('.xiangqi-board-shell')).toHaveClass(
    /xiangqi-board-shell--rotated/
  )
  const rotatedGeometry = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('.xiangqi-board-shell')!
    const game = document.querySelector<HTMLElement>('.xiangqi-game')!
    const boardArea = document.querySelector<HTMLElement>(
      '.xiangqi-board-area'
    )!
    const side = document.querySelector<HTMLElement>('.xiangqi-game__side')!
    const shellRect = shell.getBoundingClientRect()
    const gameRect = game.getBoundingClientRect()
    const sideRect = side.getBoundingClientRect()
    return {
      boardShiftedLeft:
        Number.parseFloat(getComputedStyle(boardArea).left) <
        game.clientWidth / 2,
      sideInside:
        sideRect.right <= gameRect.right + 1 &&
        sideRect.bottom <= gameRect.bottom + 1,
      shortAxisRatio:
        Math.min(shellRect.width, shellRect.height) /
        Math.min(gameRect.width, gameRect.height),
    }
  })
  expect(rotatedGeometry.boardShiftedLeft).toBe(true)
  expect(rotatedGeometry.sideInside).toBe(true)
  expect(rotatedGeometry.shortAxisRatio).toBeGreaterThan(0.8)

  const from = page.locator('[data-square="a3"]')
  const to = page.locator('[data-square="a4"]')
  const fromBox = await from.boundingBox()
  const toBox = await to.boundingBox()
  if (!fromBox || !toBox) throw new Error('Drag coordinates are unavailable')
  await page.mouse.move(
    fromBox.x + fromBox.width / 2,
    fromBox.y + fromBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, {
    steps: 8,
  })
  await page.mouse.up()
  await expect(page.getByTestId('xiangqi-status')).toContainText('黑方行棋')
  await expect(page.locator('.xiangqi-turn-announcement')).toHaveText(
    '黑方行棋'
  )
  await expect(page.locator('.xiangqi-turn-announcement')).toHaveCSS(
    'font-weight',
    '900'
  )
  await expect(page.locator('.xiangqi-turn-announcement')).toHaveCSS(
    'opacity',
    '0.7'
  )
  expect(
    await page
      .locator('.xiangqi-turn-marker')
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).top))
  ).toBeLessThan(0)
  await expect(page.locator('[data-square="a6"] .xiangqi-piece')).toHaveCSS(
    'cursor',
    'grab'
  )
  await expect(page.locator('.xiangqi-turn-announcement')).toHaveCount(0, {
    timeout: 2_500,
  })
  const resignButton = page
    .locator('.xiangqi-game__actions')
    .getByRole('button', { name: '投降', exact: true })
  await resignButton.click()
  await expect(page.locator('.xiangqi-confirm')).toContainText('确认投降吗？')
  await page
    .locator('.xiangqi-confirm')
    .getByRole('button', { name: '确认', exact: true })
    .click()
  await expect(page.getByTestId('xiangqi-status')).toContainText('红方胜')
  await expect(page.locator('.xiangqi-history__item--result')).toContainText(
    '黑方 · 投降 · 红方胜'
  )
  await page
    .locator('.xiangqi-game__actions')
    .getByRole('button', { name: '返回', exact: true })
    .click()
  await page
    .locator('.xiangqi-confirm')
    .getByRole('button', { name: '确认', exact: true })
    .click()
  await expect(page.getByRole('button', { name: /人机\s*对战/ })).toBeVisible()
})

test('renders a complete Xiangqi opening position without visible coordinates', async ({
  page,
}) => {
  await openGame(page)

  await expect(page.locator('.detail-page-header h1')).toHaveText('中国象棋')
  await expect(page.locator('.detail-page-header__subtitle')).toHaveText(
    '中国棋牌游戏'
  )
  await expect(page.locator('.xiangqi-square')).toHaveCount(90)
  await expect(page.locator('.xiangqi-piece')).toHaveCount(32)
  await expect(page.locator('.xiangqi-board')).not.toContainText(/[a-i][0-9]/)
  await expect(page.locator('.xiangqi-game__seal')).toHaveCount(0)
  await expect(page.locator('.xiangqi-board')).toHaveCSS('cursor', 'default')
  await expect(page.locator('[data-square="a3"] .xiangqi-piece')).toHaveCSS(
    'cursor',
    'grab'
  )
  await expect(page.locator('[data-square="a6"] .xiangqi-piece')).toHaveCSS(
    'cursor',
    'default'
  )
  await page.locator('[data-square="a6"] .xiangqi-piece').hover()
  await expect(page.locator('[data-square="a6"] .xiangqi-piece')).toHaveCSS(
    'transform',
    'none'
  )
  await expect(page.locator('.xiangqi-turn-marker')).toHaveCSS(
    'color',
    'rgb(255, 255, 255)'
  )
  await expect(page.locator('.xiangqi-turn-marker > span')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)'
  )
  await expect(page.locator('.xiangqi-turn-marker > span')).toHaveCSS(
    'border-top-color',
    'rgb(255, 255, 255)'
  )
  expect(
    await page
      .locator('.xiangqi-turn-marker > span')
      .evaluate((element) => element.getBoundingClientRect().width)
  ).toBeLessThanOrEqual(35)
  await expect(page.locator('.xiangqi-board__markers > g')).toHaveCount(14)
  await expect(page.locator('.xiangqi-game__actions button')).toHaveCount(3)
  await expect(page.locator('.xiangqi-game__actions svg')).toHaveCount(0)
  await expect(page.locator('.xiangqi-game__model')).toContainText('ALPHA-BETA')
  const boardThickness = await page
    .locator('.xiangqi-board-shell')
    .evaluate((element) => ({
      content: getComputedStyle(element, '::after').content,
      height: Number.parseFloat(getComputedStyle(element, '::after').height),
    }))
  expect(boardThickness.content).not.toBe('none')
  expect(boardThickness.height).toBeGreaterThan(0)
})

test('stacks captured pieces at the board left and animates the latest capture', async ({
  page,
}) => {
  await page.goto(CHINESE_CHESS_PATH, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: /本地\s*1V1/ })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('button', { name: /本地\s*1V1/ }).click()
  await expect(page.locator('.xiangqi-board-shell')).toHaveClass(
    /xiangqi-board-shell--opening/,
    { timeout: 5_000 }
  )
  await expect(page.locator('.xiangqi-board-shell')).not.toHaveClass(
    /xiangqi-board-shell--opening/,
    { timeout: 5_000 }
  )

  await dragPiece(page, 'a3', 'a4', { x: -8, y: 0 })
  await expect(page.locator('[data-square="a4"] .xiangqi-piece')).toHaveText(
    '兵'
  )
  await dragPiece(page, 'a6', 'a5')
  await dragPiece(page, 'a4', 'a5')
  await dragPiece(page, 'c6', 'c5')
  await dragPiece(page, 'c3', 'c4')
  await dragPiece(page, 'c5', 'c4')

  const redCaptures = page.locator('.xiangqi-captured--r')
  const blackCaptures = page.locator('.xiangqi-captured--b')
  await expect(redCaptures).toBeVisible()
  await expect(blackCaptures).toBeVisible()
  await expect(redCaptures.locator('> strong')).toHaveText('1')
  await expect(blackCaptures.locator('> strong')).toHaveText('1')
  await expect(
    redCaptures.locator('.xiangqi-captured__piece--latest')
  ).toHaveText('卒')
  await expect(
    blackCaptures.locator('.xiangqi-captured__piece--latest')
  ).toHaveText('兵')
  await expect(
    blackCaptures.locator('.xiangqi-captured__piece--flying')
  ).toHaveCount(1)

  const groupPositions = await page
    .locator('.xiangqi-captured')
    .evaluateAll((groups) =>
      groups.map((group) => Number.parseFloat(getComputedStyle(group).top))
    )
  expect(groupPositions[0]).not.toBe(groupPositions[1])

  const geometry = await page.evaluate(() => {
    const stacks = Array.from(
      document.querySelectorAll<HTMLElement>('.xiangqi-captured')
    )
    return stacks.map((stack) => stack.offsetLeft + stack.offsetWidth)
  })
  expect(geometry.every((stackRight) => stackRight < 0)).toBe(true)
})

test('plays a computer response and undoes the complete round', async ({
  page,
}) => {
  await openGame(page)

  const from = page.locator('[data-square="a3"]')
  const to = page.locator('[data-square="a4"]')
  const blackPieces = page.locator('.xiangqi-square:has(.xiangqi-piece--b)')
  const readBlackSquares = () =>
    blackPieces.evaluateAll((squares) =>
      squares.map((square) => square.getAttribute('data-square'))
    )
  const initialBlackSquares = await readBlackSquares()

  const fromBox = await from.boundingBox()
  const toBox = await to.boundingBox()
  if (!fromBox || !toBox) throw new Error('Drag coordinates are unavailable')

  await page.mouse.move(
    fromBox.x + fromBox.width / 2,
    fromBox.y + fromBox.height / 2
  )
  await page.mouse.down()
  await expect(to).toHaveClass(/xiangqi-square--target/)
  await page.mouse.move(
    (fromBox.x + toBox.x) / 2 + fromBox.width / 2,
    (fromBox.y + toBox.y) / 2 + fromBox.height / 2,
    { steps: 4 }
  )
  await expect(from.locator('.xiangqi-piece')).toHaveClass(
    /xiangqi-piece--dragging/
  )
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, {
    steps: 4,
  })
  await page.mouse.up()

  await expect(to.locator('.xiangqi-piece')).toHaveText('兵')
  await expect(from.locator('.xiangqi-piece')).toHaveCount(0)
  await expect(page.getByTestId('xiangqi-status')).toContainText('红方行棋', {
    timeout: 5_000,
  })
  await expect(page.locator('.xiangqi-piece__hand')).toHaveCount(0)
  await expect(page.locator('.xiangqi-history__list p')).toHaveCount(2)
  await expect(page.locator('.xiangqi-piece--highlighted')).toHaveCount(2)
  await expect(to.locator('.xiangqi-piece')).toHaveClass(
    /xiangqi-piece--highlighted/
  )
  await expect(to.locator('.xiangqi-piece')).toHaveCSS(
    'box-shadow',
    /rgb\(47, 25, 15\)/
  )
  await expect(page.locator('.xiangqi-history__list p').first()).toHaveClass(
    /xiangqi-history__item--b/
  )
  await expect(page.locator('.xiangqi-history__list p').last()).toHaveClass(
    /xiangqi-history__item--r/
  )
  await expect.poll(readBlackSquares).not.toEqual(initialBlackSquares)

  await page.locator('.xiangqi-game__actions button').first().click()
  await expect(from.locator('.xiangqi-piece')).toHaveText('兵')
  await expect(to.locator('.xiangqi-piece')).toHaveCount(0)
  await expect.poll(readBlackSquares).toEqual(initialBlackSquares)
  await expect(page.getByTestId('xiangqi-status')).toContainText('红方行棋')
  await expect(page.locator('.xiangqi-history__list')).toHaveCount(0)
})

test('contains history scrolling inside the game canvas', async ({ page }) => {
  await page.goto(CHINESE_CHESS_PATH, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: /本地\s*1V1/ })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('button', { name: /本地\s*1V1/ }).click()

  const from = page.locator('[data-square="a3"]')
  const to = page.locator('[data-square="a4"]')
  const fromBox = await from.boundingBox()
  const toBox = await to.boundingBox()
  if (!fromBox || !toBox) throw new Error('Drag coordinates are unavailable')
  await page.mouse.move(
    fromBox.x + fromBox.width / 2,
    fromBox.y + fromBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2)
  await page.mouse.up()

  const history = page.locator('.xiangqi-history__list')
  await history.evaluate((element) => {
    element.style.height = '40px'
    element.style.flex = '0 0 40px'
    const track = element.querySelector('.xiangqi-history__track')
    const item = track?.querySelector('p')
    if (!track || !item) throw new Error('History fixture is unavailable')
    for (let index = 0; index < 20; index += 1) {
      track.append(item.cloneNode(true))
    }
  })

  const initialPageScroll = await page.evaluate(() => window.scrollY)
  await history.hover()
  await page.mouse.wheel(0, 300)
  await expect
    .poll(() => history.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  await page.mouse.wheel(0, 1_000)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(initialPageScroll)
})

test('keeps the board inside the game canvas', async ({ page }) => {
  await openGame(page)

  const geometry = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>('.game-page-canvas')!
    const board = document.querySelector<HTMLElement>('.xiangqi-board-shell')!
    const canvasRect = canvas.getBoundingClientRect()
    const boardRect = board.getBoundingClientRect()

    return {
      bottom: boardRect.bottom <= canvasRect.bottom + 1,
      centered:
        Math.abs(
          boardRect.left +
            boardRect.width / 2 -
            (canvasRect.left + canvasRect.width / 2)
        ) <= 1,
      left: boardRect.left >= canvasRect.left - 1,
      right: boardRect.right <= canvasRect.right + 1,
      top: boardRect.top >= canvasRect.top - 1,
    }
  })

  expect(geometry).toEqual({
    bottom: true,
    centered: true,
    left: true,
    right: true,
    top: true,
  })
})

test('keeps page geometry stable while leaving the route', async ({ page }) => {
  await openGame(page)

  const geometry = await page.evaluate(async () => {
    const app = document.querySelector<VueAppElement>('#app')
    const router = app?.__vue_app__?.config.globalProperties.$router
    const pageElement = document.querySelector<HTMLElement>(
      '.chinese-chess-page'
    )
    const routerContainer =
      document.querySelector<HTMLElement>('.router-container')

    if (!router || !pageElement || !routerContainer) {
      throw new Error('Chinese chess route geometry targets are unavailable')
    }

    const pageRect = pageElement.getBoundingClientRect()
    const containerRect = routerContainer.getBoundingClientRect()
    const samples: Array<{
      containerLeft: number
      containerTop: number
      pageLeft: number
      pageTop: number
    }> = []

    let finished = false
    const sample = () => {
      const leavingPage = document.querySelector<HTMLElement>(
        '.chinese-chess-page'
      )
      if (!leavingPage) {
        finished = true
        return
      }

      const leavingRect = leavingPage.getBoundingClientRect()
      const leavingContainerRect = routerContainer.getBoundingClientRect()
      samples.push({
        containerLeft: leavingContainerRect.left,
        containerTop: leavingContainerRect.top,
        pageLeft: leavingRect.left,
        pageTop: leavingRect.top,
      })
      requestAnimationFrame(sample)
    }

    sample()
    await router.push('/craft')
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 500)
      const waitForLeave = () => {
        if (finished) {
          window.clearTimeout(timeout)
          resolve()
          return
        }
        requestAnimationFrame(waitForLeave)
      }
      waitForLeave()
    })

    const maxShift = (values: number[], initial: number) =>
      Math.max(...values.map((value) => Math.abs(value - initial)))

    return {
      containerLeftShift: maxShift(
        samples.map(({ containerLeft }) => containerLeft),
        containerRect.left
      ),
      containerTopShift: maxShift(
        samples.map(({ containerTop }) => containerTop),
        containerRect.top
      ),
      pageLeftShift: maxShift(
        samples.map(({ pageLeft }) => pageLeft),
        pageRect.left
      ),
      pageTopShift: maxShift(
        samples.map(({ pageTop }) => pageTop),
        pageRect.top
      ),
      sampleCount: samples.length,
    }
  })

  expect(geometry.sampleCount).toBeGreaterThan(1)
  expect(geometry.pageTopShift).toBeLessThanOrEqual(1)
  expect(geometry.pageLeftShift).toBeLessThanOrEqual(1)
  expect(geometry.containerTopShift).toBeLessThanOrEqual(1)
  expect(geometry.containerLeftShift).toBeLessThanOrEqual(1)
})
