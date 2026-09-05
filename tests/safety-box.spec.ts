import { expect, type Page, test } from '@playwright/test'

const SAFETY_BOX_PATH = '/games/sleepingdogs/saftybox'

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

const openSafetyBox = async (page: Page) => {
  await page.goto(SAFETY_BOX_PATH, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.safety-box-stage')).toBeVisible({
    timeout: 20_000,
  })
  await page.waitForTimeout(1_600)
}

const solveTumbler = async (page: Page, slotIndex: number, key: 'a' | 'd') => {
  const slot = page.getByTestId('safe-combination-slot').nth(slotIndex)
  let confirmed = false

  for (let step = 0; step < 25; step += 1) {
    await page.keyboard.press(key)
    confirmed = await slot.evaluate((element) =>
      element.classList.contains('is-confirmed')
    )
    if (confirmed) break
  }

  expect(confirmed).toBe(true)
  await expect(page.locator('.safe-dial')).toHaveClass(/safe-dial--confirmed/)
  await expect(slot).toHaveCSS('color', 'rgb(76, 255, 98)')
  await expect(slot).toHaveClass(/is-solved/, { timeout: 1_000 })
}

test('safety box enforces the dial order and confirms each number', async ({
  page,
}, testInfo) => {
  await openSafetyBox(page)

  const slots = page.getByTestId('safe-combination-slot')
  const rotateButtons = page.locator('.safe-controls__rotate')
  await expect(slots).toHaveCount(3)
  await expect(slots.nth(0)).toHaveText('0')
  await expect(slots.nth(0)).toHaveCSS('color', 'rgba(218, 222, 226, 0.82)')
  await expect(page.getByTestId('safe-current-value')).toContainText('00')

  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('safe-current-value')).toContainText('00')
  await expect(slots.nth(0)).toHaveText('0')

  await solveTumbler(page, 0, 'a')
  const secondValue = Number(await slots.nth(1).textContent())

  await page.keyboard.press('ArrowLeft')
  await expect(slots.nth(1)).toHaveText(String(secondValue))
  await solveTumbler(page, 1, 'd')
  const thirdValue = Number(await slots.nth(2).textContent())

  await page.keyboard.press('ArrowRight')
  await expect(slots.nth(2)).toHaveText(String(thirdValue))
  await solveTumbler(page, 2, 'a')

  const resetButton = page.locator('.safe-controls__reset')
  const controls = page.locator('.safe-controls')
  const canvas = page.locator('.game-page-canvas')
  await expect(resetButton).toBeVisible()
  await expect(resetButton.locator('svg')).toHaveCount(1)
  await expect(resetButton).toHaveText('')

  const resetButtonShape = await resetButton.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      borderRadius: Number.parseFloat(style.borderTopLeftRadius),
      width: element.getBoundingClientRect().width,
    }
  })
  expect(resetButtonShape.borderRadius).toBeLessThan(
    resetButtonShape.width * 0.25
  )

  const controlsBox = await controls.boundingBox()
  const canvasBox = await canvas.boundingBox()
  expect(controlsBox).not.toBeNull()
  expect(canvasBox).not.toBeNull()
  expect(controlsBox!.x).toBeLessThan(canvasBox!.x + canvasBox!.width / 2)

  if (testInfo.project.name === 'mobile-chrome') {
    await expect(rotateButtons).toHaveCount(2)
    await expect(rotateButtons.first()).toBeVisible()
    await expect(rotateButtons.first().locator('svg')).toHaveCount(1)
    await expect(rotateButtons.first()).toHaveText('')
  } else {
    await expect(rotateButtons).toHaveCount(2)
    await expect(rotateButtons.first()).toBeHidden()
  }
})

test('mobile game layout resists late-loaded generic page styles', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome')

  await page.goto('/games/sleepingdogs/bullsAndCows', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.game-page-canvas')).toBeVisible({
    timeout: 20_000,
  })
  await page.waitForTimeout(1_600)

  await page.addStyleTag({
    content: `
      .game-page-layout .tool-page-stage {
        flex: 1 0 auto;
        padding-right: 3.5rem;
        transform: translateY(-3dvh);
      }
      .game-page-layout .detail-page-header {
        height: auto;
        min-height: 0;
        aspect-ratio: 6 / 1;
      }
      .game-page-layout .game-page-sidebar {
        transform: translateX(-100%);
      }
    `,
  })

  const geometry = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.tool-page-stage')!
    const header = document.querySelector<HTMLElement>('.detail-page-header')!
    const content = document.querySelector<HTMLElement>('.tool-page-content')!
    const sidebar = document.querySelector<HTMLElement>('.game-page-sidebar')!
    const headerRect = header.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()

    return {
      contentHeaderGap: headerRect.left - contentRect.right,
      headerScreenWidth: headerRect.width,
      sidebarTransform: getComputedStyle(sidebar).transform,
      stageTransform: getComputedStyle(stage).transform,
    }
  })

  expect(geometry.stageTransform).toBe('none')
  expect(geometry.sidebarTransform).toBe('none')
  expect(geometry.headerScreenWidth).toBeLessThanOrEqual(47)
  expect(geometry.contentHeaderGap).toBeLessThanOrEqual(13)
})

test('safety box matches the bulls and cows game top spacing', async ({
  page,
}) => {
  await page.goto('/games/sleepingdogs/bullsAndCows', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.game-page-canvas')).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.locator('.game-stage__viewport')).toBeVisible({
    timeout: 20_000,
  })
  await page.waitForTimeout(1_600)
  const bullsGeometry = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>('.game-page-canvas')!
    const viewport = document.querySelector<HTMLElement>(
      '.game-stage__viewport'
    )!
    return {
      canvasTop: canvas.getBoundingClientRect().top,
      viewportTop: viewport.getBoundingClientRect().top,
    }
  })

  await openSafetyBox(page)
  const safeGeometry = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>('.game-page-canvas')!
    const viewport = document.querySelector<HTMLElement>(
      '.game-stage__viewport'
    )!
    return {
      canvasTop: canvas.getBoundingClientRect().top,
      viewportTop: viewport.getBoundingClientRect().top,
    }
  })

  expect(
    Math.abs(safeGeometry.canvasTop - bullsGeometry.canvasTop)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(safeGeometry.viewportTop - bullsGeometry.viewportTop)
  ).toBeLessThanOrEqual(1)
})

test('safety box keeps its geometry stable while leaving the route', async ({
  page,
}) => {
  await openSafetyBox(page)

  const geometry = await page.evaluate(async () => {
    const app = document.querySelector<VueAppElement>('#app')
    const router = app?.__vue_app__?.config.globalProperties.$router
    const pageElement = document.querySelector<HTMLElement>(
      '.sleeping-dogs-safety-box'
    )
    const routerContainer =
      document.querySelector<HTMLElement>('.router-container')

    if (!router || !pageElement || !routerContainer) {
      throw new Error('Safety box route geometry targets are unavailable')
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
        '.sleeping-dogs-safety-box'
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

    return {
      containerLeftShift: Math.max(
        ...samples.map((value) =>
          Math.abs(value.containerLeft - containerRect.left)
        )
      ),
      containerTopShift: Math.max(
        ...samples.map((value) =>
          Math.abs(value.containerTop - containerRect.top)
        )
      ),
      pageLeftShift: Math.max(
        ...samples.map((value) => Math.abs(value.pageLeft - pageRect.left))
      ),
      pageTopShift: Math.max(
        ...samples.map((value) => Math.abs(value.pageTop - pageRect.top))
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
